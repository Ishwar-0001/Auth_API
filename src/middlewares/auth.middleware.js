const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  let token;

  // 1. Check if header exists and starts with "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 2. Get the token from the string "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // 3. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Add the user payload to the request object
      // This is what makes "req.user.id" available in your controller!
      req.user = decoded; 

      next(); // Move to the controller
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};