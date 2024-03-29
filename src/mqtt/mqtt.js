const mqtt = require('mqtt');
const config = require('config');
const mqttConfig = config.get('mqtt');
const logger = require('../utils/logger')('MQTT');
const validator = require('validator');

const Device = require('../api/v1/model/Device');
const Attachment = require('../api/v1/model/Attachment');
const Event = require('../api/v1/model/Event');

const EventType = require('../api/v1/declarations/event-type');
/**
 * MQTT communication layer
 * Connect to MQTT broker
 * Listen to MQTT topics
 * Publish messages to topics
 */
class Mqtt {
  constructor() {
    this.listeners = {};

    this.client = mqtt.connect(mqttConfig.brokerUrl);

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker at ', mqttConfig.brokerUrl);
      this.client.publish('global/reportOnlineState');

      // Set all device to offline on startup
      Device.find().then(devices => {
        devices.forEach(device => {
          device.isOnline = false;
          device.save(err => err && console.error(err));
        });
      });

      // Send new config to all devices on statup
      this.sendConfigToDevice().then(() => {
        console.log('Send new config to all devices!');
      });

      this.client.subscribe('global/#', err => {
        if (err) console.error('Error: Failed to subscribe to topic');
      });
    });

    this.client.on('message', async (topic, message) => {
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch (err) {
        logger.err(
          'Received malformed JSON message: ',
          message.toString(),
          ' is not a valid JSON!',
        );
        return;
      }

      if (!payload) {
        logger.err(topic, 'Missing payload');
        return;
      }

      if (this.listeners[topic]) {
        for (let i = 0; i < this.listeners[topic].length; i++)
          this.listeners[topic][i](payload);
      }

      switch (topic) {
        case 'global/deviceState':
          this.onDeviceState(payload);
          break;
        case 'global/temperature':
          this.onTemperatureEvent(payload);
          break;
        case 'global/door':
          this.onDoorEvent(payload);
          break;
        default:
          logger.log(topic, payload);
        // console.log('No handler for topic: ', topic);
      }
    });
  }

  // -----------------------------------------------------------------
  // TOPIC HANDLERS

  /**
   * Handle incomming message to topic 'global/deviceState'
   * @param {*} payload
   */
  async onDeviceState(payload) {
    // Validation
    if (!payload.macAddress) {
      logger.err('deviceState', 'Missing parameter: macAddress');
      return;
    }
    if (!payload.isOnline) {
      logger.err('deviceState', 'Missing parameter: isOnline');
      return;
    }
    if (typeof payload.isOnline !== 'boolean') {
      logger.err('door', 'Wrong parameter: isOnline must be a boolean');
      return;
    }
    // end validation
    try {
      const device = await Device.findOne({ macAddress: payload.macAddress });
      if (device) {
        device.isOnline = payload.isOnline;
        if (payload.isOnline) this.sendConfigToDevice(payload.macAddress);
        device.save(err => err && console.error(err));
      } else {
        console.log('Device ' + payload.macAddress + ' not yet setup');
      }
    } catch (err) {
      logger.err('Error: ', err);
    }
  }

  /**
   * Handle incomming message to topic 'global/temperature'
   * @param {*} payload
   */
  async onTemperatureEvent(payload) {
    // Validation
    if (!payload.attachmentId) {
      logger.err('temperature', 'Missing parameter: attachmentId');
      return;
    }
    if (!validator.isMongoId(payload.attachmentId)) {
      logger.err(
        'temperature',
        'Wrong parameter: "' +
          payload.attachmentId +
          '" is not a valid Attachment identifier',
      );
      return;
    }
    if (!payload.temperature) {
      logger.err('temperature', 'Missing parameter: temperature');
      return;
    }
    if (typeof payload.temperature !== 'number') {
      logger.err('door', 'Wrong parameter: temperature must be a number');
      return;
    }
    if (!payload.humidity) {
      logger.err('temperature', 'Missing parameter: humidity');
      return;
    }
    if (typeof payload.humidity !== 'number') {
      logger.err('door', 'Wrong parameter: humidity must be a number');
      return;
    }
    // end validation

    const now = new Date();
    const today = now.setHours(0, 0, 0, 0);

    try {
      Event.findOneAndUpdate(
        {
          attachmentId: payload.attachmentId,
          type: EventType.TEMPERATURE_HUMIDITY,
          timestamp_day: today,
        },
        {
          $push: {
            values: {
              timestamp: new Date(),
              temperature: payload.temperature,
              humidity: payload.humidity,
            },
          },
        },
        { upsert: true },
        err => err && console.error(err),
      );

      const attachment = await Attachment.findById(payload.attachmentId);
      attachment.characteristics.temperature.value = payload.temperature;
      attachment.characteristics.humidity.value = payload.humidity;
      attachment.save(err => err && console.error(err));
    } catch (err) {
      logger.err('Error: ', err);
    }
  }

  /**
   * Handle incomming message to topic 'global/door'
   * @param {*} payload
   */
  async onDoorEvent(payload) {
    // Validation
    if (!payload.attachmentId) {
      logger.err('door', 'Missing parameter: attachmentId');
      return;
    }
    if (!validator.isMongoId(payload.attachmentId)) {
      logger.err(
        'door',
        'Wrong parameter: "' +
          payload.attachmentId +
          '" is not a valid Attachment identifier',
      );
      return;
    }
    if (!payload.isOpen) {
      logger.err('door', 'Missing parameter: isOpen');
      return;
    }
    if (typeof payload.isOpen !== 'boolean') {
      logger.err('door', 'Wrong parameter: isOpen must be a boolean');
      return;
    }
    // end validation

    const today = new Date().setHours(0, 0, 0, 0);

    try {
      Event.findOneAndUpdate(
        {
          attachmentId: payload.attachmentId,
          type: EventType.DOOR,
          timestamp_day: today,
        },
        {
          $push: {
            values: { timestamp: new Date(), isOpen: payload.isOpen },
          },
        },
        { upsert: true },
        err => err && console.error(err),
      );

      const attachment = await Attachment.findById(payload.attachmentId);
      attachment.characteristics.isOpen.value = payload.isOpen;
      attachment.save(err => err && console.log(err));
    } catch (err) {
      logger.err('Error: ', err);
    }
  }

  // -----------------------------------------------------------------

  /**
   * Registeres a callback that is called every time a message is received to reqested topic
   * @param {string} string topic to listen
   * @param {function} callback callback to call
   */
  on(topic, callback) {
    if (this.listeners[topic] == undefined) this.listeners[topic] = [];
    this.listeners[topic].push(callback);
  }

  /**
   * Send/publish data to MQTT topic
   * @param {string} topic
   * @param {object} data
   */
  send(topic, data) {
    if (this.client.connected == true) this.client.publish(topic, data);
    else console.error('Error: Client disconnedted from MQTT broker.');
  }

  /**
   * Send attachment configuration to device
   * @param {string} macAddress optional macAdress of the device, if null sends to all devices
   */
  async sendConfigToDevice(macAddress) {
    let devices = [];
    if (macAddress == null) {
      devices = await Device.find({});
    } else {
      devices[0] = await Device.findOne({ macAddress: macAddress });
    }
    devices.forEach(async device => {
      if (device) {
        const attachments = await Attachment.find({ deviceId: device._id });

        attachments.forEach(attachment => {
          Object.values(attachment.characteristics)
            .filter(char => typeof char == 'object')
            .forEach(ch =>
              this.send(
                'device/' + device.macAddress,
                JSON.stringify({
                  deviceId: device._id,
                  attachmentId: attachment._id,
                  attachmentType: attachment.type,
                  pin: attachment.pin,
                  sampleInterval: ch.sampleInterval,
                  invert: ch.invert,
                }),
              ),
            );
        });
      }
    });
  }
}

module.exports = new Mqtt();
