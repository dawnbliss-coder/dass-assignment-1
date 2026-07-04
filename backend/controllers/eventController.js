const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');

// Helpers for partial & fuzzy search on Event/Organizer names
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildFuzzyRegex = (s) => {
  const escaped = escapeRegex(s).replace(/\s+/g, '\\s*');
  if (!escaped.length) return escaped;
  return escaped.split('').join('.{0,1}'); // allow 0–1 char between each for typo tolerance
};

const postToDiscord = async (webhookUrl, eventData) => {
  try {
    console.log('[Discord] Posting to:', webhookUrl);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `New Event: ${eventData.name}`,
          description: eventData.description?.substring(0, 200) || '',
          color: 0x5865F2,
          fields: [
            { name: 'Type',     value: eventData.eventType || 'N/A',                                        inline: true },
            { name: 'Start',    value: new Date(eventData.startDate).toDateString(),                        inline: true },
            { name: 'Location', value: eventData.location || 'TBA',                                        inline: true },
            { name: 'Fee',      value: eventData.registrationFee ? `Rs.${eventData.registrationFee}` : 'Free', inline: true },
          ],
          footer: { text: 'Felicity Event Management' }
        }]
      })
    });
    console.log('[Discord] Response status:', response.status);
    if (!response.ok) {
      const body = await response.text();
      console.error('[Discord] Error body:', body);
    } else {
      console.log('[Discord] Posted successfully');
    }
  } catch (e) {
    console.error('[Discord] fetch error:', e.message);
  }
};

const createEvent = asyncHandler(async (req, res) => {
  const {
    name, description, eventType, eligibility,
    registrationDeadline, startDate, endDate,
    registrationLimit, registrationFee, tags, location,
    formFields, merchandiseItems, purchaseLimit,
    teamSize, minTeamSize
  } = req.body;

  const event = await Event.create({
    organizer: req.user._id,
    name, description, eventType, eligibility,
    registrationDeadline, startDate, endDate,
    registrationLimit, registrationFee,
    tags: tags || [],
    location,
    status: 'Draft',
    formFields: formFields || [],
    merchandiseItems: merchandiseItems || [],
    purchaseLimit,
    teamSize: teamSize || 4,
    minTeamSize: minTeamSize || 2,
  });

  const organizerDoc = await User.findById(req.user._id).select('discordWebhook');
  console.log('[Discord] Organizer ID:', req.user._id.toString());
  console.log('[Discord] webhookUrl from DB:', organizerDoc?.discordWebhook);

  if (organizerDoc?.discordWebhook) {
    await postToDiscord(organizerDoc.discordWebhook, {
      name, description, eventType, startDate, location, registrationFee
    });
  } else {
    console.log('[Discord] No webhook URL found for organizer — skipping');
  }

  res.status(201).json(event);
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }
  if (event.organizer.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Not authorized to edit this event');
  }

  const { status } = event;

  if (status === 'Draft') {
    const fields = [
      'name', 'description', 'eventType', 'eligibility',
      'registrationDeadline', 'startDate', 'endDate',
      'registrationLimit', 'registrationFee', 'tags', 'location',
      'merchandiseItems', 'purchaseLimit', 'teamSize', 'minTeamSize'
    ];
    fields.forEach(f => { if (req.body[f] !== undefined) event[f] = req.body[f]; });

    if (req.body.formFields !== undefined) {
      if (event.formLocked) {
        res.status(400); throw new Error('Form is locked after first registration was received');
      }
      event.formFields = req.body.formFields;
    }
  } else if (status === 'Published') {
    if (req.body.description !== undefined) event.description = req.body.description;

    if (req.body.registrationDeadline !== undefined) {
      if (new Date(req.body.registrationDeadline) < new Date(event.registrationDeadline)) {
        res.status(400); throw new Error('Can only extend the registration deadline, not shorten it');
      }
      event.registrationDeadline = req.body.registrationDeadline;
    }

    if (req.body.registrationLimit !== undefined) {
      if (req.body.registrationLimit < event.registrationLimit) {
        res.status(400); throw new Error('Can only increase the registration limit, not decrease it');
      }
      event.registrationLimit = req.body.registrationLimit;
    }

    const regCount = await Registration.countDocuments({ event: event._id });
    if (regCount > 0) event.formLocked = true;
  } else {
    res.status(400);
    throw new Error(`Cannot edit event in '${status}' status`);
  }

  const updated = await event.save();
  res.json(updated);
});

const changeEventStatus = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }
  if (event.organizer.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Not authorized');
  }

  const { newStatus } = req.body;
  const validTransitions = {
    'Draft': ['Published'],
    'Published': ['Ongoing', 'Closed'],
    'Ongoing': ['Completed', 'Closed'],
    'Closed': ['Completed'],
    'Completed': []
  };

  if (!validTransitions[event.status]?.includes(newStatus)) {
    res.status(400);
    throw new Error(`Cannot transition from '${event.status}' to '${newStatus}'`);
  }

  event.status = newStatus;
  const updated = await event.save();
  res.json(updated);
});

const getFormResponses = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }
  if (event.organizer.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Not authorized');
  }
  if (event.eventType !== 'Normal') {
    res.status(400); throw new Error('Form responses only available for Normal events');
  }

  const registrations = await Registration.find({
    event: req.params.id,
    // Include pending approvals so organizers can review submitted forms + payment proof flows
    status: { $in: ['Registered', 'Pending Approval', 'Attended'] }
  }).populate('user', 'firstName lastName email');

  const responses = registrations.map(reg => ({
    participantName: `${reg.user?.firstName} ${reg.user?.lastName}`,
    participantEmail: reg.user?.email,
    ticketId: reg.ticketId,
    registeredAt: reg.createdAt,
    responses: reg.formResponses
  }));

  res.json(responses);
});

const getEvents = asyncHandler(async (req, res) => {
  const { search, eventType, eligibility, startDate, endDate, followedOnly } = req.query;
  let query = { status: { $in: ['Published', 'Ongoing'] } };

  if (search && search.trim()) {
    const term = search.trim();
    const partialRegex = new RegExp(escapeRegex(term), 'i');
    const fuzzyRegex = new RegExp(buildFuzzyRegex(term), 'i');

    // Organizer names: partial & fuzzy match → get organizer IDs
    const organizerIds = await User.find({
      role: 'organizer',
      $or: [
        { organizerName: partialRegex },
        { firstName: partialRegex },
        { organizerName: fuzzyRegex },
        { firstName: fuzzyRegex },
      ],
    })
      .select('_id')
      .lean()
      .then((users) => users.map((u) => u._id));

    query.$or = [
      { name: partialRegex },
      { name: fuzzyRegex },
      { organizer: { $in: organizerIds } },
      { tags: partialRegex },
      { description: partialRegex },
    ];
  }

  if (eventType) query.eventType = eventType;
  if (eligibility) query.eligibility = eligibility;
  if (startDate) query.startDate = { $gte: new Date(startDate) };
  if (endDate) query.endDate = { ...query.endDate, $lte: new Date(endDate) };

  if (followedOnly === 'true' && req.user?.followedOrganizers?.length > 0) {
    query.organizer = { $in: req.user.followedOrganizers };
  }

  let events = await Event.find(query)
    .populate('organizer', 'firstName organizerName')
    .sort({ createdAt: -1 });

  if (req.user?.followedOrganizers?.length > 0 && followedOnly !== 'true') {
    const followedIds = req.user.followedOrganizers.map(id => id.toString());
    events.sort((a, b) => {
      const aFollowed = followedIds.includes(a.organizer?._id?.toString()) ? -1 : 0;
      const bFollowed = followedIds.includes(b.organizer?._id?.toString()) ? -1 : 0;
      return aFollowed - bFollowed;
    });
  }

  res.json(events);
});

const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'firstName organizerName category contactEmail');
  if (!event) { res.status(404); throw new Error('Event not found'); }
  res.json(event);
});

const getTrendingEvents = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const trending = await Registration.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const eventIds = trending.map(t => t._id);
  const events = await Event.find({
    _id: { $in: eventIds },
    status: { $in: ['Published', 'Ongoing'] }
  }).populate('organizer', 'firstName organizerName');

  const sorted = eventIds
    .map(id => events.find(e => e._id.toString() === id.toString()))
    .filter(Boolean);

  res.json(sorted);
});

const getMyEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });
  res.json(events);
});

module.exports = {
  createEvent, getEvents, getEventById, getTrendingEvents,
  getMyEvents, updateEvent, changeEventStatus, getFormResponses
};