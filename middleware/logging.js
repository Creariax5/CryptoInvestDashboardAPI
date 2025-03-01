// middleware/logging.js - Logging middleware

/**
 * Request logger middleware
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Log query parameters if present
    if (Object.keys(req.query).length > 0) {
      console.log('Query params:', req.query);
    }
    
    // Override end function to log the response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const responseTime = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`);
      
      // Log errors with status >= 400
      if (res.statusCode >= 400 && chunk) {
        try {
          const body = JSON.parse(chunk.toString());
          if (body.error) {
            console.error(`Error response:`, body);
          }
        } catch (e) {
          // Not JSON or couldn't parse
        }
      }
      
      originalEnd.call(res, chunk, encoding);
    };
    
    next();
  }
  
  module.exports = { requestLogger };