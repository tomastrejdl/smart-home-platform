const express = require('express');
const router = express.Router();

const devicesRouter = require('./routes/devices');
const attachmentsRouter = require('./routes/attachments');
const roomsRouter = require('./routes/rooms');
const docsRouter = require('./docs/swagger-config');

router.use('/devices', devicesRouter);
router.use('/attachments', attachmentsRouter);
router.use('/rooms', roomsRouter);
router.use('/docs', docsRouter);

module.exports = router;
