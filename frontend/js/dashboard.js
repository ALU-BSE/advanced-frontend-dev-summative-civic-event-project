/**
 * CivicEvents+ Dashboard Module
 * Handles role-based statistics:
 * - Admin: Platform-wide analytics, user growth charts (Chart.js), community metrics
 * - Normal User: Personal civic activity (registered events, submitted reviews, unread alerts)
 * 
 * =========================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) IN DASHBOARD:
 * - If Auth.isAdmin():
 *     Requests GET /api/dashboard/admin and renders system-wide metrics,
 *     growth timeline graphs, and admin administrative shortcuts.
 * - If Auth.isNormalUser():
 *     Requests GET /api/dashboard/me and renders the citizen's personal
 *     civic engagement portfolio.
 * =========================================================================
 */
const DashboardModule = (function ($) {
    'use strict';

    let userGrowthChart = null;

    /**
     * Dispatch dashboard loader based on authenticated role
     */
    function loadDashboard() {
        if (!Auth.isAuthenticated()) {
            Router.navigate('/login');
            return;
        }

        if (Auth.isAdmin()) {
            $('#admin-dashboard-view').removeClass('hidden');
            $('#user-dashboard-view').addClass('hidden');
            loadAdminStats();
        } else {
            $('#admin-dashboard-view').addClass('hidden');
            $('#user-dashboard-view').removeClass('hidden');
            loadUserStats();
        }
    }

    /**
     * Load Admin Metrics (GET /api/dashboard/admin)
     */
    function loadAdminStats() {
        API.get('/dashboard/admin')
            .done(function (res) {
                const data = res.data || {};
                renderAdminStats(data);
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to load administrator dashboard', 'error');
            });
    }

    function renderAdminStats(data) {
        // Users stats
        const users = data.users || {};
        $('#stat-total-users').text(users.total_users || 0);
        $('#stat-active-users').text(users.active_users || 0);
        $('#stat-inactive-users').text(users.inactive_users || 0);

        // Events stats
        const events = data.events || {};
        $('#stat-total-events').text(events.total_events || 0);
        $('#stat-upcoming-events').text(events.upcoming_events || 0);
        $('#stat-past-events').text(events.past_events || 0);

        // Registrations & Feedback
        $('#stat-total-registrations').text(data.registrations?.total_registrations || 0);
        $('#stat-total-feedbacks').text(data.feedbacks?.total_feedback || 0);

        // Content
        $('#stat-total-promos').text(data.promos?.total_promos || 0);
        $('#stat-total-announcements').text(data.announcements?.total_announcements || 0);
        $('#stat-total-notifications').text(data.notifications?.total_notifications || 0);

        // Render User Growth Chart
        renderGrowthChart(data.user_growth || []);
    }

    function renderGrowthChart(growthData) {
        const canvas = document.getElementById('user-growth-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Destroy previous instance
        if (userGrowthChart) {
            userGrowthChart.destroy();
        }

        const labels = growthData.length > 0 ? growthData.map(g => g.month) : ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
        const values = growthData.length > 0 ? growthData.map(g => parseInt(g.new_users, 10)) : [2, 5, 8, 12, 19, 25];

        userGrowthChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'New Citizen Registrations',
                    data: values,
                    backgroundColor: 'rgba(99, 102, 241, 0.85)',
                    hoverBackgroundColor: 'rgba(79, 70, 229, 1)',
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 13, weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 12 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { precision: 0, color: '#64748b', font: { size: 12 } }
                    }
                }
            }
        });
    }

    /**
     * Load Normal User Metrics (GET /api/dashboard/me)
     */
    function loadUserStats() {
        API.get('/dashboard/me')
            .done(function (res) {
                const data = res.data || {};
                renderUserStats(data);
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to load personal dashboard', 'error');
            });
    }

    function renderUserStats(data) {
        $('#user-stat-registrations').text(data.registrations?.total_registered_events || 0);
        $('#user-stat-feedbacks').text(data.feedbacks?.total_feedbacks || 0);
        $('#user-stat-notifications').text(data.notifications?.unread_notifications || 0);
        $('#user-stat-announcements').text(data.announcements?.total_announcements || 0);
        $('#user-stat-promos').text(data.promos?.total_promos || 0);
    }

    return {
        loadDashboard
    };
})(jQuery);
