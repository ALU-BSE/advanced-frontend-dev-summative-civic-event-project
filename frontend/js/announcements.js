/**
 * CivicEvents+ Announcements Module (Audio Broadcasts)
 * Manages audio announcements, HTML5 accessible audio players,
 * and Admin-only upload/publish/delete workflows
 * 
 * =========================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) IN ANNOUNCEMENTS:
 * - Admin privileges:
 *     1. "Create Announcement" button rendered only for Admin.
 *     2. "Publish / Unpublish" toggle controls visible only to Admin.
 *     3. "Delete Announcement" action available strictly to Admin.
 *     4. Admin views both published and unpublished drafts.
 * - Normal User privileges:
 *     1. Read-only access to published audio broadcasts.
 *     2. Play audio using accessible controls.
 * =========================================================================
 */
const AnnouncementsModule = (function ($) {
    'use strict';

    let announcements = [];

    /**
     * Load all announcements
     */
    function loadAnnouncements() {
        UI.renderSkeletons('#announcements-list', 3, 'list');

        API.get('/announcements')
            .done(function (res) {
                const raw = res.data || [];
                // Filter published for regular users
                if (!Auth.isAdmin()) {
                    announcements = raw.filter(a => a.published !== false);
                } else {
                    announcements = raw;
                }
                renderAnnouncements();
            })
            .fail(function (err) {
                $('#announcements-list').html(`
                    <div class="p-8 text-center bg-white rounded-2xl border border-slate-100">
                        <i class="fas fa-exclamation-circle text-rose-500 text-3xl mb-2"></i>
                        <h4 class="font-bold text-slate-800">Failed to load audio announcements</h4>
                        <p class="text-sm text-slate-500 mt-1">${UI.escapeHTML(err.message)}</p>
                        <button onclick="AnnouncementsModule.loadAnnouncements()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Retry</button>
                    </div>
                `);
            });
    }

    /**
     * Render announcement cards
     */
    function renderAnnouncements() {
        const container = $('#announcements-list');

        if (announcements.length === 0) {
            container.html(`
                <div class="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-bullhorn text-2xl"></i>
                    </div>
                    <h3 class="font-bold text-slate-800">No Announcements Available</h3>
                    <p class="text-sm text-slate-500 mt-1">There are currently no civic audio broadcasts to display.</p>
                </div>
            `);
            return;
        }

        let html = '<div class="space-y-4">';
        announcements.forEach((a, idx) => {
            const isPublished = a.published !== false;
            const audioUrl = AppConfig.resolveMediaUrl(a.audio_url);
            const audioId = `audio-player-${a.id}`;

            html += `
                <div class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div class="flex items-start space-x-4">
                            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-volume-up text-xl"></i>
                            </div>
                            <div>
                                <div class="flex items-center space-x-2">
                                    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                                        ${isPublished ? 'Live Announcement' : 'Draft / Unpublished'}
                                    </span>
                                    <span class="text-xs text-slate-400">• ${UI.formatDate(a.created_at)}</span>
                                </div>
                                <h3 class="text-lg font-bold text-slate-900 mt-1">${UI.escapeHTML(a.title)}</h3>
                            </div>
                        </div>

                        <!-- ROLE GUARD: Admin action controls for announcements -->
                        ${Auth.isAdmin() ? `
                            <div class="flex items-center space-x-2 self-end md:self-auto">
                                ${isPublished ? `
                                    <button onclick="AnnouncementsModule.unpublishAnnouncement('${a.id}')" title="Unpublish Announcement" class="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition">
                                        <i class="fas fa-eye-slash mr-1"></i> Unpublish
                                    </button>
                                ` : `
                                    <button onclick="AnnouncementsModule.publishAnnouncement('${a.id}')" title="Publish Announcement" class="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition">
                                        <i class="fas fa-globe mr-1"></i> Publish
                                    </button>
                                `}
                                <button onclick="AnnouncementsModule.confirmDelete('${a.id}', '${UI.escapeHTML(a.title)}')" title="Delete Announcement" class="p-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    <!-- ACCESSIBLE HTML5 AUDIO PLAYER -->
                    <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <label for="${audioId}" class="sr-only">Audio playback for ${UI.escapeHTML(a.title)}</label>
                        <audio id="${audioId}" class="w-full h-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg" controls preload="metadata">
                            <source src="${UI.escapeHTML(audioUrl)}" type="audio/mpeg">
                            <source src="${UI.escapeHTML(audioUrl)}" type="audio/wav">
                            <p class="text-xs text-rose-500">Your browser does not support the audio element. <a href="${UI.escapeHTML(audioUrl)}" target="_blank" class="underline">Download audio</a>.</p>
                        </audio>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.html(html);
    }

    // =========================================================================
    // ADMIN ACTIONS: CREATE / PUBLISH / UNPUBLISH / DELETE
    // =========================================================================

    function openCreateModal() {
        if (!Auth.isAdmin()) {
            UI.showToast('Access denied: Admins only.', 'error');
            return;
        }
        $('#announcement-form')[0].reset();
        $('#announcement-modal').removeClass('hidden').addClass('flex');
    }

    function closeCreateModal() {
        $('#announcement-modal').addClass('hidden').removeClass('flex');
    }

    function handleCreateSubmit(e) {
        e.preventDefault();
        if (!Auth.isAdmin()) return;

        const title = $('#announcement-form-title').val().trim();
        const audioFile = $('#announcement-form-audio')[0].files[0];
        const published = $('#announcement-form-published').is(':checked');

        if (!title) {
            UI.showToast('Announcement title is required.', 'warning');
            return;
        }

        if (!audioFile) {
            UI.showToast('Please select an audio file to upload.', 'warning');
            return;
        }

        // Validate audio file
        const validation = UI.validateFile(audioFile, 'AUDIO');
        if (!validation.valid) {
            UI.showToast(validation.message, 'error');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('audio', audioFile);
        formData.append('published', published);

        const btn = $('#announcement-form-submit');
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Uploading audio...');

        API.upload('/announcements', formData, 'POST', function (percent) {
            btn.html(`<i class="fas fa-spinner fa-spin mr-2"></i> Uploading ${percent}%...`);
        })
            .done(function () {
                UI.showToast('Announcement created and broadcast notification sent!', 'success');
                closeCreateModal();
                loadAnnouncements();
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to create announcement.', 'error');
            })
            .always(function () {
                btn.prop('disabled', false).text('Create Announcement');
            });
    }

    function publishAnnouncement(id) {
        if (!Auth.isAdmin()) return;

        API.patch(`/announcements/${id}/publish`)
            .done(function () {
                UI.showToast('Announcement published live!', 'success');
                loadAnnouncements();
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to publish announcement.', 'error');
            });
    }

    function unpublishAnnouncement(id) {
        if (!Auth.isAdmin()) return;

        API.patch(`/announcements/${id}/unpublish`)
            .done(function () {
                UI.showToast('Announcement unpublished.', 'info');
                loadAnnouncements();
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to unpublish announcement.', 'error');
            });
    }

    function confirmDelete(id, title) {
        if (!Auth.isAdmin()) return;

        UI.showConfirm({
            title: 'Delete Announcement?',
            message: `Are you sure you want to permanently delete "${title}"?`,
            confirmText: 'Yes, Delete',
            isDestructive: true,
            onConfirm: function () {
                API.delete(`/announcements/${id}`)
                    .done(function () {
                        UI.showToast('Announcement deleted successfully.', 'info');
                        loadAnnouncements();
                    })
                    .fail(function (err) {
                        UI.showToast(err.message || 'Failed to delete announcement.', 'error');
                    });
            }
        });
    }

    function init() {
        $('#announcement-form').on('submit', handleCreateSubmit);
    }

    return {
        init,
        loadAnnouncements,
        openCreateModal,
        closeCreateModal,
        publishAnnouncement,
        unpublishAnnouncement,
        confirmDelete
    };
})(jQuery);
