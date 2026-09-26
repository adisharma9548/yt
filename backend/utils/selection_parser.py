import re
from typing import List, Optional, Set


def parse_selection(selection_str: str, max_videos: Optional[int] = None) -> List[int]:
    """
    Parses a selection string containing video indices and ranges.
    Examples:
        "1, 4, 7, 12"
        "1-10"
        "1-5, 10-15"
        "1, 4, 8-12, 20"
        "all"

    Rules:
        - 1-indexed (rejects 0 and negative numbers)
        - Whitespace-tolerant
        - Deduplicates and sorts in ascending order (preserving playlist order)
        - Raises ValueError with clear message for invalid syntax or out of range
    """
    if not selection_str or not isinstance(selection_str, str):
        raise ValueError("Selection expression cannot be empty.")

    clean_str = selection_str.strip().lower()
    if not clean_str:
        raise ValueError("Selection expression cannot be empty.")

    # Special keyword: "all"
    if clean_str == "all":
        if max_videos is None or max_videos < 1:
            raise ValueError("Cannot select 'all' without specifying total number of videos.")
        return list(range(1, max_videos + 1))

    selected_indices: Set[int] = set()

    # Split by comma or newline
    tokens = [t.strip() for t in re.split(r'[,;\n]+', clean_str) if t.strip()]
    if not tokens:
        raise ValueError("No valid selection tokens found.")

    for token in tokens:
        # Check for multiple dashes or invalid signs
        if "--" in token or token.startswith("-") or token.endswith("-"):
            raise ValueError(f"Invalid range syntax in token: '{token}'")

        # Range pattern: e.g. "1-5"
        if "-" in token:
            parts = token.split("-")
            if len(parts) != 2:
                raise ValueError(f"Invalid range format '{token}'. Must be 'start-end' like '1-10'.")

            start_str, end_str = parts[0].strip(), parts[1].strip()
            if not start_str.isdigit() or not end_str.isdigit():
                raise ValueError(f"Range boundaries must be positive integers, got '{token}'.")

            start, end = int(start_str), int(end_str)
            if start == 0 or end == 0:
                raise ValueError("Playlist indexing starts at 1. Index 0 is invalid.")
            if start > end:
                raise ValueError(f"Start index ({start}) cannot be greater than end index ({end}) in '{token}'.")

            if max_videos is not None and (start > max_videos or end > max_videos):
                raise ValueError(f"Selection '{token}' exceeds total playlist size ({max_videos}).")

            selected_indices.update(range(start, end + 1))

        # Single number pattern: e.g. "4"
        else:
            if not token.isdigit():
                raise ValueError(f"Invalid item '{token}'. Expected a number or range like '1-5'.")

            val = int(token)
            if val == 0:
                raise ValueError("Playlist indexing starts at 1. Index 0 is invalid.")
            if val < 0:
                raise ValueError(f"Negative numbers are not allowed: {val}")
            if max_videos is not None and val > max_videos:
                raise ValueError(f"Index {val} exceeds total playlist size ({max_videos}).")

            selected_indices.add(val)

    if not selected_indices:
        raise ValueError("No videos were selected.")

    # Return sorted (preserving original playlist order)
    return sorted(list(selected_indices))
