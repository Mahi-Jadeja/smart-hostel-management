# IntelliHostel Documentation

This document provides a structured technical reference for the IntelliHostel project.

It complements the main `README.md` by describing the execution approach, major technical decisions, and implementation scope at a higher level.

## 1. Project Scope

IntelliHostel is a full-stack hostel management system designed to support:

- student onboarding and authentication
- student profile and guardian management
- room generation and hostel block configuration
- room allocation and deallocation
- room preference and mutual roommate workflows
- complaints and escalation support
- outpass approval with guardian flow
- payments and reminder automation
- role-based admin operations
- automated testing and API documentation

## 2. Functional Modules

| Module | Description |
|---|---|
| Authentication | Local login/register, JWT auth, Google OAuth |
| Student | Profile, room, overview, preferences |
| Hostel | Block config, room generation, room layout, allocation |
| Complaints | Student complaint lifecycle and admin management |
| Outpass | Student requests, admin decisions, guardian approval |
| Payments | Admin-created payments, reminders, mark-as-paid flow |
| Admin | Dashboard, student management, operational controls |

## 3. Backend Design

The backend follows a modular Express architecture.

### Layers
- `models/` — database schema definitions
- `controllers/` — request handling logic
- `routes/v1/` — versioned route definitions
- `middleware/` — auth, validation, error handling, rate limiting
- `validations/` — Zod schemas for request validation
- `utils/` — helper services and reusable business logic
- `tests/` — unit and integration test suites

### Design Decisions
- API versioning uses `/api/v1`
- Validation is centralized using Zod
- Email support is isolated in utility modules
- Allocation logic is separated into dedicated utility functions
- Logging and security middleware are initialized centrally in `app.js`

## 4. Frontend Design

The frontend uses React with Vite and a modular page/component structure.

### Layers
- `pages/` — route-level UI
- `components/` — reusable UI and layout components
- `services/` — API communication layer
- `context/` — auth and shared app state
- `lib/axios.js` — configured API client
- `constants/` — enums and shared UI constants
- `test/` and `components/__tests__/` — frontend tests

### Design Decisions
- Role-based routing for student and admin
- Shared layout shell for dashboards
- Tailwind CSS for consistent and responsive styling
- Theme provider for dark/light mode
- Service-based API abstraction to separate UI from transport logic

## 5. Testing Strategy

Testing was built into the implementation instead of being treated as an afterthought.

### Backend Testing
- unit tests for isolated model and utility behavior
- integration tests for full request → database → response cycle
- auth, student, hostel, complaints, outpass, payments, reminders, health checks

### Frontend Testing
- route protection
- page rendering behavior
- room layout view behavior
- payments and outpass page rendering

## 6. Execution Approach

The project was built and tracked in phases.

### Initial Foundation
- project setup
- database models
- auth
- student module
- complaints
- hostel management
- outpass
- payments

### Revised Implementation Phases
The project later introduced revised execution phases to support:
- strict enums and migration support
- advanced room allocation modes
- guardian approval flow
- email infrastructure
- automated payment reminders
- privacy-aware room views
- admin UI completion
- final integration and deployment

## 7. Collaboration Workflow

The group repository was managed through structured GitHub collaboration practices.

### GitHub Practices Used
- issues
- milestones
- feature branches
- pull requests
- merge conflict resolution
- typed commit messages
- final `dev -> main` release flow

### Commit Convention
| Type | Usage |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Maintenance/setup/config |
| `docs:` | Documentation |
| `style:` | Formatting only |
| `refactor:` | Structural change without behavior change |
| `test:` | Test addition or update |

## 8. Deployment Overview

| Layer | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas |

## 9. Suggested Future Documentation Split

If needed, this file can be split into multiple focused documents later:

| File | Purpose |
|---|---|
| `docs/architecture.md` | System architecture |
| `docs/api.md` | Endpoint-level notes |
| `docs/allocation.md` | Allocation strategy and rules |
| `docs/testing.md` | Testing strategy and coverage notes |
| `docs/deployment.md` | Deployment and environment setup |

## 10. Reference

Primary overview remains in:
- [README.md](./README.md)