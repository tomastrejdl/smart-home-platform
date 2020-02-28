// Wooox home smart light bulb on Losos je vecny credentials
//     {
//       name: 'Desk Light',
//       id: '00841330ecfabc9fc52e',
//       key: '30654e8cba504372'
//     }
//   ]

const TuyAPI = require('tuyapi');

const device = new TuyAPI({
  id: '00841330ecfabc9fc52e',
  key: '30654e8cba504372',
});

// Find device on network
device
  .find()
  .then(() => {
    // Connect to device
    device.connect();
  })
  .catch(err => console.log('Tuya device not found'));

// Add event listeners
device.on('connected', () => {
  console.log('Connected to Tuya device!');
  sendTuya(true);
});

device.on('disconnected', () => {
  console.log('Disconnected from Tuya device.');
});

device.on('error', error => {
  console.log('Error!', error);
});

function sendTuya(value) {
  if (device.isConnected()) {
    console.log('Sending Tyua: ', value);
    device.set({ set: value });
  } else {
    console.error('Error: Tuya device disconnected');
  }
}

module.exports = sendTuya;
