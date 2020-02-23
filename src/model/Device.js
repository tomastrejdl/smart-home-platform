const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let DeviceSchema = new Schema({
  name: String,
  macAddress: String,
  roomId: Schema.ObjectId,
});

module.exports = mongoose.model('Device', DeviceSchema);
