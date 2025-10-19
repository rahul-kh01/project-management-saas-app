/**
 * Middleware to parse JSON fields from multipart form data
 * 
 * When using FormData in the frontend, complex data structures like arrays
 * are sent as JSON strings. This middleware parses them back to their original types.
 */
export const parseFormDataFields = (fields = []) => {
  return (req, res, next) => {
    try {
      // Only process if we have a body
      if (!req.body) {
        return next();
      }

      // Parse each specified field if it exists and is a string
      fields.forEach((field) => {
        if (req.body[field] && typeof req.body[field] === 'string') {
          try {
            req.body[field] = JSON.parse(req.body[field]);
          } catch (error) {
            // If parsing fails, leave it as is
            console.warn(`Failed to parse field ${field}:`, error.message);
          }
        }
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

