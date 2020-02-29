const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let EventSchema = new Schema({
  attachmentId: Schema.Types.ObjectId,
  type: {
    type: String,
    enum: ['temperature-humidity', 'door'],
  },
  time: Date,
  message: Schema.Types.Mixed,
});

module.exports = mongoose.model('Event', EventSchema);
