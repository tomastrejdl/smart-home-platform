const express = require('express');
const fs = require('fs');
const sendMqtt = require('./mqtt');
const sendTyua = require('./tyua');
const lightsRouter = require('./api/lights');
const cors = require('cors');

var mongoose = require('mongoose');

const STATE_FILE = 'data/light-state.json';
const LIGHTS_TOPIC = 'toms-room/lights';

const app = express();
app.use(express.json());

app.use(cors());
app.options('*', cors()); // include before other routes

app.use('/api/v1/lights', lightsRouter);

app.get('/', (req, res) => {
  res.send(`Use GET /api/v1/status to get the current state.
    Use POST /api/v1/order with {targetState: state} to turn on/off.`);
});

const initialState = {
  lights: {
    bed: 'off',
    desk: 'off',
  },
};

fs.readFile(STATE_FILE, (err, buf) => {
  if (err) {
    fs.writeFile(STATE_FILE, JSON.stringify(initialState), err => {
      if (!err) console.log('Initial state written to file.');
      else console.error('Error: Initial state could not be written to file.');
    });
  }
});

app.listen(3000);
console.log('Server listening on post 3000...');
