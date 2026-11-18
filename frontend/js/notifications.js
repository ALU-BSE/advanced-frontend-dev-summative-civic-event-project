/**
 * CivicEvents+ Notifications Module (In-App Slide-over Drawer)
 * Manages notification retrieval, unread count polling, resource links,
 * and Admin-only deletion
 * 
 * =========================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) IN NOTIFICATIONS:
 * - Admin privileges:
 *     1. Can delete notifications from the panel (DELETE /api/notifications/:id).
 *     2. Viewing broadcast and admin notifications.
 * - Normal User privileges:
 *     1. Viewing personal and community broadcast alerts.
 *     2. Clicking a notification links directly to the related event/content.
 * =========================================================================
 */
const NotificationsModule = (function ($) {
    'use strict';

    let notifications = [];
    let localReadSet = new Set(JSON.parse(localStorage.getItem('civic_read_notifications') || '[]'));

    /**
     * Poll / fetch notifications and update the badge
     */
    function fetchNotifications(showDrawer = false) {
        if (!Auth.isAuthenticated()) {
            $('#notification-badge').addClass('hidden').text('0');
            return;
        }

        API.get('/notifications')
            .done(function (res) {
                notifications = res.data || [];
                updateBadge();
                if (showDrawer) {
                    renderDrawer();
                }
            })
            .fail(function (err) {
                console.error('Failed to fetch notifications:', err);
            });
    }

    function updateBadge() {
        const unreadCount = notifications.filter(n => !n.read && !localReadSet.has(n.id)).length;
        const badge = $('#notification-badge');

        if (unreadCount > 0) {
            badge.removeClass('hidden').text(unreadCount > 99 ? '99+' : unreadCount);
        } else {
            badge.addClass('hidden').text('0');
        }
    }

    /**
     * Open slide-over drawer
     */
    function openDrawer() {
        if (!Auth.isAuthenticated()) {
            UI.showToast('Please sign in to view your notifications.', 'info');
            Router.navigate('/login');
            return;
        }

        $('#notification-drawer').removeClass('translate-x-full');
        $('#notification-backdrop').removeClass('hidden');
        $('body').addClass('overflow-hidden');

        fetchNotifications(true);
    }

    /**
     * Close slide-over drawer
     */
    function closeDrawer() {
        $('#notification-drawer').addClass('translate-x-full');
        $('#notification-backdrop').addClass('hidden');
        $('body').removeClass('overflow-hidden');
    }

    /**
     * Render drawer notification items
     */
    function renderDrawer() {
        const container = $('#notification-list');

        if (notifications.length === 0) {
            container.html(`
                <div class="py-16 text-center text-slate-400">
                    <i class="far fa-bell-slash text-3xl mb-2"></i>
                    <p class="text-sm font-medium">No notifications yet</p>
                    <p class="text-xs text-slate-400 mt-1">Community updates will appear here.</p>
                </div>
            `);
            return;
        }

        let html = '<div class="divide-y divide-slate-100">';
        notifications.forEach(n => {
            const isRead = n.read || localReadSet.has(n.id);
            const iconInfo = getTypeIcon(n.type);

            html += `
                <div class="p-4 transition hover:bg-slate-50 flex items-start space-x-3.5 group ${isRead ? 'opacity-70 bg-white' : 'bg-indigo-50/30'}">
                    <div class="w-9 h-9 rounded-xl ${iconInfo.bg} ${iconInfo.text} flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i class="fas ${iconInfo.icon} text-sm"></i>
                    </div>

                    <div class="flex-1 min-w-0 cursor-pointer" onclick="NotificationsModule.handleClick('${n.id}')">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${iconInfo.badge}">
                                ${(n.type || 'System').toUpperCase()}
                            </span>
                            <span class="text-[11px] text-slate-400">${UI.formatRelativeTime(n.created_at)}</span>
                        </div>
                        <h4 class="text-sm font-bold text-slate-900 leading-snug">${UI.escapeHTML(n.title)}</h4>
                        <p class="text-xs text-slate-600 mt-1 leading-relaxed">${UI.escapeHTML(n.message)}</p>
                        
                        ${n.metadata?.event_id ? `
                            <span class="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-2">
                                <span>View Event</span>
                                <i class="fas fa-arrow-right ml-1 text-[10px]"></i>
                            </span>
                        ` : ''}
                    </div>

                    <!-- ROLE GUARD: Admin Delete Notification Button -->
                    ${Auth.isAdmin() ? `
                        <button onclick="NotificationsModule.deleteNotification('${n.id}', event)" title="Delete Notification (Admin)" class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 rounded transition flex-shrink-0">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        });
        html += '</div>';

        container.html(html);
    }

    function getTypeIcon(type) {
        switch (type) {
            case 'event':
                return { icon: 'fa-calendar-alt', bg: 'bg-indigo-100', text: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' };
            case 'promo':
                return { icon: 'fa-video', bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' };
            case 'announcement':
                return { icon: 'fa-bullhorn', bg: 'bg-emerald-100', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' };
            default:
                return { icon: 'fa-info-circle', bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' };
        }
    }

    /**
     * Notification Click: marks read optimistically and opens related resource
     */
    function handleClick(id) {
        const item = notifications.find(n => n.id === id);
        if (!item) return;

        // Optimistic mark as read
        localReadSet.add(id);
        localStorage.setItem('civic_read_notifications', JSON.stringify([...localReadSet]));
        updateBadge();
        renderDrawer();

        closeDrawer();

        // Navigate to related resource
        if (item.metadata?.event_id) {
            Router.navigate(`/events/${item.metadata.event_id}`);
        } else if (item.metadata?.promo_id) {
            Router.navigate('/promos');
        } else if (item.metadata?.announcement_id) {
            Router.navigate('/announcements');
        } else {
            // General info modal
            UI.showConfirm({
                title: item.title,
                message: item.message,
                confirmText: 'Dismiss',
                cancelText: 'Close',
                onConfirm: function () { }
            });
        }
    }

    function markAllAsRead() {
        notifications.forEach(n => localReadSet.add(n.id));
        localStorage.setItem('civic_read_notifications', JSON.stringify([...localReadSet]));
        updateBadge();
        renderDrawer();
        UI.showToast('All notifications marked as read', 'info');
    }

    /**
     * Admin action: Delete notification
     */
    function deleteNotification(id, event) {
        if (event) event.stopPropagation();
        if (!Auth.isAdmin()) return;

        API.delete(`/notifications/${id}`)
            .done(function () {
                notifications = notifications.filter(n => n.id !== id);
                localReadSet.delete(id);
                localStorage.setItem('civic_read_notifications', JSON.stringify([...localReadSet]));
                updateBadge();
                renderDrawer();
                UI.showToast('Notification deleted', 'info');
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to delete notification', 'error');
            });
    }

    function init() {
        $('#notification-bell-btn').on('click', openDrawer);
        $('#notification-drawer-close, #notification-backdrop').on('click', closeDrawer);
        $('#notification-mark-all').on('click', markAllAsRead);

        // Initial fetch and regular polling every 60 seconds
        fetchNotifications();
        setInterval(fetchNotifications, 60000);
    }

    return {
        init,
        fetchNotifications,
        openDrawer,
        closeDrawer,
        handleClick,
        deleteNotification
    };
})(jQuery);
