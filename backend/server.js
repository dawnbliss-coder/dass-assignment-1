const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const Message = require('./models/Message');
const User = require('./models/User');
const Registration = require('./models/Registration');
const Event = require('./models/Event');
const jwt = require('jsonwebtoken');

// Route Imports
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const forumRoutes = require('./routes/forumRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const teamRoutes = require('./routes/teamRoutes'); // NEW: Hackathon teams

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' })); // increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route Mapping
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/teams', teamRoutes); // NEW

// ─── SOCKET.IO: Real-Time Discussion Forum ────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Authenticate socket user via token
  const token = socket.handshake.auth?.token;
  let socketUser = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // We'll fetch user info per message to keep this lightweight
      socket.userId = decoded.id;
    } catch (e) {
      console.log('Socket auth failed:', e.message);
    }
  }

  // Join an event's forum room
  socket.on('join_event_forum', (eventId) => {
    socket.join(eventId);
    console.log(`Socket ${socket.id} joined forum room: ${eventId}`);
  });

  socket.on('leave_event_forum', (eventId) => {
    socket.leave(eventId);
  });

  // Send a message to the forum
  socket.on('send_message', async (data) => {
    // data: { eventId, text, parentMessageId? }
    try {
      if (!socket.userId) {
        socket.emit('forum_error', { message: 'Not authenticated' });
        return;
      }

      const user = await User.findById(socket.userId).select('firstName lastName role organizerName');
      if (!user) {
        socket.emit('forum_error', { message: 'User not found' });
        return;
      }

      // For participants: verify they are registered for the event
      if (user.role === 'participant') {
        const reg = await Registration.findOne({
          event: data.eventId,
          user: socket.userId,
          status: { $in: ['Registered', 'Attended'] }
        });
        if (!reg) {
          socket.emit('forum_error', { message: 'Only registered participants can post in this forum' });
          return;
        }
      }

      const newMessage = await Message.create({
        event: data.eventId,
        user: socket.userId,
        text: data.text,
        parentMessage: data.parentMessageId || null,
        isAnnouncement: data.isAnnouncement && user.role === 'organizer'
      });

      // Populate before broadcasting
      await newMessage.populate('user', 'firstName lastName role organizerName');
      if (newMessage.parentMessage) {
        await newMessage.populate({
          path: 'parentMessage',
          populate: { path: 'user', select: 'firstName lastName role organizerName' }
        });
      }

      // Broadcast to everyone in the room (including sender)
      io.to(data.eventId).emit('receive_message', newMessage);

    } catch (error) {
      console.error('Socket send_message error:', error.message);
      socket.emit('forum_error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing_start', (data) => {
    socket.to(data.eventId).emit('user_typing', {
      userId: socket.userId,
      name: data.name
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.eventId).emit('user_stop_typing', { userId: socket.userId });
  });

  // Real-time pin/delete (organizer actions)
  socket.on('pin_message', async (data) => {
    // data: { messageId, eventId }
    try {
      const msg = await Message.findById(data.messageId);
      if (msg) {
        msg.isPinned = !msg.isPinned;
        await msg.save();
        io.to(data.eventId).emit('message_pinned', { messageId: data.messageId, isPinned: msg.isPinned });
      }
    } catch (e) {
      console.error('Socket pin_message error:', e.message);
    }
  });

  socket.on('delete_message', async (data) => {
    // data: { messageId, eventId }
    try {
      await Message.findByIdAndDelete(data.messageId);
      io.to(data.eventId).emit('message_deleted', { messageId: data.messageId });
    } catch (e) {
      console.error('Socket delete_message error:', e.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));