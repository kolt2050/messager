import React, { useState, useEffect } from 'react';
import ConnectionSettings from './components/ConnectionSettings';
import Login from './components/Login';
import Chat from './components/Chat';
import { getMe, getServerUrl, clearServerUrl } from './api';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    const [serverUrl, setServerUrlState] = useState(getServerUrl());
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Cleanup old theme system remains
    useEffect(() => {
        // Remove old theme CSS variables set directly on root element
        const root = document.documentElement;
        const oldVars = ['--primary-color', '--primary-hover', '--bg-color', '--sidebar-bg', '--chat-bg',
            '--text-color', '--text-muted', '--border-color', '--message-bubble-bg', '--message-own-bg',
            '--message-own-text', '--input-bg', '--input-border', '--modal-bg', '--modal-header-bg',
            '--glass-bg', '--glass-border', '--radius', '--transition-speed'];
        oldVars.forEach(v => root.style.removeProperty(v));
        // Clean old theme data from localStorage
        localStorage.removeItem('themeId');
        document.body.removeAttribute('data-theme');
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            if (!serverUrl) {
                setLoading(false);
                return;
            }
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await getMe();
                    setUser(userData);
                } catch (error) {
                    console.error("Auth check failed", error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, [serverUrl]);

    const handleConnected = (url) => {
        setServerUrlState(url);
    };

    const handleDisconnect = () => {
        clearServerUrl();
        setServerUrlState('');
        setUser(null);
    };

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Загрузка...</div>;
    }

    // Step 1: No server URL — show connection settings
    if (!serverUrl) {
        return <ConnectionSettings onConnected={handleConnected} />;
    }

    // Step 2: Not logged in — show login
    if (!user) {
        return <Login onLogin={handleLogin} serverUrl={serverUrl} onDisconnect={handleDisconnect} />;
    }

    // Step 3: Logged in — show chat
    return (
        <ErrorBoundary>
            <Chat user={user} onLogout={handleLogout} serverUrl={serverUrl} onDisconnect={handleDisconnect} />
        </ErrorBoundary>
    );
}

export default App;
