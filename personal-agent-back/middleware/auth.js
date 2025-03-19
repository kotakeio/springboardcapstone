// middleware/auth.js

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret"; // use an env variable in production

function isAuthenticated(req, res, next) {
  // Look for the token in the Authorization header (format: "Bearer <token>")
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  // Extract the token
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Invalid token format" });
  }

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Token is not valid" });
    }
    // Attach the decoded payload (user info) to the request object
    req.user = decoded;
    next();
  });
}

module.exports = { isAuthenticated };
