/**
 * Validation middleware factory
 *
 * Takes a Zod schema and returns a middleware function
 * that validates req.body against that schema.
 *
 * Usage in routes:
 *   router.post('/register', validate(registerSchema), authController.register);
 *
 * If validation fails → sends 400 with error messages
 * If validation passes → attaches cleaned data to req.body and continues
 */
const validate = (schema) => {
  // This returns a NEW function (middleware)
  // This pattern is called a "factory function" or "higher-order function"
  return (req, res, next) => {
    // safeParse validates without throwing an error
    // It returns { success: true/false, data/error }
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Extract human-readable error messages from Zod
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),   // e.g., "email" or "guardian.phone"
        message: err.message,         // e.g., "Invalid email format"
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace req.body with the PARSED data
    // Zod strips out any extra fields not in the schema
    // This prevents users from sending sneaky extra fields
    req.body = result.data;

    // Continue to the next middleware/controller
    next();
  };
};

export default validate;