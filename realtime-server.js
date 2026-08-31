const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@libsql/client');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');

if (fs.existsSync('./firebase-service-account.json')) {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin Initialized for FCM');
} else {
  console.warn('FCM disabled: firebase-service-account.json not found');
}
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Turso SQLite Client securely using Environment Variables
const turso = createClient({
  url: process.env.TURSO_URL || 'libsql://dummy.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'dummy-token',
});

// Search API Endpoint
app.get('/api/search', async (req, res) => {
  const { query } = req.query; console.log('Search request received for:', query);
  if (!query) return res.json([]);

  try {
    // Search by phone or name (partial match)
    const result = await turso.execute({
      sql: 'SELECT phone, name FROM users WHERE phone LIKE ? OR name LIKE ?',
      args: [`%${query}%`, `%${query}%`]
    });
    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('register', async (data) => {
    // data can be just userId string (legacy) or object { userId, fcmToken }
    const userId = typeof data === 'string' ? data : data.userId;
    const fcmToken = typeof data === 'string' ? null : data.fcmToken;
    
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
    
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
    const receiverSocketId = connectedUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming-call', {
        from: data.from,
        offer: data.offer,
        isVideo: data.isVideo
      });
    }

    // Always attempt to send an FCM push to wake up the device (or if offline)
    try {
      if (admin.apps.length > 0) {
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
    const callerSocketId = connectedUsers.get(data.to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-answered', {
        answer: data.answer
      });
    }
  });

  socket.on('ice-candidate', (data) => {
    const targetSocketId = connectedUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', data.candidate);
    }
  });

  socket.on('message', (data) => {
    const targetSocketId = connectedUsers.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('message', data);
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`KhusPhus Signaling Server running on port ${PORT}`);
});
