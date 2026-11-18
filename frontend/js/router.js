/**
 * CivicEvents+ Client-Side Router
 * Hash-based Single Page Application (SPA) routing with Role-Based Route Guards
 * 
 * =========================================================================
 * ROLE-BASED ROUTE GUARDS:
 * 1. requireAuth: true
 *    Restricts the route to authenticated sessions. If a guest attempts access,
 *    they are smoothly redirected to #/login with an informative toast.
 * 
 * 2. adminOnly: true
 *    Restricts the route strictly to users with role === 'admin'. If a normal
 *    user attempts access (e.g. typing #/admin/users in URL), access is blocked,
 *    they are redirected to #/events, and a 403 access warning is displayed.
 * 
 * 3. guestOnly: true
 *    Prevents signed-in users from accessing Login or Signup; redirects them to
 *    the appropriate dashboard.
 * =========================================================================
 */
const Router = (function ($) {
    'use strict';

    // Route table definition
    const routes = [
        {
            path: '/',
            handler: function () {
                navigate('/events');
            }
        },
        {
            path: '/events',
            title: 'Civic Events',
            handler: function () {
                showView('view-events');
                EventsModule.loadEvents();
            }
        },
        {
            path: '/events/:id',
            title: 'Event Details',
            handler: function (params) {
                showView('view-event-detail');
                EventsModule.loadEventDetail(params.id);
            }
        },
        {
            path: '/announcements',
            title: 'Civic Audio Announcements',
            handler: function () {
                showView('view-announcements');
                AnnouncementsModule.loadAnnouncements();
            }
        },
        {
            path: '/promos',
            title: 'Civic Promos & Video Spotlights',
            handler: function () {
                showView('view-promos');
                PromosModule.loadPromos();
            }
        },
        {
            path: '/dashboard',
            title: 'Dashboard & Metrics',
            requireAuth: true,
            handler: function () {
                showView('view-dashboard');
                DashboardModule.loadDashboard();
            }
        },
        {
            // ADMIN-ONLY ROUTE GUARD: User management
            path: '/admin/users',
            title: 'User Management (Admin)',
            requireAuth: true,
            adminOnly: true,
            handler: function () {
                showView('view-admin-users');
                UsersModule.loadUsers();
            }
        },
        {
            path: '/profile',
            title: 'My Profile',
            requireAuth: true,
            handler: function () {
                showView('view-profile');
                UsersModule.loadProfile();
            }
        },
        {
            path: '/registrations',
            title: 'My Event Registrations',
            requireAuth: true,
            handler: function () {
                showView('view-my-registrations');
                EventsModule.loadMyRegistrations();
            }
        },
        {
            path: '/feedback',
            title: 'My Event Feedback',
            requireAuth: true,
            handler: function () {
                showView('view-my-feedback');
                EventsModule.loadMyFeedback();
            }
        },
        {
            path: '/login',
            title: 'Sign In',
            guestOnly: true,
            handler: function () {
                showView('view-login');
            }
        },
        {
            path: '/signup',
            title: 'Create Account',
            guestOnly: true,
            handler: function () {
                showView('view-signup');
            }
        }
    ];

    /**
     * Switch view containers
     */
    function showView(viewId) {
        $('.app-view').addClass('hidden');
        const target = $(`#${viewId}`);
        if (target.length) {
            target.removeClass('hidden');
            window.scrollTo(0, 0);
        } else {
            console.warn('View container not found:', viewId);
        }

        // Close mobile nav drawer if open
        $('#mobile-nav-menu').addClass('hidden');
        $('#user-profile-menu').addClass('hidden');
    }

    /**
     * Resolve path against registered routes
     */
    function resolveRoute(hash) {
        const cleanHash = (hash || window.location.hash || '#/').replace(/^#/, '');
        const path = cleanHash.split('?')[0] || '/';

        for (const r of routes) {
            if (r.path === path) {
                return { route: r, params: {} };
            }

            // Param matching (e.g. /events/:id)
            if (r.path.includes(':')) {
                const routeParts = r.path.split('/');
                const pathParts = path.split('/');

                if (routeParts.length === pathParts.length) {
                    let match = true;
                    const params = {};

                    for (let i = 0; i < routeParts.length; i++) {
                        if (routeParts[i].startsWith(':')) {
                            const paramName = routeParts[i].slice(1);
                            params[paramName] = decodeURIComponent(pathParts[i]);
                        } else if (routeParts[i] !== pathParts[i]) {
                            match = false;
                            break;
                        }
                    }

                    if (match) {
                        return { route: r, params };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Primary navigation handler with Role-Based Access Control checks
     */
    function handleRouting() {
        const resolved = resolveRoute(window.location.hash);

        if (!resolved) {
            console.warn('Route 404:', window.location.hash);
            navigate('/events');
            return;
        }

        const { route, params } = resolved;

        // -------------------------------------------------------------
        // ROLE-BASED ACCESS CONTROL (RBAC) ROUTE GUARDS
        // -------------------------------------------------------------

        // Guard 1: Require Authentication
        if (route.requireAuth && !Auth.isAuthenticated()) {
            UI.showToast('Please sign in to access this page.', 'warning');
            navigate('/login');
            return;
        }

        // Guard 2: Admin-Only Route Protection
        if (route.adminOnly && !Auth.isAdmin()) {
            UI.showToast('Access denied: Administrator privileges required.', 'error');
            navigate('/events');
            return;
        }

        // Guard 3: Guest-Only Route (Login / Signup)
        if (route.guestOnly && Auth.isAuthenticated()) {
            navigate('/dashboard');
            return;
        }

        // Update Document Title
        document.title = route.title ? `${route.title} - CivicEvents+` : 'CivicEvents+ Platform';

        // Update active navigation state
        updateNavState(route.path);

        // Execute route handler
        route.handler(params);
    }

    function updateNavState(path) {
        $('.nav-link').removeClass('text-indigo-600 font-semibold border-b-2 border-indigo-600').addClass('text-slate-600');
        const activeLink = $(`.nav-link[href="#${path}"]`);
        if (activeLink.length) {
            activeLink.addClass('text-indigo-600 font-semibold border-b-2 border-indigo-600').removeClass('text-slate-600');
        }
    }

    function navigate(path) {
        window.location.hash = '#' + path.replace(/^#/, '');
    }

    function init() {
        $(window).on('hashchange', handleRouting);
        // Initial routing trigger
        handleRouting();
    }

    return {
        init,
        navigate,
        showView
    };
})(jQuery);
