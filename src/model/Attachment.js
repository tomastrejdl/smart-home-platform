const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let CharacteristicSchema = new Schema({
  type: {
    type: String,
    enum: ['string', 'integer', 'float', 'boolean'],
  },
  units: String,
  value: Schema.Types.Mixed,
  interval: Number,
});

let AttachmentSchema = new Schema({
  name: String,
  type: {
    type: String,
    enum: ['light', 'socket', 'temperature-sensor', 'door-sensor'],
  },
  pin: {
    type: String,
    enum: ['D1', 'D2', 'D3', 'D4']
  },
  deviceId: Schema.ObjectId,
  characteristics: {
    isOn: CharacteristicSchema,
    isOpen: CharacteristicSchema,
    temperature: CharacteristicSchema,
    humidity: CharacteristicSchema,
  },
});

module.exports = mongoose.model('Attachment', AttachmentSchema);
