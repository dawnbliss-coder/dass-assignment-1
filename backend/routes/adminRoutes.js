const express = require('express');
const router = express.Router();
const { 
  createOrganizer, 
  getAllRegistrations, 
  getAllUsers,
  deleteOrganizer,
  getResetRequests,
  adminResetPassword
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/organizers', protect, admin, createOrganizer);
router.get('/registrations', protect, admin, getAllRegistrations);
router.get('/users', protect, admin, getAllUsers);
router.delete('/organizers/:id', protect, admin, deleteOrganizer);

// Tier B: View and Handle Password Resets
router.get('/reset-requests', protect, admin, getResetRequests);
router.put('/handle-reset/:id', protect, admin, adminResetPassword);

module.exports = router;