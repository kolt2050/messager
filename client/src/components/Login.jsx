import React, { useState } from 'react';
import { login, getMe } from '../api';

function Login({ onLogin, serverUrl, onDisconnect }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const data = await login(username.toLowerCase(), password);
            localStorage.setItem('token', data.access_token);

            const user = await getMe();
            onLogin(user);
        } catch (err) {
            console.error(err);
            setError('Ошибка входа. Проверьте логин и пароль.');
        }
    };

    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: Code+NewPass
    const [forgotCode, setForgotCode] = useState('');
    const [newPass, setNewPass] = useState('');
    const [resetMsg, setResetMsg] = useState('');

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setResetMsg('');
        if (forgotStep === 1) {
            try {
                // Import dynamically if needed or assume accessible via props/scope. 
                // But pure function component needs import. 
                // We'll rely on props passed or import at top level.  
                // Note: imports are at top of file, so we can use them directly.
            } catch (err) { }
            // We need to move logic to a separate handler or use imports.
        }
    };

    // Better structure: Separate component or inline logic with imports available.
    // Since imports are top-level, we can use `requestPasswordReset` etc.

    if (showForgot) {
        return (
            <div className="auth-container">
                <div className="auth-form">
                    <h2>Восстановление пароля</h2>
                    {error && <div className="error-message">{error}</div>}
                    {resetMsg && <div style={{ color: 'var(--success)', marginBottom: '10px' }}>{resetMsg}</div>}

                    {forgotStep === 1 ? (
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setError('');
                            try {
                                const { requestPasswordReset } = await import('../api');
                                await requestPasswordReset(forgotEmail);
                                setForgotStep(2);
                                setResetMsg('Код отправлен на ваш Email');
                            } catch (err) {
                                setError(err.response?.data?.detail || "Ошибка");
                            }
                        }}>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                            </div>
                            <button type="submit">Отправить код</button>
                            <button type="button" className="btn-secondary" onClick={() => setShowForgot(false)} style={{ marginTop: '10px' }}>Назад</button>
                        </form>
                    ) : (
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setError('');
                            try {
                                const { resetPasswordWithCode } = await import('../api');
                                await resetPasswordWithCode(forgotEmail, forgotCode, newPass);
                                setResetMsg('Пароль успешно изменен! Теперь вы можете войти.');
                                setTimeout(() => {
                                    setShowForgot(false);
                                    setForgotStep(1);
                                    setForgotEmail('');
                                    setForgotCode('');
                                    setNewPass('');
                                    setResetMsg('');
                                }, 3000);
                            } catch (err) {
                                setError(err.response?.data?.detail || "Ошибка сброса");
                            }
                        }}>
                            <div className="form-group">
                                <label>Код из письма</label>
                                <input type="text" value={forgotCode} onChange={e => setForgotCode(e.target.value)} required placeholder="6-значный код" />
                            </div>
                            <div className="form-group">
                                <label>Новый пароль</label>
                                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required />
                            </div>
                            <button type="submit">Сменить пароль</button>
                            <button type="button" className="btn-secondary" onClick={() => setForgotStep(1)} style={{ marginTop: '10px' }}>Назад</button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Вход</h2>

                <div style={{
                    backgroundColor: 'var(--primary-light, #eef2ff)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.85rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.8rem',
                    color: 'var(--primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: '500'
                }}>
                    <span>🔗 {serverUrl}</span>
                    <button
                        type="button"
                        onClick={onDisconnect}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: '2px 4px',
                            width: 'auto',
                            fontWeight: '600'
                        }}
                    >
                        Сменить
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                    <label>Имя пользователя</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Пароль</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Войти</button>

                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        style={{ background: 'none', color: 'var(--primary)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '500' }}
                    >
                        Забыли пароль?
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Login;
