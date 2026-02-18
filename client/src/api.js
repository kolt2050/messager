import axios from 'axios';

// --- Server URL management ---
export const getServerUrl = () => {
    return localStorage.getItem('serverUrl') || '';
};

export const setServerUrl = (url) => {
    // Normalize: remove trailing slash
    const normalized = url.replace(/\/+$/, '');
    localStorage.setItem('serverUrl', normalized);
    // Update axios base URL
    api.defaults.baseURL = normalized;
};

export const clearServerUrl = () => {
    localStorage.removeItem('serverUrl');
    localStorage.removeItem('token');
};

// Create axios instance with dynamic baseURL
const api = axios.create({
    baseURL: getServerUrl()
});

// Add a request interceptor to include the token
api.interceptors.request.use((config) => {
    // Always use latest serverUrl
    config.baseURL = getServerUrl();
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- Check server availability ---
export const checkServer = async (url) => {
    try {
        const resp = await axios.get(`${url}/docs`, { timeout: 5000 });
        return resp.status === 200;
    } catch (err) {
        // Try another endpoint
        try {
            const resp2 = await axios.get(`${url}/openapi.json`, { timeout: 5000 });
            return resp2.status === 200;
        } catch {
            return false;
        }
    }
};

// --- API Functions ---
export const login = async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const response = await api.post('/auth/login', params);
    return response.data;
};

export const getMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

export const updatePassword = async (oldPassword, newPassword) => {
    const response = await api.post('/auth/update-password', {
        old_password: oldPassword,
        new_password: newPassword
    });
    return response.data;
};

export const resolveInstagramUrl = async (url) => {
    try {
        // Assuming API_URL and fetchWithAuth are defined elsewhere or need to be replaced with 'api'
        // For this change, I'll assume 'api' (axios instance) should be used and the endpoint is relative.
        // If API_URL and fetchWithAuth are intended, they need to be added/defined.
        // Given the context of the file, using 'api' (axios) is consistent.
        const response = await api.get(`/utils/resolve_instagram?url=${encodeURIComponent(url)}`);
        if (response.status === 200) {
            return response.data.video_url;
        }
        return null;
    } catch (error) {
        console.error("Error resolving Instagram URL:", error);
        return null;
    }
};

export const resolveTikTokUrl = async (url) => {
    try {
        const response = await api.get(`/utils/resolve_tiktok?url=${encodeURIComponent(url)}`);
        if (response.status === 200) {
            return response.data.video_url;
        }
        return null;
    } catch (error) {
        console.error("Error resolving TikTok URL:", error);
        return null;
    }
};

export const updateProfile = async (data) => {
    const response = await api.put('/auth/me', data);
    return response.data;
};

export const resetMyPassword = async () => {
    const response = await api.post('/auth/me/reset-password');
    return response.data;
};

export const verifyEmailChange = async (code) => {
    const response = await api.post('/auth/me/verify-email', { code });
    return response.data;
};

export const getChannels = async () => {
    const response = await api.get('/channels');
    return response.data;
};

export const createChannel = async (name) => {
    const response = await api.post('/channels', { name });
    return response.data;
};

export const deleteChannel = async (id) => {
    const response = await api.delete(`/channels/${id}`);
    return response.data;
}

export const getMessages = async (channelId) => {
    const response = await api.get(`/channels/${channelId}/messages`);
    return response.data;
};

export const sendMessage = async (channelId, content, imageUrl = null, thumbnailUrl = null) => {
    const response = await api.post(`/channels/${channelId}/messages`, { content, image_url: imageUrl, thumbnail_url: thumbnailUrl });
    return response.data;
};

export const deleteMessage = async (messageId) => {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
};

export const deleteUser = async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
}

export const createUser = async (username, password, email) => {
    const response = await api.post('/admin/users', { username, password, email });
    return response.data;
}

export const updateUser = async (userId, data) => {
    const response = await api.patch(`/admin/users/${userId}`, data);
    return response.data;
};

export const resetPassword = async (userId) => {
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data;
};

export const getUsers = async () => {
    const response = await api.get('/admin/users');
    return response.data;
}

export const addChannelMember = async (channelId, username) => {
    const response = await api.post(`/channels/${channelId}/members`, { username });
    return response.data;
};

export const removeChannelMember = async (channelId, userId) => {
    const response = await api.delete(`/channels/${channelId}/members/${userId}`);
    return response.data;
};

export const getSMTPSettings = async () => {
    const response = await api.get('/admin/settings/smtp');
    return response.data;
};

export const updateSMTPSettings = async (data) => {
    const response = await api.put('/admin/settings/smtp', data);
    return response.data;
};

export const requestPasswordReset = async (email) => {
    const response = await api.post('/auth/request-password-reset', { email });
    return response.data;
};

export const resetPasswordWithCode = async (email, code, newPassword) => {
    const response = await api.post('/auth/reset-password-confirm', {
        email,
        code,
        new_password: newPassword
    });
    return response.data;
};

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData);
    return response.data; // returns { url: "..." }
};

export default api;
