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
        <div className="auth-container">
            <form onSubmit={handleConnect} className="auth-form">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔗</div>
                    <h2 style={{ margin: 0 }}>Подключение к серверу</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        Укажите адрес серверной части мессенджера
                    </p>
                </div>

                {error && (
                    <div style={{
                        color: 'var(--danger)',
                        backgroundColor: 'rgba(248, 113, 113, 0.1)',
                        border: '1px solid rgba(248, 113, 113, 0.3)',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        fontSize: '0.85rem'
                    }}>
                        {error}
                    </div>
                )}

                <div className="form-group">
                    <label>
                        Адрес сервера
                    </label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="http://192.168.1.100:8000"
                    />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Например: http://localhost:8000 или http://192.168.1.100:8000
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        opacity: loading ? 0.7 : 1,
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Подключение...' : 'Подключиться'}
                </button>
            </form>
        </div>
    );
}

export default ConnectionSettings;
