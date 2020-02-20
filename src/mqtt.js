var mqtt = require('mqtt');
const fs = require('fs');
const sendTyua = require('./tyua');
const STATE_FILE = 'data/light-state.json';
const LIGHTS_TOPIC = 'toms-room/lights';
// const mqttBroker = 'mqtt://raspberrypi.local';
const mqttBroker = 'mqtt://localhost';
var client = mqtt.connect(mqttBroker);

client.on('connect', function() {
  console.log('Connected to MQTT broker at ', mqttBroker);
  client.subscribe(LIGHTS_TOPIC, err => {
    if (err) console.error('Error: Failed to subscribe to topic');
  });
});

client.on('message', function(topic, message) {
  const payload = message.toString().split(' ');
  const state = JSON.parse(fs.readFileSync(STATE_FILE));
  state[payload[0]] = payload[1];
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  if (payload[0] == 'desk') {
    sendTyua(payload[1] == 'on' ? true : false);
  }
  if (payload[0] == 'all') {
    sendTyua(payload[1] == 'on' ? true : false);
    // Turn on other lights
  }
});

function sendMqtt(topic, data) {
  if (client.connected == true) client.publish(topic, data);
  else console.error('Error: Client disconnedted from MQTT broker.');
}

module.exports = sendMqtt;
