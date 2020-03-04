const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Device = require('../model/Device');
const Attachment = require('../model/Attachment');
const Room = require('../model/Room');
const mqtt = require('../../../mqtt/mqtt');

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management
 */

/**
 * @swagger
 * path:
 *  /rooms/:
 *    get:
 *      summary: Get a list of all rooms
 *      tags: [Rooms]
 *      responses:
 *        "200":
 *          description: List of rooms
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Device'
 */
router.get('/', async (req, res) => {
  const rooms = await Room.find({}, err => err && console.log(err));
  res.send(rooms);
});

/**
 * @swagger
 * path:
 *  /rooms/{roomId}:
 *    get:
 *      summary: Get a room by id
 *      tags: [Rooms]
 *      parameters:
 *        - in: path
 *          name: roomId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the room
 *      responses:
 *        "200":
 *          description: A room object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Room'
 */
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

/**
 * @swagger
 * path:
 *  /rooms/:
 *    post:
 *      summary: Create room
 *      tags: [Rooms]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Room'
 *      responses:
 *        "201":
 *          description: Created room
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Room'
 */
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
    room.save((err, room) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      res.status(201).send(room);
    });
  },
);

/**
 * @swagger
 * path:
 *  /rooms/{roomId}:
 *    put:
 *      summary: Update a room by id
 *      tags: [Rooms]
 *      parameters:
 *        - in: path
 *          name: roomId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the room
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Room'
 *      responses:
 *        "200":
 *          description: Updated room object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Room'
 */
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

/**
 * @swagger
 * path:
 *  /rooms/{roomId}:
 *    delete:
 *      summary: Delete a room by id
 *      tags: [Rooms]
 *      parameters:
 *        - in: path
 *          name: roomId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the room
 *      responses:
 *        "200":
 *          description: The deleted room object
 */
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

/**
 * @swagger
 * path:
 *  /rooms/{roomId}/toggleAllLights:
 *    post:
 *      summary: Toggle all lights in a room, identified by ID
 *               Switch all lights from on to off and vice versa
 *      tags: [Rooms]
 *      consumes:
 *        - application/json
 *      parameters:
 *        - in: path
 *          name: roomId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the room
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                 - targetState
 *              properties:
 *                targetState:
 *                  type: boolean
 *      responses:
 *        "200":
 *          description: Switched all lights in room to targetState
 */
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
    isOn.value = req.body.targetState;
    att.save((err, attachment) => {
      if (err) return console.error(err);
      const topic = att.type + 's/' + att.deviceId + '/' + attachment.pin;
      const message = isOn.value ? 'on' : 'off';
      console.log('Sending MQTT:', topic, message);
      mqtt.send(topic, message);
    });
  });
  res.sendStatus(200);
});

module.exports = router;
