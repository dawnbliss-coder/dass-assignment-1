const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  isAnnouncement: { type: Boolean, default: false }, // For Organizers
  isPinned: { type: Boolean, default: false },       // Moderation
  parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, // Threading
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }]
}, { timestamps: true });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);