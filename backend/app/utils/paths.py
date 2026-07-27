from pathlib import Path


def ensure_directory(path: str | Path) -> Path:
    """Create a directory (including parents) if it does not exist."""
    directory = Path(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory
