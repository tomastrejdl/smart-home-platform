const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Device = require('../model/Device');
const Attachment = require('../model/Attachment');
const Room = require('../model/Room');
const mqtt = require('../mqtt/mqtt');

router.get('/', async (req, res) => {
  const devices = await Device.find({}, err => err && console.log());
  res.send(devices);
});

router.get('/searchDevices', async (req, res) => {
  const usedMacs = (await Device.find({})).map(device => device.macAddress);
  console.log(usedMacs);

  let foundDevices = [];
  mqtt.on('global/discoveryResponse', function(message) {
    if (!usedMacs.includes(message.macAddress)) foundDevices.push(message);
  });
  mqtt.sendMqtt('global/discovery', 'report');
  setTimeout(() => res.status(200).send(foundDevices), 1000);
});

router.get('/:deviceId', async (req, res) => {
  try {
    const devices = await Device.find({ _id: req.params.deviceId });
    if (devices.length == 1) res.send(devices[0]);
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
    check('macAddress').isMACAddress(),
    check('roomId')
      .optional({ nullable: true })
      .isMongoId(),
  ],
  async (req, res) => {
    const roomIds = (await Room.find({})).map(room => room._id);
    await check('roomId', 'Not a valid room id')
      .optional({ nullable: true })
      .isIn(roomIds)
      .run(req);

    const usedMacs = (await Device.find({})).map(device => device.macAddress);
    await check('macAddress', 'A device with this MAC adress is already setup')
      .not()
      .isIn(usedMacs)
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const device = new Device(req.body);
    device.isOnline = true;
    device.save(function(err, device) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      res.status(201).send(device);
    });
  },
);

router.put('/:deviceId', async (req, res) => {
  Device.findOneAndUpdate(
    { _id: req.params.deviceId },
    req.body,
    {
      new: true,
    },
    (err, device) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }
      if (!device) res.sendStatus(404);
      else res.status(200).send(device);
    },
  );
});

router.delete('/:deviceId', async (req, res) => {
  const attachmetIds = (
    await Attachment.find({ deviceId: req.params.deviceId })
  ).map(attachment => attachment._id);

  Attachment.deleteMany({ deviceId: req.params.deviceId }, err => {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }
  });

  Device.findOneAndDelete({ _id: req.params.deviceId }, (err, device) => {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }
    if (!device) res.sendStatus(404);
    else
      res.status(200).send({
        deletedDevice: device.id,
        deletedAttachments: attachmetIds,
      });
  });
});

module.exports = router;
