import React, { useEffect, useRef, useState } from 'react';
import MessageInput from './MessageInput';
import MediaAttachments from './MediaAttachments';
import { parseMessageContent } from '../utils/mediaParsers';
import { getServerUrl } from '../api';

const Lightbox = ({ src, onClose }) => {
    if (!src) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            cursor: 'pointer'
        }} onClick={onClose}>
            <img
                src={src}
                alt="Full size"
                style={{
                    maxWidth: '90%',
                    maxHeight: '90%',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                }}
            />
        </div>
    );
};

function ChatArea({ channel, messages, onSendMessage, onDeleteMessage, onManageMembers, user }) {
    const messagesEndRef = useRef(null);
    const [lightboxImage, setLightboxImage] = useState(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getImageUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        try {
            if (url.startsWith('http') || url.startsWith('blob:')) return url;
            return `${getServerUrl()}${url}`;
        } catch (e) {
            console.error("Error generating image URL:", e);
            return null;
        }
    };
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!channel) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--bg)',
                color: 'var(--text-secondary)',
                fontSize: '1.05rem',
                fontWeight: '500',
                letterSpacing: '-0.01em'
            }}>
                Выберите канал, чтобы начать общение
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg)', flex: 1, minWidth: 0 }}>
            {/* Header */}
            <div style={{
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--border)',
                fontWeight: '700',
                fontSize: '0.95rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface)'
            }}>
                <span># {channel.name}</span>
                <button
                    onClick={() => onManageMembers(channel)}
                    style={{
                        fontSize: '0.8rem',
                        width: 'auto',
                        padding: '0.4rem 0.85rem',
                        background: 'var(--bg)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Участники
                </button>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <div style={{ width: '100%', maxWidth: '900px' }}>
                    {messages.map(msg => {
                        const isOwn = msg.user_id === user.id;
                        const canDelete = isOwn || user.is_admin;
                        const { text, media } = parseMessageContent(msg.content);

                        return (
                            <div key={msg.id} style={{ marginBottom: '16px', maxWidth: '80%', marginLeft: '0' }}>
                                {/* Username + Delete above bubble */}
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: '#6b7280',
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    justifyContent: 'flex-start'
                                }}>
                                    <span style={{ fontWeight: '600' }}>
                                        {msg.username || `User ${msg.user_id}`}
                                    </span>
                                    {canDelete && (
                                        <button
                                            onClick={() => onDeleteMessage(msg.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--danger)',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                padding: '0',
                                                width: 'auto'
                                            }}
                                        >
                                            Удалить
                                        </button>
                                    )}
                                </div>

                                {/* Message bubble */}
                                <div style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    backgroundColor: isOwn ? 'var(--primary)' : 'var(--surface)',
                                    color: isOwn ? 'white' : 'var(--text)',
                                    border: isOwn ? 'none' : '1px solid var(--border)',
                                    display: 'inline-block',
                                    maxWidth: '100%',
                                    wordBreak: 'break-word',
                                    boxShadow: isOwn ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'var(--shadow-sm)'
                                }}>
                                    {msg.image_url && getImageUrl(msg.image_url) && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <img
                                                src={getImageUrl(msg.thumbnail_url || msg.image_url)}
                                                alt="Attachment"
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '300px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => setLightboxImage(getImageUrl(msg.image_url))}
                                            />
                                        </div>
                                    )}

                                    {/* Text Content (if any) */}
                                    {text && <div>{text}</div>}

                                    {/* Media Attachment */}
                                    <MediaAttachments media={media} />

                                    <div style={{
                                        fontSize: '0.7em',
                                        color: '#9ca3af',
                                        textAlign: 'right',
                                        marginTop: '4px'
                                    }}>
                                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                <div style={{ width: '100%', maxWidth: '900px' }}>
                    <MessageInput onSendMessage={onSendMessage} />
                </div>
            </div>

            <Lightbox
                src={lightboxImage}
                onClose={() => setLightboxImage(null)}
            />
        </div>
    );
}

export default ChatArea;
