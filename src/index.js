const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const expressSanitizer = require('express-sanitizer');

// Console log colors
const chalk = require('chalk');
const log = (topic, message) =>
  console.log(chalk.black.bgGreenBright(`  ${topic}  `) + ' ' + message);

const apiV1Router = require('./api/v1');

const dotenv = require('dotenv');
dotenv.config();

const app = express();
var http = require('http').createServer(app);

app.use(express.json());

// Mount express-sanitizer middleware here
app.use(expressSanitizer());

app.use(cors());
app.options('*', cors()); // include before other routes

app.all('/*', function(req, res, next) {
  // replace an HTTP posted body property with the sanitized string
  const sanitizedBody = req.sanitize(JSON.stringify(req.body));
  log(req.method + ' ' + req.url, sanitizedBody);
  // replace the request body with sanitized body
  req.body = JSON.parse(sanitizedBody);
  next();
});

app.get('/api', (req, res) => {
  res.send(`Use GET /api/v1/status to get the current state.
    Use POST /api/v1/order with {targetState: state} to turn on/off.`);
});

/* API */
app.use('/api/v1', apiV1Router);

/* Serve static assets for frontend */
app.use(express.static('frontend-dist'));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend-dist', 'index.html'));
});

http.listen(process.env.PORT);
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
