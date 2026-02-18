import React, { useState, useEffect, useRef } from 'react';
import ChannelList from './ChannelList';
import ChatArea from './ChatArea';
import Modal from './Modal';
import { getChannels, createChannel, getMessages, sendMessage, deleteMessage, deleteChannel, createUser, getUsers, deleteUser, updatePassword, addChannelMember, removeChannelMember, updateUser, resetPassword, updateProfile, resetMyPassword, verifyEmailChange, getSMTPSettings, updateSMTPSettings } from '../api';

function Chat({ user, onLogout, serverUrl, onDisconnect }) {
    const [channels, setChannels] = useState([]);
    const [activeChannelId, setActiveChannelId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const wsRef = useRef(null);
    const activeChannelRef = useRef(null);

    // Modal state
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        content: null,
        footer: null
    });

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

    const showInfo = (title, message) => {
        setModal({
            isOpen: true,
            title,
            content: <p style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>,
            footer: <button style={{ width: 'auto' }} onClick={closeModal}>OK</button>
        });
    };

    const showConfirm = (title, message, onConfirm) => {
        setModal({
            isOpen: true,
            title,
            content: <p style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>,
            footer: (
                <>
                    <button className="btn-secondary" onClick={closeModal}>Отмена</button>
                    <button onClick={() => { onConfirm(); closeModal(); }}>Да</button>
                </>
            )
        });
    };

    useEffect(() => {
        activeChannelRef.current = activeChannelId;
    }, [activeChannelId]);

    useEffect(() => {
        loadChannels();
        if (user.is_admin) {
            loadUsers();
        }
    }, []);

    useEffect(() => {
        if (!serverUrl) return;

        let ws = null;
        try {
            const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws';
            console.log("Connecting to WebSocket:", wsUrl);
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => console.log("WebSocket connected");
            ws.onmessage = (event) => {
                try {
                    handleWsMessage(JSON.parse(event.data));
                } catch (e) {
                    console.error("Failed to parse WS message", e);
                }
            };
            ws.onerror = (err) => console.error("WebSocket error:", err);
            ws.onclose = () => console.log("WebSocket closed");
        } catch (err) {
            console.error("Failed to initialize WebSocket:", err);
        }

        return () => ws?.close();
    }, [serverUrl]);

    useEffect(() => {
        activeChannelRef.current = activeChannelId;
        if (activeChannelId) loadMessages(activeChannelId);
        else setMessages([]);
    }, [activeChannelId]);

    const loadChannels = async () => {
        try {
            const data = await getChannels();
            setChannels(data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadMessages = async (channelId) => {
        try {
            const data = await getMessages(channelId);
            setMessages(data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users', err);
        }
    };

    const handleWsMessage = (data) => {
        if (data.type === 'new_message') {
            setMessages(prev => {
                if (data.message.channel_id === activeChannelRef.current) {
                    if (prev.find(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message];
                }
                return prev;
            });
        } else if (data.type === 'message_deleted') {
            setMessages(prev => prev.filter(m => m.id !== data.id));
        } else if (data.type === 'channel_deleted') {
            setChannels(prev => prev.filter(c => c.id !== data.id));
            if (activeChannelId === data.id) setActiveChannelId(null);
        }
    };

    const handleCreateChannel = async (name) => {
        try {
            const newChannel = await createChannel(name);
            setChannels(prev => [...prev, newChannel]);
            setActiveChannelId(newChannel.id);
        } catch (err) {
            showInfo("Ошибка", "Не удалось создать канал: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleDeleteChannel = async (id) => {
        showConfirm("Удаление канала", "Вы уверены, что хотите удалить этот канал и все сообщения в нем?", async () => {
            try {
                await deleteChannel(id);
                setChannels(prev => prev.filter(c => c.id !== id));
                if (activeChannelId === id) setActiveChannelId(null);
            } catch (err) {
                showInfo("Ошибка", "Ошибка удаления: " + (err.response?.data?.detail || err.message));
            }
        });
    }

    const handleSendMessage = async (content, imageUrl = null, thumbnailUrl = null) => {
        if (!activeChannelId) return;
        try {
            await sendMessage(activeChannelId, content, imageUrl, thumbnailUrl);
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            await deleteMessage(messageId);
        } catch (err) {
            showInfo("Ошибка", "Не удалось удалить: " + (err.response?.data?.detail || "Ошибка сервера"));
        }
    }



    const handleSettings = () => {
        // Use refs for inputs to avoid re-rendering whole modal on every keystroke if properly managed, 
        // but here we use simple vars or state inside modal content wrapper if we could.
        // Since modal content is just a render, we need to maintain state in the component 
        // OR re-render the modal with new content. 
        // To support multi-step, we'll wrap the content in a small interaction logic.
        // Placeholder to ensure I see where I am inserting or if I need to.
        // I will actually just look for it first.
        // Actually, let's use a local small component logic by defining a State inside Chat? No, messy.
        // Best approach here: Use `setModal` to update the view when state changes (like step 1 -> step 2).

        let emailValue = user.email || '';
        let codeValue = '';

        const openVerificationStep = (infoMessage) => {
            setModal({
                isOpen: true,
                title: "Подтверждение Email",
                content: (
                    <div>
                        <p>{infoMessage}</p>
                        <input
                            type="text"
                            placeholder="Введите код из письма"
                            onChange={e => codeValue = e.target.value}
                            style={{ width: '100%', padding: '8px', marginTop: '10px', letterSpacing: '2px', fontSize: '1.2rem', textAlign: 'center' }}
                        />
                        <button
                            onClick={async () => {
                                try {
                                    await verifyEmailChange(codeValue);
                                    showInfo("Успех", "Email успешно изменен!");
                                    // Here we should ideally reload user. 
                                    // For now, let's just close. Profile might look outdated until refresh.
                                    setModal({ isOpen: false, title: '', content: null, footer: null });
                                } catch (err) {
                                    showInfo("Ошибка", err.response?.data?.detail || "Неверный код");
                                }
                            }}
                            style={{ marginTop: '15px', width: '100%', background: '#10b981' }}
                        >
                            Подтвердить
                        </button>
                    </div>
                ),
                footer: <button className="btn-secondary" onClick={handleSettings}>Назад</button>
            });
        };

        const submitProfile = async () => {
            try {
                const resp = await updateProfile({ email: emailValue });
                if (resp.verification_required) {
                    openVerificationStep(resp.detail);
                } else {
                    showInfo("Успех", "Профиль обновлен");
                }
            } catch (err) {
                showInfo("Ошибка", err.response?.data?.detail || "Не удалось обновить профиль");
            }
        };

        let oldPassValue = '', newPassValue = '', confirmPassValue = '';

        const submitPassword = async () => {
            if (!oldPassValue || !newPassValue || !confirmPassValue) {
                showInfo("Внимание", "Пожалуйста, заполните все поля пароля");
                return;
            }
            if (newPassValue !== confirmPassValue) {
                showInfo("Ошибка", "Пароли не совпадают!");
                return;
            }
            try {
                await updatePassword(oldPassValue, newPassValue);
                showInfo("Успех", "Пароль успешно изменен!");
                oldPassValue = ''; newPassValue = ''; confirmPassValue = ''; // Clear values logic handled by inputs usually
            } catch (err) {
                showInfo("Ошибка", err.response?.data?.detail || "Не удалось сменить пароль");
            }
        };

        const submitResetMyPassword = async () => {
            showConfirm("Сброс пароля", "Ваш текущий пароль будет сброшен, а новый отправлен на вашу почту. Продолжить?", async () => {
                try {
                    const resp = await resetMyPassword();
                    showInfo("Успех", resp.detail);
                } catch (err) {
                    showInfo("Ошибка", err.response?.data?.detail || "Не удалось сбросить пароль");
                }
            });
        };

        setModal({
            isOpen: true,
            title: "Настройки профиля",
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Profile Section */}
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Личные данные</h4>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: '#666' }}>Email</label>
                            <input
                                type="email"
                                defaultValue={emailValue}
                                onChange={e => emailValue = e.target.value}
                                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                                placeholder="user@example.com"
                            />
                        </div>
                        <button onClick={submitProfile} style={{ marginTop: '10px', width: 'auto', fontSize: '0.85rem' }}>Сохранить Email</button>
                    </div>

                    {/* SMTP Settings (Admin Only) */}
                    {user.is_admin && (
                        <div>
                            <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Настройки SMTP</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button
                                    onClick={async (e) => {
                                        const btn = e.target;
                                        btn.disabled = true;
                                        btn.innerText = "Загрузка...";
                                        try {
                                            const settings = await getSMTPSettings();
                                            // Define local variables for the inputs
                                            let host = settings.smtp_host, port = settings.smtp_port, user = settings.smtp_user, pass = settings.smtp_pass;

                                            setModal({
                                                isOpen: true, // Re-open with new content
                                                title: "Настройки SMTP",
                                                content: (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.85rem', color: '#666' }}>SMTP Host</label>
                                                            <input type="text" defaultValue={host} onChange={e => host = e.target.value} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.85rem', color: '#666' }}>SMTP Port</label>
                                                            <input type="number" defaultValue={port} onChange={e => port = parseInt(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.85rem', color: '#666' }}>SMTP User</label>
                                                            <input type="text" defaultValue={user} onChange={e => user = e.target.value} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.85rem', color: '#666' }}>SMTP Password</label>
                                                            <input type="password" defaultValue={pass} onChange={e => pass = e.target.value} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await updateSMTPSettings({ smtp_host: host, smtp_port: port, smtp_user: user, smtp_pass: pass });
                                                                    showInfo("Успех", "Настройки SMTP сохранены");
                                                                } catch (err) {
                                                                    showInfo("Ошибка", "Не удалось сохранить: " + (err.response?.data?.detail || err.message));
                                                                }
                                                            }}
                                                            style={{ marginTop: '10px', background: '#10b981', width: '100%' }}
                                                        >
                                                            Сохранить
                                                        </button>
                                                    </div>
                                                ),
                                                footer: <button className="btn-secondary" onClick={handleSettings}>Назад</button>
                                            });
                                        } catch (err) {
                                            showInfo("Ошибка", "Не удалось загрузить настройки SMTP");
                                            btn.disabled = false;
                                            btn.innerText = "Настроить SMTP";
                                        }
                                    }}
                                    style={{ background: '#64748b', fontSize: '0.85rem', width: '100%' }}
                                >
                                    Настроить SMTP
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Password Section */}
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Смена пароля</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: '#666' }}>Текущий пароль</label>
                                <input type="password" onChange={e => oldPassValue = e.target.value} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: '#666' }}>Новый пароль</label>
                                <input type="password" onChange={e => newPassValue = e.target.value} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: '#666' }}>Подтвердите новый пароль</label>
                                <input type="password" onChange={e => confirmPassValue = e.target.value} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                            </div>
                            <button onClick={submitPassword} style={{ marginTop: '10px', width: 'auto', fontSize: '0.85rem', background: '#f59e0b' }}>Обновить пароль</button>
                        </div>
                    </div>
                </div>
            ),
            footer: <button className="btn-secondary" onClick={closeModal}>Закрыть</button>
        });
    };

    const handleCreateUser = () => {
        let name = '', pass = '', email = '';
        const submit = async () => {
            if (!name || !pass) return;
            try {
                await createUser(name.toLowerCase(), pass, email);
                showInfo("Успех", `Пользователь ${name} успешно создан`);
                loadUsers();
                closeModal();
            } catch (err) {
                showInfo("Ошибка", err.response?.data?.detail || "Ошибка при создании");
            }
        };

        setModal({
            isOpen: true,
            title: "Создание пользователя",
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: '#666' }}>Имя пользователя</label>
                        <input type="text" onChange={e => name = e.target.value} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: '#666' }}>Email (опционально)</label>
                        <input type="email" onChange={e => email = e.target.value} style={{ width: '100%', padding: '8px', marginTop: '4px' }} placeholder="user@example.com" />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: '#666' }}>Пароль</label>
                        <input type="password" onChange={e => pass = e.target.value} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
                    </div>
                </div>
            ),
            footer: (
                <>
                    <button className="btn-secondary" onClick={closeModal}>Отмена</button>
                    <button onClick={submit}>Создать</button>
                </>
            )
        });
    }

    const handleDeleteUser = (userId, username) => {
        showConfirm("Удаление пользователя", `Вы уверены, что хотите удалить пользователя "${username}"?`, async () => {
            try {
                await deleteUser(userId);
                setUsers(prev => prev.filter(u => u.id !== userId));
            } catch (err) {
                showInfo("Ошибка", err.response?.data?.detail || "Ошибка сервера");
            }
        });
    }

    const handleEditUser = (targetUser) => {
        let emailValue = targetUser.email || '';
        let isAdminValue = targetUser.is_admin;

        const submitEdit = async () => {
            try {
                await updateUser(targetUser.id, { email: emailValue, is_admin: isAdminValue });
                showInfo("Успех", "Данные пользователя обновлены");
                loadUsers();
                closeModal();
            } catch (err) {
                showInfo("Ошибка", err.response?.data?.detail || "Не удалось обновить");
            }
        };

        const triggerReset = () => {
            showConfirm("Сброс пароля", "Вы уверены? Новый пароль будет отправлен на почту.", async () => {
                try {
                    const resp = await resetPassword(targetUser.id);
                    showInfo("Успех", resp.detail);
                } catch (err) {
                    showInfo("Ошибка", err.response?.data?.detail || "Не удалось сбросить пароль");
                }
            });
        };

        setModal({
            isOpen: true,
            title: `Редактирование: ${targetUser.username}`,
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: '#666' }}>Электронная почта</label>
                        <input
                            type="email"
                            defaultValue={emailValue}
                            onChange={e => emailValue = e.target.value}
                            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                            placeholder="user@example.com"
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            defaultChecked={isAdminValue}
                            onChange={e => isAdminValue = e.target.checked}
                            id="isAdminCheckbox"
                        />
                        <label htmlFor="isAdminCheckbox" style={{ fontSize: '0.85rem', color: 'red' }}>Сделать Администратором</label>
                    </div>
                    <div style={{ borderTop: '1px solid #eee', pt: '10px', marginTop: '10px' }}>
                        <button
                            onClick={triggerReset}
                            style={{ background: '#3b82f6', fontSize: '0.8rem', width: '100%' }}
                        >
                            Сбросить и отправить пароль на почту
                        </button>
                    </div>
                </div>
            ),
            footer: (
                <>
                    <button className="btn-secondary" onClick={closeModal}>Отмена</button>
                    <button onClick={submitEdit}>Сохранить</button>
                </>
            )
        });
    };

    const handleManageMembers = (channel) => {
        let usernameToAdd = '';

        const refreshModal = (updatedChannel) => {
            const isOwner = updatedChannel.created_by === user.id;

            setModal({
                isOpen: true,
                title: `Участники канала #${updatedChannel.name}`,
                content: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {isOwner && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Имя пользователя..."
                                    onChange={e => usernameToAdd = e.target.value}
                                    style={{ flex: 1, padding: '8px' }}
                                />
                                <button
                                    onClick={async () => {
                                        try {
                                            await addChannelMember(updatedChannel.id, usernameToAdd.toLowerCase());
                                            const updatedData = await getChannels();
                                            setChannels(updatedData);
                                            const fresh = updatedData.find(c => c.id === updatedChannel.id);
                                            refreshModal(fresh);
                                        } catch (err) {
                                            showInfo("Ошибка", err.response?.data?.detail || "Не удалось добавить");
                                        }
                                    }}
                                    style={{ width: 'auto', background: '#10b981' }}
                                >
                                    Добавить
                                </button>
                            </div>
                        )}
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                            {updatedChannel.members.map(m => (
                                <div key={m.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '8px',
                                    borderBottom: '1px solid #f9fafb',
                                    alignItems: 'center'
                                }}>
                                    <span>{m.username} {m.id === updatedChannel.created_by && <small>(автор)</small>}</span>
                                    {isOwner && m.id !== updatedChannel.created_by && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await removeChannelMember(updatedChannel.id, m.id);
                                                    const updatedData = await getChannels();
                                                    setChannels(updatedData);
                                                    const fresh = updatedData.find(c => c.id === updatedChannel.id);
                                                    refreshModal(fresh);
                                                } catch (err) {
                                                    showInfo("Ошибка", err.response?.data?.detail || "Не удалось удалить");
                                                }
                                            }}
                                            style={{ width: 'auto', padding: '2px 8px', background: '#ef4444', fontSize: '0.75rem' }}
                                        >
                                            Удалить
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ),
                footer: <button style={{ width: 'auto' }} onClick={closeModal}>Закрыть</button>
            });
        };

        refreshModal(channel);
    };

    const activeChannel = channels.find(c => c.id === activeChannelId);


    return (
        <div className="app-container">
            <div style={{ display: 'flex', flexDirection: 'column', width: '250px', minWidth: '250px', flexShrink: 0, borderRight: '1px solid #ccc', height: '100%', overflow: 'hidden' }}>
                <div style={{ padding: '10px', background: '#eee', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b>{user.username}</b>
                        <button
                            onClick={onLogout}
                            style={{ fontSize: '0.8em', padding: '2px 5px', width: 'auto', background: '#666' }}
                        >
                            Выход
                        </button>
                    </div>
                    <button
                        onClick={handleSettings}
                        style={{ fontSize: '0.75rem', padding: '4px', background: '#94a3b8', border: 'none' }}
                    >
                        ⚙ Настройки
                    </button>
                </div>

                <div style={{
                    padding: '6px 10px',
                    backgroundColor: '#f0f9ff',
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: '0.7rem',
                    color: '#0369a1',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        🔗 {serverUrl}
                    </span>
                    <button
                        onClick={onDisconnect}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            padding: '0',
                            width: 'auto',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Сменить
                    </button>
                </div>

                <ChannelList
                    channels={channels}
                    activeChannelId={activeChannelId}
                    onSelectChannel={setActiveChannelId}
                    onCreateChannel={handleCreateChannel}
                    onDeleteChannel={handleDeleteChannel}
                    user={user}
                />

                {user.is_admin && (
                    <div style={{ padding: '10px', borderTop: '1px solid #e5e7eb' }}>
                        <button onClick={handleCreateUser} style={{ background: '#10b981', fontSize: '0.8rem', width: '100%' }}>+ Пользователь</button>
                    </div>
                )}

                {user.is_admin && users.length > 0 && (
                    <div style={{ borderTop: '1px solid #e5e7eb', padding: '10px', maxHeight: '40%', overflowY: 'auto' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', color: '#374151' }}>
                            Пользователи ({users.length})
                        </div>
                        {users.map(u => (
                            <div key={u.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 8px',
                                marginBottom: '4px',
                                background: '#f9fafb',
                                borderRadius: '6px',
                                fontSize: '0.85rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: u.is_admin ? '#f59e0b' : '#10b981',
                                        display: 'inline-block'
                                    }}></span>
                                    <span>{u.username}</span>
                                    {u.is_admin && (
                                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '600' }}>admin</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        onClick={() => handleEditUser(u)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#6366f1',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            padding: '0',
                                            width: 'auto'
                                        }}
                                        title="Редактировать"
                                    >
                                        ✎
                                    </button>
                                    {u.id !== user.id && (
                                        <button
                                            onClick={() => handleDeleteUser(u.id, u.username)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                padding: '0',
                                                width: 'auto'
                                            }}
                                            title="Удалить"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ChatArea
                channel={activeChannel}
                messages={messages}
                onSendMessage={handleSendMessage}
                onDeleteMessage={handleDeleteMessage}
                onManageMembers={handleManageMembers}
                user={user}
            />

            <Modal
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                footer={modal.footer}
            >
                {modal.content}
            </Modal>
        </div>
    );
}

export default Chat;
