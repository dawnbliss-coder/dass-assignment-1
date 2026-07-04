const mongoose = require('mongoose');

const registrationSchema = mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ticketId: { 
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ['Registered', 'Pending Approval', 'Cancelled', 'Rejected', 'Attended'],
    default: 'Registered', // Default for Normal events. Merchandise will set to 'Pending Approval'.
  },
  
  // Tier A: Feature 2 - Payment Proof
  paymentProofImage: { 
    type: String // This will store the URL of the uploaded image
  },

  // Tier A: Feature 3 - Attendance Logging
  attendanceTime: { type: Date },
  isManualOverride: { type: Boolean, default: false }, // Audit log for manual entry

  formResponses: [{
    label: String, 
    value: String 
  }],
  merchandiseSelection: [{
    itemId: String,
    variant: String, 
    quantity: Number
  }],

}, {
  timestamps: true,
});

module.exports = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);