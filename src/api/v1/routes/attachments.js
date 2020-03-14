const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

const Device = require('../model/Device');
const Attachment = require('../model/Attachment');
const Room = require('../model/Room');
const Event = require('../model/Event');

const mqtt = require('../../../mqtt/mqtt');
const AttachmentType = require('../declarations/attachment-type');
const EventType = require('../declarations/event-type');
const Pins = require('../declarations/pins');

/**
 * @swagger
 * tags:
 *   name: Attachments
 *   description: Attachment management
 */

/**
 * @swagger
 * path:
 *  /attachments/:
 *    get:
 *      summary: Get a list of all attachments
 *      tags: [Attachments]
 *      responses:
 *        "200":
 *          description: List of attachments
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Attachment'
 */
router.get('/', async (req, res) => {
  const attachments = await Attachment.find({}, err => err && console.log());
  res.send(attachments);
});

/**
 * @swagger
 * path:
 *  /attachments/{attachmentId}:
 *    get:
 *      summary: Get a attachment by id
 *      tags: [Attachments]
 *      parameters:
 *        - in: path
 *          name: attachmentId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the attachment
 *      responses:
 *        "200":
 *          description: A attachment object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Attachment'
 */
router.get('/:attachmentId', async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.attachmentId);
    if (attachment) res.send(attachment);
    else res.sendStatus(404);
  } catch (err) {
    console.error(err);
    res.sendStatus(404);
  }
});

/**
 * @swagger
 * path:
 *  /attachments/:
 *    post:
 *      summary: Create attachment
 *      tags: [Attachments]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Attachment'
 *      responses:
 *        "201":
 *          description: Created attachment
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Attachment'
 */
router.post(
  '/',
  [
    check('name')
      .escape()
      .isString()
      .trim()
      .isLength(3),
    check('type')
      .escape()
      .isString()
      .isIn([
        AttachmentType.LIGHT,
        AttachmentType.SOCKET,
        AttachmentType.TEMPERATURE_SENSOR,
        AttachmentType.DOOR_SENSOR,
      ]),
    check('pin')
      .escape()
      .isIn(Pins.ALL),
    check('deviceId')
      .escape()
      .isMongoId()
      .custom(value => {}),
  ],
  async (req, res) => {
    // More validation
    const deviceIds = (await Device.find({})).map(device => device._id);
    await check('deviceId', 'Not a valid device id')
      .isIn(deviceIds)
      .run(req);

    const usedPins = (
      await Attachment.find({ deviceId: req.body.deviceId })
    ).map(att => att.pin);
    console.log(usedPins);

    await check('pin', 'This pin is already used')
      .not()
      .isIn(usedPins)
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    // end validation

    const attachment = new Attachment(req.body);
    switch (attachment.type) {
      case AttachmentType.LIGHT:
      case AttachmentType.SOCKET:
        attachment.characteristics = {
          isOn: {
            type: 'boolean',
            value: false,
          },
        };
        break;

      case AttachmentType.TEMPERATURE_SENSOR:
        attachment.characteristics = {
          temperature: {
            type: 'float',
            units: 'celsius',
            value: -273.15,
          },
          humidity: {
            type: 'float',
            units: 'percent',
            value: 0,
          },
        };
        break;

      case AttachmentType.DOOR_SENSOR:
        attachment.characteristics = {
          isOpen: {
            type: 'boolean',
            value: false,
          },
        };
        break;
    }
    attachment.save(async (err, attachment) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      const device = await Device.findById(attachment.deviceId);
      const room = await Room.findById(device.roomId);

      mqtt.sendConfigToDevice(device.macAddress);
      res.status(201).send(attachment);
    });
  },
);

/**
 * @swagger
 * path:
 *  /attachments/{attachmentId}:
 *    put:
 *      summary: Update an attachment by id
 *      tags: [Attachments]
 *      parameters:
 *        - in: path
 *          name: attachmentId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the attachment
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Attachment'
 *      responses:
 *        "200":
 *          description: Updated attachment object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Attachment'
 */
router.put(
  '/:attachmentId',
  [
    check('name')
      .escape()
      .isString()
      .trim()
      .isLength(3)
      .optional({ nullable: true }),
    check('type')
      .escape()
      .isString()
      .isIn([
        AttachmentType.LIGHT,
        AttachmentType.SOCKET,
        AttachmentType.TEMPERATURE_SENSOR,
        AttachmentType.DOOR_SENSOR,
      ])
      .optional({ nullable: true }),
    check('pin')
      .escape()
      .isIn(Pins.ALL)
      .optional({ nullable: true }),
    check('deviceId')
      .escape()
      .isMongoId()
      .custom(value => {})
      .optional({ nullable: true }),
  ],
  async (req, res) => {
    // More validation
    const deviceIds = (await Device.find({})).map(device => device._id);
    await check('deviceId', 'Not a valid device id')
      .isIn(deviceIds)
      .optional({ nullable: true })
      .run(req);

    const usedPins = (
      await Attachment.find({ deviceId: req.body.deviceId })
    ).map(att => att.pin);
    console.log(usedPins);

    await check('pin', 'This pin is already used')
      .not()
      .isIn(usedPins)
      .optional({ nullable: true })
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    // end validation

    Attachment.findOneAndUpdate(
      { _id: req.params.attachmentId },
      req.body,
      {
        new: true,
      },
      (err, attachment) => {
        if (err) {
          console.error(err);
          return res.status(500).send(err);
        }
        if (!attachment) res.sendStatus(404);
        else res.status(200).send(attachment);
      },
    );
  },
);

/**
 * @swagger
 * path:
 *  /attachments/{attachmentId}:
 *    delete:
 *      summary: Delete an attachment by id
 *      tags: [Attachments]
 *      parameters:
 *        - in: path
 *          name: attachmentId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the attachment
 *      responses:
 *        "200":
 *          description: The deleted attachment object
 */
router.delete('/:attachmentId', async (req, res) => {
  Attachment.findOneAndDelete(
    { _id: req.params.attachmentId },
    (err, attachment) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      if (!attachment) res.sendStatus(404);
      else res.sendStatus(200);
    },
  );
});

/**
 * @swagger
 * path:
 *  /attachments/{attachmentId}/toggle:
 *    post:
 *      summary: Toggle the state of an attachment by ID
 *               For attachments that have boolean characteristics
 *               Switch from true to false and vice versa
 *      tags: [Attachments]
 *      consumes:
 *        - application/json
 *      parameters:
 *        - in: path
 *          name: attachmentId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the attachment
 *      responses:
 *        "200":
 *          description: Toggled the attachment state
 */
router.post('/:attachmentId/toggle', async (req, res) => {
  try {
    const att = await Attachment.findById(req.params.attachmentId);
    if (att) {
      const device = await Device.findById(att.deviceId);
      switch (att.type) {
        case AttachmentType.LIGHT:
        case AttachmentType.SOCKET:
          const isOn = att.characteristics.isOn;
          isOn.value = !isOn.value;
          att.save((err, attachment) => {
            if (err) return console.error(err);
            const topic = att.type + 's/' + device._id + '/' + attachment.pin;
            const message = isOn.value ? 'on' : 'off';
            console.log('Sending MQTT:', topic, message);
            mqtt.send(topic, message);
            res.status(200).send({ newValue: attachment });
          });
          break;

        default:
          res
            .status(400)
            .send(
              'Attachment type ' +
                att.type +
                ' does not have a boolean characteristic, e.g., cannot be toggled',
            );
      }
    } else res.sendStatus(404);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

/**
 * @swagger
 * path:
 *  /attachments/{attachmentId}/getTemperatureData:
 *    get:
 *      summary: Get temperature data of attachment by id
 *      tags: [Attachments]
 *      parameters:
 *        - in: path
 *          name: attachmentId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the attachment
 *      responses:
 *        "200":
 *          description: Array of temperature events
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 */
router.get('/:attachmentId/getTemperatureData', async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.attachmentId);
    if (attachment) {
      if (attachment.type != AttachmentType.TEMPERATURE_SENSOR)
        res.status(400).send({
          error:
            'Attachment ' + attachment._id + ' is not a temperature sensor',
        });

      const today = new Date().setHours(0, 0, 0, 0);
      const event = await Event.findOne({
        attachmentId: attachment._id,
        type: EventType.TEMPERATURE_HUMIDITY,
        timestamp_day: today,
      });
      if (event) res.send(event);
      else req.send([]);
    } else res.sendStatus(404);
  } catch (err) {
    console.error(err);
    res.sendStatus(404);
  }
});

module.exports = router;
