import yt_dlp
from typing import Dict, Any, List, Optional
from ..utils.logger import logger
from ..utils.url_validator import parse_youtube_url


def format_duration(seconds: Optional[int]) -> str:
    """Formats duration in seconds to HH:MM:SS or MM:SS."""
    if not seconds or seconds < 0:
        return "00:00"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def calculate_estimated_size_mb(
    format_info: Dict[str, Any],
    duration: Optional[int] = None,
    audio_format: Optional[Dict[str, Any]] = None
) -> int:
    """
    Calculates estimated size in MB from format metadata, with bitrate fallback.
    """
    # 1. Direct filesize
    size_bytes = format_info.get("filesize") or format_info.get("filesize_approx")
    if audio_format:
        audio_bytes = audio_format.get("filesize") or audio_format.get("filesize_approx")
        if size_bytes and audio_bytes:
            return max(1, int((size_bytes + audio_bytes) / (1024 * 1024)))
        elif audio_bytes and not size_bytes and duration:
            # Calculate video from bitrate
            tbr = format_info.get("tbr") or format_info.get("vbr") or 1500
            video_bytes = (tbr * 1000 / 8) * duration
            return max(1, int((video_bytes + audio_bytes) / (1024 * 1024)))

    if size_bytes:
        return max(1, int(size_bytes / (1024 * 1024)))

    # 2. Bitrate * duration estimate
    tbr = format_info.get("tbr") or (
        (format_info.get("vbr") or 1500) + (format_info.get("abr") or 128)
    )
    if tbr and duration:
        est_bytes = (tbr * 1000 / 8) * duration
        return max(1, int(est_bytes / (1024 * 1024)))

    # Default fallback based on height
    height = format_info.get("height") or 720
    dur = duration or 300
    approx_mb_per_min = {
        2160: 120,
        1440: 60,
        1080: 30,
        720: 15,
        480: 8,
        360: 5,
        240: 3
    }.get(height, 15)
    return max(1, int((dur / 60) * approx_mb_per_min))


class YouTubeService:
    def __init__(self):
        # Base options for info extraction (fast and safe)
        self.ydl_base_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "skip_download": True,
            "ignoreerrors": True,
            "no_check_certificates": True,
        }

    def analyze_url(self, url: str) -> Dict[str, Any]:
        """
        Analyzes a YouTube video or playlist URL.
        Returns normalized structure with videos list, qualities, and sizes.
        """
        parsed = parse_youtube_url(url)
        if not parsed["valid"]:
            return {
                "success": False,
                "error": "INVALID_URL",
                "message": parsed["error"]
            }

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": "in_playlist",  # Quickly fetch playlist entries
            "skip_download": True,
            "ignoreerrors": True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                logger.info(f"Extracting metadata for: {url}")
                info = ydl.extract_info(url, download=False)
                if not info:
                    return {
                        "success": False,
                        "error": "VIDEO_UNAVAILABLE",
                        "message": "Video or playlist not found or is private."
                    }

            # Handle playlist vs single video
            is_playlist = "entries" in info and bool(info["entries"])
            if is_playlist:
                return self._process_playlist(info, url)
            else:
                return self._process_single_video(info, url)

        except yt_dlp.utils.DownloadError as e:
            err_msg = str(e)
            logger.error(f"yt-dlp DownloadError: {err_msg}")
            if "Private video" in err_msg:
                return {"success": False, "error": "VIDEO_UNAVAILABLE", "message": "This video is private."}
            elif "Sign in" in err_msg or "age-restricted" in err_msg.lower():
                return {"success": False, "error": "VIDEO_UNAVAILABLE", "message": "This video is age-restricted and requires login."}
            return {"success": False, "error": "VIDEO_UNAVAILABLE", "message": f"YouTube error: {err_msg.split('ERROR:')[-1].strip()}"}
        except Exception as e:
            logger.error(f"Unexpected error in analyze_url: {e}", exc_info=True)
            return {
                "success": False,
                "error": "NETWORK_ERROR",
                "message": f"Failed to analyze URL: {str(e)}"
            }

    def _process_single_video(self, info: Dict[str, Any], url: str) -> Dict[str, Any]:
        """Processes single video info and extracts qualities and estimated sizes."""
        video_id = info.get("id", "")
        title = info.get("title", "Untitled Video")
        uploader = info.get("uploader") or info.get("channel") or "Unknown Uploader"
        duration = info.get("duration") or 0
        thumbnail = info.get("thumbnail") or ""

        qualities, sizes = self._extract_qualities_and_sizes(info)

        default_size = sizes.get("1080p") or sizes.get("720p") or sizes.get("best", 0)

        video_item = {
            "index": 1,
            "video_id": video_id,
            "title": title,
            "duration_seconds": duration,
            "duration_formatted": format_duration(duration),
            "uploader": uploader,
            "available_qualities": qualities,
            "quality_sizes": sizes,
            "estimated_size_mb": default_size,
            "thumbnail_url": thumbnail,
            "url": f"https://www.youtube.com/watch?v=f{video_id}" if video_id else url
        }

        return {
            "success": True,
            "type": "video",
            "playlist_id": None,
            "playlist_title": title,
            "playlist_uploader": uploader,
            "video_count": 1,
            "videos": [video_item]
        }

    def _process_playlist(self, info: Dict[str, Any], url: str) -> Dict[str, Any]:
        """Processes playlist metadata and parses entry videos."""
        playlist_id = info.get("id", "")
        playlist_title = info.get("title", "Untitled Playlist")
        playlist_uploader = info.get("uploader") or info.get("channel") or "Unknown"
        entries = list(info.get("entries", []))

        processed_videos = []
        standard_qualities = ["2160p", "1440p", "1080p", "720p", "480p", "360p"]

        for idx, entry in enumerate(entries, start=1):
            if not entry:
                continue
            video_id = entry.get("id", "")
            title = entry.get("title", f"Video {idx}")
            duration = entry.get("duration") or 0
            uploader = entry.get("uploader") or playlist_uploader
            thumbnail = entry.get("thumbnail") or ""

            # Flat extraction might not have all formats; use standard estimate with fallback
            duration_min = max(1, duration // 60) if duration else 5
            approx_size = duration_min * 18  # ~18MB/min average for 1080p

            # If formats exist in flat or detailed entry
            qualities = standard_qualities
            sizes = {
                "2160p": duration_min * 70,
                "1440p": duration_min * 40,
                "1080p": duration_min * 20,
                "720p": duration_min * 12,
                "480p": duration_min * 6,
                "360p": duration_min * 4,
                "best": duration_min * 20,
            }

            if "formats" in entry:
                q_found, s_found = self._extract_qualities_and_sizes(entry)
                if q_found:
                    qualities = q_found
                    sizes = s_found
                    approx_size = sizes.get("1080p") or sizes.get("720p") or sizes.get("best", approx_size)

            processed_videos.append({
                "index": idx,
                "video_id": video_id,
                "title": title,
                "duration_seconds": duration,
                "duration_formatted": format_duration(duration),
                "uploader": uploader,
                "available_qualities": qualities,
                "quality_sizes": sizes,
                "estimated_size_mb": approx_size,
                "thumbnail_url": thumbnail,
                "url": f"https://www.youtube.com/watch?v={video_id}" if video_id else url
            })

        return {
            "success": True,
            "type": "playlist",
            "playlist_id": playlist_id,
            "playlist_title": playlist_title,
            "playlist_uploader": playlist_uploader,
            "video_count": len(processed_videos),
            "videos": processed_videos
        }

    def _extract_qualities_and_sizes(self, video_info: Dict[str, Any]) -> tuple[List[str], Dict[str, int]]:
        """Extracts available video quality badges and size estimates from formats."""
        formats = video_info.get("formats", [])
        duration = video_info.get("duration", 0)

        # Find best audio format for merging calculation
        best_audio = None
        for f in formats:
            if f.get("acodec") != "none" and f.get("vcodec") == "none":
                if not best_audio or (f.get("abr") or 0) > (best_audio.get("abr") or 0):
                    best_audio = f

        available_heights = set()
        height_to_format = {}

        for f in formats:
            height = f.get("height")
            if height and height >= 144:
                available_heights.add(height)
                # Keep format with highest bitrate for that height
                existing = height_to_format.get(height)
                if not existing or (f.get("tbr") or 0) > (existing.get("tbr") or 0):
                    height_to_format[height] = f

        sorted_heights = sorted(list(available_heights), reverse=True)
        qualities = [f"{h}p" for h in sorted_heights]

        # Calculate estimated size for each quality
        sizes = {}
        for h in sorted_heights:
            fmt = height_to_format[h]
            q_label = f"{h}p"
            sizes[q_label] = calculate_estimated_size_mb(fmt, duration, best_audio)

        if not qualities:
            qualities = ["1080p", "720p", "480p", "360p"]
            sizes = {"1080p": 50, "720p": 25, "480p": 15, "360p": 10}

        sizes["best"] = sizes.get(qualities[0], 50)
        return qualities, sizes

    @staticmethod
    def get_yt_dlp_format_selector(requested_quality: str) -> str:
        """
        Generates robust yt-dlp format selection string with fallback.
        Ensures video <= requested quality merged with best audio,
        or highest available if requested is not present.
        """
        q = (requested_quality or "best").strip().lower()

        # Quality parsing
        if q in ("best", "best available", "max"):
            return "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"

        # e.g. "1080p" -> 1080
        height_str = "".join([c for c in q if c.isdigit()])
        if not height_str:
            return "bestvideo+bestaudio/best"

        height = int(height_str)
        # Format selector:
        # 1. bestvideo <= requested height + best audio
        # 2. best combined format <= requested height
        # 3. fallback to absolute best available
        return f"bestvideo[height<={height}]+bestaudio/best[height<={height}]/best"


youtube_service = YouTubeService()
