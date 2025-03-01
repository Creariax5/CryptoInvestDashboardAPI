// utils/api-error.js - Custom API error class

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
    /**
     * Create a new API error
     * @param {string} message - User-friendly error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} details - Additional error details
     */
    constructor(message, statusCode = 500, details = {}) {
      super(message);
      this.statusCode = statusCode;
      this.details = details;
      this.timestamp = new Date().toISOString();
      
      // Add custom friendly messages based on status
      switch(statusCode) {
        case 400:
          this.friendlyMessage = "Bad request. Please check your input parameters.";
          break;
        case 401:
          this.friendlyMessage = "Authentication failed. Your API key may be invalid or expired.";
          break;
        case 403:
          this.friendlyMessage = "Access forbidden. You don't have permission to access this resource.";
          break;
        case 404:
          this.friendlyMessage = "Resource not found.";
          break;
        case 429:
          this.friendlyMessage = "Rate limit exceeded. Too many requests in a short period.";
          break;
        default:
          this.friendlyMessage = message;
      }
      
      // Include friendlyMessage in details
      this.details.friendlyMessage = this.friendlyMessage;
      
      // Capture stack trace
      Error.captureStackTrace(this, this.constructor);
    }
    
    /**
     * Handle API error from external services like Moralis
     * @param {Error} error - The original error
     * @param {string} operation - Description of the operation that failed
     * @param {Object} details - Additional context
     * @returns {ApiError} - New ApiError instance with details
     */
    static fromError(error, operation, details = {}) {
      const apiError = new ApiError(
        error.message || `Error during ${operation}`,
        error.response?.status || 500,
        {
          operation,
          ...details
        }
      );
      
      // Add response details if available
      if (error.response) {
        apiError.details.response = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
        
        // Add specific solutions based on status
        if (error.response.status === 401) {
          apiError.details.possibleSolution = "Check your API key and ensure it's valid and has the necessary permissions.";
        } else if (error.response.status === 429) {
          apiError.details.possibleSolution = "Implement request batching or add delays between requests to avoid rate limiting.";
        }
      }
      
      return apiError;
    }
  }
  
  module.exports = ApiError;