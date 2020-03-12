const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const apiV1Router = require('./api/v1');

/* Dotenv config */
const dotenv = require('dotenv');
dotenv.config();

/* SSL sertificates */
const fs = require('fs');
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

const app = express();
var https = require('https').createServer(options, app);

/* Express stuff */
app.use(express.json());
app.use(cors());
app.options('*', cors()); // include before other routes
app.use('/api/v1', apiV1Router);

// Serve static assets for frontend
app.use(express.static('frontend-dist'));

// Frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend-dist', 'index.html'));
});

app.get('/api', (req, res) => {
  res.send(`Use GET /api/v1/status to get the current state.
    Use POST /api/v1/order with {targetState: state} to turn on/off.`);
});

https.listen(process.env.PORT);
console.log(`Server listening on port ${process.env.PORT}...`);

// Mongoose setup
mongoose.set('useFindAndModify', false);
mongoose.connect('mongodb://localhost:27017/smarthome', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection to mongoDB error:'));
db.once('open', () => console.log('Connection to MongoDB Successful!'));
