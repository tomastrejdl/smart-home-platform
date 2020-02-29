const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let CharacteristicSchema = new Schema({
  type: String,
  units: String,
  value: Schema.Types.Mixed,
  interval: Number,
});

let AttachmentSchema = new Schema({
  name: String,
  type: String,
  pinNumber: Number,
  deviceId: Schema.ObjectId,
  characteristics: {
    isOn: CharacteristicSchema,
    isOpen: CharacteristicSchema,
    temperature: CharacteristicSchema,
    humidity: CharacteristicSchema,
  },
});

module.exports = mongoose.model('Attachment', AttachmentSchema);
