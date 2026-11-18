/**
 * CivicEvents+ Users & Profile Module
 * Handles:
 * 1. My Profile view & update (all users)
 * 2. Admin User Management: listing, viewing, enabling & disabling accounts
 * 
 * =========================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) IN USERS MANAGEMENT:
 * - Admin privileges:
 *     1. Listing all system users (GET /api/users).
 *     2. Viewing specific user account details.
 *     3. Enabling (PATCH /api/users/:id/enable) and disabling (PATCH /api/users/:id/disable) accounts.
 *     4. ENFORCED RULE: Admin CANNOT alter a user's role from the UI!
 * - Normal User privileges:
 *     1. Viewing own profile (GET /api/users/profile/me).
 *     2. Updating own full_name and email (PATCH /api/users/profile/me).
 *     3. Role and is_active are read-only and immutable by users.
 * =========================================================================
 */
const UsersModule = (function ($) {
    'use strict';

    let allUsers = [];
    let usersCurrentPage = 1;
    const usersPageSize = 10;

    // =========================================================================
    // 1. MY PROFILE (SELF MANAGEMENT)
    // =========================================================================

    function loadProfile() {
        if (!Auth.isAuthenticated()) {
            Router.navigate('/login');
            return;
        }

        API.get('/users/profile/me')
            .done(function (res) {
                const user = res.data;
                renderProfile(user);
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to load profile data', 'error');
            });
    }

    function renderProfile(user) {
        $('#profile-name-header').text(user.full_name);
        $('#profile-email-header').text(user.email);
        $('#profile-role-badge').text((user.role || 'user').toUpperCase());
        $('#profile-status-badge')
            .text(user.is_active ? 'Active Account' : 'Disabled')
            .removeClass('bg-emerald-100 text-emerald-800 bg-rose-100 text-rose-800')
            .addClass(user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800');

        $('#profile-input-name').val(user.full_name);
        $('#profile-input-email').val(user.email);
        $('#profile-input-role').val((user.role || 'user').toUpperCase());
        $('#profile-input-status').val(user.is_active ? 'Active' : 'Disabled');
    }

    function handleProfileSubmit(e) {
        e.preventDefault();

        const full_name = $('#profile-input-name').val().trim();
        const email = $('#profile-input-email').val().trim();

        if (!full_name || !email) {
            UI.showToast('Full name and email are required.', 'warning');
            return;
        }

        const btn = $('#profile-save-btn');
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Saving Changes...');

        API.patch('/users/profile/me', { full_name, email })
            .done(function (res) {
                UI.showToast('Profile updated successfully!', 'success');
                Auth.updateUser({ full_name, email });
                renderProfile(res.data);
            })
            .fail(function (err) {
                if (err.status === 409) {
                    UI.showToast('This email address is already in use by another account.', 'error');
                } else {
                    UI.showToast(err.message || 'Failed to update profile.', 'error');
                }
            })
            .always(function () {
                btn.prop('disabled', false).text('Save Changes');
            });
    }

    // =========================================================================
    // 2. ADMIN USER MANAGEMENT (ADMIN ONLY)
    // =========================================================================

    function loadUsers(page = 1) {
        if (!Auth.isAdmin()) {
            UI.showToast('Access denied: Admins only.', 'error');
            Router.navigate('/events');
            return;
        }

        usersCurrentPage = page;
        UI.renderSkeletons('#admin-users-table-body', 5, 'table');

        API.get('/users', { page: usersCurrentPage, limit: usersPageSize })
            .done(function (res) {
                allUsers = res.data || [];
                renderUsersTable();
            })
            .fail(function (err) {
                $('#admin-users-table-body').html(`
                    <tr>
                        <td colspan="5" class="px-6 py-8 text-center text-rose-500 font-medium">
                            Failed to load users: ${UI.escapeHTML(err.message)}
                        </td>
                    </tr>
                `);
            });
    }

    function renderUsersTable() {
        const tbody = $('#admin-users-table-body');
        const countBadge = $('#admin-users-count');
        countBadge.text(`${allUsers.length} Users on page`);

        if (allUsers.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                        No registered users found.
                    </td>
                </tr>
            `);
            return;
        }

        let html = '';
        allUsers.forEach(u => {
            const isAdmin = u.role === 'admin';
            const isActive = u.is_active !== false;

            html += `
                <tr class="hover:bg-slate-50/80 transition border-b border-slate-100">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center space-x-3">
                            <div class="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm">
                                ${UI.escapeHTML((u.full_name || 'U')[0].toUpperCase())}
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-slate-900">${UI.escapeHTML(u.full_name)}</p>
                                <p class="text-xs text-slate-400">${UI.escapeHTML(u.email)}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                            ${isAdmin ? 'Administrator' : 'Citizen / User'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                            <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                            ${isActive ? 'Active' : 'Disabled'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        ${UI.formatDate(u.created_at)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button onclick="UsersModule.viewUserDetail('${u.id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition" title="View details">
                            View
                        </button>

                        <!-- ROLE GUARD: Enable/Disable Account Toggle -->
                        ${isActive ? `
                            <button onclick="UsersModule.toggleUserStatus('${u.id}', false, '${UI.escapeHTML(u.full_name)}')" class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition">
                                Disable
                            </button>
                        ` : `
                            <button onclick="UsersModule.toggleUserStatus('${u.id}', true, '${UI.escapeHTML(u.full_name)}')" class="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition">
                                Enable
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });

        tbody.html(html);
    }

    /**
     * View Single User in Modal (Admin only)
     */
    function viewUserDetail(userId) {
        if (!Auth.isAdmin()) return;

        API.get(`/users/${userId}`)
            .done(function (res) {
                const u = res.data;
                $('#user-detail-name').text(u.full_name);
                $('#user-detail-email').text(u.email);
                $('#user-detail-id').text(u.id);
                $('#user-detail-role').text(u.role?.toUpperCase() || 'USER');
                $('#user-detail-status').text(u.is_active ? 'Active' : 'Disabled');
                $('#user-detail-created').text(UI.formatDateTime(u.created_at));

                $('#user-detail-modal').removeClass('hidden').addClass('flex');
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to fetch user details', 'error');
            });
    }

    function closeUserDetailModal() {
        $('#user-detail-modal').addClass('hidden').removeClass('flex');
    }

    /**
     * Enable or Disable a user (Admin only)
     * Backend: PATCH /api/users/:id/enable or PATCH /api/users/:id/disable
     */
    function toggleUserStatus(userId, shouldEnable, userName) {
        if (!Auth.isAdmin()) return;

        const actionText = shouldEnable ? 'Enable' : 'Disable';
        UI.showConfirm({
            title: `${actionText} User Account?`,
            message: `Are you sure you want to ${actionText.toLowerCase()} access for ${userName}?`,
            confirmText: `Yes, ${actionText}`,
            isDestructive: !shouldEnable,
            onConfirm: function () {
                const endpoint = shouldEnable ? `/users/${userId}/enable` : `/users/${userId}/disable`;
                API.patch(endpoint)
                    .done(function () {
                        UI.showToast(`User ${userName} has been ${shouldEnable ? 'enabled' : 'disabled'}.`, 'success');
                        loadUsers(usersCurrentPage);
                    })
                    .fail(function (err) {
                        UI.showToast(err.message || `Failed to ${actionText.toLowerCase()} user`, 'error');
                    });
            }
        });
    }

    function init() {
        $('#profile-form').on('submit', handleProfileSubmit);
    }

    return {
        init,
        loadProfile,
        loadUsers,
        viewUserDetail,
        closeUserDetailModal,
        toggleUserStatus
    };
})(jQuery);
