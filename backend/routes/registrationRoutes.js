const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/registrationController');
const { protect, organizer } = require('../middleware/authMiddleware');

// --- 1. PUBLIC ROUTES (Section 9.7 & 9.8) ---
// Participants browse clubs before logging in or registering
router.get('/organizers', getOrganizers);
router.get('/organizers/:id', getOrganizerDetails);

// --- 2. PARTICIPANT ROUTES (Private) ---
router.post('/', protect, registerForEvent);             // Register for event
router.get('/my', protect, getMyRegistrations);          // Dashboard & History
router.put('/:id/cancel', protect, cancelRegistration);  // Cancel registration
router.post('/follow/:clubId', protect, toggleFollowClub); // Follow/Unfollow club

// --- 3. ORGANIZER ADVANCED ROUTES (Tier A Features) ---
// Feature 2: Approve/Reject Merchandise Payment Proof
router.put('/:id/verify-payment', protect, organizer, verifyMerchandisePayment);

// Feature 3: Scan QR Code/Mark Attendance
router.post('/attendance/scan', protect, organizer, scanTicket);

// --- 4. ORGANIZER MANAGEMENT ROUTES (Section 11) ---
router.get('/event/:eventId', protect, organizer, getEventParticipants);
router.get('/event/:eventId/export', protect, organizer, exportParticipants);
router.get('/event/:eventId/stats', protect, organizer, getEventStats);

// --- 5. TICKET QR CODE ---
router.get('/ticket/:id/qr', protect, getTicketQR);

module.exports = router;
