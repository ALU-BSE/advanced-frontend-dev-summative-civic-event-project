/**
 * CivicEvents+ Promos Module (Video Spotlights & Captions)
 * Manages video promos, HTML5 video players, WebVTT closed captions,
 * transcripts, and Admin-only upload/publish/delete workflows
 * 
 * =========================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) IN PROMOS:
 * - Admin privileges:
 *     1. "Create Promo" button rendered only for Admin.
 *     2. "Publish / Unpublish" toggle controls visible only to Admin.
 *     3. "Delete Promo" action available strictly to Admin.
 *     4. Admin views both published and unpublished drafts.
 * - Normal User privileges:
 *     1. Read-only access to published video spotlights.
 *     2. Video playback with closed captions and accessibility transcript.
 * =========================================================================
 */
const PromosModule = (function ($) {
    'use strict';

    let promos = [];

    /**
     * Load all promos
     */
    function loadPromos() {
        UI.renderSkeletons('#promos-grid', 4, 'card');

        API.get('/promos')
            .done(function (res) {
                const raw = res.data || [];
                // Filter published for regular users
                if (!Auth.isAdmin()) {
                    promos = raw.filter(p => p.published !== false);
                } else {
                    promos = raw;
                }
                renderPromos();
            })
            .fail(function (err) {
                $('#promos-grid').html(`
                    <div class="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-100">
                        <i class="fas fa-exclamation-circle text-rose-500 text-3xl mb-2"></i>
                        <h4 class="font-bold text-slate-800">Failed to load video promos</h4>
                        <p class="text-sm text-slate-500 mt-1">${UI.escapeHTML(err.message)}</p>
                        <button onclick="PromosModule.loadPromos()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Retry</button>
                    </div>
                `);
            });
    }

    /**
     * Render promo cards with HTML5 video player and interactive captions
     */
    function renderPromos() {
        const container = $('#promos-grid');

        if (promos.length === 0) {
            container.html(`
                <div class="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-video text-2xl"></i>
                    </div>
                    <h3 class="font-bold text-slate-800">No Promos Available</h3>
                    <p class="text-sm text-slate-500 mt-1">There are currently no civic promo videos to display.</p>
                </div>
            `);
            return;
        }

        let html = '';
        promos.forEach((p, idx) => {
            const isPublished = p.published !== false;
            const videoUrl = AppConfig.resolveMediaUrl(p.video_url);
            const videoId = `promo-video-${p.id}`;
            const captionDataUrl = generateVttBlobUrl(p.caption_text);

            html += `
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between">
                    <div>
                        <!-- HTML5 VIDEO ELEMENT WITH ACCESSIBLE CAPTIONS TRACK -->
                        <div class="relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
                            <video id="${videoId}" class="w-full h-full object-contain focus:outline-none" controls preload="metadata" playsinline crossorigin="anonymous">
                                <source src="${UI.escapeHTML(videoUrl)}" type="video/mp4">
                                ${captionDataUrl ? `
                                    <track label="English" kind="subtitles" srclang="en" src="${captionDataUrl}" default>
                                ` : ''}
                                <p class="text-xs text-white p-4">Your browser does not support the video tag. <a href="${UI.escapeHTML(videoUrl)}" target="_blank" class="underline">Download video</a>.</p>
                            </video>

                            <div class="absolute top-3 left-3 flex items-center space-x-2 pointer-events-none">
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${isPublished ? 'bg-emerald-600/90 text-white' : 'bg-amber-600/90 text-white'} backdrop-blur-sm">
                                    ${isPublished ? 'Live Spotlight' : 'Draft / Unpublished'}
                                </span>
                            </div>
                        </div>

                        <div class="p-5">
                            <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
                                <span><i class="fas fa-calendar-day mr-1"></i> ${UI.formatDate(p.created_at)}</span>
                                ${p.caption_text ? `
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                        <i class="fas fa-closed-captioning mr-1 text-indigo-600"></i> Captioned
                                    </span>
                                ` : ''}
                            </div>

                            <h3 class="text-base font-bold text-slate-900 line-clamp-2 leading-snug">${UI.escapeHTML(p.title)}</h3>
                            <p class="text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">${UI.escapeHTML(p.description || 'No description provided.')}</p>

                            <!-- ACCESSIBILITY TRANSCRIPT ACCORDION -->
                            ${p.caption_text ? `
                                <div class="mt-4 pt-3 border-t border-slate-100">
                                    <button onclick="$('#transcript-${p.id}').toggleClass('hidden')" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center">
                                        <i class="fas fa-file-alt mr-1.5"></i>
                                        <span>Toggle Video Transcript</span>
                                    </button>
                                    <div id="transcript-${p.id}" class="hidden mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-100 max-h-32 overflow-y-auto">
                                        ${UI.escapeHTML(p.caption_text)}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- ROLE GUARD: Admin Action controls for promos -->
                    ${Auth.isAdmin() ? `
                        <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            ${isPublished ? `
                                <button onclick="PromosModule.unpublishPromo('${p.id}')" class="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg transition">
                                    <i class="fas fa-eye-slash mr-1"></i> Unpublish
                                </button>
                            ` : `
                                <button onclick="PromosModule.publishPromo('${p.id}')" class="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg transition">
                                    <i class="fas fa-globe mr-1"></i> Publish
                                </button>
                            `}

                            <button onclick="PromosModule.confirmDelete('${p.id}', '${UI.escapeHTML(p.title)}')" class="p-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition" title="Delete Promo">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        container.html(html);
    }

    /**
     * Generates an in-memory WebVTT Blob URL from text captions
     * so that the HTML5 <track> element renders native closed captions
     */
    function generateVttBlobUrl(text) {
        if (!text) return null;
        const vttContent = `WEBVTT\n\n00:00:00.000 --> 00:01:00.000\n${text}\n`;
        const blob = new Blob([vttContent], { type: 'text/vtt' });
        return URL.createObjectURL(blob);
    }

    // =========================================================================
    // ADMIN ACTIONS: CREATE / PUBLISH / UNPUBLISH / DELETE
    // =========================================================================

    function openCreateModal() {
        if (!Auth.isAdmin()) {
            UI.showToast('Access denied: Admins only.', 'error');
            return;
        }
        $('#promo-form')[0].reset();
        $('#promo-modal').removeClass('hidden').addClass('flex');
    }

    function closeCreateModal() {
        $('#promo-modal').addClass('hidden').removeClass('flex');
    }

    function handleCreateSubmit(e) {
        e.preventDefault();
        if (!Auth.isAdmin()) return;

        const title = $('#promo-form-title').val().trim();
        const description = $('#promo-form-description').val().trim();
        const caption_text = $('#promo-form-caption').val().trim();
        const videoFile = $('#promo-form-video')[0].files[0];

        if (!title || !description || !caption_text) {
            UI.showToast('Title, description, and caption text are required.', 'warning');
            return;
        }

        if (!videoFile) {
            UI.showToast('Please select a video file to upload.', 'warning');
            return;
        }

        // Validate video file
        const validation = UI.validateFile(videoFile, 'VIDEO');
        if (!validation.valid) {
            UI.showToast(validation.message, 'error');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('caption_text', caption_text);
        formData.append('video', videoFile);

        const btn = $('#promo-form-submit');
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Uploading video...');

        API.upload('/promos', formData, 'POST', function (percent) {
            btn.html(`<i class="fas fa-spinner fa-spin mr-2"></i> Uploading ${percent}%...`);
        })
            .done(function () {
                UI.showToast('Promo spotlight created and broadcast notification sent!', 'success');
                closeCreateModal();
                loadPromos();
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to create promo.', 'error');
            })
            .always(function () {
                btn.prop('disabled', false).text('Create Promo');
            });
    }

    function publishPromo(id) {
        if (!Auth.isAdmin()) return;

        API.patch(`/promos/${id}/publish`)
            .done(function () {
                UI.showToast('Promo published live!', 'success');
                loadPromos();
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to publish promo.', 'error');
            });
    }

    function unpublishPromo(id) {
        if (!Auth.isAdmin()) return;

        API.patch(`/promos/${id}/unpublish`)
            .done(function () {
                UI.showToast('Promo unpublished.', 'info');
                loadPromos();
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to unpublish promo.', 'error');
            });
    }

    function confirmDelete(id, title) {
        if (!Auth.isAdmin()) return;

        UI.showConfirm({
            title: 'Delete Promo Spotlight?',
            message: `Are you sure you want to permanently delete "${title}"?`,
            confirmText: 'Yes, Delete',
            isDestructive: true,
            onConfirm: function () {
                API.delete(`/promos/${id}`)
                    .done(function () {
                        UI.showToast('Promo deleted successfully.', 'info');
                        loadPromos();
                    })
                    .fail(function (err) {
                        UI.showToast(err.message || 'Failed to delete promo.', 'error');
                    });
            }
        });
    }

    function init() {
        $('#promo-form').on('submit', handleCreateSubmit);
    }

    return {
        init,
        loadPromos,
        openCreateModal,
        closeCreateModal,
        publishPromo,
        unpublishPromo,
        confirmDelete
    };
})(jQuery);
