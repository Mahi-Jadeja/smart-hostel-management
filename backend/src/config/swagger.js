import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import config from './env.js';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',  // OpenAPI version (the standard Swagger follows)

    info: {
      title: 'IntelliHostel API',
      version: '1.0.0',
      description: 'REST API for IntelliHostel - College Hostel Management System',
      contact: {
        name: 'Your Name',
      },
    },

    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],

    // Define security scheme (JWT Bearer token)
    // This adds the "Authorize" button in Swagger UI
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
    },
  },

  // Tell swagger-jsdoc where to find our route files
  // It will scan these files for special comments (JSDoc annotations)
  apis: ['./src/routes/v1/*.js'],
};

// Generate the swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup swagger on the Express app
 *
 * This adds two things:
 * 1. /api-docs → Interactive documentation UI
 * 2. /api-docs.json → Raw JSON specification (for tools)
 */
const setupSwagger = (app) => {
  // Serve the interactive Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }', // Hide the default top bar
    customSiteTitle: 'IntelliHostel API Docs',
  }));

  // Serve the raw JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export default setupSwagger;