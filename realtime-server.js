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
  app.use(express.static(distPath));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Turso SQLite Client — uses env vars on production (Render), falls back to local for dev
const turso = createClient({
  url: process.env.TURSO_URL || 'libsql://dummy.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'dummy-token',
});

// Initialize users table on startup (safe — runs every time server boots)
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
    console.log('[DB] users table ready');
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
  try {
    await turso.execute({
      sql: `INSERT INTO users (userId, phone, name)
            VALUES (?, ?, ?)
            ON CONFLICT(userId) DO UPDATE SET phone=excluded.phone, name=excluded.name`,
      args: [userId, phone.trim(), name.trim()]
    });
    console.log(`[USER_REGISTERED] userId=${userId} phone=${phone} name=${name}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[REGISTER_ERR]', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Search API Endpoint — search by name or phone, returns userId for routing
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  console.log('Search request received for:', query);
  if (!query) return res.json([]);

  try {
    const result = await turso.execute({
      sql: 'SELECT userId, phone, name FROM users WHERE phone LIKE ? OR name LIKE ?',
      args: [`%${query}%`, `%${query}%`]
    });
    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Database error' });
  }
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
    const targetSockets = connectedUsers.get(target);
    if (targetSockets && targetSockets.size > 0) {
      targetSockets.forEach((sId) => {
        io.to(sId).emit('message', wsMessage);
      });
      delivered = true;
    } else {
      io.emit('message', wsMessage);
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

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('register', async (data) => {
    // data can be just userId string (legacy) or object { userId, fcmToken }
    const userId = typeof data === 'string' ? data : data.userId;
    const fcmToken = typeof data === 'string' ? null : data.fcmToken;
    
    socket.userId = userId;
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);
    console.log(`User ${userId} registered socket ${socket.id} (Active devices: ${connectedUsers.get(userId).size})`);
    
    try {
       // Ensure fcm_token column exists (lazy migration)
       try { await turso.execute('ALTER TABLE users ADD COLUMN fcm_token TEXT'); } catch(e) {}
       
       if (fcmToken) {
         await turso.execute({
           sql: 'UPDATE users SET fcm_token = ? WHERE phone = ?',
           args: [fcmToken, userId]
         });
       }
    } catch (e) {
       console.error('Failed to save FCM token:', e);
    }
  });

  socket.on('call-user', async (data) => {
    const receiverSockets = connectedUsers.get(data.to);
    if (receiverSockets && receiverSockets.size > 0) {
      receiverSockets.forEach((sId) => {
        io.to(sId).emit('incoming-call', {
          from: data.from,
          offer: data.offer,
          isVideo: data.isVideo
        });
      });
    }

    // Always attempt to send an FCM push to wake up the device (or if offline)
    try {
      if (admin && admin.apps && admin.apps.length > 0) {
        const result = await turso.execute({
          sql: 'SELECT fcm_token FROM users WHERE phone = ?',
          args: [data.to]
        });
        const fcmToken = result.rows[0]?.fcm_token;
        if (fcmToken) {
          await admin.messaging().send({
            token: fcmToken,
            data: {
              type: 'INCOMING_CALL',
              callId: data.from + '-' + Date.now(), // Generate a unique call ID
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

  socket.on('answer-call', (data) => {
    const callerSockets = connectedUsers.get(data.to);
    if (callerSockets && callerSockets.size > 0) {
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

  socket.on('ice-candidate', (data) => {
    const targetSockets = connectedUsers.get(data.to);
    if (targetSockets && targetSockets.size > 0) {
      targetSockets.forEach((sId) => {
        io.to(sId).emit('ice-candidate', data.candidate);
      });
    }
  });

  socket.on('message', (data) => {
    // 1. Deliver to all active devices of target recipient
    const targetSockets = connectedUsers.get(data.targetUserId);
    if (targetSockets && targetSockets.size > 0) {
      targetSockets.forEach((sId) => {
        io.to(sId).emit('message', data);
      });
    }

    // 2. Multi-Device Companion Sync: mirror message to sender's OTHER devices (Mobile <-> Web <-> Desktop)
    const senderId = data.payload?.senderId || socket.userId;
    if (senderId && connectedUsers.has(senderId)) {
      connectedUsers.get(senderId).forEach((sId) => {
        if (sId !== socket.id) {
          io.to(sId).emit('message', data);
        }
      });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId && connectedUsers.has(socket.userId)) {
      const userSockets = connectedUsers.get(socket.userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        connectedUsers.delete(socket.userId);
      }
      console.log(`Socket ${socket.id} disconnected for user ${socket.userId}. Remaining devices: ${userSockets.size}`);
    } else {
      console.log('Unregistered socket disconnected:', socket.id);
    }
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
