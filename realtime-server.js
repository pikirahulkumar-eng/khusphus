const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@libsql/client');
const cors = require('cors');

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

  socket.on('register', async (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
    
    // Example: You can now save registered users to Turso SQLite
    try {
       // await turso.execute('INSERT OR IGNORE INTO users (id, socket_id) VALUES (?, ?)', [userId, socket.id]);
    } catch (e) {
       console.log('Turso DB not fully configured yet for insertion.');
    }
  });

  socket.on('call-user', (data) => {
    const receiverSocketId = connectedUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming-call', {
        from: data.from,
        offer: data.offer,
        isVideo: data.isVideo
      });
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
