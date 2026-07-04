const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Registration = require('../models/Registration');
const crypto = require('crypto');

// @desc    Create a new organizer/club (Section 11.2 & 12.1)
// @route   POST /api/admin/organizers
// @access  Private (Admin only)
const createOrganizer = asyncHandler(async (req, res) => {
  const { organizerName, email, category, description, contactNumber } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Section 11.2: System auto-generates credentials
  const tempPassword = crypto.randomBytes(4).toString('hex');

  const organizer = await User.create({
    organizerName,
    email,
    password: tempPassword, 
    role: 'organizer', 
    category,
    description,
    contactNumber,
  });

  if (organizer) {
    res.status(201).json({
      _id: organizer._id,
      organizerName: organizer.organizerName,
      email: organizer.email,
      tempPassword: tempPassword,
      message: "Organizer created successfully. Share the password manually."
    });
  } else {
    res.status(400);
    throw new Error('Invalid organizer data');
  }
});

// @desc    Get all registrations platform-wide (Section 12.2)
// @route   GET /api/admin/registrations
// @access  Private (Admin only)
const getAllRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.find({})
    .populate('event', 'name organizer eventType')
    .populate('user', 'firstName lastName email participantType');

  res.json({
    count: registrations.length,
    registrations
  });
});

// @desc    Get all users list (Section 11.2)
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

// @desc    Remove/Delete Club or Organizer (Section 11.2)
// @route   DELETE /api/admin/organizers/:id
// @access  Private (Admin only)
const deleteOrganizer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user && user.role === 'organizer') {
    // Note: You might want to archive rather than delete in a real app
    // but for the assignment, we will perform a deletion.
    await user.deleteOne();
    res.json({ message: 'Organizer account permanently removed' });
  } else {
    res.status(404);
    throw new Error('Organizer not found or user is not an organizer');
  }
});

// @desc    Get all organizers who requested a password reset (Tier B)
// @route   GET /api/admin/reset-requests
const getResetRequests = asyncHandler(async (req, res) => {
  // Fetch users with resetRequest true and include their history
  const users = await User.find({ resetRequest: true })
    .select('firstName lastName email resetHistory');
  res.json(users);
});

// @desc    Admin handle reset (Approve/Reject) (Tier B - Feature 2)
// @route   PUT /api/admin/handle-reset/:id
const adminResetPassword = asyncHandler(async (req, res) => {
  const { action, comment } = req.body; // action: 'Approve' or 'Reject'
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (action === 'Approve') {
    // 1. Auto-generate new password (Tier B requirement)
    const newPassword = crypto.randomBytes(4).toString('hex'); 
    
    user.password = newPassword;
    user.resetRequest = false;
    user.resetHistory.push({
      action: 'Approved',
      adminComment: comment || 'Password reset approved by admin'
    });

    await user.save();
    res.json({ 
      message: `Password for ${user.email} reset successfully`, 
      newPassword: newPassword // Admin shares this with organizer
    });

  } else if (action === 'Reject') {
    user.resetRequest = false;
    user.resetHistory.push({
      action: 'Rejected',
      adminComment: comment || 'Request denied by admin'
    });

    await user.save();
    res.json({ message: 'Password reset request rejected' });
  }
});

module.exports = { 
  createOrganizer, 
  getAllRegistrations, 
  getAllUsers, 
  deleteOrganizer,
  getResetRequests,
  adminResetPassword
};