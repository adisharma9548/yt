import re
from urllib.parse import urlparse, parse_qs
from typing import Optional, Tuple, Dict, Any


YOUTUBE_DOMAINS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "gaming.youtube.com",
    "youtu.be",
    "www.youtu.be",
}

# Regex patterns for video IDs and playlist IDs
VIDEO_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{11}$")
PLAYLIST_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{12,}$")


def is_youtube_url(url: str) -> bool:
    """Verifies that the URL belongs to an approved YouTube domain."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    try:
        parsed = urlparse(url)
        if not parsed.scheme or parsed.scheme not in ("http", "https"):
            return False
        hostname = (parsed.hostname or "").lower()
        return hostname in YOUTUBE_DOMAINS
    except Exception:
        return False


def extract_video_id(url: str) -> Optional[str]:
    """Extracts YouTube video ID from various URL formats."""
    if not is_youtube_url(url):
        return None
    try:
        parsed = urlparse(url.strip())
        hostname = (parsed.hostname or "").lower()
        path = parsed.path

        # Case 1: youtu.be/VIDEO_ID
        if "youtu.be" in hostname:
            vid = path.strip("/").split("/")[0]
            if VIDEO_ID_REGEX.match(vid):
                return vid

        # Case 2: youtube.com/watch?v=VIDEO_ID
        if path == "/watch" or path.startswith("/watch/"):
            qs = parse_qs(parsed.query)
            if "v" in qs and qs["v"]:
                vid = qs["v"][0]
                if VIDEO_ID_REGEX.match(vid):
                    return vid

        # Case 3: youtube.com/shorts/VIDEO_ID
        if path.startswith("/shorts/"):
            parts = path.strip("/").split("/")
            if len(parts) >= 2 and VIDEO_ID_REGEX.match(parts[1]):
                return parts[1]

        # Case 4: youtube.com/embed/VIDEO_ID or /v/VIDEO_ID
        if path.startswith("/embed/") or path.startswith("/v/"):
            parts = path.strip("/").split("/")
            if len(parts) >= 2 and VIDEO_ID_REGEX.match(parts[1]):
                return parts[1]

        return None
    except Exception:
        return None


def extract_playlist_id(url: str) -> Optional[str]:
    """Extracts playlist ID from query parameters or path."""
    if not is_youtube_url(url):
        return None
    try:
        parsed = urlparse(url.strip())
        qs = parse_qs(parsed.query)
        if "list" in qs and qs["list"]:
            pid = qs["list"][0]
            if PLAYLIST_ID_REGEX.match(pid):
                return pid
        return None
    except Exception:
        return None


def parse_youtube_url(url: str) -> Dict[str, Any]:
    """
    Parses and categorizes YouTube URL.
    Returns dictionary with valid, url_type ('video', 'playlist', 'video_with_playlist'),
    video_id, playlist_id, error.
    """
    url = (url or "").strip()
    if not url:
        return {
            "valid": False,
            "error": "URL cannot be empty",
            "type": None,
            "video_id": None,
            "playlist_id": None
        }

    if not is_youtube_url(url):
        return {
            "valid": False,
            "error": "URL does not appear to be a valid YouTube link (must be youtube.com or youtu.be)",
            "type": None,
            "video_id": None,
            "playlist_id": None
        }

    v_id = extract_video_id(url)
    p_id = extract_playlist_id(url)

    if p_id and v_id:
        url_type = "video_with_playlist"
    elif p_id:
        url_type = "playlist"
    elif v_id:
        url_type = "video"
    else:
        return {
            "valid": False,
            "error": "Could not identify a valid video or playlist in the provided YouTube URL",
            "type": None,
            "video_id": None,
            "playlist_id": None
        }

    return {
        "valid": True,
        "error": None,
        "type": url_type,
        "video_id": v_id,
        "playlist_id": p_id,
    }
