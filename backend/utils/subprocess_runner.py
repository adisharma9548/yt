import subprocess
from typing import List, Optional, Tuple
from .logger import logger


def run_command_safe(
    cmd_args: List[str],
    timeout_seconds: Optional[int] = None,
    cwd: Optional[str] = None
) -> Tuple[int, str, str]:
    """
    Executes an external command safely without shell=True.
    Returns (returncode, stdout, stderr).
    """
    try:
        process = subprocess.run(
            cmd_args,
            shell=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_seconds,
            cwd=cwd,
        )
        return process.returncode, process.stdout, process.stderr
    except subprocess.TimeoutExpired:
        logger.error(f"Command timed out after {timeout_seconds}s: {' '.join(cmd_args)}")
        return -1, "", f"Command timed out after {timeout_seconds} seconds"
    except Exception as e:
        logger.error(f"Error running command {' '.join(cmd_args)}: {str(e)}")
        return -1, "", str(e)
