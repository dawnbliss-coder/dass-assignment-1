const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEventById,
  getTrendingEvents,
  getMyEvents,
  updateEvent,
  changeEventStatus,
  getFormResponses
} = require('../controllers/eventController');
const { protect, organizer } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getEvents)
  .post(protect, organizer, createEvent);

router.get('/my', protect, organizer, getMyEvents);
router.get('/trending', getTrendingEvents);

// Update event (with editing rules)
router.put('/:id', protect, organizer, updateEvent);

// Change event status (Publish, Close, Mark Completed, etc.)
router.put('/:id/status', protect, organizer, changeEventStatus);

// Organizer: view form responses from participants
router.get('/:id/form-responses', protect, organizer, getFormResponses);

router.route('/:id').get(getEventById);

module.exports = router;