/**
 * CivicEvents+ API Service
 * Centralized AJAX wrapper with JWT injection, 401 token expiry interceptor, and error handling
 */
const API = (function ($) {
    'use strict';

    /**
     * Retrieves the current auth token from either localStorage or sessionStorage
     */
    function getToken() {
        return localStorage.getItem(AppConfig.STORAGE_TOKEN_KEY) ||
            sessionStorage.getItem(AppConfig.STORAGE_TOKEN_KEY) ||
            null;
    }

    /**
     * Standard request handler
     */
    function request(options) {
        const token = getToken();
        const headers = options.headers || {};

        // Automatically attach Authorization header if token exists
        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const ajaxOptions = {
            url: options.url.startsWith('http') ? options.url : `${AppConfig.API_BASE}${options.url.startsWith('/') ? '' : '/'}${options.url}`,
            type: options.method || 'GET',
            headers: headers,
            dataType: options.dataType || 'json',
            contentType: options.contentType !== undefined ? options.contentType : 'application/json; charset=utf-8',
            data: options.data,
            processData: options.processData !== undefined ? options.processData : true
        };

        const dfd = $.Deferred();

        $.ajax(ajaxOptions)
            .done(function (data, textStatus, jqXHR) {
                dfd.resolve(data, textStatus, jqXHR);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                // Handle 401 Unauthorized (Expired or invalid token)
                if (jqXHR.status === 401) {
                    const currentPath = window.location.hash;
                    // Only trigger logout redirect if not already on login or signup
                    if (currentPath !== '#/login' && currentPath !== '#/signup') {
                        Auth.logout(true); // pass true for expired notification
                        UI.showToast('Your session has expired. Please sign in again.', 'warning');
                        Router.navigate('/login');
                    }
                } else if (jqXHR.status === 403) {
                    UI.showToast('Access denied: You do not have permission to perform this action.', 'error');
                } else if (jqXHR.status === 0) {
                    UI.showToast('Network error: Unable to connect to backend server. Ensure backend is running.', 'error');
                }

                // Extract friendly error message
                let errorMessage = 'An unexpected error occurred.';
                if (jqXHR.responseJSON) {
                    if (jqXHR.responseJSON.message) {
                        errorMessage = jqXHR.responseJSON.message;
                    } else if (jqXHR.responseJSON.errors && Array.isArray(jqXHR.responseJSON.errors)) {
                        errorMessage = jqXHR.responseJSON.errors.map(e => e.msg || e.message).join(' | ');
                    }
                } else if (errorThrown) {
                    errorMessage = errorThrown;
                }

                dfd.reject({
                    status: jqXHR.status,
                    message: errorMessage,
                    response: jqXHR.responseJSON,
                    jqXHR: jqXHR
                });
            });

        return dfd.promise();
    }

    return {
        getToken,

        get: function (url, queryParams) {
            let fullUrl = url;
            if (queryParams) {
                const qs = $.param(queryParams);
                fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
            }
            return request({ url: fullUrl, method: 'GET' });
        },

        post: function (url, body) {
            return request({
                url: url,
                method: 'POST',
                data: JSON.stringify(body)
            });
        },

        put: function (url, body) {
            return request({
                url: url,
                method: 'PUT',
                data: JSON.stringify(body)
            });
        },

        patch: function (url, body) {
            return request({
                url: url,
                method: 'PATCH',
                data: body ? JSON.stringify(body) : undefined
            });
        },

        delete: function (url) {
            return request({
                url: url,
                method: 'DELETE'
            });
        },

        /**
         * Multipart file upload for image, audio, or video files
         */
        upload: function (url, formData, method = 'POST', onProgress) {
            const token = getToken();
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const dfd = $.Deferred();

            $.ajax({
                url: url.startsWith('http') ? url : `${AppConfig.API_BASE}${url.startsWith('/') ? '' : '/'}${url}`,
                type: method,
                headers: headers,
                data: formData,
                processData: false,
                contentType: false,
                xhr: function () {
                    const xhr = new window.XMLHttpRequest();
                    if (onProgress && xhr.upload) {
                        xhr.upload.addEventListener('progress', function (e) {
                            if (e.lengthComputable) {
                                const percent = Math.round((e.loaded / e.total) * 100);
                                onProgress(percent);
                            }
                        }, false);
                    }
                    return xhr;
                }
            })
                .done(function (data) {
                    dfd.resolve(data);
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status === 401) {
                        Auth.logout(true);
                        UI.showToast('Your session has expired. Please sign in again.', 'warning');
                        Router.navigate('/login');
                    }
                    let errorMessage = 'Upload failed.';
                    if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
                        errorMessage = jqXHR.responseJSON.message;
                    }
                    dfd.reject({
                        status: jqXHR.status,
                        message: errorMessage,
                        response: jqXHR.responseJSON
                    });
                });

            return dfd.promise();
        }
    };
})(jQuery);
