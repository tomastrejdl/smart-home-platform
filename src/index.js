const express = require('express');
const fs = require('fs');
const sendMqtt = require('./mqtt');
const sendTyua = require('./tyua');
const lightsRouter = require('./api/lights');
const devicesRouter = require('./api/crud/devices');
const roomsRouter = require('./api/crud/rooms');
const cors = require('cors');

var mongoose = require('mongoose');

const STATE_FILE = 'data/light-state.json';
const LIGHTS_TOPIC = 'toms-room/lights';

const app = express();
app.use(express.json());

app.use(cors());
app.options('*', cors()); // include before other routes

app.use('/api/v1/lights', lightsRouter);
app.use('/api/v1/devices', devicesRouter);
app.use('/api/v1/rooms', roomsRouter);

app.get('/', (req, res) => {
  res.send(`Use GET /api/v1/status to get the current state.
    Use POST /api/v1/order with {targetState: state} to turn on/off.`);
});

app.listen(3000);
console.log('Server listening on post 3000...');

var mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
mongoose.connect('mongodb://localhost:27017/smarthome');
var db = mongoose.connection;

const Device = require('./schema/Device');

db.on('error', console.error.bind(console, 'connection to mongoDB error:'));

db.once('open', async function() {
  console.log('Connection to MongoDB Successful!');

  // var device1 = new Device({
  //   name: 'TestLight',
  //   macAddress: 'AB12:xx',
  //   type: 'light',
  //   controlType: 'on-off',
  //   pin: 2,
  //   state: 'off',
  // });

  // // save model to database
  // device1.save(function(err, device) {
  //   if (err) return console.error(err);
  //   console.log(device.name + ' saved to devices collection.');
  // });

  // const devices = await Device.find({ type: 'ESP8266' });
  // console.log('Devices: ', devices);
});
