# CivicEvents+ Frontend Application

A responsive, accessible Single Page Application (SPA) designed for civic participation, municipal announcements, promotional video spotlights, community feedback, and role-based administration.

Built strictly using **HTML5, Tailwind CSS, and jQuery**.

---

## 🌟 Key Features

1. **Authentication & Session Management**
   - User Sign-Up with live password strength meter enforcing security policy (minimum 8 characters, mixed-case, numbers, and special characters).
   - User Sign-In with credential validation and error handling.
   - Storage Rules:
     - **Session-Only (`sessionStorage`)**: Cleared immediately when the browser tab closes. Ideal for public/shared workstations.
     - **Persistent (`localStorage`)**: Retained across browser restarts when "Keep me signed in" is enabled. Tradeoff: Higher convenience, but susceptible to device access.
   - Global auth context storing `{ id, full_name, email, role }` and JWT token.
   - Automatic injection of `Authorization: Bearer <token>` on protected endpoints.
   - Interception of `401 Unauthorized` responses to auto-logout expired sessions and guide the user back to Sign In.

2. **Role-Based Access Control (RBAC)**
   - Two defined roles: **Administrator (`admin`)** and **Citizen (`user`)**.
   - Front-end role guards that dynamically adapt UI controls, view actions, and route accessibility.
   - Dedicated Admin console for user management (enabling/disabling citizen accounts without altering immutable roles).

3. **Civic Events Module**
   - Public/authenticated listing of published events with search, location filtering, and timing filters (Upcoming / Past).
   - Client-side pagination controls (6 items per page).
   - Detailed event view with Google Maps integration, banner display, and countdown.
   - Instant Event Registration and Cancellation.
   - Admin-only View of registered attendees for each event.
   - Community Feedback & Ratings: interactive 1–5 star picker, comment submission, and verified review displays.
   - Admin-only Event Creation & Editing with client-side image validation (size <= 2MB, formats `.jpg, .jpeg, .png, .gif`) and live upload preview.

4. **Public Audio Announcements**
   - Accessible HTML5 audio player with keyboard controls, duration display, and fallback support.
   - Admin-only audio upload (file key `audio`, size <= 5MB, formats `.mp3, .wav, .m4a, .ogg`).
   - Admin-only Publish / Unpublish toggles and deletion with confirmation.
   - Automatic broadcast notifications triggered on creation.

5. **Video Promos & Closed Captions**
   - Accessible HTML5 video player with play/pause, volume, fullscreen, and synchronized WebVTT subtitles.
   - Toggleable text transcript accordion for hearing-impaired users and enhanced accessibility.
   - Admin-only video upload (file key `video`, size <= 8MB, formats `.mp4, .mov, .avi, .mkv`) with custom caption text.
   - Admin-only Publish / Unpublish toggles and deletion.

6. **In-App Notification Drawer**
   - Slide-over notification inbox with unread count badge in header.
   - Filtered to personal alerts and platform-wide broadcasts.
   - Direct deep-links from notification items to related events, promos, or announcements.
   - Optimistic UI for marking notifications as read.
   - Admin-only deletion of notification records.

7. **Dashboard & Analytics**
   - **Admin Dashboard**: System metrics (Total Events, Active/Inactive Citizens, Total Registrations, Reviews, Content items) and an interactive **User Registration Growth Bar Chart** (powered by Chart.js).
   - **User Dashboard**: Personal civic engagement summary (Events registered, Reviews submitted, Unread alerts).

8. **User Self-Management & Administration**
   - Profile view and editing for `full_name` and `email` with duplicate email conflict (409) handling.
   - Role and account status are strictly immutable by users.
   - Admin user directory with Enable/Disable toggles.

---

## 📂 Project Architecture

```
frontend/
├── index.html                 # Main Single Page Application markup & views
├── css/
│   └── styles.css             # Custom utility styles, scrollbars, and cues
├── js/
│   ├── config.js              # Base API URL, upload limits, and media resolver
│   ├── ui.js                  # Toasts, modals, formatters, and password meter
│   ├── api.js                 # Centralized AJAX wrapper & 401 interceptor
│   ├── auth.js                # Auth context, session storage, and RBAC guards
│   ├── router.js              # Hash-based SPA routing with route guards
│   ├── events.js              # Events listing, registration, feedback & CRUD
│   ├── announcements.js       # Audio announcements & accessible player
│   ├── promos.js              # Video spotlights with closed captions & transcripts
│   ├── notifications.js       # In-app slide-over drawer & polling
│   ├── dashboard.js           # Admin analytics (Chart.js) & user personal stats
│   ├── users.js               # Profile editing & Admin user management
│   └── app.js                 # App initialization, event listeners & demo logins
└── README.md                  # Frontend documentation
```

---

## 🛡️ Role-Based Access Control (RBAC) Code Documentation

Role-based access guards are implemented across multiple layers of the frontend application:

### 1. Route Guards (`frontend/js/router.js`)
- Each route defines access metadata (`requireAuth`, `adminOnly`, `guestOnly`).
- **`requireAuth: true`**: Blocks unauthenticated visitors and redirects to `#/login`.
- **`adminOnly: true`**: Restricts sensitive views (`#/admin/users`) strictly to sessions where `Auth.isAdmin() === true`. Non-admin users attempting manual URL navigation are redirected to `#/events` with a 403 Access Denied notification.
- **`guestOnly: true`**: Redirects signed-in users away from Login and Signup to `#/dashboard`.

### 2. UI Visibility Guards (`frontend/js/auth.js`)
- `Auth.updateUI()` dynamically toggles classes across the DOM:
  - Elements with `.auth-only` are shown only when authenticated.
  - Elements with `.guest-only` are shown only to unauthenticated visitors.
  - Elements with `.admin-only` (such as "Create Event", "New Announcement", "New Promo", and "User Management") are rendered **strictly if `Auth.isAdmin()` is true**.
  - Elements with `.user-only` are rendered for regular citizens.

### 3. Action Guards in Feature Modules
- **`events.js`**:
  - `openCreateModal()` and `openEditModal()` verify `Auth.isAdmin()` before opening forms.
  - Event deletion (`confirmDelete`) and attendee lists (`loadEventAttendees`) are restricted to administrators.
  - Normal users see "Register" and "Cancel Registration" buttons.
- **`announcements.js` & `promos.js`**:
  - Publish, unpublish, and delete actions check `Auth.isAdmin()` prior to API invocation.
- **`users.js`**:
  - `loadUsers()` and `toggleUserStatus()` enforce admin privilege.
  - In adherence to platform rules, the UI provides **no option to alter a user's role**, ensuring role immutability from client controls.

---

## 🚀 Running the Frontend Locally

### Prerequisites
- Any modern web browser (Chrome, Firefox, Safari, Edge).
- The CivicEvents+ backend running at `http://localhost:4000` (see Backend Setup below).

### Option 1: VSCode Live Server (Recommended)
1. Open the project folder in VSCode.
2. Right-click `frontend/index.html` and select **"Open with Live Server"**.
3. The app will launch in your browser (typically at `http://127.0.0.1:5500/frontend/index.html`).

### Option 2: Python Built-in HTTP Server
From the terminal, navigate to the `frontend` directory and start a local server:
```bash
cd frontend
python3 -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 3: Node `npx serve`
```bash
npx serve frontend -p 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Custom Backend URL
If your backend runs on a different port or host:
1. Click your profile avatar (or open the dropdown).
2. Select **"API Endpoint Settings"**.
3. Enter your backend API URL (e.g., `http://localhost:4000` or `https://api.yourdomain.com`).
4. Click **"Save & Reload"**. The setting persists in your browser.

---

## 🔑 Demo & Test Accounts

The database includes pre-configured seed accounts for evaluation:

| Role | Email | Password | Access Privileges |
|------|-------|----------|-------------------|
| **Administrator** | `admin@civicevents.org` | `Admin@12345!` | Full CRUD on Events, Announcements, Promos, User Management, Attendee Lists, Analytics |
| **Citizen (User)** | `john.doe@example.com` | `User@12345!` | Browse Content, Register for Events, Cancel Bookings, Submit Ratings & Reviews, Personal Dashboard |
| **Citizen (User 2)** | `sarah.smith@example.com` | `User@12345!` | Secondary normal user for testing multi-user registration & feedback flows |

> **Tip:** On the Sign In page (`#/login`), two fast-track buttons (**"Admin Demo"** and **"Citizen Demo"**) are available for instant 1-click credential filling.
