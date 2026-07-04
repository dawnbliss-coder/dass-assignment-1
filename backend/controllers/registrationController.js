const asyncHandler = require('express-async-handler');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { Parser } = require('json2csv');
const { sendRegistrationEmail, sendPaymentApprovalEmail, generateQRCode } = require('../utils/emailService');

// @desc    Register for an event
// @route   POST /api/registrations
const registerForEvent = asyncHandler(async (req, res) => {
  const { eventId, formResponses, merchandiseSelection } = req.body;
  const event = await Event.findById(eventId);

  if (!event) { res.status(404); throw new Error('Event not found'); }

  if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
    res.status(400); throw new Error('Registration deadline has passed');
  }

  if (event.registrationLimit > 0) {
    const count = await Registration.countDocuments({
      event: eventId,
      status: { $in: ['Registered', 'Attended'] }
    });
    if (count >= event.registrationLimit) {
      res.status(400); throw new Error('Event is full');
    }
  }

  const existing = await Registration.findOne({
    event: eventId,
    user: req.user._id,
    status: { $nin: ['Cancelled', 'Rejected'] }
  });
  if (existing) {
    res.status(400); throw new Error('You are already registered for this event');
  }

  if (event.eventType === 'Merchandise' && merchandiseSelection) {
    for (const item of merchandiseSelection) {
      const dbItem = event.merchandiseItems.find(i => i.name === item.itemId);
      if (!dbItem || dbItem.stock < item.quantity) {
        res.status(400); throw new Error(`Out of stock: ${item.itemId}`);
      }
      dbItem.stock -= item.quantity;
    }
    await event.save();
  }

  // Needs approval if: Merchandise event OR any event with a fee > 0
  const needsApproval = event.eventType === 'Merchandise' || Number(event.registrationFee) > 0;
  console.log('🔍 Event type:', event.eventType);
  console.log('🔍 Registration fee:', event.registrationFee, typeof event.registrationFee);
  console.log('🔍 needsApproval:', needsApproval);
  console.log('🔍 paymentProofImage received:', !!req.body.paymentProofImage);
  
  const registration = await Registration.create({
    event: eventId,
    user: req.user._id,
    ticketId: `TIC-${uuidv4().substring(0, 8).toUpperCase()}`,
    formResponses,
    merchandiseSelection,
    status: needsApproval ? 'Pending Approval' : 'Registered',
    paymentProofImage: req.body.paymentProofImage || ""
  });

  if (event.eventType === 'Normal' && !event.formLocked) {
    event.formLocked = true;
    await event.save();
  }

  const user = await User.findById(req.user._id);
  // Only send ticket email immediately for free events
  if (!needsApproval) {
    await sendRegistrationEmail(user, event, registration);
  }

  res.status(201).json(registration);
});

// @desc    Participant Dashboard
// @route   GET /api/registrations/my
const getMyRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.find({ user: req.user._id })
    .populate({
      path: 'event',
      select: 'name startDate endDate location eventType organizer registrationFee',
      populate: { path: 'organizer', select: 'firstName organizerName' }
    });

  const now = new Date();

  const dashboard = {
    upcoming: registrations.filter(r =>
      r.status === 'Registered' &&
      r.event?.startDate &&
      new Date(r.event.startDate) > now
    ),
    pending: registrations.filter(r => r.status === 'Pending Approval'),
    history: {
      normal: registrations.filter(r =>
        r.event?.eventType === 'Normal' &&
        (r.status === 'Registered' || r.status === 'Attended')
      ),
      merchandise: registrations.filter(r =>
        r.event?.eventType === 'Merchandise' &&
        (r.status === 'Registered' || r.status === 'Attended')
      ),
      completed: registrations.filter(r =>
        (r.status === 'Registered' || r.status === 'Attended') &&
        r.event?.endDate &&
        new Date(r.event.endDate) < now
      ),
      cancelled: registrations.filter(r =>
        r.status === 'Cancelled' || r.status === 'Rejected'
      )
    }
  };

  res.json(dashboard);
});

// @desc    Cancel Registration
// @route   PUT /api/registrations/:id/cancel
const cancelRegistration = asyncHandler(async (req, res) => {
  const reg = await Registration.findById(req.params.id);
  if (!reg || reg.user.toString() !== req.user._id.toString()) {
    res.status(404); throw new Error('Registration not found');
  }

  const event = await Event.findById(reg.event);
  if (event.eventType === 'Merchandise') {
    reg.merchandiseSelection.forEach(sel => {
      const item = event.merchandiseItems.find(i => i.name === sel.itemId);
      if (item) item.stock += sel.quantity;
    });
    await event.save();
  }

  reg.status = 'Cancelled';
  await reg.save();
  res.json({ message: 'Cancelled successfully' });
});

// @desc    Follow/Unfollow Club
// @route   POST /api/registrations/follow/:clubId
const toggleFollowClub = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const clubId = req.params.clubId;
  const mongoose = require('mongoose');
  const clubObjectId = new mongoose.Types.ObjectId(clubId);

  const isFollowing = user.followedOrganizers.some(id => id.toString() === clubId);
  if (isFollowing) {
    user.followedOrganizers = user.followedOrganizers.filter(id => id.toString() !== clubId);
  } else {
    user.followedOrganizers.push(clubObjectId);
  }

  await user.save();
  res.json({
    message: isFollowing ? 'Unfollowed' : 'Followed',
    followedOrganizers: user.followedOrganizers
  });
});

// @desc    Organizer: View Participant List
// @route   GET /api/registrations/event/:eventId
const getEventParticipants = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event || event.organizer.toString() !== req.user._id.toString()) {
    res.status(401); throw new Error('Not authorized to view this list');
  }

  const list = await Registration.find({
    event: req.params.eventId,
    status: { $in: ['Registered', 'Pending Approval', 'Attended'] }
  }).populate('user', 'firstName lastName email contactNumber participantType');

  res.json(list);
});

// @desc    Export participants to CSV
// @route   GET /api/registrations/event/:eventId/export
const exportParticipants = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event || event.organizer.toString() !== req.user._id.toString()) {
    res.status(401); throw new Error('Not authorized to export this list');
  }

  const registrations = await Registration.find({
    event: req.params.eventId,
    status: { $in: ['Registered', 'Attended'] }
  }).populate('user', 'firstName lastName email contactNumber');

  if (registrations.length === 0) {
    res.status(400); throw new Error('No participants to export');
  }

  const csvData = registrations.map(reg => ({
    TicketID: reg.ticketId,
    FirstName: reg.user.firstName,
    LastName: reg.user.lastName,
    Email: reg.user.email,
    Phone: reg.user.contactNumber,
    RegistrationDate: reg.createdAt.toISOString().split('T')[0],
    Status: reg.status,
    AttendanceTime: reg.attendanceTime ? reg.attendanceTime.toISOString() : ''
  }));

  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(csvData);

  res.header('Content-Type', 'text/csv');
  res.attachment(`${event.name.replace(/\s+/g, '_')}_Participants.csv`);
  res.status(200).send(csv);
});

// @desc    Get event analytics and stats
// @route   GET /api/registrations/event/:eventId/stats
const getEventStats = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event || event.organizer.toString() !== req.user._id.toString()) {
    res.status(401); throw new Error('Not authorized to view stats');
  }

  const registrations = await Registration.find({ event: req.params.eventId })
    .populate('user', 'participantType');

  const activeRegs = registrations.filter(r => ['Registered', 'Attended'].includes(r.status));

  const stats = {
    totalRegistrations: registrations.length,
    activeCount: registrations.filter(r => r.status === 'Registered').length,
    attendedCount: registrations.filter(r => r.status === 'Attended').length,
    cancelledCount: registrations.filter(r => r.status === 'Cancelled').length,
    pendingCount: registrations.filter(r => r.status === 'Pending Approval').length,
    demographics: {
      iiitStudents: activeRegs.filter(r => r.user?.participantType === 'IIIT').length,
      others: activeRegs.filter(r => r.user?.participantType === 'Non-IIIT').length
    },
    revenue: activeRegs.length * (event.registrationFee || 0)
  };

  if (event.eventType === 'Merchandise') {
    stats.inventory = event.merchandiseItems.map(item => ({
      itemName: item.name,
      currentStock: item.stock,
      sold: activeRegs.filter(r =>
        r.merchandiseSelection?.some(s => s.itemId === item.name)
      ).length
    }));
  }

  res.json(stats);
});

// @desc    Organizer: Approve/Reject Payment (works for ALL paid event types)
// @route   PUT /api/registrations/:id/verify-payment
const verifyMerchandisePayment = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const registration = await Registration.findById(req.params.id)
    .populate('event')
    .populate('user');

  if (!registration) { res.status(404); throw new Error('Registration not found'); }
  if (registration.event.organizer.toString() !== req.user._id.toString()) {
    res.status(401); throw new Error('Not authorized to verify this payment');
  }

  if (status === 'Registered') {
    registration.status = 'Registered';
    await registration.save();
    await sendPaymentApprovalEmail(registration.user, registration.event, registration, true);
  } else if (status === 'Rejected') {
    registration.status = 'Rejected';
    // Restore stock only for merchandise events
    if (registration.event.eventType === 'Merchandise' && registration.merchandiseSelection?.length > 0) {
      const event = await Event.findById(registration.event._id);
      registration.merchandiseSelection.forEach(sel => {
        const item = event.merchandiseItems.find(i => i.name === sel.itemId);
        if (item) item.stock += sel.quantity;
      });
      await event.save();
    }
    await registration.save();
    await sendPaymentApprovalEmail(registration.user, registration.event, registration, false);
  }

  res.json({ message: `Payment ${status === 'Registered' ? 'approved' : 'rejected'} successfully`, registration });
});

// @desc    Organizer: Scan QR / Mark Attendance
// @route   POST /api/registrations/attendance/scan
const scanTicket = asyncHandler(async (req, res) => {
  const { ticketId, eventId } = req.body;
  const registration = await Registration.findOne({ ticketId, event: eventId })
    .populate('user', 'firstName lastName email');

  if (!registration) {
    res.status(404); throw new Error('Invalid Ticket: No registration found for this event');
  }
  if (registration.status === 'Attended') {
    res.status(400); throw new Error(`Duplicate Scan! Already checked in at ${registration.attendanceTime}`);
  }
  if (registration.status !== 'Registered') {
    res.status(400); throw new Error('Access Denied: Payment not yet approved or registration cancelled');
  }

  registration.status = 'Attended';
  registration.attendanceTime = new Date();
  await registration.save();

  res.json({
    message: `Attendance marked for ${registration.user?.firstName} ${registration.user?.lastName}`,
    participantName: `${registration.user?.firstName} ${registration.user?.lastName}`,
    time: registration.attendanceTime
  });
});

// @desc    Get all organizers
// @route   GET /api/registrations/organizers
const getOrganizers = asyncHandler(async (req, res) => {
  const organizers = await User.find({ role: 'organizer' })
    .select('firstName organizerName category description email');
  res.json(organizers);
});

// @desc    Get organizer details with their events
// @route   GET /api/registrations/organizers/:id
const getOrganizerDetails = asyncHandler(async (req, res) => {
  const organizer = await User.findById(req.params.id)
    .select('firstName organizerName category description contactEmail');
  if (!organizer) { res.status(404); throw new Error('Organizer not found'); }

  const events = await Event.find({ organizer: req.params.id, status: 'Published' });
  res.json({ organizer, events });
});

// @desc    Get ticket QR code
// @route   GET /api/registrations/ticket/:id/qr
const getTicketQR = asyncHandler(async (req, res) => {
  const registration = await Registration.findById(req.params.id)
    .populate({
      path: 'event',
      select: 'name organizer',
      populate: { path: 'organizer', select: '_id' }
    })
    .populate('user', 'firstName lastName email');

  if (!registration) { res.status(404); throw new Error('Registration not found'); }

  const isOwner = registration.user._id.toString() === req.user._id.toString();
  const isEventOrganizer = registration.event?.organizer?._id?.toString() === req.user._id.toString();

  if (!isOwner && !isEventOrganizer) {
    res.status(403); throw new Error('Not authorized to view this ticket');
  }

  const qrCodeDataUrl = await generateQRCode(
    registration.ticketId,
    registration.event.name,
    `${registration.user.firstName} ${registration.user.lastName}`
  );

  res.json({
    ticketId: registration.ticketId,
    qrCode: qrCodeDataUrl,
    event: { _id: registration.event._id, name: registration.event.name },
    user: {
      name: `${registration.user.firstName} ${registration.user.lastName}`,
      email: registration.user.email
    },
    status: registration.status
  });
});

module.exports = {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  toggleFollowClub,
  getEventParticipants,
  exportParticipants,
  getEventStats,
  getOrganizers,
  getOrganizerDetails,
  verifyMerchandisePayment,
  scanTicket,
  getTicketQR
};