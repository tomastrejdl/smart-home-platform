const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let DeviceSchema = new Schema({
  name: String,
  macAddress: { type: String, unique: true },
  roomId: Schema.ObjectId,
  isOnline: Boolean,
});

module.exports = mongoose.model('Device', DeviceSchema);
