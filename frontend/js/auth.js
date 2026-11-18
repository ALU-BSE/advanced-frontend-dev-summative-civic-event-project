/**
 * CivicEvents+ Authentication & Role-Based Access Control (RBAC)
 * Manages user state, login/signup flows, storage rules, and role guards
 * 
 * =========================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) ARCHITECTURE:
 * - Two roles exist: 'admin' and 'user'.
 * - Client-side guards inspect Auth.getUser().role.
 * - 'admin' has privileges for:
 *     1. Creating, editing, publishing, deleting Events
 *     2. Uploading, publishing, unpublishing, deleting Audio Announcements
 *     3. Uploading, publishing, unpublishing, deleting Promo Videos
 *     4. Enabling / disabling users in Admin User Management
 *     5. Deleting in-app notifications
 *     6. Viewing all attendees for any event
 *     7. Accessing the Admin Dashboard statistics & charts
 * - 'user' has privileges for:
 *     1. Viewing published events, announcements, and promos
 *     2. Registering and cancelling registrations for events
 *     3. Submitting and updating feedback (rating + comment)
 *     4. Viewing personal registrations and submitted feedbacks
 *     5. Managing personal profile (full_name, email)
 * - CRITICAL: Client-side role checks provide UX guidance; backend endpoints
 *   always enforce authoritative JWT authorization via authorize(['admin'])!
 * =========================================================================
 */
const Auth = (function ($) {
    'use strict';

    // In-memory auth state (Context)
    let state = {
        token: null,
        user: null // { id, full_name, email, role }
    };

    /**
     * Initialize state from storage
     * Checks localStorage first (if persistent storage was selected),
     * otherwise falls back to sessionStorage (session-only).
     */
    function init() {
        const storedToken = localStorage.getItem(AppConfig.STORAGE_TOKEN_KEY) ||
            sessionStorage.getItem(AppConfig.STORAGE_TOKEN_KEY);
        const storedUser = localStorage.getItem(AppConfig.STORAGE_USER_KEY) ||
            sessionStorage.getItem(AppConfig.STORAGE_USER_KEY);

        if (storedToken && storedUser) {
            try {
                state.token = storedToken;
                state.user = JSON.parse(storedUser);
            } catch (e) {
                console.error('Error parsing stored user:', e);
                logout();
            }
        }
        updateUI();
    }

    /**
     * Storage rule implementation:
     * - If rememberMe === true: uses localStorage (persistent across browser restarts).
     *   Security Tradeoff: Convenient, but susceptible to physical device access & XSS.
     * - If rememberMe === false: uses sessionStorage (session-only; cleared when tab closes).
     *   Security Tradeoff: Higher security for shared/public computers; requires re-login on new tab.
     */
    function saveSession(token, user, rememberMe = false) {
        state.token = token;
        state.user = user;

        // Clear both first to avoid stale dual-storage
        localStorage.removeItem(AppConfig.STORAGE_TOKEN_KEY);
        localStorage.removeItem(AppConfig.STORAGE_USER_KEY);
        sessionStorage.removeItem(AppConfig.STORAGE_TOKEN_KEY);
        sessionStorage.removeItem(AppConfig.STORAGE_USER_KEY);

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(AppConfig.STORAGE_TOKEN_KEY, token);
        storage.setItem(AppConfig.STORAGE_USER_KEY, JSON.stringify(user));

        updateUI();
    }

    /**
     * Update user details in current session & storage (e.g. after profile edit)
     */
    function updateUser(updatedFields) {
        if (!state.user) return;
        state.user = { ...state.user, ...updatedFields };

        const isLocal = !!localStorage.getItem(AppConfig.STORAGE_USER_KEY);
        const storage = isLocal ? localStorage : sessionStorage;
        storage.setItem(AppConfig.STORAGE_USER_KEY, JSON.stringify(state.user));

        updateUI();
    }

    /**
     * Logout user, clear storage, and refresh UI
     */
    function logout(silent = false) {
        state.token = null;
        state.user = null;

        localStorage.removeItem(AppConfig.STORAGE_TOKEN_KEY);
        localStorage.removeItem(AppConfig.STORAGE_USER_KEY);
        sessionStorage.removeItem(AppConfig.STORAGE_TOKEN_KEY);
        sessionStorage.removeItem(AppConfig.STORAGE_USER_KEY);

        updateUI();

        if (!silent) {
            UI.showToast('You have been signed out successfully.', 'info');
        }
    }

    // =========================================================================
    // ROLE GUARDS & STATE ACCESSORS
    // =========================================================================

    /**
     * Returns true if user is logged in
     */
    function isAuthenticated() {
        return !!state.token && !!state.user;
    }

    /**
     * ROLE GUARD: Returns true if authenticated user has 'admin' role
     */
    function isAdmin() {
        return isAuthenticated() && state.user.role === 'admin';
    }

    /**
     * ROLE GUARD: Returns true if authenticated user is a normal 'user'
     */
    function isNormalUser() {
        return isAuthenticated() && state.user.role === 'user';
    }

    function getUser() {
        return state.user;
    }

    function getToken() {
        return state.token;
    }

    /**
     * Global UI synchronization based on auth state and role
     * Hides/shows admin-only links, user dropdowns, login/signup buttons
     */
    function updateUI() {
        if (isAuthenticated()) {
            $('.auth-only').removeClass('hidden');
            $('.guest-only').addClass('hidden');

            // Populate user display info
            $('.user-name-display').text(state.user.full_name || 'User');
            $('.user-email-display').text(state.user.email || '');
            $('.user-role-badge')
                .text(state.user.role ? state.user.role.toUpperCase() : 'USER')
                .removeClass('bg-purple-100 text-purple-700 bg-blue-100 text-blue-700')
                .addClass(state.user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700');

            // ROLE-BASED UI GUARD: Show or hide admin-specific navigation & controls
            if (isAdmin()) {
                $('.admin-only').removeClass('hidden');
                $('.user-only').addClass('hidden');
            } else {
                $('.admin-only').addClass('hidden');
                $('.user-only').removeClass('hidden');
            }
        } else {
            $('.auth-only').addClass('hidden');
            $('.admin-only').addClass('hidden');
            $('.user-only').addClass('hidden');
            $('.guest-only').removeClass('hidden');
        }
    }

    // =========================================================================
    // AUTH API FLOWS: LOGIN & SIGNUP
    // =========================================================================

    /**
     * Sign In Flow
     */
    function login(email, password, rememberMe = false) {
        const dfd = $.Deferred();

        API.post('/auth/login', { email, password })
            .done(function (res) {
                if (res.data && res.data.token && res.data.user) {
                    saveSession(res.data.token, res.data.user, rememberMe);
                    UI.showToast(`Welcome back, ${res.data.user.full_name}!`, 'success');
                    dfd.resolve(res.data);
                } else {
                    dfd.reject({ message: 'Invalid response from server' });
                }
            })
            .fail(function (err) {
                dfd.reject(err);
            });

        return dfd.promise();
    }

    /**
     * Sign Up Flow
     * Role selection: Normal user by default.
     * Allows optional admin role assignment during registration for demo purposes.
     */
    function signup(full_name, email, password, role = 'user') {
        const dfd = $.Deferred();

        API.post('/auth/signup', { full_name, email, password, role })
            .done(function (res) {
                dfd.resolve(res);
            })
            .fail(function (err) {
                dfd.reject(err);
            });

        return dfd.promise();
    }

    return {
        init,
        login,
        signup,
        logout,
        updateUser,
        isAuthenticated,
        isAdmin,
        isNormalUser,
        getUser,
        getToken,
        updateUI
    };
})(jQuery);
