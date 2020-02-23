const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let CharacteristicSchema = new Schema({
  name: String,
  type: String,
  value: Schema.Types.Mixed,
});

let AttachmentSchema = new Schema({
  name: String,
  type: String,
  pin: Number,
  deviceId: Schema.ObjectId,
  characteristics: {
    isOn: CharacteristicSchema,
  },
});

module.exports = mongoose.model('Attachment', AttachmentSchema);
