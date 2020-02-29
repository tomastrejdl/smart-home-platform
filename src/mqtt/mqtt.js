var mqtt = require('mqtt');
const config = require('config');
const mqttConfig = config.get('mqtt');
var client = mqtt.connect(mqttConfig.brokerUrl);

const AttachmentType = require('../model/attachment-types');
const Device = require('../model/Device');
const Room = require('../model/Room');
const Attachment = require('../model/Attachment');
const Event = require('../model/Event');

let listeners = {};

client.on('connect', function() {
  console.log('Connected to MQTT broker at ', mqttConfig.brokerUrl);
  client.subscribe('global/#', err => {
    if (err) console.error('Error: Failed to subscribe to topic');
  });
});

client.on('message', async function(topic, message) {
  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (err) {}
  console.log('MQTT ', topic, payload);

  if (listeners[topic]) {
    for (let i = 0; i < listeners[topic].length; i++)
      listeners[topic][i](payload);
  }

  if (topic == 'global/deviceState') {
    const device = await Device.find({ macAddress: payload.macAddress });
    if (payload.state == 'online') {
      device.isOnline = true;
      sendConfigToDevice(payload.macAddress);
    }
    if (payload.state == 'offline') {
      device.isOnline = false;
    }
    device.save(async function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
    });
  }

  if (topic == 'global/temperature') {
    const attachment = await Attachment.findById(payload.attachmentId);
    const event = new Event({
      attachmentId: payload.attachmentId,
      type: 'temperature-humidity',
      time: Date.now(),
      message: { temperature: payload.temperature, humidity: payload.humidity },
    });
    event.save(async function(err, event) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
    });
    attachment.characteristics.temperature.value = payload.temperature;
    attachment.characteristics.humidity.value = payload.humidity;
    attachment.save(async function(err, attachment) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
    });
  }

  if (topic == 'global/door') {
    const attachment = await Attachment.findById(payload.attachmentId);
    const event = new Event({
      attachmentId: payload.attachmentId,
      type: 'door',
      time: Date.now(),
      message: { state: payload.state },
    });
    attachment.characteristics.isOpen.value =
      payload.state == 'open' ? true : false;
    attachment.save(async function(err, attachment) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }
    });
  }

  //   const state = JSON.parse(fs.readFileSync(STATE_FILE));
  //   state[payload[0]] = payload[1];
  //   fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  //   if (payload[0] == 'desk') {
  //     sendTuya(payload[1] == 'on' ? true : false);
  //   }
  //   if (payload[0] == 'all') {
  //     sendTuya(payload[1] == 'on' ? true : false);
  //     // Turn on other lights
  //   }
});

function on(topic, callback) {
  if (listeners[topic] == undefined) listeners[topic] = [];
  listeners[topic].push(callback);
}

function sendMqtt(topic, data) {
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
      const room = await Room.findById(device.roomId);
      const attachments = await Attachment.find({ deviceId: device._id });

      attachments.forEach(attachment =>
        sendMqtt(
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
            doorInterval:
              attachment.type == AttachmentType.DOOR_SENSOR
                ? attachment.characteristics.isOpen.interval
                : 0,
          }),
        ),
      );
    }
  });
}

// Send new config to all devices on statup
sendConfigToDevice().then(() => {
  console.log('Send new config to all devices!');
});

module.exports = { sendMqtt, on };
