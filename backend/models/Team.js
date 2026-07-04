const mongoose = require('mongoose');

const teamSchema = mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  maxSize: {
    type: Number,
    required: true,
    min: 2,
  },
  inviteCode: {
    type: String,
    unique: true,
    required: true,
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Declined'],
      default: 'Pending'
    },
    joinedAt: { type: Date }
  }],
  status: {
    type: String,
    enum: ['Forming', 'Complete', 'Cancelled'],
    default: 'Forming',
  },
  // Payment proof for paid hackathons (stored once per team, used for approvals)
  paymentProofImage: {
    type: String,
    default: ''
  },
  // When team is complete, all members get a registration ticket
  registrationIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration'
  }]
}, {
  timestamps: true,
});

module.exports = mongoose.models.Team || mongoose.model('Team', teamSchema);