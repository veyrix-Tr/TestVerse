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

// Use after requireAuth on admin-only routes. The role is re-read from the
// database, so taking admin away works at once (not only when the token expires).
const prisma = require('../lib/prisma');

const requireAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true, isActive: true } });
    if (!user || !user.isActive || user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { requireAuth, requireAdmin };
