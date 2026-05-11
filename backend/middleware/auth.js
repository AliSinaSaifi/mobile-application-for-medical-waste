const jwt = require('jsonwebtoken');

// Verify JWT token
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Must be logged in AND have admin role
function isAdmin(req, res, next) {
  authenticate(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
}

module.exports = { authenticate, isAdmin };