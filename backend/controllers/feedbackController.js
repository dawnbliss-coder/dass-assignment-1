const Feedback = require('../models/Feedback');

// 1. Submit Feedback (Participant)
exports.submitFeedback = async (req, res) => {
  const { eventId, rating, comment } = req.body;
  const feedback = await Feedback.create({ event: eventId, rating, comment });
  res.status(201).json(feedback);
};

// 2. View Aggregated Stats (Organizer)
exports.getEventStats = async (req, res) => {
  const feedbacks = await Feedback.find({ event: req.params.eventId });
  
  const total = feedbacks.length;
  const avgRating = total > 0 
    ? feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / total 
    : 0;

  res.json({
    event: req.params.eventId,
    totalFeedback: total,
    averageRating: avgRating.toFixed(1),
    allFeedback: feedbacks
  });
};