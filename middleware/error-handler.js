// middleware/error-handler.js - Error handling middleware
const ApiError = require('../utils/api-error');
const { NODE_ENV } = require('../config/environment');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // If the error is an ApiError instance, use its properties
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: true,
      error_message: err.message,
      error_details: NODE_ENV === 'production' ? undefined : err.details
    });
  }

  // For other types of errors
  console.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  
  // Default error message
  const errorResponse = {
    error: true,
    error_message: err.message || 'An unexpected error occurred'
  };
  
  // Add stack trace in development
  if (NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  return res.status(statusCode).json(errorResponse);
}

module.exports = { errorHandler };