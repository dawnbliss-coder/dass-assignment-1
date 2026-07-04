const express = require('express');
const router = express.Router();
const {
  getForumMessages,
  postMessage,
  togglePinMessage,
  deleteMessage,
  reactToMessage
} = require('../controllers/forumController');
const { protect } = require('../middleware/authMiddleware');

// PUT /api/forum/pin/:id          - toggle pin (organizer)
router.put('/pin/:id', protect, togglePinMessage);

// POST /api/forum/react/:id       - add/remove reaction
router.post('/react/:id', protect, reactToMessage);

// DELETE /api/forum/:id           - delete message
router.delete('/:id', protect, deleteMessage);

// GET  /api/forum/:eventId        - fetch all messages for an event
router.get('/:eventId', protect, getForumMessages);

// POST /api/forum/:eventId        - post a new message (REST fallback)
router.post('/:eventId', protect, postMessage);

module.exports = router;