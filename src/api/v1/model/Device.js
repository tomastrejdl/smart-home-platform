const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @swagger
 *  components:
 *    schemas:
 *      Device:
 *        type: object
 *        required:
 *          - name
 *          - macAddress
 *          - roomId
 *        properties:
 *          name:
 *            type: string
 *          macAddress:
 *            type: string
 *          roomId:
 *            type: string
 *        example:
 *          name: Living room controller
 *          macAddress: 12:45:67:AB:CD:EF
 *          roomId: 5e5137380729f152a8b4395a
 *          isOnline: true
 */
let DeviceSchema = new Schema({
  name: String,
  macAddress: { type: String, unique: true },
  roomId: Schema.ObjectId,
  isOnline: Boolean,
});

module.exports = mongoose.model('Device', DeviceSchema);
