import os
import shutil
import platform
from pathlib import Path
from typing import Dict, Any, Optional
from ..utils.logger import logger
from ..utils.subprocess_runner import run_command_safe


def validate_download_directory(dir_path: str) -> Dict[str, Any]:
    """
    Validates that a path is a valid, writable directory.
    Checks free space and returns directory info.
    """
    if not dir_path or not isinstance(dir_path, str):
        return {
            "valid": False,
            "error": "Directory path cannot be empty",
            "path": None,
            "free_space_mb": 0
        }

    try:
        resolved = Path(dir_path).resolve()

        # If it doesn't exist, try to check if parent is writable and can create
        if not resolved.exists():
            resolved.mkdir(parents=True, exist_ok=True)

        if not resolved.is_dir():
            return {
                "valid": False,
                "error": f"Path is not a directory: {resolved}",
                "path": str(resolved),
                "free_space_mb": 0
            }

        # Check write permissions by touching a temp file
        test_file = resolved / ".write_test_tmp"
        try:
            test_file.write_text("test")
            test_file.unlink()
        except Exception as e:
            return {
                "valid": False,
                "error": f"Directory is not writable: {str(e)}",
                "path": str(resolved),
                "free_space_mb": 0
            }

        # Get free disk space
        total, used, free = shutil.disk_usage(resolved)
        free_mb = int(free / (1024 * 1024))

        return {
            "valid": True,
            "error": None,
            "path": str(resolved),
            "free_space_mb": free_mb,
            "total_space_mb": int(total / (1024 * 1024))
        }

    except Exception as e:
        return {
            "valid": False,
            "error": f"Invalid directory path: {str(e)}",
            "path": dir_path,
            "free_space_mb": 0
        }


def open_folder_in_explorer(folder_path: str) -> bool:
    """
    Opens the target folder in Windows Explorer.
    """
    try:
        path = Path(folder_path).resolve()
        if not path.exists():
            path.mkdir(parents=True, exist_ok=True)

        if platform.system() == "Windows":
            os.startfile(str(path))
            return True
        else:
            # Fallback for cross-platform dev
            run_command_safe(["explorer.exe", str(path)])
            return True
    except Exception as e:
        logger.error(f"Failed to open explorer for {folder_path}: {e}")
        return False
