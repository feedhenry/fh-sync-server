const express = require('express');
const sync = require('fh-sync');
const cors = require('cors');
const bodyParser = require('body-parser');

const session = require('express-session');
const Keycloak = require('keycloak-connect');

const authEnabled = !!process.env.SYNC_ENABLE_AUTH;

/**
 * Get configuration for MongoDB to be used with sync.
 */
var mongodbConnectionString;

if (process.env.MONGO_CONNECTION_URL) {
  mongodbConnectionString = process.env.MONGO_CONNECTION_URL;
} else if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD && process.env.MONGODB_SERVICE_PORT) {
  // Openshift/Kubernetes
  mongodbConnectionString = `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@mongodb:${process.env.MONGODB_SERVICE_PORT}/sync`;
} else {
  // Local MongoDB
  mongodbConnectionString = 'mongodb://127.0.0.1:27017/sync';
}

const mongoOptions = {
  server: {
    poolSize: 50
  }
};

/**
 * Get configuration for Redis to be used with sync.
 */
var redisUrl;

if (process.env.REDIS_CONNECTION_URL) {
  redisUrl = process.env.REDIS_CONNECTION_URL;
} else if (process.env.REDIS_SERVICE_PORT) {
  // OpenShift/Kubernetes
  redisUrl = `redis://redis:${process.env.REDIS_SERVICE_PORT}`;
} else {
  // Local Redis
  redisUrl = 'redis://127.0.0.1:6379';
}

/**
 * Start sync, it requires both MongoDB and Redis to be accessible.
 * Once sync is ready, initialise the server itself.
 */
sync.connect(mongodbConnectionString, mongoOptions, redisUrl, function startApplicationServer (err) {
  if (err) {
    throw err;
  }

  const app = express();

  app.use(bodyParser.json());
  app.use(cors());
  app.use(express.static('public'));

  /**
   * Intitialise Keycloak if SYNC_ENABLE_AUTH is defined. It can be any value
   * so this should not be set to false if auth should be disabled, instead it
   * should just not be defined.
   */
  if(authEnabled) {
    console.log('Initialising Keycloak authentication');

    // Initialise the memory store for Keycloak.
    var memoryStore = new session.MemoryStore();
    app.use(session({
      secret: 'replaceme',
      resave: false,
      saveUninitialized: true,
      store: memoryStore
    }));

    var keycloak = new Keycloak({
      store: memoryStore
    });

    app.use(keycloak.middleware());
  }

  /**
   * Small wrapper around Keycloak protect() middleware. Will only perform
   * authorization if the SYNC_ENABLE_AUTH environment variable is defined.
   */
  function protectEndpoint(requiredRole) {
    return function(req, res, next) {
      if(authEnabled) {
        return keycloak.protect(requiredRole)(req, res, next);
      }
      return next();
    }
  }

  app.get('/', function (req, res) {
    res.redirect(301, '/dashboard.html');
  });

  /**
   * Expose sync to clients.
   */
  app.post('/sync/:datasetId', protectEndpoint(), function (req, res) {
    var datasetId = req.params.datasetId;
    var params = req.body;

    // Invoke action in sync for specific dataset
    sync.invoke(datasetId, params, function (err, result) {
      if (err) {
        res.status(500).json(err.toString());
        return;
      }
      return res.json(result);
    });
  });

<<<<<<< 862ca71cda35ec4c7e0d5cc148c37e6fa398d906
  app.get('/sys/info/ping', function (req, res) {
    res.send('"OK"');
  });

=======
  /**
   * Returns metrics about the sync server stored in Redis.
   * For example, the size of each queue.
   */
>>>>>>> FH-3877 Keycloak integration
  app.get('/sys/info/stats', function(req, res) {
    sync.getStats(function(err, stats) {
      if (err) {
        return res.status(500).json({
          message: err.message || 'Could not retrieve sync stats.'
        });
      }
      return res.json({
        metrics: stats
      });
    });
  });

  var port = process.env.SERVER_PORT || 3000;
  app.listen(port, function () {
    console.log(`\nServer listening on port ${port}!`);
  });
});

