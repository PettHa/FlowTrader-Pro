// backend/utils/errorResponse.js
class ErrorResponse extends Error {
    constructor(message, statusCode) {
      super(message); // Call parent constructor (Error)
      this.statusCode = statusCode;
  
      // Optional: Capture stack trace
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = ErrorResponse;