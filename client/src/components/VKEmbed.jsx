import React from 'react';

const VKEmbed = ({ videoInfo }) => {
    if (!videoInfo || !videoInfo.oid || !videoInfo.id) return null;

    return (
        <div style={{ marginTop: '8px', maxWidth: '100%', overflow: 'hidden', borderRadius: '8px' }}>
            <iframe
                width="100%"
                height="200"
                src={`https://vk.com/video_ext.php?oid=${videoInfo.oid}&id=${videoInfo.id}&hd=2`}
                title="VK video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: 'none' }}
            />
        </div>
    );
};

export default VKEmbed;
