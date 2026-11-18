# Advanced Frontend Development – Civic Event Project

A modern, responsive, and accessible civic engagement platform built with **HTML5, Tailwind CSS, and jQuery** connecting to an Express + PostgreSQL REST API backend.

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Backend API & Database Setup](#backend-api--database-setup)
4. [Frontend Application Setup](#frontend-application-setup)
5. [Demo User Credentials](#demo-user-credentials)
6. [Role-Based Access Control (RBAC) Architecture](#role-based-access-control-rbac-architecture)
7. [5–7 Minute Video Walkthrough Guide](#57-minute-video-walkthrough-guide)

---

## 🏛️ Project Overview

CivicEvents+ connects citizens with municipal government and neighborhood initiatives. It provides:
- **Authentication**: JWT-based sign-up & login, password strength validation, session-only vs persistent storage.
- **Civic Events**: Published listings, search, location/timing filters, pagination, registration, feedback/ratings, admin attendee views, and admin event CRUD with image uploads.
- **Audio Announcements**: Public municipal audio bulletins with accessible HTML5 audio player and admin upload/publishing.
- **Video Promos**: Community spotlights with HTML5 video, synchronized closed captions, accessibility transcripts, and admin upload.
- **In-App Notifications**: Real-time notification drawer with unread counter, type badges, deep-linking, and admin deletion.
- **Admin Dashboard**: Live platform analytics, user growth bar chart (Chart.js), and user account management (Enable/Disable toggles).
- **Citizen Dashboard**: Personal engagement metrics, registered bookings, and review history.

---

## ⚙️ Prerequisites

Before getting started, ensure you have:
- **Node.js (v18+)**: [https://nodejs.org/](https://nodejs.org/)
- **PostgreSQL (v15+)**: [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
- **Git**: Installed and configured

---

## 🗄️ Backend API & Database Setup

### Step 1: Configure PostgreSQL Database
1. Ensure your PostgreSQL service is running on port `5432`.
2. Connect to PostgreSQL and create the project database:
   ```sql
   CREATE DATABASE "civic-events-db";
   ```
3. Ensure a user exists with permissions to access the database (default `postgres` / password `postgres`).

### Step 2: Configure Environment Variables
In the `backend` directory, check or edit the `.env` file:
```env
DB_USER=postgres
DB_PASS=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=civic-events-db
JWT_SECRET=790e1c9fcb3847dd85dfeb9835631015783bae1d5b63ed986c6d8bd122d646d3
```

### Step 3: Run Database Migrations & Seed Data
From the project root:
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Apply database tables
psql -U postgres -d civic-events-db -f ./migrations/001_create_tables.sql

# Seed initial users, events, announcements, promos, and reviews
psql -U postgres -d civic-events-db -f ./migrations/002_seed_data.sql
```

### Step 4: Start the Backend Server
```bash
npm start
# Or for auto-reload during development:
npm run dev
```
The server will output:
```
CivicEvents+ backend listening on port 4000
Connected to PostgreSQL
```
Test health check: [http://localhost:4000/health](http://localhost:4000/health) -> `{"ok":true,"env":"development"}`.

---

## 💻 Frontend Application Setup

The frontend is a pure Single Page Application located in the `frontend` directory.

### Running with a Local Web Server

#### Option A: VSCode Live Server (Recommended)
1. In VSCode, right-click `frontend/index.html`.
2. Click **"Open with Live Server"**.

#### Option B: Python Simple Server
```bash
cd frontend
python3 -m http.server 3000
```
Visit: [http://localhost:3000](http://localhost:3000)

#### Option C: Node Serve
```bash
npx serve frontend -p 3000
```
Visit: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo User Credentials

Pre-seeded accounts ready for demonstration:

| Role | Email | Password | Allowed Capabilities |
|------|-------|----------|----------------------|
| **Admin** | `admin@civicevents.org` | `Admin@12345!` | Full platform administration, create/edit/delete events, promos, announcements, manage users, view all attendees, view analytics |
| **Citizen (User)** | `john.doe@example.com` | `User@12345!` | Browse events, register/cancel bookings, submit feedback, listen to audio, watch promos, personal profile |
| **Citizen (User 2)** | `sarah.smith@example.com` | `User@12345!` | Secondary normal user for multi-user feedback testing |

> **Convenience**: On the Sign In page (`#/login`), click the **"Admin Demo"** or **"Citizen Demo"** buttons to instantly fill credentials.

---

## 🛡️ Role-Based Access Control (RBAC) Architecture

Code comments are strategically placed in `frontend/js/router.js`, `frontend/js/auth.js`, `frontend/js/events.js`, `frontend/js/announcements.js`, `frontend/js/promos.js`, and `frontend/js/users.js` explaining the security model:

1. **Client-Side Route Guards (`router.js`)**:
   - `adminOnly: true` prevents normal users from visiting `#/admin/users`. Attempts trigger a 403 notification and redirect to `#/events`.
   - `requireAuth: true` ensures unauthenticated visitors are redirected to `#/login`.
2. **UI Element Visibility (`auth.js`)**:
   - Elements tagged `.admin-only` are rendered strictly when `Auth.isAdmin()` is true.
   - Elements tagged `.user-only` appear for normal citizens.
3. **Backend Authoritative Authorization**:
   - The frontend enforces controls for UX; the Express backend verifies JWT claims on all mutations (`authorize(['admin'])`).
4. **Role Immutability**:
   - In accordance with rules, neither users nor administrators can alter a user's assigned role through the UI.

---

## 🎥 5–7 Minute Video Walkthrough Guide

Use this recommended presentation outline when recording your video walkthrough for Canvas:

### Part 1: Architecture & Backend Setup (0:00 - 1:30)
- Show terminal with PostgreSQL running and tables migrated (`001_create_tables.sql` and `002_seed_data.sql`).
- Start backend server on `http://localhost:4000` showing `Connected to PostgreSQL`.
- Briefly point out the `frontend/` directory structure: pure HTML5, Tailwind CSS, jQuery.

### Part 2: Normal User Flow (1:30 - 3:30)
- Sign in as **John Doe** (`john.doe@example.com`).
- Highlight storage option: Explain the difference between **session-only (`sessionStorage`)** and **persistent (`localStorage`)**.
- Navigate through **Events**:
  - Use search and filter by location and upcoming dates.
  - Open an Event Detail page.
  - Click **"Register for Event"** -> show confirmation toast and "Registered" badge.
  - Submit a rating (5 stars) and comment -> demonstrate real-time average rating calculation.
  - Demonstrate **"Cancel Registration"** with confirmation dialog.
- Open **Announcements**: Play audio broadcast using HTML5 audio player.
- Open **Promos**: Play video with synchronized closed captions and show transcript accordion.
- Open **Notifications Drawer**: Show unread counter and deep-link navigation to the related event.
- Visit **My Profile**: Update name/email and show success confirmation.
- Visit **User Dashboard**: Highlight personal registration count and review counts.

### Part 3: Administrator Flow (3:30 - 5:30)
- Sign out and sign in as **Admin Officer** (`admin@civicevents.org`).
- Highlight dynamic UI adaptation:
  - Admin role badge in navbar.
  - "Create New Event" button now visible.
  - "New Announcement" and "New Promo" buttons now visible.
- Visit **Admin Dashboard**:
  - Show platform metrics (total events, users, registrations, feedback).
  - Highlight the interactive **User Registration Growth Bar Chart** (Chart.js).
- Visit **User Management (`#/admin/users`)**:
  - View citizen list.
  - Demonstrate **Enable / Disable toggle** on a user account.
  - Emphasize code rule: Admins cannot change roles via UI.
- Open an Event Detail as Admin:
  - Show the **Registered Attendees list** (visible only to admin).
  - Open Event Edit modal, modify details, and save.
- Create a new Audio Announcement or Promo to show upload and broadcast alert creation.
- Open Notifications drawer as Admin: Show the **Delete Notification** icon.

### Part 4: Code Documentation & Role Guards (5:30 - 6:30)
- Open VSCode and display `frontend/js/router.js` and `frontend/js/auth.js`.
- Point out the code comments explaining where and how `adminOnly`, `requireAuth`, and UI visibility guards are implemented.
- Show `frontend/js/api.js` demonstrating the `401 Unauthorized` interceptor.
