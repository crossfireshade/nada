/**
 * Database seed script — creates initial test users.
 * Run with: npm run seed
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const env = require('../config/env');

const SEED_USERS = [
  {
    name: 'Ahmed Producteur',
    email: 'producteur@radio-monastir.tn',
    password: 'Pass123!',
    role: 'PRODUCTEUR',
  },
  {
    name: 'Fatma Chef Production',
    email: 'production@radio-monastir.tn',
    password: 'Pass123!',
    role: 'RESPONSABLE_PRODUCTION',
  },
  {
    name: 'Karim Technicien',
    email: 'technicien@radio-monastir.tn',
    password: 'Pass123!',
    role: 'TECHNICIEN_COORDINATEUR',
  },
  {
    name: 'Sami Administratif',
    email: 'admin@radio-monastir.tn',
    password: 'Pass123!',
    role: 'RESPONSABLE_ADMINISTRATIF',
  },
  {
    name: 'Leila Publicité',
    email: 'publicite@radio-monastir.tn',
    password: 'Pass123!',
    role: 'RESPONSABLE_PUBLICITE',
  },
  {
    name: 'Mohamed Réception',
    email: 'reception@radio-monastir.tn',
    password: 'Pass123!',
    role: 'RECEPTIONNISTE_POLICIER',
  },
  {
    name: 'Kamel Sécurité',
    email: 'securite@radio-monastir.tn',
    password: 'Pass123!',
    role: 'RESPONSABLE_SECURITE',
  },
  {
    name: 'Responsable',
    email: 'responsable@radio-monastir.tn',
    password: 'Pass123!',
    role: 'RESPONSABLE',
  },
];

const seed = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const userData of SEED_USERS) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        console.log(`  SKIP  ${userData.email} (already exists)`);
        skipped++;
        continue;
      }
      const passwordHash = await bcrypt.hash(userData.password, 12);
      await User.create({
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        active: true,
      });
      console.log(`  CREATE ${userData.email} [${userData.role}]`);
      created++;
    }

    console.log(`\nSeed complete: ${created} created, ${skipped} skipped.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
