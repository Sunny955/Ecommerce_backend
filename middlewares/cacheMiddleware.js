const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 3600 * 12, checkperiod: 600 }); //  auto-check every 10 minutes

// Cache middleware function
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = req.originalUrl || req.url;
    console.log("key-->", key);
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
      return res.send(JSON.parse(cachedResponse));
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        cache.set(key, body, duration);
        res.sendResponse(body);
      };
      next();
    }
  };
};

module.exports = { cacheMiddleware, cache };
