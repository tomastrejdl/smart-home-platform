/**
 * Attachment types
 *
 * @example
 *    const AttachmentType = require('./attachment-type.js)
 *    if(payload.type == AttachmentType.LIGHT) ...
 */
module.exports = {
  LIGHT: 'light',
  SOCKET: 'socket',
  TEMPERATURE_SENSOR: 'temperature-sensor',
  DOOR_SENSOR: 'door-sensor',
};
