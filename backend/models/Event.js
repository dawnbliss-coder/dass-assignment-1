const mongoose = require('mongoose');

const eventSchema = mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  eventType: {
    type: String,
    enum: ['Normal', 'Merchandise', 'Hackathon'], // ADDED: Hackathon
    required: true,
  },
  eligibility: { type: String },
  registrationDeadline: { type: Date, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationLimit: { type: Number, default: 0 },
  registrationFee: { type: Number, default: 0 },
  tags: [{ type: String }],
  location: { type: String },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Ongoing', 'Closed', 'Completed'],
    default: 'Draft',
  },

  // Section 10.4: Dynamic Form Builder for Normal Events
  formFields: [{
    label: { type: String },
    fieldType: { type: String, enum: ['text', 'dropdown', 'checkbox', 'file'] },
    options: [{ type: String }],
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 } // For reordering
  }],

  // Section 8: Merchandise Specific
  merchandiseItems: [{
    name: { type: String },
    variants: [{ type: String }],
    price: { type: Number },
    stock: { type: Number },
  }],
  purchaseLimit: { type: Number, default: 1 },

  // ADDED: Hackathon Specific
  teamSize: { type: Number, default: 4 }, // Max team size
  minTeamSize: { type: Number, default: 2 },

  // Track if form is locked (after first registration received)
  formLocked: { type: Boolean, default: false },

}, {
  timestamps: true,
});

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);