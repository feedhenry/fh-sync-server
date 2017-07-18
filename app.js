const express = require('express');
const sync = require('fh-sync');
const cors = require('cors');
const bodyParser = require('body-parser');

const mongodbConnectionString = process.env.MONGO_CONNECTION_URL || 'mongodb://127.0.0.1:27017/sync';
const redisUrl = process.env.REDIS_CONNECTION_URL || 'redis://127.0.0.1:6379';

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
