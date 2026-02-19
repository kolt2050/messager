import React, { useState } from 'react';

function ChannelList({ channels, activeChannelId, onSelectChannel, onCreateChannel, onDeleteChannel, user }) {
    const [newChannelName, setNewChannelName] = useState('');

    const handleCreate = (e) => {
        e.preventDefault();
        if (newChannelName.trim()) {
            onCreateChannel(newChannelName);
            setNewChannelName('');
        }
    };

    return (
        <div className="sidebar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="sidebar-header">
                Каналы
            </div>
            <form onSubmit={handleCreate} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                <input
                    type="text"
                    placeholder="Новый канал"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', fontFamily: 'inherit', background: 'var(--bg)' }}
                />
                <button type="submit" style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem' }}>Создать</button>
            </form>
            <div className="channel-list" style={{ flex: 1, overflowY: 'auto' }}>
                {channels.map(channel => (
                    <div
                        key={channel.id}
                        className={`channel-item ${activeChannelId === channel.id ? 'active' : ''}`}
                        onClick={() => onSelectChannel(channel.id)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <span># {channel.name}</span>
                        {(user.is_admin || channel.created_by === user.id) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteChannel(channel.id); }}
                                style={{ background: 'none', color: 'var(--text-secondary)', padding: '2px', fontSize: '0.8rem', width: 'auto', border: 'none', opacity: 0.5, transition: 'opacity 0.15s' }}
                                title="Удалить"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ChannelList;
