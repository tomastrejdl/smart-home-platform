const express = require('express');
const LIGHTS_TOPIC = 'toms-room/lights';
const sendMqtt = require('../mqtt');
const sendTyua = require('../tyua');
const router = express.Router();

const Device = require('../schema/Device');

router.get('/status', async (req, res) => {
  const devices = await Device.find({ name: req.query.lightName });

  if (devices[0]) {
    res.send({ currentState: devices[0].currentState == 'on' ? true : false });
  } else {
    res.send('Device not found');
  }
});

router.post('/order', (req, res) => {
  const lightName = req.query.lightName;
  if (lightName) {
    const targetState = req.body.targetState ? 'on' : 'off';

    Device.updateOne(
      { name: req.query.lightName },
      { currentState: targetState },
      err => err && console.log(err),
    );

    console.log('Turning light ' + lightName + ' ' + targetState);
    sendMqtt(LIGHTS_TOPIC, lightName + ' ' + targetState);

    if (lightName == 'desk') sendTyua(targetState == 'on' ? true : false);

    res.send({ success: true, currentState: targetState });
  } else {
    res.send({
      success: false,
      message: "Required parameter 'lightName' is missing. ",
    });
  }
});

module.exports = router;
