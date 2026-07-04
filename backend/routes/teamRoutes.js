const express = require('express');
const router = express.Router();
const {
  createTeam,
  getMyTeam,
  joinTeam,
  handleMemberRequest,
  removeMember,
  getEventTeams,
  getTeamByInviteCode
} = require('../controllers/teamController');
const { protect, organizer } = require('../middleware/authMiddleware');

// Participant routes
router.post('/', protect, createTeam);                                         // Create team
router.post('/join', protect, joinTeam);                                       // Join via invite code
router.get('/my/:eventId', protect, getMyTeam);                               // My team for an event
router.get('/invite/:code', protect, getTeamByInviteCode);                    // Preview team by invite code
router.put('/:teamId/members/:userId', protect, handleMemberRequest);         // Accept/Decline member
router.delete('/:teamId/members/:userId', protect, removeMember);             // Remove member

// Organizer routes
router.get('/event/:eventId', protect, organizer, getEventTeams);             // All teams for event

module.exports = router;