/**
 * CivicEvents+ Events Module
 * Handles event listings, filtering, search, pagination, details, registration,
 * feedback management, and admin CRUD with image uploads
 * 
 * =========================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) IN EVENTS:
 * - Admin privileges:
 *     1. "Create Event" button is rendered only for Admin.
 *     2. "Edit Event" & "Delete Event" actions visible only to Admin.
 *     3. "View Registrants / Attendees" list on Event Detail is restricted to Admin.
 *     4. Admin can view unpublished and published events.
 * - Normal User privileges:
 *     1. "Register for Event" and "Cancel Registration" buttons visible to users.
 *     2. "Submit Feedback" (rating 1-5 + comment) available to registered attendees/users.
 *     3. "My Registrations" view shows personal event bookings.
 * =========================================================================
 */
const EventsModule = (function ($) {
    'use strict';

    let allEvents = [];
    let myRegistrationsMap = {}; // event_id -> registration object
    let currentPage = 1;
    const pageSize = 6;

    let currentDetailEvent = null;
    let editingEventId = null;

    /**
     * Load events list from API
     */
    function loadEvents() {
        UI.renderSkeletons('#events-grid', 6, 'card');

        // Parallel fetch of events and user registrations (if logged in)
        const eventsReq = API.get('/events');
        const regReq = Auth.isAuthenticated() ? API.get('/event-registrations/my-registrations') : $.Deferred().resolve({ data: [] }).promise();

        $.when(eventsReq, regReq)
            .done(function (eventsRes, regRes) {
                const rawEvents = eventsRes[0]?.data || eventsRes?.data || [];
                const myRegs = regRes[0]?.data || regRes?.data || [];

                myRegistrationsMap = {};
                myRegs.forEach(reg => {
                    if (reg.status === 'registered') {
                        myRegistrationsMap[reg.event_id] = reg;
                    }
                });

                // Filter published events for non-admins
                if (!Auth.isAdmin()) {
                    allEvents = rawEvents.filter(e => e.published !== false);
                } else {
                    allEvents = rawEvents;
                }

                // Populate location filter dropdown
                populateLocationFilter(allEvents);

                // Render page
                currentPage = 1;
                renderFilteredEvents();
            })
            .fail(function (err) {
                $('#events-grid').html(`
                    <div class="col-span-full py-12 text-center">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 text-rose-600 mb-4">
                            <i class="fas fa-exclamation-triangle text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-slate-800">Failed to load events</h3>
                        <p class="text-sm text-slate-500 mt-1">${UI.escapeHTML(err.message)}</p>
                        <button onclick="EventsModule.loadEvents()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                            Retry
                        </button>
                    </div>
                `);
            });
    }

    function populateLocationFilter(events) {
        const locations = [...new Set(events.map(e => e.location).filter(Boolean))].sort();
        const select = $('#events-filter-location');
        select.find('option:not(:first)').remove();
        locations.forEach(loc => {
            select.append(`<option value="${UI.escapeHTML(loc)}">${UI.escapeHTML(loc)}</option>`);
        });
    }

    /**
     * Filter & Paginate events
     */
    function renderFilteredEvents() {
        const keyword = ($('#events-search-input').val() || '').toLowerCase().trim();
        const location = $('#events-filter-location').val();
        const timing = $('#events-filter-timing').val(); // 'all', 'upcoming', 'past'

        const now = new Date().getTime();

        const filtered = allEvents.filter(event => {
            // Keyword match (title, description, location)
            if (keyword) {
                const matchTitle = (event.title || '').toLowerCase().includes(keyword);
                const matchDesc = (event.description || '').toLowerCase().includes(keyword);
                const matchLoc = (event.location || '').toLowerCase().includes(keyword);
                if (!matchTitle && !matchDesc && !matchLoc) return false;
            }

            // Location match
            if (location && event.location !== location) {
                return false;
            }

            // Timing filter
            if (timing === 'upcoming' && event.ends_at) {
                if (new Date(event.ends_at).getTime() < now) return false;
            } else if (timing === 'past' && event.ends_at) {
                if (new Date(event.ends_at).getTime() >= now) return false;
            }

            return true;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        $('#events-count-badge').text(`${totalItems} event${totalItems === 1 ? '' : 's'}`);

        if (paginated.length === 0) {
            $('#events-grid').html(`
                <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                        <i class="fas fa-calendar-times text-2xl"></i>
                    </div>
                    <h3 class="text-base font-semibold text-slate-800">No events found</h3>
                    <p class="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Try adjusting your search terms or filters to find civic activities in your community.</p>
                </div>
            `);
            $('#events-pagination').empty();
            return;
        }

        let html = '';
        paginated.forEach(event => {
            const isRegistered = !!myRegistrationsMap[event.id];
            const isPast = event.ends_at && new Date(event.ends_at).getTime() < now;
            const imageUrl = event.metadata?.image_url ? AppConfig.resolveMediaUrl(event.metadata.image_url) : '';

            html += `
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
                    <div class="relative h-48 bg-slate-100 overflow-hidden">
                        ${imageUrl ? `
                            <img src="${UI.escapeHTML(imageUrl)}" alt="${UI.escapeHTML(event.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null; this.src='https://placehold.co/800x400/1e293b/ffffff?text=Civic+Event';">
                        ` : `
                            <div class="w-full h-full bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 flex items-center justify-center p-6 text-center">
                                <div>
                                    <i class="fas fa-landmark text-white/30 text-4xl mb-2"></i>
                                    <h4 class="text-white font-bold text-lg line-clamp-2">${UI.escapeHTML(event.title)}</h4>
                                </div>
                            </div>
                        `}
                        
                        <div class="absolute top-3 left-3 flex flex-wrap gap-2">
                            ${isPast ? `
                                <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-white backdrop-blur-sm">
                                    <i class="fas fa-history mr-1"></i> Past Event
                                </span>
                            ` : `
                                <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600/90 text-white backdrop-blur-sm">
                                    <i class="fas fa-clock mr-1"></i> Upcoming
                                </span>
                            `}
                            ${isRegistered ? `
                                <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-sm">
                                    <i class="fas fa-check-circle mr-1"></i> Registered
                                </span>
                            ` : ''}
                        </div>

                        ${Auth.isAdmin() ? `
                            <div class="absolute top-3 right-3 flex items-center space-x-1.5 bg-black/60 backdrop-blur-sm p-1 rounded-lg">
                                <button onclick="EventsModule.openEditModal('${event.id}')" title="Edit Event (Admin)" class="w-7 h-7 flex items-center justify-center rounded text-white hover:bg-white/20 transition">
                                    <i class="fas fa-pencil-alt text-xs"></i>
                                </button>
                                <button onclick="EventsModule.confirmDelete('${event.id}', '${UI.escapeHTML(event.title)}')" title="Delete Event (Admin)" class="w-7 h-7 flex items-center justify-center rounded text-rose-300 hover:bg-rose-600 hover:text-white transition">
                                    <i class="fas fa-trash-alt text-xs"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    <div class="p-5 flex-1 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center text-xs text-indigo-600 font-semibold mb-2">
                                <i class="fas fa-calendar-alt mr-1.5"></i>
                                <span>${UI.formatDate(event.starts_at)}</span>
                                <span class="mx-1.5 text-slate-300">•</span>
                                <i class="fas fa-clock mr-1"></i>
                                <span>${UI.formatTime(event.starts_at)}</span>
                            </div>

                            <h3 class="text-lg font-bold text-slate-900 leading-snug line-clamp-2 hover:text-indigo-600 transition">
                                <a href="#/events/${event.id}">${UI.escapeHTML(event.title)}</a>
                            </h3>

                            <p class="text-xs text-slate-500 mt-2 flex items-center">
                                <i class="fas fa-map-marker-alt text-rose-500 mr-1.5 flex-shrink-0"></i>
                                <span class="truncate">${UI.escapeHTML(event.location || 'Location TBA')}</span>
                            </p>

                            <p class="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                                ${UI.escapeHTML(event.description || 'No description provided for this civic gathering.')}
                            </p>
                        </div>

                        <div class="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                            <a href="#/events/${event.id}" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center">
                                <span>View Details</span>
                                <i class="fas fa-arrow-right ml-1.5 text-xs"></i>
                            </a>

                            <!-- ROLE-BASED REGISTRATION ACTIONS -->
                            ${!isPast ? `
                                ${isRegistered ? `
                                    <button onclick="EventsModule.cancelRegistration('${event.id}')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition border border-rose-200">
                                        Cancel Registration
                                    </button>
                                ` : `
                                    <button onclick="EventsModule.registerForEvent('${event.id}')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
                                        Register Now
                                    </button>
                                `}
                            ` : `
                                <span class="text-xs font-medium text-slate-400">Completed</span>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });

        $('#events-grid').html(html);
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        if (totalPages <= 1) {
            $('#events-pagination').empty();
            return;
        }

        let html = `
            <div class="flex items-center justify-center space-x-2 pt-6">
                <button onclick="EventsModule.changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="opacity-50 cursor-not-allowed"' : 'class="hover:bg-slate-100"'} class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 text-sm transition">
                    <i class="fas fa-chevron-left text-xs"></i>
                </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            const active = i === currentPage ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-100 border-slate-200';
            html += `
                <button onclick="EventsModule.changePage(${i})" class="w-9 h-9 rounded-lg border text-sm transition ${active}">
                    ${i}
                </button>
            `;
        }

        html += `
                <button onclick="EventsModule.changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="opacity-50 cursor-not-allowed"' : 'class="hover:bg-slate-100"'} class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 text-sm transition">
                    <i class="fas fa-chevron-right text-xs"></i>
                </button>
            </div>
        `;

        $('#events-pagination').html(html);
    }

    function changePage(page) {
        currentPage = page;
        renderFilteredEvents();
        window.scrollTo({ top: $('#events-grid').offset().top - 100, behavior: 'smooth' });
    }

    /**
     * Load Event Detail View (Single event, attendees list for admin, feedback for all)
     */
    function loadEventDetail(eventId) {
        $('#event-detail-loading').removeClass('hidden');
        $('#event-detail-content').addClass('hidden');

        API.get(`/events/${eventId}`)
            .done(function (res) {
                const event = res.data;
                currentDetailEvent = event;
                renderEventDetail(event);
                loadEventFeedback(eventId);

                // ROLE GUARD: Only admins can view the event attendees/registrants list
                if (Auth.isAdmin()) {
                    $('#event-attendees-section').removeClass('hidden');
                    loadEventAttendees(eventId);
                } else {
                    $('#event-attendees-section').addClass('hidden');
                }
            })
            .fail(function (err) {
                $('#event-detail-loading').addClass('hidden');
                UI.showToast(err.message || 'Failed to load event details', 'error');
                Router.navigate('/events');
            });
    }

    function renderEventDetail(event) {
        $('#event-detail-loading').addClass('hidden');
        $('#event-detail-content').removeClass('hidden');

        $('#detail-event-title').text(event.title);
        $('#detail-event-desc').text(event.description || 'No detailed description available.');
        $('#detail-event-location').text(event.location || 'Location to be announced');
        $('#detail-event-starts').text(UI.formatDateTime(event.starts_at));
        $('#detail-event-ends').text(UI.formatDateTime(event.ends_at));

        // Google Maps Search Link
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location || 'Civic Center')}`;
        $('#detail-map-link').attr('href', mapUrl);

        // Banner Image
        const imageUrl = event.metadata?.image_url ? AppConfig.resolveMediaUrl(event.metadata.image_url) : '';
        if (imageUrl) {
            $('#detail-event-banner').attr('src', imageUrl).removeClass('hidden');
            $('#detail-event-banner-placeholder').addClass('hidden');
        } else {
            $('#detail-event-banner').addClass('hidden');
            $('#detail-event-banner-placeholder').removeClass('hidden');
        }

        // Registration button state
        updateDetailRegistrationButton();

        // Admin action buttons on detail page
        if (Auth.isAdmin()) {
            $('#detail-admin-actions').removeClass('hidden');
            $('#detail-btn-edit').off('click').on('click', () => openEditModal(event.id));
            $('#detail-btn-delete').off('click').on('click', () => confirmDelete(event.id, event.title, true));
        } else {
            $('#detail-admin-actions').addClass('hidden');
        }
    }

    function updateDetailRegistrationButton() {
        if (!currentDetailEvent) return;
        const eventId = currentDetailEvent.id;
        const isRegistered = !!myRegistrationsMap[eventId];
        const isPast = currentDetailEvent.ends_at && new Date(currentDetailEvent.ends_at).getTime() < Date.now();

        const btn = $('#detail-register-btn');
        if (isPast) {
            btn.text('Event Completed').prop('disabled', true)
                .removeClass('bg-indigo-600 hover:bg-indigo-700 bg-rose-600 hover:bg-rose-700 text-white')
                .addClass('bg-slate-200 text-slate-500 cursor-not-allowed');
        } else if (isRegistered) {
            btn.html('<i class="fas fa-times-circle mr-2"></i> Cancel Registration')
                .prop('disabled', false)
                .removeClass('bg-indigo-600 hover:bg-indigo-700 bg-slate-200 text-slate-500 cursor-not-allowed')
                .addClass('bg-rose-600 hover:bg-rose-700 text-white')
                .off('click').on('click', () => cancelRegistration(eventId, true));
        } else {
            btn.html('<i class="fas fa-ticket-alt mr-2"></i> Register for Event')
                .prop('disabled', false)
                .removeClass('bg-rose-600 hover:bg-rose-700 bg-slate-200 text-slate-500 cursor-not-allowed')
                .addClass('bg-indigo-600 hover:bg-indigo-700 text-white')
                .off('click').on('click', () => registerForEvent(eventId, true));
        }
    }

    /**
     * User Action: Register for Event
     */
    function registerForEvent(eventId, refreshDetail = false) {
        if (!Auth.isAuthenticated()) {
            UI.showToast('Please sign in to register for civic events.', 'warning');
            Router.navigate('/login');
            return;
        }

        API.post('/event-registrations/register', { event_id: eventId })
            .done(function (res) {
                UI.showToast('You have successfully registered for this event!', 'success');
                myRegistrationsMap[eventId] = res.data;
                if (refreshDetail) {
                    updateDetailRegistrationButton();
                } else {
                    renderFilteredEvents();
                }
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Registration failed.', 'error');
            });
    }

    /**
     * User Action: Cancel Registration
     */
    function cancelRegistration(eventId, refreshDetail = false) {
        UI.showConfirm({
            title: 'Cancel Registration?',
            message: 'Are you sure you want to cancel your registration for this event?',
            confirmText: 'Yes, Cancel Registration',
            isDestructive: true,
            onConfirm: function () {
                API.post('/event-registrations/cancel', { event_id: eventId })
                    .done(function () {
                        UI.showToast('Registration cancelled.', 'info');
                        delete myRegistrationsMap[eventId];
                        if (refreshDetail) {
                            updateDetailRegistrationButton();
                        } else {
                            renderFilteredEvents();
                        }
                    })
                    .fail(function (err) {
                        UI.showToast(err.message || 'Cancellation failed.', 'error');
                    });
            }
        });
    }

    /**
     * ROLE GUARD: Load event attendees (Admin only)
     * Backend endpoint: GET /api/event-registrations/event/:event_id/attendees
     */
    function loadEventAttendees(eventId) {
        $('#event-attendees-list').html('<p class="text-sm text-slate-500 py-4 animate-pulse">Loading attendee records...</p>');

        API.get(`/event-registrations/event/${eventId}/attendees`)
            .done(function (res) {
                const attendees = res.data || [];
                $('#attendees-count-badge').text(attendees.length);

                if (attendees.length === 0) {
                    $('#event-attendees-list').html(`
                        <p class="text-sm text-slate-400 py-3 text-center italic">No registered attendees yet for this event.</p>
                    `);
                    return;
                }

                let html = '<div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">';
                attendees.forEach(att => {
                    html += `
                        <div class="py-2.5 flex items-center justify-between text-sm">
                            <div class="flex items-center space-x-3">
                                <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                    ${UI.escapeHTML((att.full_name || 'U')[0].toUpperCase())}
                                </div>
                                <div>
                                    <p class="font-medium text-slate-800">${UI.escapeHTML(att.full_name)}</p>
                                    <p class="text-xs text-slate-400">${UI.escapeHTML(att.email)}</p>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">Registered</span>
                        </div>
                    `;
                });
                html += '</div>';
                $('#event-attendees-list').html(html);
            })
            .fail(function (err) {
                $('#event-attendees-list').html(`<p class="text-xs text-rose-500 py-2">Error loading attendees: ${UI.escapeHTML(err.message)}</p>`);
            });
    }

    /**
     * Feedback Management for Event
     */
    function loadEventFeedback(eventId) {
        $('#feedback-list-container').html('<p class="text-sm text-slate-500 py-4 animate-pulse">Loading feedback...</p>');

        // Fetch user's submitted feedback to see if they already reviewed this event
        const userFeedbackReq = Auth.isAuthenticated() ? API.get('/event-feedback/my-feedback') : $.Deferred().resolve({ data: [] }).promise();
        
        // For event feedback: Admin has dedicated endpoint, normal users can read their own or public
        const eventFeedbackReq = Auth.isAdmin() ? API.get(`/event-feedback/event/${eventId}`) : $.Deferred().resolve({ data: [] }).promise();

        $.when(userFeedbackReq, eventFeedbackReq)
            .done(function (userRes, adminRes) {
                const userFeedbacks = userRes[0]?.data || userRes?.data || [];
                const adminFeedbacks = adminRes[0]?.data || adminRes?.data || [];

                // Combine feedbacks (admin gets all, user gets own for this event)
                let feedbacks = Auth.isAdmin() ? adminFeedbacks : userFeedbacks.filter(f => f.event_id === eventId);
                const userReview = userFeedbacks.find(f => f.event_id === eventId);

                renderFeedbackSection(eventId, feedbacks, userReview);
            })
            .fail(function () {
                $('#feedback-list-container').html('<p class="text-xs text-slate-400 py-2 italic">Feedback unavailable at this time.</p>');
            });
    }

    function renderFeedbackSection(eventId, feedbacks, userReview) {
        // Average rating calculation
        let avgRating = 0;
        if (feedbacks.length > 0) {
            const sum = feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0);
            avgRating = (sum / feedbacks.length).toFixed(1);
        }

        $('#feedback-avg-score').text(avgRating > 0 ? avgRating : 'New');
        $('#feedback-total-count').text(`(${feedbacks.length} review${feedbacks.length === 1 ? '' : 's'})`);

        // Render Star summary
        renderStarRatingDisplay('#feedback-star-display', avgRating);

        // Render Feedback List
        if (feedbacks.length === 0) {
            $('#feedback-list-container').html(`
                <div class="text-center py-6 bg-slate-50 rounded-xl">
                    <p class="text-sm text-slate-500">No feedback submitted yet. Be the first to share your experience!</p>
                </div>
            `);
        } else {
            let html = '<div class="space-y-3">';
            feedbacks.forEach(f => {
                html += `
                    <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="font-semibold text-slate-800 text-sm">${UI.escapeHTML(f.full_name || 'Community Member')}</span>
                            <span class="text-xs text-slate-400">${UI.formatDate(f.created_at)}</span>
                        </div>
                        <div class="flex items-center text-amber-400 text-xs mb-2">
                            ${getStarHtml(f.rating)}
                        </div>
                        <p class="text-sm text-slate-600 leading-relaxed">${UI.escapeHTML(f.comment || 'No comment provided.')}</p>
                    </div>
                `;
            });
            html += '</div>';
            $('#feedback-list-container').html(html);
        }

        // Render Feedback Form (Logged in users)
        if (Auth.isAuthenticated()) {
            $('#feedback-form-card').removeClass('hidden');
            if (userReview) {
                $('#feedback-form-title').text('Update Your Review');
                $('#feedback-comment').val(userReview.comment || '');
                setStarInput(userReview.rating || 5);
                $('#feedback-submit-btn').text('Update Review').data('feedback-id', userReview.id);
            } else {
                $('#feedback-form-title').text('Leave Your Review');
                $('#feedback-comment').val('');
                setStarInput(5);
                $('#feedback-submit-btn').text('Submit Review').removeData('feedback-id');
            }
        } else {
            $('#feedback-form-card').addClass('hidden');
        }
    }

    function getStarHtml(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star mr-0.5"></i>';
            } else {
                stars += '<i class="far fa-star text-slate-300 mr-0.5"></i>';
            }
        }
        return stars;
    }

    function renderStarRatingDisplay(selector, score) {
        const num = parseFloat(score) || 0;
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (num >= i) {
                html += '<i class="fas fa-star text-amber-400"></i>';
            } else if (num >= i - 0.5) {
                html += '<i class="fas fa-star-half-alt text-amber-400"></i>';
            } else {
                html += '<i class="far fa-star text-slate-300"></i>';
            }
        }
        $(selector).html(html);
    }

    let selectedRating = 5;
    function setStarInput(rating) {
        selectedRating = rating;
        $('#feedback-stars-input i').each(function (index) {
            if (index < rating) {
                $(this).removeClass('far text-slate-300').addClass('fas text-amber-400');
            } else {
                $(this).removeClass('fas text-amber-400').addClass('far text-slate-300');
            }
        });
    }

    /**
     * Submit or Update Feedback
     */
    function handleFeedbackSubmit() {
        if (!currentDetailEvent) return;
        const comment = $('#feedback-comment').val().trim();
        const feedbackId = $('#feedback-submit-btn').data('feedback-id');

        if (!comment) {
            UI.showToast('Please enter a comment for your feedback.', 'warning');
            return;
        }

        const payload = {
            event_id: currentDetailEvent.id,
            rating: selectedRating,
            comment: comment
        };

        const request = feedbackId
            ? API.put(`/event-feedback/${feedbackId}`, { rating: selectedRating, comment: comment })
            : API.post('/event-feedback', payload);

        request
            .done(function () {
                UI.showToast(feedbackId ? 'Feedback updated successfully!' : 'Feedback submitted! Thank you.', 'success');
                loadEventFeedback(currentDetailEvent.id);
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to submit feedback.', 'error');
            });
    }

    /**
     * My Registrations Page View
     */
    function loadMyRegistrations() {
        UI.renderSkeletons('#my-registrations-container', 3, 'card');

        API.get('/event-registrations/my-registrations')
            .done(function (res) {
                const regs = res.data || [];
                if (regs.length === 0) {
                    $('#my-registrations-container').html(`
                        <div class="text-center py-16 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                            <i class="fas fa-calendar-check text-4xl text-slate-300 mb-3"></i>
                            <h3 class="text-base font-semibold text-slate-800">No Registrations Yet</h3>
                            <p class="text-sm text-slate-500 mt-1">You have not registered for any civic events.</p>
                            <a href="#/events" class="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">Browse Events</a>
                        </div>
                    `);
                    return;
                }

                let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';
                regs.forEach(reg => {
                    const isCancelled = reg.status === 'cancelled';
                    html += `
                        <div class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${isCancelled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
                                        ${isCancelled ? 'Cancelled' : 'Confirmed Registration'}
                                    </span>
                                    <span class="text-xs text-slate-400">${UI.formatDate(reg.created_at)}</span>
                                </div>
                                <h3 class="text-lg font-bold text-slate-900 mt-2">
                                    <a href="#/events/${reg.event_id}" class="hover:text-indigo-600 transition">${UI.escapeHTML(reg.title || 'Civic Event')}</a>
                                </h3>
                                <p class="text-xs text-slate-500 mt-2 flex items-center">
                                    <i class="fas fa-calendar-alt text-indigo-500 mr-1.5"></i>
                                    <span>${UI.formatDateTime(reg.starts_at)}</span>
                                </p>
                                <p class="text-xs text-slate-500 mt-1 flex items-center">
                                    <i class="fas fa-map-marker-alt text-rose-500 mr-1.5"></i>
                                    <span>${UI.escapeHTML(reg.location || 'Location TBA')}</span>
                                </p>
                            </div>

                            <div class="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                                <a href="#/events/${reg.event_id}" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View Event Details &rarr;</a>
                                ${!isCancelled ? `
                                    <button onclick="EventsModule.cancelRegistration('${reg.event_id}')" class="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold transition">
                                        Cancel Registration
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                $('#my-registrations-container').html(html);
            })
            .fail(function (err) {
                $('#my-registrations-container').html(`<p class="text-sm text-rose-500">${UI.escapeHTML(err.message)}</p>`);
            });
    }

    /**
     * My Feedback Page View
     */
    function loadMyFeedback() {
        UI.renderSkeletons('#my-feedback-container', 3, 'card');

        API.get('/event-feedback/my-feedback')
            .done(function (res) {
                const feedbacks = res.data || [];
                if (feedbacks.length === 0) {
                    $('#my-feedback-container').html(`
                        <div class="text-center py-16 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                            <i class="fas fa-star text-4xl text-slate-300 mb-3"></i>
                            <h3 class="text-base font-semibold text-slate-800">No Feedback Submitted</h3>
                            <p class="text-sm text-slate-500 mt-1">You haven't left feedback on any civic events yet.</p>
                            <a href="#/events" class="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">Browse Events</a>
                        </div>
                    `);
                    return;
                }

                let html = '<div class="space-y-4">';
                feedbacks.forEach(f => {
                    html += `
                        <div class="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div class="flex-1">
                                <div class="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                                    <span>${UI.formatDate(f.created_at)}</span>
                                </div>
                                <h4 class="text-base font-bold text-slate-900">
                                    <a href="#/events/${f.event_id}" class="hover:text-indigo-600 transition">${UI.escapeHTML(f.title || 'Civic Event')}</a>
                                </h4>
                                <div class="flex items-center text-amber-400 text-xs my-2">
                                    ${getStarHtml(f.rating)}
                                </div>
                                <p class="text-sm text-slate-600">${UI.escapeHTML(f.comment || 'No comment provided.')}</p>
                            </div>
                            <div>
                                <a href="#/events/${f.event_id}" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition inline-block">
                                    Open Event
                                </a>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                $('#my-feedback-container').html(html);
            })
            .fail(function (err) {
                $('#my-feedback-container').html(`<p class="text-sm text-rose-500">${UI.escapeHTML(err.message)}</p>`);
            });
    }

    // =========================================================================
    // ADMIN ACTIONS: CREATE / EDIT / DELETE EVENT
    // =========================================================================

    function openCreateModal() {
        if (!Auth.isAdmin()) {
            UI.showToast('Access denied: Admins only.', 'error');
            return;
        }
        editingEventId = null;
        $('#event-modal-title').text('Create Civic Event');
        $('#event-form')[0].reset();
        $('#event-image-preview-container').addClass('hidden');
        $('#event-image-preview').attr('src', '');
        $('#event-modal').removeClass('hidden').addClass('flex');
    }

    function openEditModal(eventId) {
        if (!Auth.isAdmin()) {
            UI.showToast('Access denied: Admins only.', 'error');
            return;
        }
        editingEventId = eventId;
        $('#event-modal-title').text('Edit Civic Event');
        $('#event-form')[0].reset();

        const event = allEvents.find(e => e.id === eventId) || currentDetailEvent;
        if (!event) return;

        $('#event-form-title').val(event.title || '');
        $('#event-form-location').val(event.location || '');
        $('#event-form-description').val(event.description || '');

        // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
        if (event.starts_at) {
            const s = new Date(event.starts_at);
            $('#event-form-starts').val(s.toISOString().slice(0, 16));
        }
        if (event.ends_at) {
            const e = new Date(event.ends_at);
            $('#event-form-ends').val(e.toISOString().slice(0, 16));
        }

        if (event.metadata?.image_url) {
            $('#event-image-preview').attr('src', AppConfig.resolveMediaUrl(event.metadata.image_url));
            $('#event-image-preview-container').removeClass('hidden');
        } else {
            $('#event-image-preview-container').addClass('hidden');
        }

        $('#event-modal').removeClass('hidden').addClass('flex');
    }

    function closeEventModal() {
        $('#event-modal').addClass('hidden').removeClass('flex');
    }

    function handleEventFormSubmit(e) {
        e.preventDefault();
        if (!Auth.isAdmin()) return;

        const title = $('#event-form-title').val().trim();
        const location = $('#event-form-location').val().trim();
        const starts_at = $('#event-form-starts').val();
        const ends_at = $('#event-form-ends').val();
        const description = $('#event-form-description').val().trim();
        const imageFile = $('#event-form-image')[0].files[0];

        // Client-side validations
        if (!title || !location || !starts_at || !ends_at) {
            UI.showToast('Please fill in all required event fields.', 'warning');
            return;
        }

        if (new Date(ends_at) <= new Date(starts_at)) {
            UI.showToast('Event end date must be after the start date.', 'warning');
            return;
        }

        if (imageFile) {
            const validation = UI.validateFile(imageFile, 'IMAGE');
            if (!validation.valid) {
                UI.showToast(validation.message, 'error');
                return;
            }
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('location', location);
        formData.append('starts_at', new Date(starts_at).toISOString());
        formData.append('ends_at', new Date(ends_at).toISOString());
        formData.append('description', description);

        if (imageFile) {
            formData.append('image', imageFile);
        }

        const submitBtn = $('#event-form-submit');
        submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Saving...');

        const endpoint = editingEventId ? `/events/${editingEventId}` : '/events';
        const method = editingEventId ? 'PUT' : 'POST';

        API.upload(endpoint, formData, method)
            .done(function () {
                UI.showToast(editingEventId ? 'Event updated successfully!' : 'Event created and published!', 'success');
                closeEventModal();
                if (currentDetailEvent && editingEventId === currentDetailEvent.id) {
                    loadEventDetail(editingEventId);
                } else {
                    loadEvents();
                }
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Failed to save event.', 'error');
            })
            .always(function () {
                submitBtn.prop('disabled', false).text('Save Event');
            });
    }

    function confirmDelete(eventId, eventTitle, fromDetail = false) {
        if (!Auth.isAdmin()) return;

        UI.showConfirm({
            title: 'Delete Event?',
            message: `Are you sure you want to delete "${eventTitle}"? This will remove all registrations and notifications related to this event.`,
            confirmText: 'Yes, Delete',
            isDestructive: true,
            onConfirm: function () {
                API.delete(`/events/${eventId}`)
                    .done(function () {
                        UI.showToast('Event deleted successfully.', 'info');
                        if (fromDetail) {
                            Router.navigate('/events');
                        } else {
                            loadEvents();
                        }
                    })
                    .fail(function (err) {
                        UI.showToast(err.message || 'Failed to delete event.', 'error');
                    });
            }
        });
    }

    function init() {
        // Image preview handler
        $('#event-form-image').on('change', function () {
            const file = this.files[0];
            if (file) {
                const validation = UI.validateFile(file, 'IMAGE');
                if (!validation.valid) {
                    UI.showToast(validation.message, 'error');
                    this.value = '';
                    $('#event-image-preview-container').addClass('hidden');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (e) {
                    $('#event-image-preview').attr('src', e.target.result);
                    $('#event-image-preview-container').removeClass('hidden');
                };
                reader.readAsDataURL(file);
            }
        });

        // Event form submit
        $('#event-form').on('submit', handleEventFormSubmit);

        // Feedback star clicks
        $('#feedback-stars-input').on('click', 'i', function () {
            const rating = $(this).data('rating');
            setStarInput(rating);
        });

        $('#feedback-submit-btn').on('click', handleFeedbackSubmit);

        // Search & Filter event bindings
        $('#events-search-input').on('input', function () {
            currentPage = 1;
            renderFilteredEvents();
        });

        $('#events-filter-location, #events-filter-timing').on('change', function () {
            currentPage = 1;
            renderFilteredEvents();
        });
    }

    return {
        init,
        loadEvents,
        loadEventDetail,
        loadMyRegistrations,
        loadMyFeedback,
        changePage,
        openCreateModal,
        openEditModal,
        closeEventModal,
        registerForEvent,
        cancelRegistration,
        confirmDelete
    };
})(jQuery);
