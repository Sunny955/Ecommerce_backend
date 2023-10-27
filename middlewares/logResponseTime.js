const fs = require("fs");

const logResponseTime = (req, res, next) => {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;

    if (elapsedTimeInMs > 5000) {
      const log = `API took ${elapsedTimeInMs}ms to respond. Route: ${
        req.method
      } ${req.originalUrl} at ${new Date().toISOString()}\n`;

      fs.appendFile("response_times.log", log, (err) => {
        if (err) console.error("Error logging response time:", err);
      });
    }
  });

  next();
};

module.exports = logResponseTime;
