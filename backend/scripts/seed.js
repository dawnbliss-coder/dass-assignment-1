/**
 * Seed script — wipes and repopulates the database with sample data.
 *
 * Usage:
 *   npm run seed
 *
 * Creates:
 *   1 admin, 3 organizers, 3 participants, and 4 events (Normal, Merchandise, Hackathon).
 * All seeded users share the password: password123 (admin uses ADMIN_PASSWORD / password123).
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Event = require('../models/Event');

dotenv.config();

const PASSWORD = 'password123';

// insertMany() does NOT trigger Mongoose's pre('save') hook, so passwords
// would be stored in plain text if we didn't hash them here ourselves.
const hashPassword = async (plain) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    // ---- Clear existing data ----
    await User.deleteMany({});
    await Event.deleteMany({});
    console.log('Cleared existing Users and Events');

    // ---- Admin ----
    const admin = await User.create({
      email: process.env.ADMIN_EMAIL || 'admin@felicity.com',
      password: process.env.ADMIN_PASSWORD || PASSWORD,
      role: 'admin',
      firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
      lastName: 'User',
    });

    // ---- Organizers ----
    const hashedPassword = await hashPassword(PASSWORD);
    const organizers = await User.insertMany([
      {
        email: 'techclub@felicity.com',
        password: hashedPassword,
        role: 'organizer',
        organizerName: 'Technical Club',
        category: 'Technical',
        description: 'Building cool things, one hackathon at a time.',
        contactEmail: 'techclub@felicity.com',
      },
      {
        email: 'musicclub@felicity.com',
        password: hashedPassword,
        role: 'organizer',
        organizerName: 'Music Club',
        category: 'Cultural',
        description: 'Where every beat tells a story.',
        contactEmail: 'musicclub@felicity.com',
      },
      {
        email: 'merchclub@felicity.com',
        password: hashedPassword,
        role: 'organizer',
        organizerName: 'Felicity Merch Store',
        category: 'Merchandise',
        description: 'Official Felicity merchandise store.',
        contactEmail: 'merchclub@felicity.com',
      },
    ]);
    const [techClub, musicClub, merchClub] = organizers;

    // ---- Participants ----
    const participants = await User.insertMany([
      {
        email: 'alice@students.iiit.ac.in',
        password: hashedPassword,
        role: 'participant',
        firstName: 'Alice',
        lastName: 'Sharma',
        participantType: 'IIIT',
        interests: ['Technical', 'Cultural'],
      },
      {
        email: 'bob@iiit.ac.in',
        password: hashedPassword,
        role: 'participant',
        firstName: 'Bob',
        lastName: 'Verma',
        participantType: 'IIIT',
        interests: ['Technical'],
      },
      {
        email: 'carol@gmail.com',
        password: hashedPassword,
        role: 'participant',
        firstName: 'Carol',
        lastName: 'Reddy',
        participantType: 'Non-IIIT',
        collegeName: 'BITS Pilani',
        interests: ['Cultural', 'Merchandise'],
      },
    ]);

    // ---- Events ----
    const now = Date.now();
    const days = (n) => new Date(now + n * 24 * 60 * 60 * 1000);

    await Event.insertMany([
      {
        organizer: techClub._id,
        name: 'CodeStorm Hackathon',
        description: '24-hour hackathon to build innovative solutions for real-world problems.',
        eventType: 'Hackathon',
        eligibility: 'Open to all',
        registrationDeadline: days(5),
        startDate: days(10),
        endDate: days(11),
        registrationLimit: 100,
        registrationFee: 0,
        tags: ['Technical', 'Hackathon'],
        location: 'Himalaya Building, IIIT-H',
        status: 'Published',
        teamSize: 4,
        minTeamSize: 2,
      },
      {
        organizer: techClub._id,
        name: 'AI/ML Workshop',
        description: 'Hands-on workshop covering the fundamentals of machine learning.',
        eventType: 'Normal',
        eligibility: 'Open to all',
        registrationDeadline: days(3),
        startDate: days(7),
        endDate: days(7),
        registrationLimit: 60,
        registrationFee: 50,
        tags: ['Technical', 'Workshop'],
        location: 'Vindhya C4',
        status: 'Published',
        formFields: [
          { label: 'Prior ML experience?', fieldType: 'dropdown', options: ['None', 'Beginner', 'Intermediate', 'Advanced'], required: true, order: 0 },
          { label: 'Bring your own laptop?', fieldType: 'checkbox', required: false, order: 1 },
        ],
      },
      {
        organizer: musicClub._id,
        name: 'Battle of Bands',
        description: 'Annual inter-college band competition. Winner takes the trophy!',
        eventType: 'Normal',
        eligibility: 'Bands of 3-6 members',
        registrationDeadline: days(8),
        startDate: days(15),
        endDate: days(15),
        registrationLimit: 20,
        registrationFee: 200,
        tags: ['Cultural', 'Music'],
        location: 'Open Air Theatre',
        status: 'Published',
      },
      {
        organizer: merchClub._id,
        name: 'Felicity 2026 Merch Drop',
        description: 'Official Felicity hoodies, tees, and tote bags — limited stock!',
        eventType: 'Merchandise',
        registrationDeadline: days(20),
        startDate: days(1),
        endDate: days(20),
        registrationLimit: 0,
        tags: ['Merchandise'],
        location: 'Online',
        status: 'Published',
        purchaseLimit: 3,
        merchandiseItems: [
          { name: 'Felicity Hoodie', variants: ['S', 'M', 'L', 'XL'], price: 799, stock: 50 },
          { name: 'Felicity T-Shirt', variants: ['S', 'M', 'L', 'XL'], price: 399, stock: 100 },
          { name: 'Felicity Tote Bag', variants: ['One Size'], price: 199, stock: 75 },
        ],
      },
    ]);

    console.log('\nSeed complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Admin:        ${admin.email} / ${process.env.ADMIN_PASSWORD || PASSWORD}`);
    console.log(`Organizers:   techclub@felicity.com, musicclub@felicity.com, merchclub@felicity.com`);
    console.log(`Participants: alice@students.iiit.ac.in, bob@iiit.ac.in, carol@gmail.com`);
    console.log(`Password (all except admin): ${PASSWORD}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

run();