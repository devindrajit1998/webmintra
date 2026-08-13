import mongoose from 'mongoose';
import { Template } from './src/models/Template.js';

mongoose.connect('mongodb://127.0.0.1:27017/webmintra').then(async () => {
  await Template.updateMany({ pageCount: { $exists: false } }, { $set: { pageCount: 1 } });
  console.log('Updated templates:', await Template.find().select('title pageCount').lean());
  process.exit(0);
});
