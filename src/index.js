const express = require('express');
const lightsRouter = require('./api/lights');
const devicesRouter = require('./api/crud/devices');
const attachmentsRouter = require('./api/crud/attachments');
const roomsRouter = require('./api/crud/rooms');
const cors = require('cors');
var mongoose = require('mongoose');

const app = express();
app.use(express.json());

app.use(cors());
app.options('*', cors()); // include before other routes

app.use('/api/v1/lights', lightsRouter);
app.use('/api/v1/devices', devicesRouter);
app.use('/api/v1/attachments', attachmentsRouter);
app.use('/api/v1/rooms', roomsRouter);

app.get('/', (req, res) => {
  res.send(`Use GET /api/v1/status to get the current state.
    Use POST /api/v1/order with {targetState: state} to turn on/off.`);
});

app.listen(3000);
console.log('Server listening on port 3000...');

// Mongoose setup
mongoose.set('useFindAndModify', false);
mongoose.connect('mongodb://localhost:27017/smarthome', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection to mongoDB error:'));
db.once('open', () => console.log('Connection to MongoDB Successful!'));