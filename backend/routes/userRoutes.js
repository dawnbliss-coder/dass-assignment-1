const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  authUser, 
  updateUserProfile,
  requestPasswordReset,
  getUserProfile 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', registerUser);
router.post('/login', authUser);

// Tier B: Password reset request (Public)
// POST /api/users/request-reset
router.post('/request-reset', requestPasswordReset);

// Get user profile
router.get('/profile', protect, getUserProfile);

router.put('/profile', protect, updateUserProfile);

module.exports = router;
