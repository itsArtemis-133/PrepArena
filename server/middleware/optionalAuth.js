// server/middleware/optionalAuth.js
const jwt = require("jsonwebtoken");

module.exports = function optionalAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id:
        decoded.id ||
        decoded._id ||
        decoded.sub ||
        decoded.userId ||
        decoded.uid ||
        undefined,
    };
  } catch {
    // ignore malformed/expired tokens for public routes
  }
  next();
};
