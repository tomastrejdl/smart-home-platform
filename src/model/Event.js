const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let EventSchema = new Schema({
  attachmentId: Schema.Types.ObjectId,
  type: {
    type: String,
    enum: ['temperature', 'humidity', 'door'],
  },
  timestamp_day: { type: Date, unique: true },
  num_samples: Number,
  sum: Number,
  values: Schema.Types.Mixed,
});

module.exports = mongoose.model('Event', EventSchema);
