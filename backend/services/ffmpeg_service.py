import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from ..utils.logger import logger
from ..utils.subprocess_runner import run_command_safe


class FFmpegService:
    def __init__(self, custom_path: Optional[str] = None):
        self.ffmpeg_path = custom_path or shutil.which("ffmpeg")

    def is_available(self) -> bool:
        """Checks if ffmpeg binary exists and runs."""
        if not self.ffmpeg_path:
            self.ffmpeg_path = shutil.which("ffmpeg")
        if not self.ffmpeg_path:
            return False

        rc, stdout, stderr = run_command_safe([self.ffmpeg_path, "-version"], timeout_seconds=5)
        return rc == 0

    def get_version_info(self) -> Dict[str, Any]:
        """Returns FFmpeg presence and version string."""
        available = self.is_available()
        version_str = "Not installed"
        if available and self.ffmpeg_path:
            rc, stdout, stderr = run_command_safe([self.ffmpeg_path, "-version"], timeout_seconds=5)
            if rc == 0:
                version_str = stdout.splitlines()[0] if stdout.splitlines() else "Unknown"

        return {
            "installed": available,
            "path": self.ffmpeg_path if available else None,
            "version": version_str
        }

    def merge_video_audio(
        self,
        video_path: Path,
        audio_path: Path,
        output_path: Path,
        timeout_seconds: int = 300
    ) -> Dict[str, Any]:
        """
        Merges separate video and audio files into output_path container (MP4)
        using fast stream copy where possible (-c:v copy -c:a aac -strict -2).
        """
        if not self.is_available():
            return {
                "success": False,
                "error": "FFmpeg is not installed or not in PATH.",
                "output_path": None
            }

        if not video_path.exists():
            return {
                "success": False,
                "error": f"Video stream file does not exist: {video_path}",
                "output_path": None
            }

        if not audio_path.exists():
            return {
                "success": False,
                "error": f"Audio stream file does not exist: {audio_path}",
                "output_path": None
            }

        # Build ffmpeg merge command
        # -y overwrites output if necessary
        # -c:v copy copies video stream without re-encoding
        # -c:a aac re-encodes audio to standard AAC for maximum Windows compatibility
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-strict", "-2",
            str(output_path)
        ]

        logger.info(f"Merging streams: {video_path.name} + {audio_path.name} -> {output_path.name}")
        rc, stdout, stderr = run_command_safe(cmd, timeout_seconds=timeout_seconds)

        if rc != 0 or not output_path.exists():
            logger.error(f"FFmpeg merge failed (rc={rc}): {stderr}")
            return {
                "success": False,
                "error": f"FFmpeg merge failed: {stderr[-500:] if stderr else 'Unknown error'}",
                "output_path": None
            }

        logger.info(f"FFmpeg merge completed successfully: {output_path}")
        return {
            "success": True,
            "error": None,
            "output_path": str(output_path)
        }


ffmpeg_service = FFmpegService()
