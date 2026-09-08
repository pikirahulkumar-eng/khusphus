process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@libsql/client');
const cors = require('cors');
const fs = require('fs');
let admin = null;
try {
  admin = require('firebase-admin');
  if (fs.existsSync('./firebase-service-account.json')) {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized for FCM');
  } else {
    console.warn('FCM disabled: firebase-service-account.json not found');
  }
} catch (e) {
  console.warn('firebase-admin module not available locally, running signaling server in dev mode');
}
const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Initialize SQLite Client — uses Turso on cloud (if env set), falls back to local SQLite file for zero-error dev
const turso = createClient({
  url: process.env.TURSO_URL || 'file:sunao_local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize users and pending_messages tables on startup (safe — runs every time server boots)
async function initDb() {
  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        phone  TEXT NOT NULL,
        name   TEXT NOT NULL,
        fcm_token TEXT,
        registered_at INTEGER DEFAULT (strftime('%s','now'))
      )
    `);
    // Ensure legacy rows (phone-keyed) still work — add userId column if missing
    try { await turso.execute('ALTER TABLE users ADD COLUMN userId TEXT'); } catch (_) {}

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS pending_messages (
        id TEXT PRIMARY KEY,
        target_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    try {
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_pending_target ON pending_messages(target_id)');
    } catch (_) {}

    // Purge any legacy dummy accounts or fabricated phantom users
    try {
      await turso.execute(`
        DELETE FROM users 
        WHERE phone LIKE 'user_%' 
           OR phone LIKE 'reg_%' 
           OR phone IN ('9876543210', '9876543211', '6677889900', '9999888877', '1122334455', 'test_123', '12345', 'space_live_room')
           OR name IN ('Rahul Bhai', 'Priya Verma', 'Neha Sharma', 'Amit Patel', 'Vikram Rajput', 'Papa', 'Test Bhai', 'Open Audio Lounge 🎙️')
      `);
    } catch (_) {}

    console.log('[DB] users & pending_messages tables ready');
  } catch (e) {
    console.error('[DB_INIT_ERR]', e);
  }
}
initDb();

// User Registration Endpoint — called on every login from the app
app.post('/api/register', async (req, res) => {
  const { userId, phone, name } = req.body;
  if (!userId || !phone || !name) {
    return res.status(400).json({ error: 'userId, phone, name are required' });
  }
  const cleanPhone = String(phone).trim();
  const cleanName = String(name).trim();
  if (cleanPhone.startsWith('user_') || cleanPhone.startsWith('reg_') || cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Invalid phone format' });
  }

  try {
    await turso.execute({
      sql: `INSERT INTO users (userId, phone, name)
            VALUES (?, ?, ?)
            ON CONFLICT(userId) DO UPDATE SET phone=excluded.phone, name=excluded.name`,
      args: [userId, cleanPhone, cleanName]
    });
    console.log(`[USER_REGISTERED] userId=${userId} phone=${cleanPhone} name=${cleanName}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[REGISTER_ERR]', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Search API Endpoint — only exact phone lookup allowed, NEVER substring name search
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query || !query.trim()) return res.json([]);
  const q = query.trim().replace(/\D/g, '');
  if (q.length < 10) return res.json([]);

  try {
    const result = await turso.execute({
      sql: `SELECT userId, phone, name FROM users 
            WHERE phone = ? 
              AND phone NOT LIKE 'user_%' 
              AND phone NOT LIKE 'reg_%'
              AND phone NOT IN ('9876543210', '9876543211', '6677889900', '9999888877', '1122334455', 'test_123', '12345', 'space_live_room')
            LIMIT 1`,
      args: [q]
    });
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
});

// All Users Endpoint — loads real registered users from DB for chat list & live rail
app.get('/api/users', async (req, res) => {
  const { excludePhone } = req.query;
  const dummyFilter = `
    AND phone NOT LIKE 'user_%' 
    AND phone NOT LIKE 'reg_%'
    AND phone NOT IN ('9876543210', '9876543211', '6677889900', '9999888877', '1122334455', 'test_123', '12345', 'space_live_room')
  `;
  try {
    const result = await turso.execute({
      sql: excludePhone 
        ? `SELECT userId, phone, name FROM users WHERE phone != ? ${dummyFilter} ORDER BY registered_at DESC LIMIT 50`
        : `SELECT userId, phone, name FROM users WHERE 1=1 ${dummyFilter} ORDER BY registered_at DESC LIMIT 50`,
      args: excludePhone ? [excludePhone] : []
    });
    res.json(result.rows);
  } catch (e) {
    console.error('Fetch users error:', e);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Online Users Endpoint — returns array of userIds/phones currently connected
app.get('/api/online-users', (req, res) => {
  res.json(Array.from(connectedUsers.keys()));
});

// Native Android Direct Call Signal Relay (HTTP -> Socket.io & FCM)
app.post('/api/call-signal', async (req, res) => {
  try {
    const { type: signalType, callId, targetUserId, callerId, callType } = req.body;
    const target = targetUserId || callerId;
    const sender = req.body.senderId || req.body.userId || 'native_phone';
    const resolvedType = callType || 'audio';

    console.log(`📡 [NATIVE_CALL_SIGNAL_RECEIVED] type=${signalType} callId=${callId} target=${target} from=${sender}`);

    const wsMessage = {
      type: signalType,
      targetUserId: target,
      senderId: sender,
      payload: {
        callId: callId || `call_${Date.now()}`,
        callerId: target,
        receiverId: sender,
        type: resolvedType,
        callType: resolvedType
      }
    };

    let delivered = false;
    const targetSockets = await getSocketsForTarget(target);
    if (targetSockets && targetSockets.length > 0) {
      targetSockets.forEach((sId) => {
        io.to(sId).emit('message', wsMessage);
      });
      delivered = true;
    } else {
      console.log(`[SIGNAL] Target ${target} not currently connected online.`);
    }

    if (signalType === 'CALL_ENDED' && target && admin && admin.apps && admin.apps.length > 0) {
      try {
        const result = await turso.execute({
          sql: 'SELECT fcm_token FROM users WHERE phone = ?',
          args: [target]
        });
        const fcmToken = result.rows[0]?.fcm_token;
        if (fcmToken) {
          await admin.messaging().send({
            token: fcmToken,
            data: {
              type: 'CALL_ENDED',
              callId: callId || ''
            },
            android: { priority: 'high' }
          });
          console.log(`Sent CALL_ENDED FCM cancel to ${target}`);
        }
      } catch (e) {}
    }

    res.json({ success: true, delivered, signalType, callId });
  } catch (err) {
    console.error('[NATIVE_CALL_SIGNAL_ERR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Push Token Sync Endpoint (Native Android -> Turso Database)
app.post('/api/profiles/push-token', async (req, res) => {
  try {
    const { userId, fcmPushToken } = req.body;
    if (userId && fcmPushToken) {
      try { await turso.execute('ALTER TABLE users ADD COLUMN fcm_token TEXT'); } catch(e) {}
      await turso.execute({
        sql: 'UPDATE users SET fcm_token = ? WHERE phone = ?',
        args: [fcmPushToken, userId]
      });
      console.log(`[FCM_SYNC] Token updated for user: ${userId}`);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[FCM_SYNC_ERR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const connectedUsers = new Map(); // userId -> Set of socket IDs

// Helper to get all sockets for a target (resolves phone <-> userId bi-directionally)
async function getSocketsForTarget(targetId) {
  if (!targetId) return [];
  const direct = connectedUsers.get(targetId);
  if (direct && direct.size > 0) {
    return Array.from(direct);
  }
  // Try DB alias lookup (e.g. if targetId is a phone, find their userId, or vice versa)
  try {
    const res = await turso.execute({
      sql: 'SELECT userId, phone FROM users WHERE userId = ? OR phone = ? LIMIT 1',
      args: [targetId, targetId]
    });
    if (res.rows && res.rows.length > 0) {
      const { userId, phone } = res.rows[0];
      const altId = (userId === targetId) ? phone : userId;
      if (altId && connectedUsers.has(altId)) {
        return Array.from(connectedUsers.get(altId));
      }
    }
  } catch (_) {}
  return [];
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('register', async (data) => {
    // data can be userId string or object { userId, phone, fcmToken }
    const userId = typeof data === 'string' ? data : data.userId;
    const phone = typeof data === 'object' ? data.phone : null;
    const name = typeof data === 'object' ? data.name : null;
    const fcmToken = typeof data === 'object' ? data.fcmToken : null;
    
    socket.userId = userId;
    socket.userPhone = phone;

    // Automatically ensure valid real users exist in users table
    if (userId && phone && !phone.startsWith('user_') && !phone.startsWith('reg_') && phone.length >= 10) {
      try {
        await turso.execute({
          sql: `INSERT INTO users (userId, phone, name)
                VALUES (?, ?, ?)
                ON CONFLICT(userId) DO UPDATE SET phone=excluded.phone, name=COALESCE(excluded.name, users.name)`,
          args: [userId, phone.trim(), (name || phone).trim()]
        });
      } catch (_) {}
    }

    const mapId = (id) => {
      if (!id) return;
      if (!connectedUsers.has(id)) {
        connectedUsers.set(id, new Set());
      }
      connectedUsers.get(id).add(socket.id);
    };

    mapId(userId);
    if (phone) mapId(phone);

    // Also auto-map from DB if phone not provided in data
    if (userId && !phone) {
      try {
        const res = await turso.execute({
          sql: 'SELECT phone FROM users WHERE userId = ? LIMIT 1',
          args: [userId]
        });
        if (res.rows?.[0]?.phone) {
          socket.userPhone = res.rows[0].phone;
          mapId(res.rows[0].phone);
          console.log(`[SOCKET_MAP] Auto-mapped ${userId} -> phone ${res.rows[0].phone}`);
        }
      } catch (_) {}
    }

    console.log(`User registered: userId=${userId}, phone=${phone || socket.userPhone} on socket ${socket.id}`);
    
    // Broadcast presence update
    const activePhone = phone || socket.userPhone;
    if (activePhone) {
      io.emit('presence_update', { userId: activePhone, isOnline: true });
    }
    if (userId) {
      io.emit('presence_update', { userId: userId, isOnline: true });
    }
    // Send list of all online users to this socket
    socket.emit('online_users', Array.from(connectedUsers.keys()));

    // Flush pending offline messages for this user (both phone and userId)
    try {
      const pendingTargets = Array.from(new Set([userId, phone, socket.userPhone].filter(Boolean)));
      for (const tId of pendingTargets) {
        const pending = await turso.execute({
          sql: 'SELECT id, type, payload, sender_id, target_id FROM pending_messages WHERE target_id = ? ORDER BY created_at ASC',
          args: [String(tId)]
        });
        if (pending.rows && pending.rows.length > 0) {
          console.log(`[OFFLINE_FLUSH] Delivering ${pending.rows.length} queued message(s) to ${tId} on socket ${socket.id}`);
          for (const row of pending.rows) {
            try {
              const parsedPayload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
              const msgData = {
                type: row.type,
                payload: parsedPayload,
                targetUserId: row.target_id
              };
              socket.emit('message', msgData);
              await turso.execute({
                sql: 'DELETE FROM pending_messages WHERE id = ?',
                args: [row.id]
              });
            } catch (err) {
              console.error('[OFFLINE_FLUSH_ITEM_ERR]', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('[OFFLINE_FLUSH_ERR]', err);
    }

    try {
       try { await turso.execute('ALTER TABLE users ADD COLUMN fcm_token TEXT'); } catch(e) {}
       if (fcmToken && phone) {
         await turso.execute({
           sql: 'UPDATE users SET fcm_token = ? WHERE phone = ? OR userId = ?',
           args: [fcmToken, phone, userId]
         });
       }
    } catch (e) {
       console.error('Failed to save FCM token:', e);
    }
  });

  socket.on('call-user', async (data) => {
    console.log(`[CALL_REQUEST] from=${data.from} to=${data.to} isVideo=${data.isVideo} callId=${data.callId}`);
    const receiverSockets = await getSocketsForTarget(data.to);
    if (receiverSockets && receiverSockets.length > 0) {
      receiverSockets.forEach((sId) => {
        io.to(sId).emit('incoming-call', {
          from: data.from,
          offer: data.offer,
          isVideo: data.isVideo,
          callId: data.callId,
          callerUser: data.callerUser
        });
      });
      console.log(`[CALL_DISPATCHED] Delivered incoming-call to ${receiverSockets.length} socket(s) for ${data.to}`);
    } else {
      console.warn(`[CALL_TARGET_OFFLINE] No active socket for target ${data.to}`);
    }

    // Always attempt to send an FCM push to wake up the device (or if offline)
    try {
      if (admin && admin.apps && admin.apps.length > 0) {
        const result = await turso.execute({
          sql: 'SELECT fcm_token FROM users WHERE phone = ? OR userId = ? LIMIT 1',
          args: [data.to, data.to]
        });
        const fcmToken = result.rows[0]?.fcm_token;
        if (fcmToken) {
          await admin.messaging().send({
            token: fcmToken,
            data: {
              type: 'INCOMING_CALL',
              callId: data.from + '-' + Date.now(),
              callerName: data.from,
              callerId: data.from,
              callType: data.isVideo ? 'video' : 'audio',
              callerPhoto: ''
            },
            android: {
              priority: 'high'
            }
          });
          console.log(`Sent FCM wakeup to ${data.to}`);
        }
      }
    } catch (e) {
      console.error('FCM Error:', e);
    }
  });

  socket.on('answer-call', async (data) => {
    const callerSockets = await getSocketsForTarget(data.to);
    if (callerSockets && callerSockets.length > 0) {
      callerSockets.forEach((sId) => {
        io.to(sId).emit('call-answered', {
          answer: data.answer
        });
      });
    }
    // Notify other devices of responder to stop ringing
    if (socket.userId && connectedUsers.has(socket.userId)) {
      connectedUsers.get(socket.userId).forEach((sId) => {
        if (sId !== socket.id) {
          io.to(sId).emit('call-handled', { by: socket.id });
        }
      });
    }
  });

  socket.on('ice-candidate', async (data) => {
    const targetSockets = await getSocketsForTarget(data.to);
    if (targetSockets && targetSockets.length > 0) {
      targetSockets.forEach((sId) => {
        io.to(sId).emit('ice-candidate', data.candidate);
      });
    }
  });

  socket.on('message', async (data) => {
    const targetUserId = data?.targetUserId || data?.payload?.receiverId;
    const senderId = data?.payload?.senderId || data?.payload?.readerPhone || socket.userPhone || socket.userId;
    console.log(`[MSG_IN] type=${data?.type} to=${targetUserId} from=${senderId}`);

    // 1. Deliver to all active devices of target recipient
    const targetSockets = await getSocketsForTarget(targetUserId);
    console.log(`[MSG_ROUTED] to=${targetUserId} sockets=${targetSockets.length}`);
    if (targetSockets && targetSockets.length > 0) {
      targetSockets.forEach((sId) => {
        io.to(sId).emit('message', data);
      });
    } else if (targetUserId && data?.type && ['CHAT_MESSAGE', 'MESSAGE_DELIVERED', 'MESSAGE_READ', 'CHAT_READ_SYNC'].includes(data.type)) {
      // Store in offline queue so it is guaranteed to be delivered as soon as target reconnects!
      try {
        const msgId = data.payload?.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await turso.execute({
          sql: `INSERT OR REPLACE INTO pending_messages (id, target_id, sender_id, type, payload, created_at)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            String(msgId),
            String(targetUserId),
            String(senderId || ''),
            String(data.type),
            JSON.stringify(data.payload || {}),
            Date.now()
          ]
        });
        console.log(`[MSG_STORED_OFFLINE] Saved pending ${data.type} (id=${msgId}) for offline user ${targetUserId}`);
      } catch (err) {
        console.error('[MSG_STORE_OFFLINE_ERR]', err);
      }
    }

    // 2. Multi-Device Companion Sync: mirror message to sender's OTHER devices (Mobile <-> Web <-> Desktop)
    if (senderId && connectedUsers.has(senderId)) {
      connectedUsers.get(senderId).forEach((sId) => {
        if (sId !== socket.id) {
          io.to(sId).emit('message', data);
        }
      });
    }
  });

  socket.on('disconnect', () => {
    const cleanup = (id) => {
      if (id && connectedUsers.has(id)) {
        const set = connectedUsers.get(id);
        set.delete(socket.id);
        if (set.size === 0) {
          connectedUsers.delete(id);
          io.emit('presence_update', { userId: id, isOnline: false });
        }
      }
    };
    cleanup(socket.userId);
    cleanup(socket.userPhone);
    console.log(`Socket ${socket.id} disconnected`);
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Sunao Realtime Signaling & Push Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

if (fs.existsSync(distPath)) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sunao Cloud Server</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0F172A; color: #F8FAFC; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1E293B; border-radius: 20px; padding: 32px; max-width: 480px; text-align: center; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          h1 { color: #10B981; margin-bottom: 8px; font-size: 26px; }
          p { color: #94A3B8; font-size: 15px; line-height: 1.5; }
          .badge { display: inline-flex; align-items: center; background: rgba(16,185,129,0.15); color: #34D399; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-top: 12px; }
          .dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; margin-right: 8px; box-shadow: 0 0 10px #10B981; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Sunao Realtime Server</h1>
          <p>WebRTC P2P Signaling Engine, Turso DB Sync & FCM Push Notification Gateway are live and running smoothly.</p>
          <div class="badge"><div class="dot"></div>Cloud Backend 100% Operational</div>
        </div>
      </body>
      </html>
    `);
  });
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunao Signaling Server running on 0.0.0.0:${PORT}`);
});
