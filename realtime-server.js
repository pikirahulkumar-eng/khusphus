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
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string' 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
      : process.env.FIREBASE_SERVICE_ACCOUNT;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized for FCM from ENV');
  } else {
    console.warn('FCM disabled: firebase-service-account.json not found');
  }
} catch (e) {
  console.warn('firebase-admin module not available locally, running signaling server in dev mode');
}
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/env-info', (req, res) => {
  res.json({
    tursoUrl: process.env.TURSO_URL || process.env.TURSO_DATABASE_URL || 'NOT_SET',
    hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
    tokenPrefix: process.env.TURSO_AUTH_TOKEN ? process.env.TURSO_AUTH_TOKEN.substring(0, 20) + '...' : 'NOT_SET'
  });
});

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

// Load .env if present
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((line) => {
      const parts = line.trim().split('=');
      if (parts.length >= 2 && !parts[0].startsWith('#')) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (_) {}

// Initialize Database Client — connects to Khusphus DB
const DEFAULT_TURSO_URL = 'libsql://khusphus-khusphus.turso.io';
const DEFAULT_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg4OTA3MDIsImlkIjoiMDFhMDU1ZTMtYTMwMS03MzhhLTg3YjQtZGIyOWM0NTA5YzQxIiwia2lkIjoiYXV1RnlEbnFzdkV1Tnp6YzVsb2ltN2dJQTNvcExiSHlJa29UR3VfM2dPQSIsInJpZCI6Ijg4YTVhZWZlLWU0ZmQtNDZkMy05MGY0LWFmNDRiMmU3NmI2MyJ9.33neAHtCPg_xcyapPdZASKNHKsEUadkXMiCKpqKqJHUApAkgaQKkZSlxrI1JPAV6Q6StRz9e1YJUwV3t8E4MCA';

const DB_URL = process.env.TURSO_URL || process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_URL;
const DB_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_TOKEN;

console.log('[DB_CONFIG] Using Khusphus database:', DB_URL);
const turso = createClient({
  url: DB_URL,
  authToken: DB_AUTH_TOKEN,
});

// Initialize users and pending_messages tables on startup
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
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        sender_phone TEXT NOT NULL,
        receiver_phone TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        media_url TEXT,
        duration TEXT,
        status TEXT DEFAULT 'sent',
        created_at INTEGER NOT NULL
      )
    `);
    try {
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at)');
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_phone, status)');
    } catch (_) {}

    console.log('[DB] users, pending_messages & messages tables ready in Khusphus Database');
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
  let cleanPhone = String(phone).trim().replace(/\D/g, '');
  if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) {
    cleanPhone = cleanPhone.slice(2);
  }
  if (cleanPhone.length > 10) {
    cleanPhone = cleanPhone.slice(-10);
  }
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

// Search API Endpoint — queries Khusphus DB for registered user by phone number
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query || !query.trim()) return res.json([]);
  let q = query.trim().replace(/\D/g, '');
  if (q.length > 10 && q.startsWith('91')) {
    q = q.slice(2);
  }
  if (q.length > 10) {
    q = q.slice(-10);
  }
  if (q.length < 10) return res.json([]);

  try {
    const result = await turso.execute({
      sql: `SELECT userId, phone, name 
            FROM users 
            WHERE (phone = ? OR phone LIKE ?)
              AND phone NOT LIKE 'user_%' 
              AND phone NOT LIKE 'reg_%'
              AND phone NOT LIKE 'guest_%'
              AND phone NOT IN ('test_123', 'space_live_room')
            LIMIT 5`,
      args: [q, `%${q}%`]
    });
    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.json([]);
  }
});

// All Users Endpoint — loads real registered users from DB for chat list & live rail
app.get('/api/users', async (req, res) => {
  const { excludePhone } = req.query;
  let cleanExclude = excludePhone ? String(excludePhone).replace(/\D/g, '').slice(-10) : '';
  const dummyFilter = `
    AND phone NOT LIKE 'user_%' 
    AND phone NOT LIKE 'reg_%'
    AND phone NOT LIKE 'guest_%'
    AND phone NOT IN ('test_123', 'space_live_room')
  `;
  try {
    const result = await turso.execute({
      sql: cleanExclude 
        ? `SELECT userId, phone, name FROM users WHERE phone != ? ${dummyFilter} ORDER BY registered_at DESC LIMIT 50`
        : `SELECT userId, phone, name FROM users WHERE 1=1 ${dummyFilter} ORDER BY registered_at DESC LIMIT 50`,
      args: cleanExclude ? [cleanExclude] : []
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

// Canonical conversation thread ID helper (e.g. "1234567890_9837628163")
function getThreadId(phoneA, phoneB) {
  const cleanA = String(phoneA || '').replace(/\D/g, '').slice(-10);
  const cleanB = String(phoneB || '').replace(/\D/g, '').slice(-10);
  return [cleanA, cleanB].sort().join('_');
}

// Cloud Chat History Endpoint — loads permanent messages from Turso
app.get('/api/messages/history', async (req, res) => {
  const { myPhone, contactPhone, limit } = req.query;
  if (!myPhone || !contactPhone) {
    return res.status(400).json({ error: 'myPhone and contactPhone required' });
  }
  const threadId = getThreadId(myPhone, contactPhone);
  const max = Math.min(Number(limit) || 100, 500);
  try {
    const result = await turso.execute({
      sql: `SELECT id, sender_phone as senderId, receiver_phone as receiverId, 
                   text, type, media_url as audioUrl, duration, status, 
                   created_at as timestamp 
            FROM messages 
            WHERE thread_id = ? 
            ORDER BY created_at ASC 
            LIMIT ?`,
      args: [threadId, max]
    });
    res.json(result.rows);
  } catch (err) {
    console.error('[MESSAGES_HISTORY_ERR]', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Cloud Chat Backup / Sync Endpoint — bulk uploads local messages to Turso
app.post('/api/messages/sync', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.json({ success: true, synced: 0 });
  }
  let synced = 0;
  for (const m of messages) {
    if (!m.senderId || !m.receiverId) continue;
    const sPhone = String(m.senderId).replace(/\D/g, '').slice(-10);
    const rPhone = String(m.receiverId).replace(/\D/g, '').slice(-10);
    if (!sPhone || !rPhone) continue;
    const threadId = getThreadId(sPhone, rPhone);
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO messages (id, thread_id, sender_phone, receiver_phone, text, type, media_url, duration, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          String(m.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
          threadId,
          sPhone,
          rPhone,
          String(m.text || ''),
          m.type || 'text',
          m.audioUrl || m.mediaUrl || null,
          m.duration || null,
          m.status || 'sent',
          m.timestamp || Date.now()
        ]
      });
      synced++;
    } catch (_) {}
  }
  console.log(`[CLOUD_SYNC] Synced ${synced} messages to Turso Cloud`);
  res.json({ success: true, synced });
});

// Dynamic Carrier-Grade WebRTC ICE Servers Endpoint (Jio 5G / Airtel 4G NAT-optimized)
app.get('/api/ice-servers', (req, res) => {
  const customTurnUrl = process.env.TURN_URL;
  const customTurnUsername = process.env.TURN_USERNAME;
  const customTurnCredential = process.env.TURN_CREDENTIAL;

  const customServers = [];
  if (customTurnUrl && customTurnUsername && customTurnCredential) {
    customServers.push({
      urls: customTurnUrl.includes(',') ? customTurnUrl.split(',').map(s => s.trim()) : customTurnUrl.trim(),
      username: customTurnUsername.trim(),
      credential: customTurnCredential.trim()
    });
  }

  // Multi-port, multi-transport fallback pool engineered for Indian cellular Symmetric NAT
  const iceServers = [
    // Standard STUN pool
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    ...customServers,
    // Enterprise TURN relay pool: Port 80 (UDP/TCP), Port 443 (UDP/TCP), and TURNS (TLS)
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:80?transport=tcp',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:5349?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];

  res.json({
    iceServers,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all'
  });
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
  // 1. Direct match
  const direct = connectedUsers.get(targetId);
  if (direct && direct.size > 0) {
    return Array.from(direct);
  }
  // 2. Clean 10-digit phone match (strip country code, spaces, hyphens)
  const clean = String(targetId).replace(/\D/g, '').slice(-10);
  if (clean && clean.length >= 10) {
    const byClean = connectedUsers.get(clean);
    if (byClean && byClean.size > 0) {
      return Array.from(byClean);
    }
  }
  // 3. Try DB alias lookup (e.g. if targetId is a phone, find their userId, or vice versa)
  try {
    const res = await turso.execute({
      sql: 'SELECT userId, phone, phone_number FROM users WHERE userId = ? OR phone = ? OR phone = ? OR phone_number LIKE ? LIMIT 1',
      args: [targetId, targetId, clean, `%${clean}%`]
    });
    if (res.rows && res.rows.length > 0) {
      const row = res.rows[0];
      const candidates = [
        row.userId,
        row.phone,
        String(row.phone || '').replace(/\D/g, '').slice(-10),
        String(row.phone_number || '').replace(/\D/g, '').slice(-10)
      ].filter(Boolean);
      for (const candidate of candidates) {
        if (connectedUsers.has(candidate)) {
          return Array.from(connectedUsers.get(candidate));
        }
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
        let cleanPhone = String(phone).trim().replace(/\D/g, '');
        if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
        if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
        await turso.execute({
          sql: `INSERT INTO users (userId, phone, name)
                VALUES (?, ?, ?)
                ON CONFLICT(userId) DO UPDATE SET phone=excluded.phone, name=COALESCE(excluded.name, users.name)`,
          args: [userId, cleanPhone, (name || phone).trim()]
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
    if (phone) {
      mapId(phone);
      const cleanP = String(phone).replace(/\D/g, '').slice(-10);
      if (cleanP && cleanP !== phone) mapId(cleanP);
    }

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

    // 2. Cloud Backup to Turso Database (Permanent chat history across device re-installs)
    if (data?.type === 'CHAT_MESSAGE' && data.payload) {
      try {
        const p = data.payload;
        const sPhone = String(p.senderPhone || p.senderId || socket.userPhone || senderId || '').replace(/\D/g, '').slice(-10);
        const rPhone = String(p.receiverPhone || p.receiverId || targetUserId || '').replace(/\D/g, '').slice(-10);
        if (sPhone && rPhone) {
          const threadId = getThreadId(sPhone, rPhone);
          const msgId = p.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          await turso.execute({
            sql: `INSERT OR REPLACE INTO messages (id, thread_id, sender_phone, receiver_phone, text, type, media_url, duration, status, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              String(msgId),
              threadId,
              sPhone,
              rPhone,
              String(p.text || ''),
              p.type || 'text',
              p.audioUrl || p.mediaUrl || null,
              p.duration || null,
              p.status || 'sent',
              p.timestamp || Date.now()
            ]
          });
          console.log(`[CLOUD_BACKUP] Saved message ${msgId} to Turso thread ${threadId}`);
        }
      } catch (backupErr) {
        console.error('[CLOUD_BACKUP_ERR]', backupErr);
      }
    } else if (data?.type === 'MESSAGE_DELIVERED' && data.payload) {
      try {
        const msgId = data.payload.messageId || data.payload.id;
        if (msgId) {
          await turso.execute({
            sql: "UPDATE messages SET status = 'delivered' WHERE id = ? AND status = 'sent'",
            args: [String(msgId)]
          });
        }
      } catch (_) {}
    } else if ((data?.type === 'MESSAGE_READ' || data?.type === 'CHAT_READ_SYNC') && data.payload) {
      try {
        const reader = String(data.payload.readerPhone || data.payload.senderId || '').replace(/\D/g, '').slice(-10);
        const contact = String(data.payload.contactPhone || data.payload.receiverId || '').replace(/\D/g, '').slice(-10);
        if (reader && contact) {
          const threadId = getThreadId(reader, contact);
          await turso.execute({
            sql: "UPDATE messages SET status = 'read' WHERE thread_id = ? AND receiver_phone = ?",
            args: [threadId, reader]
          });
        }
      } catch (_) {}
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
