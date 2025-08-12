// scripts/reset-db.js
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/upsc_platform';

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection;
  console.log('Connected to DB:', db.name);

  const hasTests = await db.db.listCollections({ name: 'tests' }).hasNext();
  if (hasTests) {
    await db.dropCollection('tests');
    console.log('Dropped collection: tests');
  } else {
    console.log('No tests collection');
  }

  const hasSubs = await db.db.listCollections({ name: 'submissions' }).hasNext();
  if (hasSubs) {
    await db.dropCollection('submissions');
    console.log('Dropped collection: submissions');
  } else {
    console.log('No submissions collection');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
