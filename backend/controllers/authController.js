const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      participantType: user.participantType,
      collegeName: user.collegeName,
      interests: user.interests || [],
      followedOrganizers: user.followedOrganizers || [],
      organizerName: user.organizerName,
      category: user.category,
      description: user.description,
      contactEmail: user.contactEmail,
      discordWebhook: user.discordWebhook,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, contactNumber, participantType, collegeName, interests } = req.body;

  const iiitEmailPattern = /@([a-zA-Z0-9-]+\.)*iiit\.ac\.in$/;
  if (participantType === 'IIIT' && !iiitEmailPattern.test(email)) {
    res.status(400);
    throw new Error('IIIT Participants must register with a @iiit.ac.in email (subdomains like @students.iiit.ac.in are allowed)');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: 'participant',
    contactNumber,
    participantType,
    collegeName,
    interests: interests || []
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      participantType: user.participantType,
      collegeName: user.collegeName,
      interests: user.interests || [],
      followedOrganizers: user.followedOrganizers || [],
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Update Profile
// @route   PUT /api/users/profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // ── Shared fields ────────────────────────────────────────────────────────
  if (req.body.firstName     !== undefined) user.firstName     = req.body.firstName;
  if (req.body.lastName      !== undefined) user.lastName      = req.body.lastName;
  if (req.body.contactNumber !== undefined) user.contactNumber = req.body.contactNumber;
  if (req.body.interests     !== undefined) user.interests     = req.body.interests;

  // ── Participant-specific ─────────────────────────────────────────────────
  if (req.body.collegeName   !== undefined) user.collegeName   = req.body.collegeName;

  // ── Organizer-specific ───────────────────────────────────────────────────
  if (req.body.organizerName !== undefined) user.organizerName = req.body.organizerName;
  if (req.body.category      !== undefined) user.category      = req.body.category;
  if (req.body.description   !== undefined) user.description   = req.body.description;
  if (req.body.contactEmail  !== undefined) user.contactEmail  = req.body.contactEmail;
  if (req.body.discordWebhook !== undefined) {
    user.discordWebhook = req.body.discordWebhook;
  }

  if (req.body.password) {
    user.password = req.body.password;
  }

  const saved = await user.save();

  res.json({ message: 'Profile updated successfully' });
});

// @desc    Request password reset from Admin (Tier B)
// @route   POST /api/users/request-reset
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email, reason } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    user.resetRequest = true;
    user.resetHistory.push({
      action: 'Requested',
      adminComment: reason || 'No reason provided',
      date: new Date()
    });
    await user.save();
    res.json({ message: 'Reset request sent to Admin successfully' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = { authUser, registerUser, updateUserProfile, requestPasswordReset, getUserProfile };