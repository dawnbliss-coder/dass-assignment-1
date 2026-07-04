const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

// @desc    Get all messages for an event forum (with pagination)
// @route   GET /api/forum/:eventId
const getForumMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const messages = await Message.find({ event: req.params.eventId })
    .populate('user', 'firstName lastName role organizerName')
    .populate({
      path: 'parentMessage',
      populate: { path: 'user', select: 'firstName lastName role organizerName' }
    })
    .sort({ isPinned: -1, createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json(messages);
});

// @desc    Post a message to the forum (REST fallback — primary is via Socket.io)
// @route   POST /api/forum/:eventId
const postMessage = asyncHandler(async (req, res) => {
  const { text, parentMessageId, isAnnouncement } = req.body;
  const event = await Event.findById(req.params.eventId);

  if (!event) { res.status(404); throw new Error('Event not found'); }

  // Only registered participants OR the organizer can post
  if (req.user.role === 'participant') {
    const reg = await Registration.findOne({
      event: req.params.eventId,
      user: req.user._id,
      status: { $in: ['Registered', 'Attended'] }
    });
    if (!reg) { res.status(403); throw new Error('Only registered participants can post in this forum'); }
  }

  // Only organizer can post announcements
  if (isAnnouncement && req.user.role !== 'organizer') {
    res.status(403); throw new Error('Only organizers can post announcements');
  }

  const message = await Message.create({
    event: req.params.eventId,
    user: req.user._id,
    text,
    parentMessage: parentMessageId || null,
    isAnnouncement: isAnnouncement && req.user.role === 'organizer'
  });

  await message.populate('user', 'firstName lastName role organizerName');

  res.status(201).json(message);
});

// @desc    Toggle pin on a message (organizer only)
// @route   PUT /api/forum/pin/:id
const togglePinMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) { res.status(404); throw new Error('Message not found'); }

  const event = await Event.findById(message.event);
  if (!event || event.organizer.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Only the event organizer can pin messages');
  }

  message.isPinned = !message.isPinned;
  await message.save();
  res.json({ message: message.isPinned ? 'Message pinned' : 'Message unpinned', data: message });
});

// @desc    Delete a message (organizer can delete any; participant can delete their own)
// @route   DELETE /api/forum/:id
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id).populate('event');
  if (!message) { res.status(404); throw new Error('Message not found'); }

  const isOwner = message.user.toString() === req.user._id.toString();
  const isOrganizer = req.user.role === 'organizer' &&
    message.event.organizer.toString() === req.user._id.toString();

  if (!isOwner && !isOrganizer) {
    res.status(403); throw new Error('Not authorized to delete this message');
  }

  await message.deleteOne();
  res.json({ message: 'Message deleted', id: req.params.id });
});

// @desc    Add/remove a reaction to a message
// @route   POST /api/forum/react/:id
const reactToMessage = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const message = await Message.findById(req.params.id);
  if (!message) { res.status(404); throw new Error('Message not found'); }

  const existingReaction = message.reactions.find(r => r.emoji === emoji);

  if (existingReaction) {
    const alreadyReacted = existingReaction.users.some(
      uid => uid.toString() === req.user._id.toString()
    );
    if (alreadyReacted) {
      // Remove reaction
      existingReaction.users = existingReaction.users.filter(
        uid => uid.toString() !== req.user._id.toString()
      );
      if (existingReaction.users.length === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      existingReaction.users.push(req.user._id);
    }
  } else {
    message.reactions.push({ emoji, users: [req.user._id] });
  }

  await message.save();
  await message.populate('user', 'firstName lastName role organizerName');
  res.json(message);
});

module.exports = { getForumMessages, postMessage, togglePinMessage, deleteMessage, reactToMessage };