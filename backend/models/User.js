const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['participant', 'organizer', 'admin'],
    default: 'participant',
  },
  firstName: { type: String },
  lastName: { type: String },
  contactNumber: { type: String },
  
  // Section 6.1: Participant Specific
  participantType: { 
    type: String, 
    enum: ['IIIT', 'Non-IIIT'] 
  },
  collegeName: { type: String },
  
  // Section 5: Preferences & Onboarding
  interests: [{ type: String }], // Areas of interest
  followedOrganizers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Section 6.2: Organizer Specific
  organizerName: { type: String }, 
  category: { type: String }, // e.g., Technical Club, Cultural Club
  description: { type: String },
  contactEmail: { type: String }, 
  discordWebhook: { type: String }, // Section 10.5
  resetRequest: { type: Boolean, default: false },

  resetHistory: [{
    date: { type: Date, default: Date.now },
    action: String, // 'Requested', 'Approved', 'Rejected'
    adminComment: String
  }]

}, {
  timestamps: true, 
});

userSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return; // Just return, don't use next()
  }

  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);