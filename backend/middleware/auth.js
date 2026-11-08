// middleware/auth.js
// Protects routes by verifying the JWT token sent in the Authorization header.
// Usage: add requireAuth as middleware to any route that needs a logged-in user.
// On success, attaches decoded token payload (id, role) to req.user.

const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;

  // Expect header format: "Bearer <token>"
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role, iat, exp }
    next();
  } catch {
    // Token expired or tampered
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { requireAuth };
