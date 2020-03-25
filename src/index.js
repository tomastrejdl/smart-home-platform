const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const expressSanitizer = require('express-sanitizer');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');

// Console log colors
const logger = require('./utils/logger');

const apiV1Router = require('./api/v1');

const dotenv = require('dotenv');
dotenv.config();

const app = express();
const http = require('http').createServer(app);

app.use(express.json());

/* Helmet */
app.use(helmet());

// Sets "Referrer-Policy: same-origin".
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

// Frameguard
app.use(helmet.frameguard({ action: 'deny' }));

/* Set Content-Security-Policy header */
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-eval'",
        'https://unpkg.com',
        'https://storage.googleapis.com',
      ],
      connectSrc: ["'self'", 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  }),
);

// Mount express-sanitizer middleware here
app.use(expressSanitizer());

// Sanitize user-supplied data to prevent MongoDB Operator Injection
app.use(mongoSanitize());

// Enable CORS in developement
if (process.env.NODE_ENV == 'development') {
  app.use(cors());
  app.options('*', cors()); // include before other routes
}

/* USER INPUT SANITIZATION */
app.use(function(req, res, next) {
  // replace HTTP posted data with the sanitized strings
  const sanitizedBody = req.sanitize(JSON.stringify(req.body));
  const sanitizedQuerry = req.sanitize(JSON.stringify(req.query));
  const sanitizedParams = req.sanitize(JSON.stringify(req.params));

  logger(req.method + ' ' + req.url).log(sanitizedBody);

  // replace the request data with sanitized data
  req.body = JSON.parse(sanitizedBody);
  req.query = JSON.parse(sanitizedQuerry);
  req.params = JSON.parse(sanitizedParams);

  next();
});

// Return api usage info
app.get('/api', (req, res) => {
  res.send(`Use GET /api/v1/status to get the current state.
    Use POST /api/v1/order with {targetState: state} to turn on/off.`);
});

/* API */
app.use('/api/v1', apiV1Router);

/* Serve static assets for frontend */
app.use(express.static(path.join(__dirname, '../frontend-dist')));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend-dist', 'index.html'));
});

http.listen(process.env.PORT);
console.log(`Server listening on port ${process.env.PORT}...`);
logger('INFO').warn(
  `Don't forget to build the frontend and copy the dist files to frontend-dist`,
);

// Mongoose setup
mongoose.set('useFindAndModify', false);
mongoose.connect('mongodb://localhost:27017/smarthome', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection to mongoDB error:'));
db.once('open', () => console.log('Connection to MongoDB Successful!'));
