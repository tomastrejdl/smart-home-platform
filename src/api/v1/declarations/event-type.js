/**
 * Event types
 *
 * @example
 *    const EventType = require('./event-type.js)
 *    if(event.type == EventType.DOOR) ...
 */
const temperatureHumidity = 'temperature-humidity',
  door = 'door';

module.exports = {
  ALL: [temperatureHumidity, door],
  TEMPERATURE_HUMIDITY: temperatureHumidity,
  DOOR: door,
};
