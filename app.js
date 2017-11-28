const fs = require('fs');

const express = require('express');
const sync = require('fh-sync');
const cors = require('cors');
const bodyParser = require('body-parser');

const session = require('express-session');
const Keycloak = require('keycloak-connect');

const apiKeyAuth = require('./src/api-key-auth');

const keycloakConfigPath = process.env.SYNC_KEYCLOAK_CONFIG || '/etc/secrets/keycloak/bearer_installation';
const apiKeyConfigPath = process.env.API_KEY_CONFIG || '/etc/secrets/mcp-mobile-keys/apiKeys';

const promClient = require('prom-client');

const collectDefaultMetrics = promClient.collectDefaultMetrics;

// Probe every 5th second.
collectDefaultMetrics({ timeout: 5000 });

/**
 * Temporary fix for secret output not having a .json extension, this should be
 * fixed in the secret creation itself. Once that is done this should be
 * removed.
 *
 * @param {string} filePath Path to the JSON file
 */
const requireJSON = function (filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

var keycloakConfig;
var apiKeyConfig;

try {
  keycloakConfig = requireJSON(keycloakConfigPath);
  console.log('Keycloak config found, Keycloak auth is enabled');
} catch(e) {
  console.log(`Keycloak config not found at ${keycloakConfigPath}, Keycloak auth will not be enabled`, e);
}

try {
  apiKeyConfig = requireJSON(apiKeyConfigPath);
  console.log('API Keys found, API Key auth is enabled');
} catch(e) {
  console.log(`API Keys not found at ${apiKeyConfigPath}, API Key auth will not be enabled`, e);
}

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
  if (keycloakConfig) {
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
    }, keycloakConfig);

    app.use(keycloak.middleware());
  }


  /**
   * Filter each action, check whether the user sending the request has the
   * ability to perform the action. There are only two roles in relation to
   * authorization, sync_user_read and sync_user_write, these should map to the
   * sync actions: create, update and delete.
   *
   * This assumes that the user is authenticated. Previous middleware should
   * have performed this action.
   *
   * The read-only users should not have anything in their payloads. If they do
   * then delete them.
   *
   * The users with write permissions can have anything they want in their
   * payloads. It would also be possible to narrow down permissions to each
   * individual action instead.
   */
  function filterPendingForPermission(requiredRole) {
    return function(req, res, next) {
      if(keycloakConfig && req.body.pending && req.body.pending.length > 0 && !req.kauth.grant.access_token.hasRole(requiredRole)) {
        console.log('Attempted write without correct permissions');
        req.body.pending = [];
        return next()
      }
      return next();
    }
  }

  /**
   * Small wrapper around Keycloak protect() middleware. Will only perform
   * authorization if the SYNC_ENABLE_AUTH environment variable is defined.
   *
   * This is only useful for a demo app. This should be removed when using sync
   * either with or without authentication for real.
   */
  function protectEndpoint(requiredRole) {
    return function(req, res, next) {
      if (keycloakConfig) {
        return keycloak.protect(requiredRole)(req, res, next);
      } else if (apiKeyConfig) {
        return apiKeyAuth.protect(apiKeyConfig)(req, res, next)
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
  app.post('/sync/:datasetId', protectEndpoint('realm:sync_read'), filterPendingForPermission('realm:sync_write'), function (req, res) {
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

  app.get('/metrics', function (req, res) {
    function getOrMakeHistogram(name, help){
      if (typeof promClient.register.getSingleMetric(name) !== "undefined") {
        return promClient.register.getSingleMetric(name);
      }
      var h = new promClient.Histogram({
        name: name,
        help: help
      });
      
      promClient.register.registerMetric(h);
      return h;
    }

    res.set('Content-Type', promClient.register.contentType);
    sync.getStats(function(err, stats) {
      if (! err) {
        for(var catId in stats) {
          catStats = stats[catId];
          for(var statId in catStats) {
            var catName = "fh_sync_" + catId + "_" + statId;
            catName = catName.toLowerCase().replace(/ /g, "_");
            var statValue = catStats[statId].current;
            if(typeof statValue !== "undefined"){ 
              if(statValue.toString().indexOf(".") > -1){
                statValue = statValue.split(".")[0];
              }
              getOrMakeHistogram(catName, catId + ": " + statId).observe(parseInt(statValue));
            }
          }
        }
      }
      return res.end(promClient.register.metrics());
    });
  });

  app.get('/sys/info/ping', function (req, res) {
    res.send('"OK"');
  });

  /**
   * Returns metrics about the sync server stored in Redis.
   * For example, the size of each queue.
   */
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

