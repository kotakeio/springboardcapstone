## Personal Agent App

This document provides an overview of the Personal Agent App, including its purpose, architecture, setup instructions, and usage guidelines. It is intended for course instructors to review the application and understand its structure and functionality.

---

### Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Architecture & Tech Stack](#architecture--tech-stack)
4. [Prerequisites](#prerequisites)
5. [Setup & Installation](#setup--installation)
   - [Backend](#backend)
   - [Frontend](#frontend)
6. [Running the Application Locally](#running-the-application-locally)
7. [Test Credentials](#test-credentials)
8. [Using the Tutorial Walkthrough](#using-the-tutorial-walkthrough)
9. [API Endpoints](#api-endpoints)
10. [Code Structure](#code-structure)
11. [Security Best Practices](#security-best-practices)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Future Improvements](#future-improvements)

---

## Introduction

Once per day, the Personal Agent App retrieves all upcoming appointments for the user’s verified calendar emails from Google Calendar. It then calculates any free time intervals and generates **Freedom Time Blocks**—dedicated focus slots—for use with [Freedom.to](https://freedom.to/). Users can review and approve the suggested blocks, at which point the backend calls a webhook to [Task Magic](https://www.taskmagic.com/) to schedule them in Freedom.to (which lacks a native API), and simultaneously sends an API request to the Tasker app on the user’s phone to set alarms at each block’s start and end.

## Features

- **User Authentication**: Register and log in with username/password and JWT-based sessions.
- **Schedule Management**: View, create, update, approve, and delete time blocks.
- **Calendar Integration**: Fetch busy times from Google Calendar using service account credentials.
- **Tutorial Walkthrough**: Interactive help overlay that can be launched via the Help button.
- **Responsive UI**: Built with React and Tailwind CSS (or equivalent), optimized for desktop and mobile.
- **Testing**: Jest + Supertest for backend, with in-memory MongoDB for isolation; unit tests for core utilities.

## Architecture & Tech Stack

- **Frontend**: React (Vite), Axios for HTTP, Context API for global loader.
- **Backend**: Node.js, Express.js, Mongoose (MongoDB), JWT for auth.
- **Databases**: MongoDB for user and free-time blocks.
- **Testing**: Jest, mongodb-memory-server, Supertest.

## Prerequisites

- Node.js (v16+)
- npm
- MongoDB URI (e.g., Mongo Atlas connection string)
- Google Service Account JSON for Calendar API (placed in `config/service-account.json`)

## Setup & Installation

### Backend

1. Navigate to the backend directory:
   ```bash
   cd personal-agent-back
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file at the project root with the following variables:
   ```env
   PORT=5000
   MONGO_URI=<your_mongo_uri>
   SESSION_SECRET=<your_session_secret>
   JWT_SECRET=<your_jwt_secret>
   PHONE_ALARM_ENDPOINTS=<comma-separated-endpoints>
   FREEDOM_APP_TASKMAGIC_WEBHOOK=<optional-webhook-url>
   GOOGLE_CLIENT_ID=<your_google_client_id>
   GOOGLE_CLIENT_SECRET=<your_google_client_secret>
   GMAIL_OAUTH_REDIRECT=<your_oauth_redirect_uri>
   ```

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd personal-agent-front
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   VITE_API_URL=<YOUR_BACKEND_URL>
   ```

## Running the Application Locally

1. **Start Backend**:
   ```bash
   npm run dev # or node server.js
   ```
2. **Start Frontend**:
   ```bash
   npm run dev  # Vite dev server
   ```
3. Open your browser at `http://localhost:5173` (or printed URL).

## Test Credentials

- **Username:** `evolvfitness3@gmail.com`
- **Password:** `TestPassword1!`

Use these credentials on the login page to sign in immediately.

## Using the Tutorial Walkthrough

Once logged in, click the **Help** button (usually displayed as a question mark icon or `Help` in the navigation bar) to launch an interactive step-by-step tutorial overlay. Follow the on-screen prompts to learn about the main screens:

1. **Dashboard Overview**
2. **Schedule View & Editing**
3. **Approval Workflow**
4. **Profile & Settings**

## API Endpoints

| Method | Route                                       | Description                                 |
| ------ | ------------------------------------------- | ------------------------------------------- |
| GET    | `/api/users/register`                       | Register a new user                         |
| POST   | `/api/users/login`                          | Authenticate and receive a JWT              |
| GET    | `/api/users/me`                             | Get profile of the authenticated user       |
| PUT    | `/api/users/timezone`                       | Update user timezone (completes onboarding) |
| GET    | `/api/users/calendarEmails`                 | List a user’s calendar emails               |
| POST   | `/api/users/calendarEmails`                 | Add a calendar email                        |
| POST   | `/api/users/calendarEmails/:emailId/verify` | Verify calendar access                      |
| DELETE | `/api/users/calendarEmails/:emailId`        | Remove a calendar email                     |
| POST   | `/api/freedom-blocks`                       | Generate today’s free-time blocks           |
| GET    | `/api/freedom-blocks/today`                 | Fetch today’s appointments + blocks         |
| PUT    | `/api/freedom-blocks/:id`                   | Update a free-time block                    |
| DELETE | `/api/freedom-blocks/:id`                   | Exclude (soft delete) a block               |
| POST   | `/api/freedom-blocks/:id/phoneAlarm`        | Set phone alarm for a block                 |
| POST   | `/api/freedom-blocks/:id/taskMagic`         | Trigger TaskMagic webhook for a block       |

## Code Structure

- `app.js`: Express app setup (CORS, JSON, sessions, routes)
- `server.js`: Entry point, starts HTTP server after DB connection
- `config/`: Database configuration (MongoDB via Mongoose)
- `controllers/`: Route handlers for freedom blocks and users
- `models/`: Mongoose data models
- `routes/`: Express route definitions
- `services/`: Calendar, Gmail, alarm, and free-time utilities
- `middleware/auth.js`: JWT-based authentication
- `tests/`: Jest test suites (unit and integration)
- `personal-agent-front/src/`: React components, API client, and styling

## Security Best Practices

- **Password Hashing**: bcrypt with salt rounds (in `user.routes.js`).
- **JWT**: Stored in HTTP-only cookies or localStorage; secret managed via env.
- **Input Validation**: Email and password validated on registration and login.
- **CORS**: Restricted to allowed origins (`app.js`).
- **Session Management**: Secure, HTTP-only cookies with sameSite and maxAge settings.

## Testing

- **Backend**: Jest + Supertest, with `jest.setup.js` and `jest.teardown.js` for in-memory MongoDB.
- **Coverage**: Core endpoints and utility functions are covered; run `npm test`.

## Deployment

1. **Backend**: Deploy the Node/Express server to Render.com as a **Web Service**:

   - Connect your GitHub repository in the Render dashboard and select the backend directory.
   - Set the **Build Command** to `npm install && npm run build` (if you transpile) or `npm install`.
   - Set the **Start Command** to `npm run start` (or `node server.js`).
   - Under **Environment**, add all required environment variables (`PORT`, `MONGO_URI`, `SESSION_SECRET`, `JWT_SECRET`, `PHONE_ALARM_ENDPOINTS`, `FREEDOM_APP_TASKMAGIC_WEBHOOK`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_OAUTH_REDIRECT`)..

2. **Frontend**: Deploy the React app to Render.com as a **Static Site**:

   - Connect your GitHub repository and select the frontend directory.
   - Set the **Build Command** to `npm install && npm run build`.
   - Set the **Publish Directory** to `dist` (Vite’s default output) or `build` if you override it.
   - Under **Environment**, add `VITE_API_URL` with the URL of your deployed backend service on Render.

3. **Databases**:

   - **MongoDB**: Use MongoDB Atlas or another managed provider. Obtain the connection string and configure the `MONGO_URI` env var in Render.

## Future Improvements Future Improvements

- Add OAuth (Google, Facebook) via Passport.js for social login.
- Enhance RBAC: Admin dashboard for managing roles/permissions.
- Integrate React Query or SWR for data fetching.
- Add e2e tests (Cypress) for full UI flows.
- Polish UI with theming support and accessibility audits.

---