import React, { useState, useEffect } from 'react';
import ConnectionSettings from './components/ConnectionSettings';
import Login from './components/Login';
import Chat from './components/Chat';
import { getMe, getServerUrl, clearServerUrl } from './api';

function App() {
    const [serverUrl, setServerUrlState] = useState(getServerUrl());
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
    return <Chat user={user} onLogout={handleLogout} serverUrl={serverUrl} onDisconnect={handleDisconnect} />;
}

export default App;
