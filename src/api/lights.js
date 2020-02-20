const express = require('express');
const fs = require('fs');
const STATE_FILE = 'data/light-state.json';
const LIGHTS_TOPIC = 'toms-room/lights';
const sendMqtt = require('../mqtt');
const sendTyua = require('../tyua');
const router = express.Router();

router.get('/status', (req, res) => {
  const state = JSON.parse(fs.readFileSync(STATE_FILE));

  const lightName = req.params.lightName;
  if (lightName) {
    res.send({ currentState: state.lights[lightName] == 'on' ? true : false });
  } else {
    res.send(state);
  }
});

router.post('/order', (req, res) => {
  const lightName = req.query.lightName;
  if (lightName) {
    const state = JSON.parse(fs.readFileSync(STATE_FILE));
    const targetState = req.body.targetState ? 'on' : 'off';
    state.lights[lightName] = targetState;

    fs.writeFile(STATE_FILE, JSON.stringify(state), err => {
      if (err) console.log(err);

      console.log('Turning light ' + lightName + ' ' + targetState);
      sendMqtt(LIGHTS_TOPIC, lightName + ' ' + targetState);

      if (lightName == 'desk') sendTyua(targetState == 'on' ? true : false);

      res.send({ success: true, currentState: targetState });
    });
  } else {
    res.send({
      success: false,
      message: "Required parameter 'lightName' is missing. ",
    });
  }
});

module.exports = router;
