import React, { useState } from 'react';
import { setServerUrl, checkServer } from '../api';

function ConnectionSettings({ onConnected }) {
    const [url, setUrl] = useState('http://localhost:8000');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConnect = async (e) => {
        e.preventDefault();
        setError('');

        if (!url.trim()) {
            setError('Введите адрес сервера');
            return;
        }

        // Normalize URL
        let serverUrl = url.trim().toLowerCase().replace(/\/+$/, '');
        if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
            serverUrl = 'http://' + serverUrl;
        }

        setLoading(true);

        try {
            console.log("Checking server at:", serverUrl);
            const available = await checkServer(serverUrl);
            if (available) {
                setServerUrl(serverUrl);
                onConnected(serverUrl);
            } else {
                setError(`Сервер по адресу ${serverUrl} недоступен. Убедитесь, что сервер запущен и адрес указан верно.`);
            }
        } catch (err) {
            console.error("Connection error:", err);
            setError('Ошибка подключения: ' + (err.message || 'Неизвестная ошибка') + '. Попробуйте открыть этот адрес в браузере телефона.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#f3f4f6'
        }}>
            <form onSubmit={handleConnect} style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                width: '100%',
                maxWidth: '420px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔗</div>
                    <h2 style={{ margin: 0, color: '#1f2937' }}>Подключение к серверу</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        Укажите адрес серверной части мессенджера
                    </p>
                </div>

                {error && (
                    <div style={{
                        color: '#ef4444',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fee2e2',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        fontSize: '0.85rem'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                        Адрес сервера
                    </label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="http://192.168.1.100:8000"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                        }}
                    />
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Например: http://localhost:8000 или http://192.168.1.100:8000
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: loading ? '#93c5fd' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500'
                    }}
                >
                    {loading ? 'Подключение...' : 'Подключиться'}
                </button>
            </form>
        </div>
    );
}

export default ConnectionSettings;
