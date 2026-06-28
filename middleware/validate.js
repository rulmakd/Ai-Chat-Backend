import { validationResult } from "express-validator";

// The body(...) validation chains (e.g. in authRoutes.js) only collect errors
// onto the request — they don't reject anything by themselves. This middleware
// reads those collected errors and actually returns a 400 if any rule failed.
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      statusCode: 400,
    });
  }

  next();
};

export default validate;
