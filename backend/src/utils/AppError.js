// AppError extends the built-in JavaScript Error class
// It adds a 'statusCode' so we know what HTTP status to send back

class AppError extends Error {
  constructor(message, statusCode) {
    // super() calls the parent class (Error) constructor
    // This sets this.message = message
    super(message);

    this.statusCode = statusCode;

    // Determine if this is a client error (4xx) or server error (5xx)
    // 'fail' = client did something wrong (bad input, not authorized)
    // 'error' = server messed up (database crash, bug in code)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    // This flag helps us distinguish our intentional errors
    // from unexpected crashes
    this.isOperational = true;

    // Captures the stack trace (shows where the error originated)
    // Excludes the constructor itself from the trace (cleaner output)
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;