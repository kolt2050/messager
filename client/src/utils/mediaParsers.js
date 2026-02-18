
// Regex patterns
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VK_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:vk\.com\/video|vkvideo\.ru\/video)([-0-9]+)_([0-9]+)/;
const INSTAGRAM_REGEX = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/;
const TIKTOK_REGEX = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/@?[a-zA-Z0-9_.]+\/video\/\d+|https?:\/\/(?:vm|vt)\.tiktok\.com\/[a-zA-Z0-9]+/;

/**
 * Extracts YouTube video ID from text.
 * @param {string} text 
 * @returns {string|null} Video ID or null
 */
export const extractYoutubeId = (text) => {
    if (!text) return null;
    const match = text.match(YOUTUBE_REGEX);
    return match ? match[1] : null;
};

/**
 * Extracts VK video info from text.
 * @param {string} text 
 * @returns {{oid: string, id: string}|null} Object with oid and id, or null
 */
export const extractVkVideoInfo = (text) => {
    if (!text) return null;
    const match = text.match(VK_REGEX);
    if (match) {
        return { oid: match[1], id: match[2] };
    }
    return null;
};

/**
 * Extracts Instagram URL from text.
 * @param {string} text 
 * @returns {string|null} Full Instagram URL or null
 */
export const extractInstagramUrl = (text) => {
    if (!text) return null;
    const match = text.match(INSTAGRAM_REGEX);
    if (match) {
        return `https://www.instagram.com/p/${match[1]}/`;
    }
    return null;
};

/**
 * Extracts TikTok URL from text.
 * @param {string} text 
 * @returns {string|null} Full TikTok URL or null
 */
export const extractTikTokUrl = (text) => {
    if (!text) return null;
    const match = text.match(TIKTOK_REGEX);
    return match ? match[0] : null;
};

/**
 * Parses message content to identify media and return clean text.
 * Priorities: YouTube > VK > Instagram > TikTok
 * @param {string} content 
 * @returns {{ text: string, media: { type: string, data: any } | null }}
 */
export const parseMessageContent = (content) => {
    if (!content) return { text: '', media: null };

    // Check YouTube
    const ytId = extractYoutubeId(content);
    if (ytId) {
        return {
            text: content.replace(YOUTUBE_REGEX, '').trim(),
            media: { type: 'youtube', data: ytId }
        };
    }

    // Check VK
    const vkInfo = extractVkVideoInfo(content);
    if (vkInfo) {
        return {
            text: content.replace(VK_REGEX, '').trim(),
            media: { type: 'vk', data: vkInfo }
        };
    }

    // Check Instagram
    const instaMatch = content.match(INSTAGRAM_REGEX);
    if (instaMatch) {
        // robust removal of full url possibly with query params
        const cleanText = content.replace(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[a-zA-Z0-9_-]+(\/?\?.*)?/, '').trim();
        return {
            text: cleanText,
            media: { type: 'instagram', data: `https://www.instagram.com/p/${instaMatch[1]}/` }
        };
    }

    // Check TikTok
    const tiktokMatch = content.match(TIKTOK_REGEX);
    if (tiktokMatch) {
        const cleanText = content.replace(/(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/(?:@?[a-zA-Z0-9_.]+\/video\/\d+|(?:t\/)?[a-zA-Z0-9]+)(\/?\?.*)?/, '').trim();
        return {
            text: cleanText,
            media: { type: 'tiktok', data: tiktokMatch[0] }
        };
    }

    return { text: content, media: null };
};
