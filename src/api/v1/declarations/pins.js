/**
 * ESP8266 Pin definition
 *
 * @example
 *    const Pins = require('./pins.js)
 *    if(payload.pin == Pins.D1) ...
 */
const d1 = 'D1',
  d2 = 'D2',
  d3 = 'D3',
  d4 = 'D4';

module.exports = {
  ALL: [d1, d2, d3, d4],
  D1: d1,
  D2: d2,
  D3: d3,
  D4: d4,
};
