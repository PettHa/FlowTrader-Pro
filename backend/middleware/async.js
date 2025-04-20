// backend/middleware/async.js
const asyncHandler = fn => (req, res, next) =>
    Promise
      .resolve(fn(req, res, next))
      .catch(next); // Pass any error to the error handler
  
  module.exports = asyncHandler;