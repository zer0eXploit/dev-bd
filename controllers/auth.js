const crypto = require('crypto');

// Models
const User = require('../models/User');

// Middlewares
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/asyncHandler');

// Utils
const sendEmail = require('../utils/email');

// @desc    Register a user
// @route   POST /api/v1/auth/register
// @access  Public
exports.authRegister = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  sendTokenResponse(user, 200, res);
});

// @desc    Logs a user in
// @route   POST /api/v1/auth/login
// @access  Public
exports.authLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new ErrorResponse(`Please enter username and password.`, 400));

  const user = await User.findOne({
    email,
  }).select('+password');

  if (!user) return next(new ErrorResponse(`Bad credentials.`, 401));

  const pwCorrect = await user.isPasswordCorrect(password);

  if (!pwCorrect) return next(new ErrorResponse(`Bad credentials.`, 401));

  sendTokenResponse(user, 200, res);
});

// @desc    Logs a user out
// @route   POST /api/v1/auth/logout
// @access  Public
exports.authLogout = asyncHandler(async (req, res, next) => {
  res.cookie('token', '', {
    expires: new Date(Date.now() - 10 * 1000),
    httpOnly: true,
  });

  res.status(204).end();
});

// @desc    Request password reset email.
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.authForgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) return next(new ErrorResponse(`Email address is required.`, 400));

  const user = await User.findOne({ email });

  if (!user)
    return next(
      new ErrorResponse(
        `${email} is not associated with an existing user.`,
        404,
      ),
    );

  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const url = `/api/v1/auth/reset-password/${resetToken}`;
  const fullResetPasswordUrl = `${req.protocol}://${req.get('host')}${url}`;
  const subject = 'Password Reset Email';
  const text = `Please make a PUT request to the following url.\n${fullResetPasswordUrl}`;

  try {
    await sendEmail({ email: user.email, subject, text });
  } catch (e) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse(`Error sending password reset email.`, 500));
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Reset password.
// @route   PUT /api/v1/auth/reset-password/:resetToken
// @access  Public
exports.authResetPassword = asyncHandler(async (req, res, next) => {
  const resetTokenDigest = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: resetTokenDigest,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return next(new ErrorResponse(`Invalid token provided.`, 400));

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Update User's Name and Email Address
// @route   PUT /api/v1/auth/me/update-info
// @access  Private
exports.authUpdateInfo = asyncHandler(async (req, res, next) => {
  const { name, email } = req.body;

  if (!name || !email)
    return next(new ErrorResponse(`Name and Email required.`, 400));

  let user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse(`User not found.`, 404));
  }

  user = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update Password
// @route   PUT /api/v1/auth/update-password
// @access  Public
exports.authUpdatePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return next(new ErrorResponse(`Please enter old and new passwords.`, 400));

  const user = await User.findById(req.user.id).select('+password');
  const pwCorrect = await user.isPasswordCorrect(oldPassword);

  if (!pwCorrect)
    return next(new ErrorResponse(`Incorrect old password.`, 401));

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Get logged in user information.
// @route   GET /api/v1/auth/me
// @access  Private
exports.authGetMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse(`User not found.`, 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// Attach cookie to response and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedToken();

  const option = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 3600 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'Production') {
    option.secure = true;
  }

  return res.status(statusCode).cookie('token', token, option).json({
    success: true,
    token,
  });
};
