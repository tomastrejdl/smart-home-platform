const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Device = require('../../model/Device');
const Attachment = require('../../model/Attachment');
const Room = require('../../model/Room');
const AttachmentType = require('../../model/attachment-types');
const mqtt = require('../../mqtt/mqtt');

router.get('/', async (req, res) => {
  const attachments = await Attachment.find({}, err => err && console.log());
  res.send(attachments);
});

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

router.post(
  '/',
  [
    check('name')
      .isString()
      .trim()
      .isLength(3),
    check('type')
      .isString()
      .isIn([
        AttachmentType.LIGHT,
        AttachmentType.SOCKET,
        AttachmentType.TEMPERATURE_SENSOR,
        AttachmentType.DOOR_SENSOR,
      ]),
    check('pinNumber').isNumeric(),
    check('deviceId').isMongoId(),
  ],
  async (req, res) => {
    const deviceIds = (await Device.find({})).map(device => device._id);
    await check('deviceId', 'Not a valid device id')
      .isIn(deviceIds)
      .run(req);

    const usedPins = (
      await Attachment.find({ deviceId: req.body.deviceId })
    ).map(att => att.pinNumber);
    console.log(usedPins);

    await check('pinNumber', 'This pin is already used')
      .not()
      .isIn(usedPins)
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

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
            interval: 10_000,
          },
          humidity: {
            type: 'float',
            units: 'percent',
            value: 0,
            interval: 10_000,
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
    attachment.save(async function(err, attachment) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      const device = await Device.findById(attachment.deviceId);
      const room = await Room.findById(device.roomId);

      mqtt.sendMqtt(
        'global/' + device.macAddress,
        JSON.stringify({
          deviceId: device._id,
          attachmentId: attachment._id,
          attachmentType: attachment.type,
          pinNumber: attachment.pinNumber,
          tempInterval:
            attachment.type == AttachmentType.TEMPERATURE_SENSOR
              ? attachment.characteristics.temperature.interval
              : 0,
        }),
      );
      res.status(201).send(attachment);
    });
  },
);

router.put('/:attachmentId', async (req, res) => {
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
});

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

router.post('/:attachmentId/toggle', async (req, res) => {
  try {
    const att = await Attachment.findById(req.params.attachmentId);
    if (att) {
      const device = await Device.findById(att.deviceId);
      const room = await Room.findById(device.roomId);
      const roomId = room ? room._id : 'global';
      switch (att.type) {
        case AttachmentType.LIGHT:
        case AttachmentType.SOCKET:
          const isOn = att.characteristics.isOn;
          isOn.value = !isOn.value;
          att.save(function(err, attachment) {
            if (err) return console.error(err);
            const topic =
              att.type + 's/' + device._id + '/' + attachment.pinNumber;
            const message = isOn.value ? 'on' : 'off';
            console.log('Sending MQTT:', topic, message);
            mqtt.sendMqtt(topic, message);
            res.status(200).send({ newValue: attachment });
          });

          break;

        default:
          res.status(400).send('Unknown device type');
      }
    } else res.sendStatus(404);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

module.exports = router;
