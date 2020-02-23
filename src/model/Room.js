const mongoose = require('mongoose');

let RoomSchema = mongoose.Schema({
  name: String,
});

module.exports = mongoose.model('Room', RoomSchema);
