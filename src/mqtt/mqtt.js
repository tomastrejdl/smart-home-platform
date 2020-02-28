var mqtt = require('mqtt');
const fs = require('fs');
const sendTuya = require('./tuya');
const STATE_FILE = 'data/light-state.json';
const LIGHTS_TOPIC = 'toms-room/lights';
// const mqttBroker = 'mqtt://raspberrypi.local';
const mqttBroker = 'mqtt://localhost';
var client = mqtt.connect(mqttBroker);

const Device = require('../model/Device');
const Room = require('../model/Room');
const Attachment = require('../model/Attachment');

let listeners = {};

client.on('connect', function() {
  console.log('Connected to MQTT broker at ', mqttBroker);
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

  if (topic == 'global/isOnlineReport') {
    const device = await Device.findOne({ macAddress: payload.macAddress });
    if (device) {
      const room = await Room.findById(device.roomId);
      const attachments = await Attachment.find({ deviceId: device._id });

      attachments.forEach(attachment =>
        sendMqtt(
          'global/' + device.macAddress,
          JSON.stringify({
            roomId: room._id,
            deviceId: device._id,
            pinNumber: attachment.pinNumber,
          }),
        ),
      );
    }
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

module.exports = { sendMqtt, on };
