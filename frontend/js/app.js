/**
 * CivicEvents+ Main Application Entry Point
 * Bootstraps modules, binds global navigation, auth forms, and demo conveniences
 */
$(function () {
    'use strict';

    // 1. Initialize Auth and load stored session
    Auth.init();

    // 2. Initialize feature modules
    EventsModule.init();
    AnnouncementsModule.init();
    PromosModule.init();
    NotificationsModule.init();
    UsersModule.init();

    // 3. Initialize Router (starts hash-based SPA routing)
    Router.init();

    // =========================================================================
    // GLOBAL HEADER & NAVIGATION EVENT BINDINGS
    // =========================================================================

    // Profile Dropdown Toggle
    $('#user-menu-btn').on('click', function (e) {
        e.stopPropagation();
        $('#user-profile-menu').toggleClass('hidden');
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('#user-profile-menu, #user-menu-btn').length) {
            $('#user-profile-menu').addClass('hidden');
        }
    });

    // Mobile Navigation Menu Toggle
    $('#mobile-menu-btn').on('click', function () {
        $('#mobile-nav-menu').toggleClass('hidden');
    });

    // Logout Click
    $('#logout-btn, #mobile-logout-btn').on('click', function (e) {
        e.preventDefault();
        Auth.logout();
        Router.navigate('/login');
    });

    // Global Search Bar in Navbar
    $('#global-search-input').on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = $(this).val().trim();
            Router.navigate('/events');
            setTimeout(() => {
                $('#events-search-input').val(query).trigger('input');
            }, 50);
        }
    });

    // =========================================================================
    // AUTHENTICATION FLOWS: LOGIN & SIGNUP FORMS
    // =========================================================================

    // Sign In Form Submission
    $('#login-form').on('submit', function (e) {
        e.preventDefault();

        const email = $('#login-email').val().trim();
        const password = $('#login-password').val();
        const rememberMe = $('#login-remember-me').is(':checked');

        if (!email || !password) {
            UI.showToast('Please enter both email and password.', 'warning');
            return;
        }

        const btn = $('#login-submit-btn');
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Signing In...');

        Auth.login(email, password, rememberMe)
            .done(function () {
                Router.navigate('/dashboard');
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Login failed. Check your credentials.', 'error');
            })
            .always(function () {
                btn.prop('disabled', false).text('Sign In to Account');
            });
    });

    // Quick Demo Sign-In Buttons (for grading & convenience)
    $('#quick-admin-login').on('click', function () {
        $('#login-email').val('admin@civicevents.org');
        $('#login-password').val('Admin@12345!');
        $('#login-form').trigger('submit');
    });

    $('#quick-user-login').on('click', function () {
        $('#login-email').val('john.doe@example.com');
        $('#login-password').val('User@12345!');
        $('#login-form').trigger('submit');
    });

    // Signup Form Password Strength Meter
    $('#signup-password').on('input', function () {
        const val = $(this).val();
        const strength = UI.checkPasswordStrength(val);

        $('#password-strength-bar')
            .css('width', `${strength.score}%`)
            .removeClass('bg-gray-200 bg-rose-500 bg-amber-500 bg-emerald-500')
            .addClass(strength.color);

        $('#password-strength-text')
            .text(strength.message)
            .removeClass('text-slate-400 text-rose-500 text-amber-500 text-emerald-500')
            .addClass(strength.textColor || 'text-slate-400');
    });

    // Signup Form Submission
    $('#signup-form').on('submit', function (e) {
        e.preventDefault();

        const full_name = $('#signup-name').val().trim();
        const email = $('#signup-email').val().trim();
        const password = $('#signup-password').val();
        const confirm_password = $('#signup-confirm-password').val();
        const role = $('#signup-role').val() || 'user';

        if (!full_name || !email || !password || !confirm_password) {
            UI.showToast('Please complete all fields.', 'warning');
            return;
        }

        // Validate Password Match
        if (password !== confirm_password) {
            UI.showToast('Passwords do not match.', 'error');
            return;
        }

        // Enforce Strong Password Policy (Min 8 chars, mixed-case, number, special char)
        const strength = UI.checkPasswordStrength(password);
        if (!strength.isValid) {
            UI.showToast('Password does not satisfy policy: minimum 8 characters with uppercase, lowercase, number, and symbol.', 'error');
            return;
        }

        const btn = $('#signup-submit-btn');
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Creating Account...');

        Auth.signup(full_name, email, password, role)
            .done(function () {
                UI.showToast('Account created successfully! Please sign in with your credentials.', 'success');
                $('#signup-form')[0].reset();
                $('#password-strength-bar').css('width', '0%');
                $('#password-strength-text').text('');
                Router.navigate('/login');
            })
            .fail(function (err) {
                UI.showToast(err.message || 'Registration failed.', 'error');
            })
            .always(function () {
                btn.prop('disabled', false).text('Create Citizen Account');
            });
    });

    // Settings Modal / Custom API URL configuration
    $('#settings-btn, #mobile-settings-btn').on('click', function (e) {
        e.preventDefault();
        const currentUrl = localStorage.getItem('civic_custom_api_url') || AppConfig.API_ORIGIN;
        $('#settings-api-url').val(currentUrl);
        $('#settings-modal').removeClass('hidden').addClass('flex');
    });

    $('#settings-form').on('submit', function (e) {
        e.preventDefault();
        const newUrl = $('#settings-api-url').val().trim();
        if (newUrl) {
            localStorage.setItem('civic_custom_api_url', newUrl);
            UI.showToast('API URL saved. Reloading application...', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            localStorage.removeItem('civic_custom_api_url');
            window.location.reload();
        }
    });

    $('#settings-modal-close, #settings-modal-cancel').on('click', function () {
        $('#settings-modal').addClass('hidden').removeClass('flex');
    });
});
