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
  .catch(err => console.log('Tyua device not found'));

// Add event listeners
device.on('connected', () => {
  console.log('Connected to Tyua device!');
});

device.on('disconnected', () => {
  console.log('Disconnected from Tyua device.');
});

device.on('error', error => {
  console.log('Error!', error);
});

function sendTyua(value) {
  if (device.isConnected()) {
    device.set({ set: value });
  } else {
    console.error('Error: Tyua device disconnected');
  }
}

module.exports = sendTyua;
