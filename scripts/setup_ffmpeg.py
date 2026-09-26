"""
FFmpeg setup helper script for Windows.
Verifies FFmpeg presence or downloads portable release.
"""

import sys
import shutil
import zipfile
import urllib.request
from pathlib import Path

FFMPEG_RELEASE_URL = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"


def check_ffmpeg() -> bool:
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        print(f"[OK] FFmpeg already detected at: {ffmpeg_bin}")
        return True
    return False


def install_ffmpeg_windows():
    print("[INFO] Checking FFmpeg installation...")
    if check_ffmpeg():
        return True

    project_root = Path(__file__).resolve().parent.parent
    tools_dir = project_root / "tools" / "ffmpeg"
    tools_dir.mkdir(parents=True, exist_ok=True)
    zip_dest = tools_dir / "ffmpeg.zip"

    print(f"[INFO] Downloading portable FFmpeg from: {FFMPEG_RELEASE_URL}")
    print("[INFO] This may take a few moments depending on your network connection...")

    try:
        urllib.request.urlretrieve(FFMPEG_RELEASE_URL, zip_dest)
        print("[INFO] Extracting FFmpeg archive...")
        with zipfile.ZipFile(zip_dest, "r") as zip_ref:
            zip_ref.extractall(tools_dir)

        # Locate ffmpeg.exe in extracted contents
        extracted_bins = list(tools_dir.glob("**/bin/ffmpeg.exe"))
        if extracted_bins:
            bin_dir = extracted_bins[0].parent
            print(f"[SUCCESS] FFmpeg binaries located at: {bin_dir}")
            print(f"[ACTION REQUIRED] Please add this folder to your PATH environment variable:")
            print(f"  {bin_dir}")
            return True
        else:
            print("[ERROR] Could not find ffmpeg.exe in extracted archive.")
            return False
    except Exception as e:
        print(f"[ERROR] Failed to download/extract FFmpeg: {e}")
        return False
    finally:
        if zip_dest.exists():
            try:
                zip_dest.unlink()
            except Exception:
                pass


if __name__ == "__main__":
    if check_ffmpeg():
        sys.exit(0)
    else:
        success = install_ffmpeg_windows()
        sys.exit(0 if success else 1)
