const Course = require('../models/Course');
const Bootcamp = require('../models/Bootcamp');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get courses
// @route   GET /api/v1/courses
// @route   GET /api/v1/bootcamps/:bootcampID/courses
// @access  Public
exports.getCourses = asyncHandler(async (req, res, next) => {
  if (req.params.bootcampID) {
    const courses = await Course.find({
      bootcamp: req.params.bootcampID,
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } else {
    res.status(200).json(res.advancedResults);
  }
});

// @desc    Get a single course
// @route   GET /api/v1/courses/:id
// @access  Public
exports.getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course with ID ${req.params.id} is not found.`, 404),
    );
  }

  res.status(200).json({
    success: true,
    data: course,
  });
});

// @desc    Create a course under a bootcamp
// @route   POST /api/v1/bootcamps/:bootcampID/courses
// @access  Private
exports.createCourse = asyncHandler(async (req, res, next) => {
  const { _id, role } = req.user;

  req.body.bootcamp = req.params.bootcampID;
  req.body.user = _id;

  const bootcamp = await Bootcamp.findById(req.params.bootcampID);

  if (!bootcamp) {
    return next(
      new ErrorResponse(
        `Bootcamp with ID ${req.params.bootcampID} is not found.`,
        404,
      ),
    );
  }

  // Check if current user is not an owner or an admin
  if (!bootcamp.user.equals(_id) && role !== 'admin') {
    return next(
      new ErrorResponse(
        `Permission denied to add a course to ${req.params.bootcampID}.`,
        403,
      ),
    );
  }

  course = await Course.create(req.body);

  res.status(201).json({
    success: true,
    data: course,
  });
});

// @desc    Update a course
// @route   PUT /api/v1/courses/:id
// @access  Private
exports.updateCourse = asyncHandler(async (req, res, next) => {
  const { _id, role } = req.user;
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course with ID ${req.params.id} is not found.`, 404),
    );
  }

  // Check if current user is not an owner or an admin
  if (!course.user.equals(_id) && role !== 'admin') {
    return next(
      new ErrorResponse(`Permission denied to update ${req.params.id}.`, 403),
    );
  }

  const updated = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: updated,
  });
});

// @desc    Delete a course
// @route   DELETE /api/v1/courses/:id
// @access  Private
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const { _id, role } = req.user;
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(`Course with ID ${req.params.id} is not found.`, 404),
    );
  }

  // Check if current user is not an owner or an admin
  if (!course.user.equals(_id) && role !== 'admin') {
    return next(
      new ErrorResponse(`Permission denied to delete ${req.params.id}.`, 403),
    );
  }

  await course.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});
