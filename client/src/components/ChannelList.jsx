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
            <form onSubmit={handleCreate} style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <input
                    type="text"
                    placeholder="Новый канал"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                />
                <button type="submit" style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem' }}>Создать</button>
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
                                style={{ background: 'none', color: '#9ca3af', padding: '2px', fontSize: '0.8rem', width: 'auto' }}
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
