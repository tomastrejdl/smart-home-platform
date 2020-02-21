const mongoose = require('mongoose');

let DeviceSchema = mongoose.Schema({
  name: String,
  type: String,
  controlType: String,
  macAddress: String,
  pin: Number,
  state: String,
  roomId: String,
});

module.exports = mongoose.model('Device', DeviceSchema);
