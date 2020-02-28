const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Device = require('../../model/Device');
const Attachment = require('../../model/Attachment');
const Room = require('../../model/Room');
const { LIGHT, SOCKET } = require('../../model/attachment_types');
const mqtt = require('../../mqtt/mqtt');

router.get('/', async (req, res) => {
  const attachments = await Attachment.find({}, err => err && console.log());
  res.send(attachments);
});

router.get('/:attachmentId', async (req, res) => {
  try {
    const attachments = await Attachment.find({ _id: req.params.attachmentId });
    if (attachments.length == 1) res.send(attachments[0]);
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
      .isIn(['light', 'socket']),
    check('pinNumber').isNumeric(),
    check('deviceId').isMongoId(),
  ],
  async (req, res) => {
    const deviceIds = (await Device.find({})).map(device => device._id);
    await check('deviceId', 'Not a valid device id')
      .isIn(deviceIds)
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const attachment = new Attachment(req.body);
    switch (attachment.type) {
      case LIGHT:
      case SOCKET:
        attachment.characteristics = {
          isOn: {
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
          roomId: room._id,
          deviceId: device._id,
          pinNumber: attachment.pinNumber,
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
        case LIGHT:
        case SOCKET:
          const isOn = att.characteristics.isOn;
          isOn.value = !isOn.value;
          att.save(function(err, attachment) {
            if (err) return console.error(err);
            const topic =
              roomId + '/' + device._id + '/' + attachment.pinNumber;
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
