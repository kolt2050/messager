import React from 'react';

const YouTubeEmbed = ({ videoId }) => {
    if (!videoId) return null;

    return (
        <div style={{ marginTop: '8px', maxWidth: '100%', overflow: 'hidden', borderRadius: '8px' }}>
            <iframe
                width="100%"
                height="200"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: 'none' }}
            />
        </div>
    );
};

export default YouTubeEmbed;
