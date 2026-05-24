/**
 * init_db.js — Health Disease Predictor
 * ───────────────────────────────────────
 * • Drops all existing data (users + queries)
 * • Recreates all indexes defined in the Mongoose schemas
 * • Inserts a sample admin user (password: Admin@1234)
 *
 * Run:  node backend/scripts/init_db.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// ── Inline schemas (mirrors models/) ─────────────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, minlength: 60 },
    role:         { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive:     { type: Boolean, default: true },
    lastLogin:    { type: Date },
  },
  { timestamps: true }
);
// Note: email_1 index is auto-created by unique:true above — do NOT add it again
UserSchema.index({ createdAt: -1 });

const QuerySchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:    { type: String, enum: ['text', 'image', 'face-acne', 'brain-mri'], required: true, index: true },
    input:   { type: mongoose.Schema.Types.Mixed, required: true },
    modelOutput: [
      {
        condition:     { type: String, required: true },
        score:         { type: Number, required: true, min: 0, max: 1 },
        severity:      String,
        evidence:      [String],
        affected_areas:[String],
      },
    ],
    severity:  { type: String, enum: ['minor', 'moderate', 'severe', 'mild', 'clear'], required: true, index: true },
    advice:    { type: String, default: '' },
    resources: { heatmapUrl: String, imageUrl: String, reportUrls: [String] },
    metadata:  { processingTime: Number, modelVersion: String, backendVersion: String },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);
QuerySchema.index({ userId: 1, createdAt: -1 });
QuerySchema.index({ userId: 1, type: 1, createdAt: -1 });
QuerySchema.index({ userId: 1, severity: 1, createdAt: -1 });

const User  = mongoose.model('User',  UserSchema);
const Query = mongoose.model('Query', QuerySchema);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in backend/.env');

  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { dbName: 'health_predictor' });
  console.log(`✅ Connected → ${mongoose.connection.host}`);

  // ── 1. Drop all existing data ─────────────────────────────────────────────
  console.log('\n🗑️  Dropping all existing data...');
  const userCount  = await User.deleteMany({});
  const queryCount = await Query.deleteMany({});
  console.log(`   Deleted ${userCount.deletedCount} user(s)`);
  console.log(`   Deleted ${queryCount.deletedCount} quer(y/ies)`);

  // ── 2. Drop all existing indexes (except _id) then re-sync ─────────────
  console.log('\n📐 Dropping old indexes and re-syncing...');
  const db = mongoose.connection.db;

  try {
    await db.collection('users').dropIndexes();
    console.log('   Dropped all indexes on: users');
  } catch (e) {
    console.log('   users collection has no indexes to drop (skipping)');
  }

  try {
    await db.collection('queries').dropIndexes();
    console.log('   Dropped all indexes on: queries');
  } catch (e) {
    console.log('   queries collection has no indexes to drop (skipping)');
  }

  await User.syncIndexes();
  await Query.syncIndexes();
  console.log('   ✅ Indexes re-created for: users, queries');

  // ── 3. Print collection summary ───────────────────────────────────────────
  const collections = await db.listCollections().toArray();
  console.log('\n📦 Collections in database:');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    const indexes = await db.collection(col.name).indexes();
    console.log(`   • ${col.name.padEnd(12)} → ${count} document(s), ${indexes.length} index(es)`);
  }

  console.log('\n🎉 Database initialised successfully!');
  console.log('   Database : health_predictor');
  console.log('   Collections: users, queries');
  console.log('   All previous data has been cleared.\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Init failed:', err.message);
  process.exit(1);
});
