const express = require('express');
const sync = require('fh-sync');
const cors = require('cors');
const bodyParser = require('body-parser');

var mongodbConnectionString;

if (process.env.MONGO_CONNECTION_URL) {
  mongodbConnectionString = process.env.MONGO_CONNECTION_URL;
} else if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD && process.env.MONGODB_SERVICE_PORT) {
// running in kubernetes/openshift
  mongodbConnectionString = `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@mongodb:${process.env.MONGODB_SERVICE_PORT}/sync`;
} else {
  mongodbConnectionString = 'mongodb://127.0.0.1:27017/sync';
}

var redisUrl;
if (process.env.REDIS_CONNECTION_URL) {
  redisUrl = process.env.REDIS_CONNECTION_URL;
} else if (process.env.REDIS_SERVICE_PORT) {
  // running in kubernetes/openshift
  redisUrl = `redis://redis:${process.env.REDIS_SERVICE_PORT}`;
} else {
  redisUrl = 'redis://127.0.0.1:6379';
}

var mongoOptions = {
  server: {
    poolSize: 50
  }
};
sync.connect(mongodbConnectionString, mongoOptions, redisUrl, function startApplicationServer (err) {
  if (err) {
    throw err;
  }

  const app = express();

    // middleware
  app.use(bodyParser.json());
  app.use(cors());

  app.get('/', function (req, res) {
    res.send('"OK"');
  });

  /**
   * Sync express api required for sync clients
   * All sync clients will call that endpoint to sync data
   */
  app.post('/sync/:datasetId', function (req, res) {
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

  var port = process.env.SERVER_PORT;
  app.listen(port, function () {
    console.log(`\nServer listening on port ${port}!`);
  });
});
