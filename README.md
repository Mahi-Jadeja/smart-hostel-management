# IntelliHostel

[![Frontend Tests](https://github.com/Mahi-Jadeja/smart-hostel-management/actions/workflows/test.yml/badge.svg)](https://github.com/Mahi-Jadeja/smart-hostel-management/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Live-Demo-blue)](https://smart-hostel-management-five.vercel.app)
[![API Docs](https://img.shields.io/badge/API-Docs-green)](https://smart-hostel-management.onrender.com/api-docs)

IntelliHostel is a full-stack hostel management platform built to streamline student accommodation workflows across authentication, profile management, complaints, outpass approvals, payments, room allocation, and administrative operations.

The system is designed as a role-based web application with separate flows for students, administrators, and guardians. It combines a modern React frontend with a modular Express and MongoDB backend, complete with testing, API documentation, email workflows, and deployment readiness.

## Live Links

| Resource | Link |
|---|---|
| Live Application | https://smart-hostel-management-five.vercel.app |
| Backend API | https://smart-hostel-management.onrender.com |
| API Documentation | https://smart-hostel-management.onrender.com/api-docs |
| Main Repository | https://github.com/Mahi-Jadeja/smart-hostel-management |

## Academic Context

| Field | Value |
|---|---|
| Project Title | IntelliHostel |
| Institute | Symbiosis Institute of Technology, Pune |
| Project Type | Full Stack Web Application |
| Architecture | MERN Stack |

## Core Features

### Student Features
- Secure registration and login with JWT authentication
- Google OAuth sign-in with profile completion flow
- Student dashboard with room, complaint, outpass, and payment overview
- Profile management with academic and guardian details
- Complaint creation, deletion, tracking, and admin response visibility
- Outpass request submission with guardian approval workflow
- Payment history, reminders, and mark-as-paid flow
- Room preference selection and mutual roommate support
- Privacy-aware room view limited to the student's own context

### Admin Features
- Admin dashboard with operational statistics and recent activity
- Hostel block configuration and room generation
- Room layout management with occupancy visualization
- Student allocation, deallocation, and bulk room allocation
- Preference-based, random, and branch-based allocation modes
- Student management hub with allocation support
- Complaint management with filtering, status updates, and remarks
- Outpass management and approval handling
- Payment creation, reminder triggering, and payment monitoring

### Guardian and Automation Features
- Public guardian approval page for outpass links
- Email-driven outpass approval flow
- Payment reminder automation
- Cron-based scheduled tasks for reminders and lifecycle handling

## Technical Highlights

- Role-based access control across student and admin modules
- JWT authentication with protected routes
- Google OAuth integration using Passport
- Zod-based schema validation on backend and frontend
- Centralized error handling with custom application errors
- API versioning under `/api/v1`
- Swagger/OpenAPI documentation
- Rate limiting, Helmet, CORS, and request sanitization
- Deterministic room allocation utilities with preview and execution flows
- Automated email integration for guardian approval and payment reminders
- Modular test suites across unit, integration, and frontend component tests

## Architecture Overview

```text
Frontend (React + Vite)
   │
   │  Axios API calls
   ▼
Backend (Express + Node.js)
   │
   ├── Auth / Student / Hostel / Complaint / Outpass / Payment modules
   ├── Validation, middleware, logging, cron, email
   ▼
MongoDB Atlas
```

## Tech Stack

### Backend

| Layer      | Technology                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| Runtime    | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat\&logo=node.js\&logoColor=white)    |
| Framework  | ![Express](https://img.shields.io/badge/Express-000000?style=flat\&logo=express\&logoColor=white)    |
| Database   | ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat\&logo=mongodb\&logoColor=white)    |
| ODM        | ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat\&logo=mongoose\&logoColor=white) |
| Validation | ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat\&logo=zod\&logoColor=white)                |
| Auth       | JWT, Passport Google OAuth                                                                           |
| Security   | Helmet, Express Rate Limit, express-mongo-sanitize, CORS                                             |
| Logging    | Morgan, Winston                                                                                      |
| Email      | Nodemailer                                                                                           |
| API Docs   | Swagger (swagger-jsdoc, swagger-ui-express)                                                          |
| Testing    | Jest, Supertest                                                                                      |

### Frontend

| Layer              | Technology                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| UI Library         | ![React](https://img.shields.io/badge/React-20232A?style=flat\&logo=react\&logoColor=61DAFB)                     |
| Build Tool         | ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat\&logo=vite\&logoColor=white)                         |
| Routing            | React Router                                                                                                     |
| Styling            | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat\&logo=tailwind-css\&logoColor=white) |
| State              | Context API                                                                                                      |
| Forms              | React Hook Form, Zod                                                                                             |
| HTTP Client        | Axios                                                                                                            |
| UI Feedback        | React Hot Toast                                                                                                  |
| Animation          | Framer Motion                                                                                                    |
| Data Visualization | Recharts                                                                                                         |
| Testing            | Vitest, React Testing Library                                                                                    |

## Testing Status

### Backend Test Summary

| Category      | Status                 |
| ------------- | ---------------------- |
| Test Suites   | 14 passed / 14 total   |
| Test Cases    | 167 passed / 167 total |
| Coverage Type | Unit + Integration     |

### Frontend Test Summary

| Category      | Status                     |
| ------------- | -------------------------- |
| Test Files    | 4 passed / 4 total         |
| Test Cases    | 10 passed / 10 total       |
| Coverage Type | Component + Route Behavior |

### Tested Modules

| Backend           | Frontend         |
| ----------------- | ---------------- |
| Auth              | ProtectedRoute   |
| Student           | Payments Page    |
| Complaints        | Outpass Page     |
| Hostel            | Room Layout Page |
| Outpass           | -                |
| Payments          | -                |
| Payment Reminders | -                |
| Room Preferences  | -                |
| Health Check      | -                |

## Project Structure

```text
smart-hostel-management/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── constants/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/v1/
│   │   ├── seeds/
│   │   ├── utils/
│   │   └── validations/
│   └── tests/
│       ├── helpers/
│       ├── integration/
│       └── unit/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   └── test/
└── README.md
```

## Team and Contribution Mapping

| Team Member | Contribution Area                                                                         |
| ----------- | ----------------------------------------------------------------------------------------- |
| Mahi Jadeja | Outpass, Payments, Guardian Flow, Email/Cron, Final Integration, Deployment, Project Lead |
| Khushi      | Auth System, Public Pages, Complaints Module                                              |
| Nakshatra   | Student APIs, Hostel Management, Room Allocation, Preferences                             |
| Devershika  | Frontend Shell, Student Pages, Admin UI, Route Wiring                                     |

## Git Workflow and Collaboration

The project follows a structured GitHub-based execution model.

### Collaboration Practices

* Feature branches merged into `dev`
* Pull requests used for integration
* Milestones and issues used for planning and tracking
* Merge conflict resolution handled as part of the workflow
* Commit messages follow a typed convention

### Commit Message Convention

| Type        | Meaning                                               |
| ----------- | ----------------------------------------------------- |
| `feat:`     | New feature                                           |
| `fix:`      | Bug fix                                               |
| `chore:`    | Setup, maintenance, configuration, dependency updates |
| `docs:`     | Documentation changes                                 |
| `style:`    | Formatting only                                       |
| `refactor:` | Restructuring without behavior change                 |
| `test:`     | Adding or updating tests                              |

## Running the Project Locally

### Prerequisites

| Tool    | Version                         |
| ------- | ------------------------------- |
| Node.js | 18+ recommended                 |
| npm     | 9+ recommended                  |
| MongoDB | Local instance or MongoDB Atlas |

### 1. Clone the Repository

```bash
git clone https://github.com/Mahi-Jadeja/smart-hostel-management.git
cd smart-hostel-management
```

### 2. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Configure Environment Variables

Create the following files:

#### `backend/.env`

```env
NODE_ENV=development
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/v1/auth/google/callback
CLIENT_URL=http://localhost:5173
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
EMAIL_FROM=IntelliHostel <your_email>
```

#### `frontend/.env`

```env
VITE_API_URL=http://localhost:5001/api/v1
```

### 4. Seed Admin and Demo Data

```bash
cd backend
npm run seed
npm run seed:demo
```

### 5. Start Backend

```bash
cd backend
npm run dev
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

### 7. Open the Application

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5001
API Docs: http://localhost:5001/api-docs
```

## Running Tests

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

## Demo Credentials

### Admin

| Role  | Email                     | Password    |
| ----- | ------------------------- | ----------- |
| Admin | `admin@intellihostel.com` | `Admin@123` |

### Sample Students

| Email                        | Password      |
| ---------------------------- | ------------- |
| `arjun.sharma@student.com`   | `Student@123` |
| `viraj.sheoran@student.com`  | `Student@123` |
| `priya.desai@student.com`    | `Student@123` |
| `sneha.kulkarni@student.com` | `Student@123` |

## Documentation

Additional technical documentation is available here:

* [Project Documentation](./DOCUMENTATION.md)

If you later create module-level documents, this section can be expanded into:

* Architecture notes
* API notes
* Allocation algorithm notes
* Deployment notes

## Deployment

| Service  | Platform      |
| -------- | ------------- |
| Frontend | Vercel        |
| Backend  | Render        |
| Database | MongoDB Atlas |

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.