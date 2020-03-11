const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @swagger
 *  components:
 *    schemas:
 *      Event:
 *        type: object
 *        required:
 *          - attachmentId
 *          - type
 *          - timestamp_day
 *        properties:
 *          attachmentId:
 *            type: string
 *          type:
 *            type: string
 *          timestamp_day:
 *            type: string
 *            format: date
 *          num_samples:
 *            type: integer
 *          sum:
 *            type: number
 *          values:
 *            type: array
 *        example:
 *          attachmentId: 5e5ce0718432f397509538fb
 *          type: door
 *          timestamp_day: 2020-03-01T23:00:00.000+00:00
 *          values: [{timestamp: 2020-03-01T23:01:21.092+00:00}]
 */
const EventSchema = new Schema({
  attachmentId: Schema.Types.ObjectId,
  type: {
    type: String,
    enum: ['temperature', 'humidity', 'door'],
  },
  timestamp_day: Date,
  num_samples: Number,
  sum: Number,
  values: Schema.Types.Mixed,
});

module.exports = mongoose.model('Event', EventSchema);
