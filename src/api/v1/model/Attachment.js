const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttachmentType = require('../declarations/attachment-type');
const Pins = require('../declarations/pins');

/**
 * @swagger
 *  components:
 *    schemas:
 *      Characteristic:
 *        type: object
 *        required:
 *          - type
 *          - units
 *          - value
 *        properties:
 *          type:
 *            type: string
 *          units:
 *            type: string
 *          value:
 *            oneOf:
 *              - type: string
 *              - type: nuber
 *              - type: boolean
 *          sampleInterval:
 *            type: number
 *          invert:
 *            type: boolean
 *        example:
 *          type: string
 *          units: celsius
 *          value: 20
 *          sampleInterval: 1000
 */
let CharacteristicSchema = new Schema({
  type: {
    type: String,
    enum: ['string', 'integer', 'float', 'boolean'],
  },
  units: String,
  value: Schema.Types.Mixed,
  sampleInterval: { type: Number, default: 1000 },
  invert: {
    type: Boolean,
    default: false,
  },
});

/**
 * @swagger
 *  components:
 *    schemas:
 *      Attachment:
 *        type: object
 *        required:
 *          - name
 *          - type
 *          - pin
 *          - deviceId
 *        properties:
 *          name:
 *            type: string
 *          type:
 *            type: string
 *          pin:
 *            type: string
 *          deviceId:
 *            type: string
 *          characteristics:
 *            type: object
 *            properties:
 *              isOn:
 *                type: object
 *              isOpen:
 *                type: object
 *              temperature:
 *                type: object
 *              humidity:
 *                type: object
 *        example:
 *          name: Ceiling light
 *          type: light
 *          pin: D1
 *          deviceId: 5e5cd6153049290dbe28a6a0
 */
let AttachmentSchema = new Schema({
  name: String,
  type: {
    type: String,
    enum: AttachmentType.ALL,
  },
  pin: {
    type: String,
    enum: Pins.ALL,
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
