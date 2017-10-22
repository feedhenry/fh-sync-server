/**
 * Middleware to protect a service based on whether is has provided a valid API
 * key.
 */
function _protect(apiKeys, req, res, next) {
  const appID = req.header('app_id');
  const appKey = req.header('app_key');
  // Only continue if the keys match up
  if (appID && appKey && apiKeys[appID] === appKey) {
    return next();
  }
  res.status(403);
  return res.end('Access denied');
}

function protect(apiKeys) {
  return _protect.bind(null, apiKeys);
}

module.exports = { protect };
