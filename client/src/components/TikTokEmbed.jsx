import React, { useState, useEffect } from 'react';
import { resolveTikTokUrl } from '../api';

const TikTokEmbed = ({ url }) => {
    const [videoUrl, setVideoUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(false);

        const fetchVideo = async () => {
            const directUrl = await resolveTikTokUrl(url);
            if (isMounted) {
                if (directUrl) {
                    setVideoUrl(directUrl);
                } else {
                    setError(true);
                }
                setLoading(false);
            }
        };

        fetchVideo();
        return () => { isMounted = false; };
    }, [url]);

    // Extract video ID for fallback iframe
    // https://www.tiktok.com/@user/video/VIDEO_ID
    const getVideoId = (link) => {
        const match = link.match(/video\/(\d+)/);
        return match ? match[1] : null;
    };

    if (loading) {
        return (
            <div style={{
                marginTop: '8px',
                maxWidth: '100%',
                height: '200px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                color: '#6b7280'
            }}>
                Loading TikTok video...
            </div>
        );
    }

    if (videoUrl) {
        return (
            <div style={{ marginTop: '8px', maxWidth: '325px', overflow: 'hidden', borderRadius: '8px' }}>
                <video
                    controls
                    width="100%"
                    style={{ maxHeight: '580px', backgroundColor: 'black' }}
                    playsInline
                >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
        );
    }

    // Fallback iframe
    // TikTok embeds are tricky without official SDK script, but we can try the embed URL
    // https://www.tiktok.com/embed/v2/VIDEO_ID
    const videoId = getVideoId(url);
    const embedSrc = videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : url;

    return (
        <div style={{ marginTop: '8px', maxWidth: '325px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <iframe
                width="100%"
                height="580"
                src={embedSrc}
                title="TikTok video player"
                frameBorder="0"
                allowFullScreen
                scrolling="no"
                style={{ border: 'none' }}
            />
        </div>
    );
};

export default TikTokEmbed;
