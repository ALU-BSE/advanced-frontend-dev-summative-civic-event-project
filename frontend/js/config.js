/**
 * CivicEvents+ Frontend Configuration
 * Contains backend base URLs, endpoints, and file upload limits
 */
const AppConfig = (function () {
    // Allows overriding the backend base URL via localStorage if backend runs on a different port/host
    const customBase = localStorage.getItem('civic_custom_api_url');
    const API_ORIGIN = customBase || 'http://localhost:4000';

    return {
        API_ORIGIN: API_ORIGIN,
        API_BASE: `${API_ORIGIN}/api`,
        UPLOADS_BASE: `${API_ORIGIN}/uploads`,

        // Storage keys
        STORAGE_TOKEN_KEY: 'civic_auth_token',
        STORAGE_USER_KEY: 'civic_auth_user',
        STORAGE_REMEMBER_KEY: 'civic_remember_me',

        // Upload constraints (matching backend upload.middleware.js)
        UPLOADS: {
            IMAGE: {
                maxSize: 2 * 1024 * 1024, // 2MB
                allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif'],
                label: 'Image (JPG, JPEG, PNG, GIF up to 2MB)'
            },
            AUDIO: {
                maxSize: 5 * 1024 * 1024, // 5MB
                allowedExtensions: ['.mp3', '.wav', '.m4a', '.ogg'],
                label: 'Audio (MP3, WAV, M4A, OGG up to 5MB)'
            },
            VIDEO: {
                maxSize: 8 * 1024 * 1024, // 8MB
                allowedExtensions: ['.mp4', '.mov', '.avi', '.mkv'],
                label: 'Video (MP4, MOV, AVI, MKV up to 8MB)'
            }
        },

        // Helper to get full upload URL if a relative path is saved
        resolveMediaUrl: function (url) {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://')) {
                // If it points to an older host, ensure it matches current origin
                return url;
            }
            return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
        }
    };
})();
