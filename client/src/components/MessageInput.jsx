import React, { useState, useRef, useEffect } from 'react';
import { uploadFile } from '../api';

function MessageInput({ onSendMessage, disabled }) {
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file) => {
        if (!file.type.startsWith('image/')) {
            alert('Можно загружать только изображения');
            return;
        }
        setSelectedImage(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                processFile(blob);
                e.preventDefault();
                return;
            }
        }
    };

    const clearImage = () => {
        setSelectedImage(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && !selectedImage) return;

        setIsUploading(true);
        let imageUrl = null;
        let thumbnailUrl = null;

        try {
            if (selectedImage) {
                const uploadResp = await uploadFile(selectedImage);
                imageUrl = uploadResp.url;
                thumbnailUrl = uploadResp.thumbnail_url;
            }
            onSendMessage(content, imageUrl, thumbnailUrl);
            setContent('');
            clearImage();
        } catch (err) {
            alert('Ошибка отправки: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    return (
        <div style={{ position: 'relative', borderTop: '1px solid #e5e7eb', padding: '10px' }}>
            {previewUrl && (
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px' }}>
                    <img src={previewUrl} alt="Preview" style={{ maxHeight: '100px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <button
                        type="button"
                        onClick={clearImage}
                        style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: 'red',
                            color: 'white',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            border: 'none',
                            fontSize: '12px',
                            padding: 0
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            <form
                className="message-input-area"
                onSubmit={handleSubmit}
                style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'center' }}
            >
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}
                    title="Прикрепить изображение"
                >
                    📎
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*"
                />

                <div style={{ position: 'relative', flex: 1 }}>
                    <input
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onPaste={handlePaste}
                        placeholder="Напишите сообщение..."
                        disabled={disabled || isUploading}
                        maxLength={1024}
                        style={{ width: '100%' }}
                    />
                    {content.length > 800 && (
                        <span style={{
                            position: 'absolute',
                            right: '5px',
                            top: '-20px',
                            fontSize: '0.7rem',
                            color: content.length >= 1024 ? 'red' : '#6b7280',
                            background: 'rgba(255,255,255,0.8)',
                            padding: '2px 4px',
                            borderRadius: '4px'
                        }}>
                            {content.length}/1024
                        </span>
                    )}
                </div>

                <button type="submit" disabled={disabled || isUploading || (!content.trim() && !selectedImage)}>
                    {isUploading ? '...' : 'Отправить'}
                </button>
            </form>
        </div>
    );
}

export default MessageInput;
