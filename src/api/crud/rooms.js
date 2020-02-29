const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Device = require('../../model/Device');
const Attachment = require('../../model/Attachment');
const Room = require('../../model/Room');

const mqtt = require('../../mqtt/mqtt');

router.get('/', async (req, res) => {
  const rooms = await Room.find({}, err => err && console.log(err));
  res.send(rooms);
});

router.get('/:roomId', async (req, res) => {
  try {
    const rooms = await Room.find({ _id: req.params.roomId });
    if (rooms.length == 1) res.send(rooms[0]);
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
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const room = new Room(req.body);
    room.save(function(err, room) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      res.status(201).send(room);
    });
  },
);

router.put('/:roomId', async (req, res) => {
  Room.findOneAndUpdate(
    { _id: req.params.roomId },
    req.body,
    {
      new: true,
    },
    (err, room) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      if (!room) res.sendStatus(404);
      else res.status(200).send(room);
    },
  );
});

router.delete('/:roomId', async (req, res) => {
  const devices = await Device.find({ roomId: req.params.roomId });
  devices.forEach(device => {
    device.roomId = { name: 'none' };
    device.save();
  });

  Room.findOneAndDelete({ _id: req.params.roomId }, (err, room) => {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }
    if (!room) res.sendStatus(404);
    else res.sendStatus(200);
  });
});

router.post('/:roomId/toggleAllLights', async (req, res) => {
  const deviceIds = (await Device.find({ roomId: req.params.roomId })).map(
    device => device._id,
  );
  const attachments = await Attachment.find({
    deviceId: { $in: deviceIds },
    type: 'light',
  });

  attachments.forEach(att => {
    const isOn = att.characteristics.isOn;
    isOn.value = !isOn.value;
    att.save(function(err, attachment) {
      if (err) return console.error(err);
      const topic = att.type + 's/' + att.deviceId + '/' + attachment.pinNumber;
      const message = isOn.value ? 'on' : 'off';
      console.log('Sending MQTT:', topic, message);
      mqtt.sendMqtt(topic, message);
    });
  });
  res.sendStatus(200);
});

module.exports = router;
