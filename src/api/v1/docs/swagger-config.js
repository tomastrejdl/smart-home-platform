const express = require('express');
const router = express.Router();

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger set up
const options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Home Platform by Tomáš Trejdl',
      version: '1.0.0',
      description: 'A REST API to control smart home devices.',
      license: {
        name: 'MIT',
        url: 'https://choosealicense.com/licenses/mit/',
      },
      contact: {
        name: 'Tomáš Trejdl',
        url: 'https://github.com/tomastrejdl',
        email: 'tom.trejdl@seznam.cz',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
      },
    ],
  },
  apis: [
    './src/api/v1/routes/rooms.js',
    './src/api/v1/routes/devices.js',
    './src/api/v1/routes/attachments.js',
    './src/api/v1/model/Room.js',
    './src/api/v1/model/Event.js',
    './src/api/v1/model/Device.js',
    './src/api/v1/model/Attachment.js',
  ],
};
const specs = swaggerJsdoc(options);
router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(specs, {
    explorer: true,
  }),
);

module.exports = router;
