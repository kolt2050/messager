import React, { useState, useEffect } from 'react';
import { resolveInstagramUrl } from '../api';

const InstagramEmbed = ({ url }) => {
    const [videoUrl, setVideoUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const fetchVideo = async () => {
            const directUrl = await resolveInstagramUrl(url);
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
                Loading Instagram video...
            </div>
        );
    }

    // Success: Render standard video player
    if (videoUrl) {
        return (
            <div style={{ marginTop: '8px', maxWidth: '100%', overflow: 'hidden', borderRadius: '8px' }}>
                <video
                    controls
                    width="100%"
                    style={{ maxHeight: '600px', backgroundColor: 'black' }}
                    playsInline
                >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
        );
    }

    // Fallback or Error: Render iframe embed
    // Extract shortcode for embed URL construction
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
    const embedUrl = match ? `https://www.instagram.com/p/${match[1]}/embed` : url;

    return (
        <div style={{ marginTop: '8px', maxWidth: '100%', overflow: 'hidden', borderRadius: '8px' }}>
            <iframe
                width="100%"
                height="600"
                src={embedUrl}
                title="Instagram video player"
                frameBorder="0"
                scrolling="no"
                allowFullScreen
                style={{ border: 'none', overflow: 'hidden' }}
            />
        </div>
    );
};

export default InstagramEmbed;
