const mongoose = require('mongoose');
const url = 'mongodb://127.0.0.1:27017/webmintra';
async function run() {
  await mongoose.connect(url);
  const db = mongoose.connection.db;
  await db.collection('settings').updateMany(
    { key: { $in: ['brand.logoUrl', 'brand.faviconUrl'] } },
    { $set: { type: 'image' } }
  );
  console.log('Updated DB');
  process.exit(0);
}
run();
