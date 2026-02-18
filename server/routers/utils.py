from fastapi import APIRouter, HTTPException, Query
import requests
import re

router = APIRouter(
    prefix="/utils",
    tags=["utils"]
)

@router.get("/resolve_instagram")
async def resolve_instagram(url: str = Query(..., description="The Instagram post/reel URL")):
    """
    Attempts to resolve the direct video URL from an Instagram post/reel
    by scraping the og:video meta tag.
    """
    if "instagram.com" not in url:
        raise HTTPException(status_code=400, detail="Invalid URL")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        html = response.text
        
        # Simple regex to find og:video
        # <meta property="og:video" content="..." />
        video_match = re.search(r'<meta property="og:video" content="([^"]+)"', html)
        
        if video_match:
            video_url = video_match.group(1)
            # Unicode unscape if needed, though requests usually handles charset
            # Sometimes HTML entities are present
            video_url = video_url.replace("&amp;", "&")
            return {"video_url": video_url}
            
        # Fallback: check for secure url
        secure_video_match = re.search(r'<meta property="og:video:secure_url" content="([^"]+)"', html)
        if secure_video_match:
             video_url = secure_video_match.group(1)
             video_url = video_url.replace("&amp;", "&")
             return {"video_url": video_url}

        raise HTTPException(status_code=404, detail="Video URL not found in metadata")

    except requests.RequestException as e:
        print(f"Error fetching Instagram URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch URL")
    except Exception as e:
        print(f"Error parsing Instagram HTML: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse content")

@router.get("/resolve_tiktok")
async def resolve_tiktok(url: str = Query(..., description="The TikTok video URL")):
    """
    Attempts to resolve the direct video URL from a TikTok video URL
    by scraping the page content.
    """
    if "tiktok.com" not in url:
        raise HTTPException(status_code=400, detail="Invalid URL")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.tiktok.com/"
    }

    try:
        # Follow redirects to get the actual video page if it's a short link (vm.tiktok.com)
        session = requests.Session()
        response = session.get(url, headers=headers, timeout=10, allow_redirects=True)
        response.raise_for_status()
        
        html = response.text
        
        # 1. Try og:video
        video_match = re.search(r'<meta property="og:video" content="([^"]+)"', html)
        if video_match:
            return {"video_url": video_match.group(1)}
            
        # 2. Try to find the playAddr in JSON state (SIGI_STATE or similar)
        # This is more complex regex, simplistic attempt:
        # "playAddr":"https://..."
        # JSON strings are escaped, so we might need to handle that.
        # But let's try a simple pattern first.
        
        # NOTE: TikTok makes it hard to scrape without a real browser or specialized lib.
        # We will try a few common patterns.
        
        # Pattern for <video> src?
        # Often loaded dynamically.
        
        raise HTTPException(status_code=404, detail="Video URL not found in metadata")

    except requests.RequestException as e:
        print(f"Error fetching TikTok URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch URL")
    except Exception as e:
        print(f"Error parsing TikTok HTML: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse content")
