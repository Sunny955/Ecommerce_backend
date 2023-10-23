function timeoutMiddleware(ms) {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      res.status(408).json({ success: false, message: "Request timed out" });
    }, ms);

    res.on("finish", () => clearTimeout(timeout));
    next();
  };
}

module.exports = { timeoutMiddleware };
