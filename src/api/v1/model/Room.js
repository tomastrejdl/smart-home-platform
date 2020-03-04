const mongoose = require('mongoose');

/**
 * @swagger
 *  components:
 *    schemas:
 *      Room:
 *        type: object
 *        required:
 *          - name
 *        properties:
 *          name:
 *            type: string
 *        example:
 *           name: Living room
 */
const RoomSchema = mongoose.Schema({
  name: String,
});

module.exports = mongoose.model('Room', RoomSchema);
