/**
 * CivicEvents+ UI Utilities
 * Provides toasts, modals, skeleton loaders, form validation, and formatters
 */
const UI = (function ($) {
    'use strict';

    // HTML escape helper to prevent XSS
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Toast Notifications
    function showToast(message, type = 'info', duration = 4000) {
        const toastContainer = $('#toast-container');
        if (!toastContainer.length) return;

        const id = 'toast-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        let icon = 'fa-info-circle';
        let bg = 'bg-blue-600 text-white border-blue-700';

        if (type === 'success') {
            icon = 'fa-check-circle';
            bg = 'bg-emerald-600 text-white border-emerald-700';
        } else if (type === 'error') {
            icon = 'fa-exclamation-triangle';
            bg = 'bg-rose-600 text-white border-rose-700';
        } else if (type === 'warning') {
            icon = 'fa-exclamation-circle';
            bg = 'bg-amber-500 text-white border-amber-600';
        }

        const toastHtml = `
            <div id="${id}" class="flex items-center w-full max-w-sm p-4 mb-3 rounded-xl shadow-lg border ${bg} transform transition-all duration-300 ease-out translate-y-2 opacity-0" role="alert">
                <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-black/20 text-white">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="ms-3 text-sm font-medium flex-1 pr-2 break-words">${escapeHTML(message)}</div>
                <button type="button" class="ms-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 text-white/80 hover:text-white hover:bg-black/20 focus:outline-none transition-colors" aria-label="Close" onclick="$('#${id}').fadeOut(200, function(){ $(this).remove(); });">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        `;

        toastContainer.append(toastHtml);
        const $el = $(`#${id}`);
        setTimeout(() => {
            $el.removeClass('translate-y-2 opacity-0');
        }, 10);

        if (duration > 0) {
            setTimeout(() => {
                $el.addClass('translate-y-2 opacity-0');
                setTimeout(() => $el.remove(), 300);
            }, duration);
        }
    }

    // Confirmation Modal
    function showConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false, onConfirm }) {
        const modal = $('#confirmation-modal');
        if (!modal.length) return;

        $('#confirm-modal-title').text(title);
        $('#confirm-modal-message').text(message);
        $('#confirm-modal-submit')
            .text(confirmText)
            .removeClass('bg-rose-600 hover:bg-rose-700 bg-indigo-600 hover:bg-indigo-700')
            .addClass(isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700');
        $('#confirm-modal-cancel').text(cancelText);

        modal.removeClass('hidden').addClass('flex');
        $('body').addClass('overflow-hidden');

        // Unbind previous and bind new
        $('#confirm-modal-submit').off('click').on('click', function () {
            closeConfirm();
            if (typeof onConfirm === 'function') onConfirm();
        });

        $('#confirm-modal-cancel, #confirm-modal-close, #confirmation-modal .modal-backdrop').off('click').on('click', closeConfirm);
    }

    function closeConfirm() {
        $('#confirmation-modal').addClass('hidden').removeClass('flex');
        $('body').removeClass('overflow-hidden');
    }

    // Date & Time formatting
    function formatDate(dateStr) {
        if (!dateStr) return 'TBA';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'TBA';
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return 'TBA';
        return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
    }

    function formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        const diffInSeconds = Math.floor((now - d) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        return formatDate(dateStr);
    }

    // Password strength evaluator
    // Requirements: Min 8 chars, at least one uppercase, one lowercase, one number, one special char
    function checkPasswordStrength(password) {
        const result = {
            score: 0,
            hasLength: password.length >= 8,
            hasLower: /[a-z]/.test(password),
            hasUpper: /[A-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[\W_]/.test(password),
            isValid: false,
            message: '',
            color: 'bg-gray-200'
        };

        if (result.hasLength) result.score += 20;
        if (result.hasLower) result.score += 20;
        if (result.hasUpper) result.score += 20;
        if (result.hasNumber) result.score += 20;
        if (result.hasSpecial) result.score += 20;

        result.isValid = result.score === 100;

        if (result.score <= 40) {
            result.message = 'Weak: Include mixed-case, numbers & symbols';
            result.color = 'bg-rose-500';
            result.textColor = 'text-rose-500';
        } else if (result.score < 100) {
            result.message = 'Medium: Almost there, meet all 5 criteria';
            result.color = 'bg-amber-500';
            result.textColor = 'text-amber-500';
        } else {
            result.message = 'Strong password policy satisfied';
            result.color = 'bg-emerald-500';
            result.textColor = 'text-emerald-500';
        }

        return result;
    }

    // Client-side file validation (Size & Allowed Extension)
    function validateFile(file, typeKey) {
        const config = AppConfig.UPLOADS[typeKey];
        if (!config) return { valid: true };

        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!config.allowedExtensions.includes(ext)) {
            return {
                valid: false,
                message: `Invalid file format (${ext}). Allowed: ${config.allowedExtensions.join(', ')}`
            };
        }

        if (file.size > config.maxSize) {
            const maxMB = (config.maxSize / (1024 * 1024)).toFixed(0);
            const actualMB = (file.size / (1024 * 1024)).toFixed(2);
            return {
                valid: false,
                message: `File is too large (${actualMB}MB). Maximum allowed is ${maxMB}MB.`
            };
        }

        return { valid: true };
    }

    // Skeleton loaders
    function renderSkeletons(container, count = 3, type = 'card') {
        let html = '';
        if (type === 'card') {
            for (let i = 0; i < count; i++) {
                html += `
                    <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-pulse space-y-4">
                        <div class="w-full h-48 bg-slate-200 rounded-xl"></div>
                        <div class="h-5 bg-slate-200 rounded w-3/4"></div>
                        <div class="h-4 bg-slate-100 rounded w-1/2"></div>
                        <div class="space-y-2 pt-2">
                            <div class="h-3 bg-slate-100 rounded w-full"></div>
                            <div class="h-3 bg-slate-100 rounded w-5/6"></div>
                        </div>
                        <div class="pt-4 flex justify-between items-center">
                            <div class="h-8 bg-slate-200 rounded-lg w-24"></div>
                            <div class="h-8 bg-slate-100 rounded-lg w-16"></div>
                        </div>
                    </div>
                `;
            }
        } else if (type === 'list') {
            for (let i = 0; i < count; i++) {
                html += `
                    <div class="p-4 bg-white rounded-xl border border-slate-100 shadow-sm animate-pulse flex items-center justify-between">
                        <div class="space-y-2 flex-1">
                            <div class="h-4 bg-slate-200 rounded w-1/3"></div>
                            <div class="h-3 bg-slate-100 rounded w-1/2"></div>
                        </div>
                        <div class="h-8 bg-slate-100 rounded w-20"></div>
                    </div>
                `;
            }
        } else if (type === 'table') {
            for (let i = 0; i < count; i++) {
                html += `
                    <tr class="animate-pulse border-b border-slate-100">
                        <td class="px-6 py-4"><div class="h-4 bg-slate-200 rounded w-32"></div></td>
                        <td class="px-6 py-4"><div class="h-4 bg-slate-100 rounded w-48"></div></td>
                        <td class="px-6 py-4"><div class="h-6 bg-slate-100 rounded-full w-16"></div></td>
                        <td class="px-6 py-4"><div class="h-6 bg-slate-100 rounded-full w-16"></div></td>
                        <td class="px-6 py-4"><div class="h-8 bg-slate-100 rounded w-20"></div></td>
                    </tr>
                `;
            }
        }
        $(container).html(html);
    }

    return {
        escapeHTML,
        showToast,
        showConfirm,
        closeConfirm,
        formatDate,
        formatTime,
        formatDateTime,
        formatRelativeTime,
        checkPasswordStrength,
        validateFile,
        renderSkeletons
    };
})(jQuery);
