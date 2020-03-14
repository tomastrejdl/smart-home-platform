/**
 * Attachment types
 *
 * @example
 *    const AttachmentType = require('./attachment-type.js)
 *    if(payload.type == AttachmentType.LIGHT) ...
 */
const light = 'light',
  socket = 'socket',
  temperatureSensor = 'temperature-sensor',
  doorSensor = 'door-sensor';

module.exports = {
  ALL: [light, socket, temperatureSensor, doorSensor],
  LIGHT: light,
  SOCKET: socket,
  TEMPERATURE_SENSOR: temperatureSensor,
  DOOR_SENSOR: doorSensor,
};
