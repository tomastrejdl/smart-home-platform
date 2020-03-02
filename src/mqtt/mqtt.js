var mqtt = require('mqtt');
const config = require('config');
const mqttConfig = config.get('mqtt');
var client = mqtt.connect(mqttConfig.brokerUrl);

const AttachmentType = require('../model/attachment-types');
const Device = require('../model/Device');
const Room = require('../model/Room');
const Attachment = require('../model/Attachment');
const Event = require('../model/Event');
const EventDaily = require('../model/EventDaily');

let listeners = {};

client.on('connect', function() {
  console.log('Connected to MQTT broker at ', mqttConfig.brokerUrl);
  client.publish('global/reportOnlineState');

  // Set all device to offline on startup
  Device.find().then(devices => {
    devices.forEach(device => {
      device.isOnline = false;
      device.save(err => err && console.error(err));
    });
  });

  // Send new config to all devices on statup
  sendConfigToDevice().then(() => {
    console.log('Send new config to all devices!');
  });

  client.subscribe('global/#', err => {
    if (err) console.error('Error: Failed to subscribe to topic');
  });
});

client.on('message', async function(topic, message) {
  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (err) {}
  console.log('MQTT: ', topic, payload);

  if (listeners[topic]) {
    for (let i = 0; i < listeners[topic].length; i++)
      listeners[topic][i](payload);
  }

  switch (topic) {
    case 'global/deviceState':
      onDeviceState(payload);
      break;
    case 'global/temperature':
      onTemperatureEvent(payload);
      break;
    case 'global/door':
      onDoorEvent(payload);
      break;
    default:
    // console.log('No handler for topic: ', topic);
  }
});

// -----------------------------------------------------------------
// TOPIC HANDLERS

async function onDeviceState(payload) {
  const device = await Device.findOne({ macAddress: payload.macAddress });
  if (device) {
    device.isOnline = payload.isOnline;
    if (payload.isOnline) sendConfigToDevice(payload.macAddress);
    device.save(err => err && console.error(err));
  } else {
    console.log('Device ' + payload.macAddress + ' not yet setup');
  }
}

async function onTemperatureEvent(payload) {
  const attachment = await Attachment.findById(payload.attachmentId);
  const now = new Date();
  const today = now.setHours(0, 0, 0, 0);

  const today_th = await EventDaily.findOne({
    type: 'temperature',
    timestamp_day: today,
  });
  if (today_th) {
    today_th.values.push(payload.temperature);
    today_th.num_samples += 1;
    today_th.totalTemp += payload.temperature;
    today_th.save(err => err && console.error(err));
  } else {
    const th = new EventDaily({
      attachmentId: payload.attachmentId,
      type: 'temperature',
      timestamp_day: today,
      num_samples: 1,
      sum: payload.temperature,
      values: [payload.temperature],
    });
    th.save(err => err && console.error(err));
  }

  const today_hh = await EventDaily.findOne({
    type: 'humidity',
    timestamp_day: today,
  });
  if (today_hh) {
    today_th.values.push(payload.temperature);
    today_th.num_samples += 1;
    today_th.totalTemp += payload.temperature;
    today_hh.save(err => err && console.error(err));
  } else {
    const hh = new EventDaily({
      attachmentId: payload.attachmentId,
      type: 'humidity',
      timestamp_day: today,
      num_samples: 1,
      sum: payload.humidity,
      values: [payload.humidity],
    });
    hh.save(err => err && console.error(err));
  }

  attachment.characteristics.temperature.value = payload.temperature;
  attachment.characteristics.humidity.value = payload.humidity;
  attachment.save(err => err && console.error(err));
}

async function onDoorEvent(payload) {
  const now = new Date();
  const today = now.setHours(0, 0, 0, 0);

  EventDaily.findOneAndUpdate(
    {
      attachmentId: payload.attachmentId,
      timestamp_day: today,
      type: 'door',
    },
    {
      $set: {
        characteristics: {
          isOpen: payload.isOpen,
        },
      },
      $push: {
        values: { timestamp: now, isOpen: payload.isOpen },
      },
    },
    { upsert: true },
    err => err && console.error(err),
  );
}

// -----------------------------------------------------------------

function on(topic, callback) {
  if (listeners[topic] == undefined) listeners[topic] = [];
  listeners[topic].push(callback);
}

function send(topic, data) {
  if (client.connected == true) client.publish(topic, data);
  else console.error('Error: Client disconnedted from MQTT broker.');
}

async function sendConfigToDevice(macAddress) {
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
            send(
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

module.exports = { send, sendConfigToDevice, on };
