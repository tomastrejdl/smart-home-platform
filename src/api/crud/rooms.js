const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Device = require('../../model/Device');
const Room = require('../../model/Room');

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

module.exports = router;
