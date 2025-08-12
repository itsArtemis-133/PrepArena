// server/middleware/optionalAuth.js
const jwt = require("jsonwebtoken");

module.exports = (req, _res, next) => {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) {
    const token = h.split(" ")[1];
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch {}
  }
  next();
};
