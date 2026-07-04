const express = require('express');
const router = express.Router();
const { submitFeedback, getEventStats } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', submitFeedback); // Participants submit here
router.get('/stats/:eventId', protect, getEventStats); // Organizers view here

module.exports = router;