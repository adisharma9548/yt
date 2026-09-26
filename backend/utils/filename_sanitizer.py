import re
import unicodedata
from pathlib import Path
from typing import Optional, Set

# Windows reserved device names
WINDOWS_RESERVED_NAMES: Set[str] = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
}

# Invalid characters in Windows file/folder names: \ / : * ? " < > |
INVALID_CHARS_REGEX = re.compile(r'[\\/:*?"<>|]')
# Control characters ASCII 0-31
CONTROL_CHARS_REGEX = re.compile(r'[\x00-\x1f\x7f]')


def sanitize_filename(filename: str, fallback_id: str = "video", max_length: int = 240) -> str:
    """
    Sanitizes a string to be a safe, valid Windows filename.
    Preserves unicode characters, handles reserved names, truncates length,
    and ensures valid extensions.
    """
    if not filename or not isinstance(filename, str):
        filename = fallback_id

    # Normalize unicode (NFC standard)
    filename = unicodedata.normalize("NFC", filename)

    # Separate stem and extension if an extension exists
    p = Path(filename)
    stem = p.stem
    ext = p.suffix

    # If ext is unusually long or contains spaces, it's probably part of the title
    if len(ext) > 6 or " " in ext:
        stem = filename
        ext = ""

    # Remove/replace invalid Windows characters
    # In accordance with prompt test: "Video: The <Best>.mp4" -> "Video The Best.mp4"
    # We replace invalid characters with a space or empty, then collapse spaces
    cleaned_stem = INVALID_CHARS_REGEX.sub(" ", stem)
    cleaned_stem = CONTROL_CHARS_REGEX.sub("", cleaned_stem)

    # Strip leading/trailing dots and whitespace (Windows forbids filenames ending in dot or space)
    cleaned_stem = re.sub(r'\s+', ' ', cleaned_stem).strip('. ')

    # If empty after cleaning, use fallback
    if not cleaned_stem:
        cleaned_stem = fallback_id if fallback_id else "unnamed_video"

    # Handle Windows reserved names (case-insensitive)
    if cleaned_stem.upper() in WINDOWS_RESERVED_NAMES:
        cleaned_stem = f"_{cleaned_stem}_"

    # Clean extension as well
    cleaned_ext = INVALID_CHARS_REGEX.sub("", ext)
    cleaned_ext = CONTROL_CHARS_REGEX.sub("", cleaned_ext).strip()

    # Enforce maximum filename length (preserving extension)
    max_stem_length = max(10, max_length - len(cleaned_ext))
    if len(cleaned_stem) > max_stem_length:
        cleaned_stem = cleaned_stem[:max_stem_length].strip('. ')

    final_name = f"{cleaned_stem}{cleaned_ext}"
    return final_name


def get_unique_filepath(target_path: Path) -> Path:
    """
    If file already exists, appends ' (1)', ' (2)', etc. to prevent unwanted overwrite.
    """
    if not target_path.exists():
        return target_path

    parent = target_path.parent
    stem = target_path.stem
    suffix = target_path.suffix

    counter = 1
    while True:
        candidate = parent / f"{stem} ({counter}){suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def generate_filename(
    title: str,
    index: int,
    video_id: str,
    naming_mode: str = "index_title",
    custom_template: Optional[str] = None,
    ext: str = ".mp4"
) -> str:
    """
    Generates a filename based on naming mode and sanitizes it for Windows.
    """
    if not ext.startswith("."):
        ext = f".{ext}"

    if naming_mode == "title_only":
        raw_name = f"{title}{ext}"
    elif naming_mode == "index_only":
        raw_name = f"{index:03d}{ext}"
    elif naming_mode == "custom" and custom_template:
        try:
            # Safe replacement of placeholders
            formatted = custom_template.replace("%(playlist_index)03d", f"{index:03d}")
            formatted = formatted.replace("%(playlist_index)d", str(index))
            formatted = formatted.replace("%(title)s", title)
            formatted = formatted.replace("%(ext)s", ext.lstrip("."))
            formatted = formatted.replace("%(id)s", video_id)
            raw_name = formatted if formatted.endswith(ext) else f"{formatted}{ext}"
        except Exception:
            raw_name = f"{index:03d} - {title}{ext}"
    else:
        # Default: index_title (001 - Title.mp4)
        raw_name = f"{index:03d} - {title}{ext}"

    return sanitize_filename(raw_name, fallback_id=f"{index:03d}_{video_id}")
