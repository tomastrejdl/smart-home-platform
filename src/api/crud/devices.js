const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Device = require('../../schema/Device');

router.get('/', async (req, res) => {
  const devices = await Device.find({}, err => err && console.log());
  res.send(devices);
});

router.get('/:deviceId', async (req, res) => {
  try {
    const devices = await Device.find({ _id: req.params.deviceId });
    if (devices.length == 1) res.send(devices[0]);
    else res.sendStatus(404);
  } catch (err) {
    res.sendStatus(404);
  }
});

router.post(
  '/',
  [
    check('name')
      .isString()
      .isLength(3),
    check('pin').isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    req.body.state = 'off';
    const device = new Device(req.body);
    device.save(function(err, device) {
      if (err) return console.error(err);
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
      if (err) return console.log(err);
      if (!device) res.sendStatus(404);
      else res.status(200).send(device);
    },
  );
});

router.delete('/:deviceId', async (req, res) => {
  Device.findOneAndDelete({ _id: req.params.deviceId }, (err, device) => {
    if (err) console.error(err);
    if (!device) res.sendStatus(404);
    else res.sendStatus(200);
  });
});

module.exports = router;
