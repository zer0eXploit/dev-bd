// @desc    Route Protector. Extracts jwt if exists and verifies it.
//          Attaches the user object to req if token is verified.

// Main imports
const jwt = require('jsonwebtoken');

// Middlewares
const asyncHandler = require('./asyncHandler');

// Utils
const ErrorResponse = require('../utils/errorResponse');

// Models
const User = require('../models/User');

exports.protect = asyncHandler(async (req, res, next) => {
  const UNAUTHORIZED = 'Not authorized to access this resource.';
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  //   If the token is attached in cookies,
  //   else (req.cookies.token) {
  //       token = req.cookies.token
  //   }

  if (!token) return next(new ErrorResponse(`${UNAUTHORIZED}`, 401));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        new ErrorResponse(`Token is not associated with a user anymore.`, 401),
      );
    }

    req.user = user;

    next();
  } catch (e) {
    return next(new ErrorResponse(`${UNAUTHORIZED}`, 401));
  }
});

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Certain permission is not met to access this resource.`,
          403,
        ),
      );
    }

    next();
  };
};
