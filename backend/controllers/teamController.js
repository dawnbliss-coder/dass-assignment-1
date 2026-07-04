const asyncHandler = require('express-async-handler');
const Team = require('../models/Team');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { sendRegistrationEmail } = require('../utils/emailService');

// @desc    Create a new team for a hackathon event
// @route   POST /api/teams
const createTeam = asyncHandler(async (req, res) => {
  const { eventId, teamName, maxSize, paymentProofImage } = req.body;
  const event = await Event.findById(eventId);

  if (!event) { res.status(404); throw new Error('Event not found'); }
  if (event.eventType !== 'Hackathon') { res.status(400); throw new Error('This event does not support team registration'); }
  if (new Date() > new Date(event.registrationDeadline)) { res.status(400); throw new Error('Registration deadline has passed'); }

  const isPaidHackathon = Number(event.registrationFee) > 0;
  if (isPaidHackathon && !paymentProofImage) {
    res.status(400); throw new Error('Please upload payment proof to create a team for this paid hackathon');
  }

  // Check if user already has a team for this event
  const existingTeam = await Team.findOne({
    event: eventId,
    $or: [
      { leader: req.user._id },
      { 'members.user': req.user._id, 'members.status': 'Accepted' }
    ]
  });
  if (existingTeam) { res.status(400); throw new Error('You already have a team for this event'); }

  const inviteCode = uuidv4().substring(0, 8).toUpperCase();

  const team = await Team.create({
    event: eventId,
    name: teamName,
    leader: req.user._id,
    maxSize: maxSize || event.teamSize || 4,
    inviteCode,
    members: [],
    status: 'Forming',
    paymentProofImage: paymentProofImage || ''
  });

  res.status(201).json(team);
});

// @desc    Get team details for a specific event (for the current user)
// @route   GET /api/teams/my/:eventId
const getMyTeam = asyncHandler(async (req, res) => {
  const team = await Team.findOne({
    event: req.params.eventId,
    $or: [
      { leader: req.user._id },
      { 'members.user': req.user._id }
    ]
  })
    .populate('leader', 'firstName lastName email')
    .populate('members.user', 'firstName lastName email');

  if (!team) { res.status(404); throw new Error('No team found for this event'); }
  res.json(team);
});

// @desc    Join a team using invite code
// @route   POST /api/teams/join
const joinTeam = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;

  const team = await Team.findOne({ inviteCode })
    .populate('leader', 'firstName lastName email')
    .populate('members.user', 'firstName lastName email');

  if (!team) { res.status(404); throw new Error('Invalid invite code'); }
  if (team.status !== 'Forming') { res.status(400); throw new Error('This team is no longer accepting members'); }

  const event = await Event.findById(team.event);
  if (new Date() > new Date(event.registrationDeadline)) { res.status(400); throw new Error('Registration deadline has passed'); }

  // Check if user is already in a team for this event
  const existingTeam = await Team.findOne({
    event: team.event,
    $or: [
      { leader: req.user._id },
      { 'members.user': req.user._id, 'members.status': { $in: ['Pending', 'Accepted'] } }
    ]
  });
  if (existingTeam) { res.status(400); throw new Error('You already belong to a team for this event'); }

  // Check if team is full (count leader + accepted members)
  const acceptedCount = team.members.filter(m => m.status === 'Accepted').length + 1; // +1 for leader
  if (acceptedCount >= team.maxSize) { res.status(400); throw new Error('Team is already full'); }

  // Add user as pending member
  team.members.push({ user: req.user._id, status: 'Pending' });
  await team.save();

  res.json({ message: 'Join request sent. Waiting for team leader to confirm.', team });
});

// @desc    Leader accepts or declines a pending member
// @route   PUT /api/teams/:teamId/members/:userId
const handleMemberRequest = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'Accept' or 'Decline'
  const team = await Team.findById(req.params.teamId);

  if (!team) { res.status(404); throw new Error('Team not found'); }
  if (team.leader.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Only the team leader can manage members'); }

  const member = team.members.find(m => m.user.toString() === req.params.userId);
  if (!member) { res.status(404); throw new Error('Member not found'); }

  if (action === 'Accept') {
    // Check capacity before accepting
    const acceptedCount = team.members.filter(m => m.status === 'Accepted').length + 1;
    if (acceptedCount >= team.maxSize) { res.status(400); throw new Error('Team is already full'); }
    member.status = 'Accepted';
    member.joinedAt = new Date();
  } else if (action === 'Decline') {
    member.status = 'Declined';
  }

  // Check if team is now complete
  const acceptedMembers = team.members.filter(m => m.status === 'Accepted');
  if ((acceptedMembers.length + 1) === team.maxSize) { // +1 for leader
    team.status = 'Complete';
    await team.save();
    // Auto-generate registrations for all members
    await generateTeamRegistrations(team);
  } else {
    await team.save();
  }

  await team.populate('leader', 'firstName lastName email');
  await team.populate('members.user', 'firstName lastName email');
  res.json(team);
});

// @desc    Leader removes a member from team
// @route   DELETE /api/teams/:teamId/members/:userId
const removeMember = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId);
  if (!team) { res.status(404); throw new Error('Team not found'); }
  if (team.leader.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Only the team leader can remove members'); }
  if (team.status === 'Complete') { res.status(400); throw new Error('Cannot modify a completed team'); }

  team.members = team.members.filter(m => m.user.toString() !== req.params.userId);
  await team.save();
  res.json({ message: 'Member removed', team });
});

// @desc    Get all teams for an event (organizer view)
// @route   GET /api/teams/event/:eventId
const getEventTeams = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event || event.organizer.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Not authorized');
  }

  const teams = await Team.find({ event: req.params.eventId })
    .populate('leader', 'firstName lastName email')
    .populate('members.user', 'firstName lastName email');

  res.json(teams);
});

// @desc    Get team by invite code (for previewing before joining)
// @route   GET /api/teams/invite/:code
const getTeamByInviteCode = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ inviteCode: req.params.code })
    .populate('leader', 'firstName lastName')
    .populate('event', 'name registrationDeadline');

  if (!team) { res.status(404); throw new Error('Invalid invite code'); }

  // Return safe info only
  res.json({
    teamName: team.name,
    leaderName: `${team.leader.firstName} ${team.leader.lastName}`,
    eventName: team.event.name,
    maxSize: team.maxSize,
    currentSize: team.members.filter(m => m.status === 'Accepted').length + 1,
    status: team.status
  });
});

// Internal helper — generates Registration documents for all team members when team is complete
const generateTeamRegistrations = async (team) => {
  const event = await Event.findById(team.event);
  const needsApproval = Number(event.registrationFee) > 0;
  const allMemberIds = [team.leader, ...team.members.filter(m => m.status === 'Accepted').map(m => m.user)];

  const registrationIds = [];

  for (const userId of allMemberIds) {
    const user = await User.findById(userId);
    const ticketId = `TIC-${uuidv4().substring(0, 8).toUpperCase()}`;

    const reg = await Registration.create({
      event: team.event,
      user: userId,
      ticketId,
      status: needsApproval ? 'Pending Approval' : 'Registered',
      paymentProofImage: needsApproval ? (team.paymentProofImage || '') : '',
      formResponses: [{ label: 'Team Name', value: team.name }]
    });

    registrationIds.push(reg._id);

    // Only send ticket email immediately for free hackathons
    if (!needsApproval) {
      try {
        await sendRegistrationEmail(user, event, reg);
      } catch (e) {
        console.error(`Failed to send email to ${user.email}:`, e.message);
      }
    }
  }

  team.registrationIds = registrationIds;
  await team.save();
};

module.exports = {
  createTeam,
  getMyTeam,
  joinTeam,
  handleMemberRequest,
  removeMember,
  getEventTeams,
  getTeamByInviteCode
};