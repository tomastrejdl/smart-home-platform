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
 *   name: Devices
 *   description: Device management
 */

/**
 * @swagger
 * path:
 *  /devices/:
 *    get:
 *      summary: Get a list of all devices
 *      tags: [Devices]
 *      responses:
 *        "200":
 *          description: List of devices
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Device'
 */
router.get('/', async (req, res) => {
  const devices = await Device.find({}, err => err && console.log());
  res.send(devices);
});

/**
 * @swagger
 * path:
 *  /devices/searchDevices:
 *    get:
 *      summary: Get a list of devices on local network, that are not yet configured
 *      tags: [Devices]
 *      responses:
 *        "200":
 *          description: List of devices
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Device'
 */
router.get('/searchDevices', async (req, res) => {
  const usedMacs = (await Device.find({})).map(device => device.macAddress);
  let foundDevices = [];
  mqtt.on('global/discoveryResponse', message => {
    if (!usedMacs.includes(message.macAddress)) foundDevices.push(message);
  });
  mqtt.send('global/discovery', 'report');
  setTimeout(() => res.status(200).send(foundDevices), 1000);
});

/**
 * @swagger
 * path:
 *  /devices/{deviceId}:
 *    get:
 *      summary: Get a device by id
 *      tags: [Devices]
 *      parameters:
 *        - in: path
 *          name: deviceId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the device
 *      responses:
 *        "200":
 *          description: A device object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Device'
 */
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

/**
 * @swagger
 * path:
 *  /devices/:
 *    post:
 *      summary: Create device
 *      tags: [Devices]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Device'
 *      responses:
 *        "201":
 *          description: Created device
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Device'
 */
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
    device.save((err, device) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
      res.status(201).send(device);
    });
  },
);

/**
 * @swagger
 * path:
 *  /devices/{deviceId}:
 *    put:
 *      summary: Update a device by id
 *      tags: [Devices]
 *      parameters:
 *        - in: path
 *          name: deviceId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the device
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Device'
 *      responses:
 *        "200":
 *          description: Updated device object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Device'
 */
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

/**
 * @swagger
 * path:
 *  /devices/{deviceId}:
 *    delete:
 *      summary: Delete a device by id
 *      tags: [Devices]
 *      parameters:
 *        - in: path
 *          name: deviceId
 *          schema:
 *            type: string
 *          required: true
 *          description: Id of the device
 *      responses:
 *        "200":
 *          description: The deleted device object
 *          content:
 *            application/json:
 *              schema:
 *                deletedDevice:
 *                  type: string
 *                deletedAttachments:
 *                  type: array
 *                  items: string
 */
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
        deletedDevice: device._id,
        deletedAttachments: attachmetIds,
      });
  });
});

module.exports = router;
