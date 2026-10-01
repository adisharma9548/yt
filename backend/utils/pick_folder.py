import sys
import os
import subprocess
from pathlib import Path


def pick_folder_powershell(title: str, initialdir: str) -> tuple[bool, str]:
    """
    Invokes the modern Windows 11 IFileOpenDialog via open_folder_dialog.ps1.
    Matches the native Windows File Explorer dialog with navigation pane,
    breadcrumbs, and New Folder button.
    Returns (success, path).
    success is True if PowerShell ran properly (path may be empty if user cancelled).
    success is False if PowerShell failed to execute or errored.
    """
    ps1_path = Path(__file__).resolve().parent / "open_folder_dialog.ps1"
    if not ps1_path.exists():
        return False, ""

    init_dir = initialdir if initialdir and Path(initialdir).exists() else str(Path.home() / "Downloads")
    init_dir = str(Path(init_dir).resolve()).rstrip("\\")

    try:
        # Use -Sta and DO NOT use -NonInteractive so modal dialogs can display
        cmd = [
            "powershell",
            "-NoProfile",
            "-Sta",
            "-ExecutionPolicy", "Bypass",
            "-File", str(ps1_path),
            "-Title", title,
            "-InitialDirectory", init_dir,
        ]
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120
        )
        if proc.returncode != 0:
            sys.stderr.write(f"PowerShell picker returned code {proc.returncode}: {proc.stderr}\n")
            return False, ""

        out = proc.stdout.strip()
        if out and Path(out).exists():
            return True, out
        # User cancelled
        return True, ""
    except Exception as e:
        sys.stderr.write(f"PowerShell picker error: {e}\n")
        return False, ""


def pick_folder_tkinter(title: str, initialdir: str) -> str:
    """Fallback using Tkinter filedialog."""
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        root.lift()
        root.focus_force()

        init_dir = initialdir if initialdir and Path(initialdir).exists() else str(Path.home() / "Downloads")
        folder = filedialog.askdirectory(title=title, initialdir=init_dir)
        root.destroy()
        return folder or ""
    except Exception as e:
        sys.stderr.write(f"Tkinter error: {e}\n")
        return ""


if __name__ == "__main__":
    dialog_title = sys.argv[1] if len(sys.argv) > 1 else "Select Download Folder"
    init_path = sys.argv[2] if len(sys.argv) > 2 else str(Path.home() / "Downloads")

    # 1. Primary: Modern Windows 11 Explorer dialog via PowerShell (-Sta, interactive)
    ps_success, result = pick_folder_powershell(dialog_title, init_path)

    # 2. Fallback: Tkinter ONLY if PowerShell failed to execute
    if not ps_success:
        result = pick_folder_tkinter(dialog_title, init_path)

    # Print selected path to stdout for caller
    print(result)
