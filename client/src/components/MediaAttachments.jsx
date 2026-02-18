import React from 'react';
import InstagramEmbed from './InstagramEmbed';
import TikTokEmbed from './TikTokEmbed';
import YouTubeEmbed from './YouTubeEmbed';
import VKEmbed from './VKEmbed';

const MediaAttachments = ({ media }) => {
    if (!media) return null;

    const { type, data } = media;

    if (type === 'youtube') {
        return <YouTubeEmbed videoId={data} />;
    }

    if (type === 'vk') {
        return <VKEmbed videoInfo={data} />;
    }

    if (type === 'instagram') {
        return <InstagramEmbed url={data} />;
    }

    if (type === 'tiktok') {
        return <TikTokEmbed url={data} />;
    }

    return null;
};

export default MediaAttachments;
