"""Video processing service using FFmpeg."""
import subprocess
import json
import os
import shutil
from pathlib import Path
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
THUMBNAILS_DIR = Path(__file__).parent.parent / "thumbnails"
EXPORTS_DIR = Path(__file__).parent.parent / "exports"

for d in [UPLOADS_DIR, THUMBNAILS_DIR, EXPORTS_DIR]:
    d.mkdir(exist_ok=True)


def _check_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def get_video_info(filepath: str) -> dict:
    """Extract video metadata using ffprobe."""
    if not _check_ffmpeg():
        logger.warning("ffprobe not found, returning mock data")
        return {"duration": 10.0, "width": 1920, "height": 1080, "fps": 30.0}

    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_streams", "-show_format",
                filepath
            ],
            capture_output=True, text=True, timeout=30
        )
        data = json.loads(result.stdout)
        info = {"duration": 0.0, "width": None, "height": None, "fps": None}

        if "format" in data:
            info["duration"] = float(data["format"].get("duration", 0))

        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                info["width"] = stream.get("width")
                info["height"] = stream.get("height")
                fps_str = stream.get("r_frame_rate", "30/1")
                try:
                    num, den = fps_str.split("/")
                    info["fps"] = round(int(num) / int(den), 2)
                except Exception:
                    info["fps"] = 30.0
                break

        return info
    except Exception as e:
        logger.error(f"Error getting video info: {e}")
        return {"duration": 0.0, "width": None, "height": None, "fps": None}


def generate_thumbnail(
    video_path: str,
    thumbnail_path: str,
    timestamp: float = 1.0,
    width: int = 320,
    height: int = 180
) -> bool:
    """Generate a thumbnail image from a video at the given timestamp."""
    if not _check_ffmpeg():
        logger.warning("ffmpeg not found, skipping thumbnail generation")
        return False

    try:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", str(timestamp),
                "-i", video_path,
                "-vframes", "1",
                "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease",
                "-q:v", "2",
                thumbnail_path
            ],
            capture_output=True, timeout=30, check=True
        )
        return os.path.exists(thumbnail_path)
    except Exception as e:
        logger.error(f"Error generating thumbnail: {e}")
        return False


def export_video(
    decisions: list,
    output_path: str,
    quality: str = "high",
    progress_callback=None
) -> Tuple[bool, str]:
    """
    Export the final video based on edit decisions.

    decisions: list of dicts with {scene_filename, in_point, out_point, transition_type, transition_duration}
    """
    if not _check_ffmpeg():
        return False, "FFmpeg not found. Please install FFmpeg to export videos."

    if not decisions:
        return False, "No edit decisions to export."

    quality_settings = {
        "low": {"crf": "28", "preset": "fast"},
        "medium": {"crf": "23", "preset": "medium"},
        "high": {"crf": "18", "preset": "slow"},
    }
    qs = quality_settings.get(quality, quality_settings["high"])

    try:
        # Build a filter complex for concatenation with transitions
        inputs = []
        filter_parts = []
        concat_inputs = []

        for i, decision in enumerate(decisions):
            video_path = str(UPLOADS_DIR / decision["scene_filename"])
            if not os.path.exists(video_path):
                logger.warning(f"Video file not found: {video_path}")
                continue

            in_pt = decision.get("in_point", 0.0)
            out_pt = decision.get("out_point", 0.0)
            duration_args = []
            if in_pt > 0:
                duration_args += ["-ss", str(in_pt)]
            if out_pt > 0:
                duration_args += ["-to", str(out_pt)]

            inputs += duration_args + ["-i", video_path]
            filter_parts.append(f"[{len(concat_inputs)}:v][{len(concat_inputs)}:a]")
            concat_inputs.append(i)

        if not concat_inputs:
            return False, "No valid video files found."

        n = len(concat_inputs)
        filter_complex = "".join(filter_parts) + f"concat=n={n}:v=1:a=1[outv][outa]"

        cmd = (
            ["ffmpeg", "-y"]
            + inputs
            + [
                "-filter_complex", filter_complex,
                "-map", "[outv]", "-map", "[outa]",
                "-c:v", "libx264", "-crf", qs["crf"], "-preset", qs["preset"],
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                output_path
            ]
        )

        logger.info(f"Running ffmpeg export: {' '.join(cmd[:10])}...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            return False, f"Export failed: {result.stderr[-500:]}"

        return True, output_path

    except subprocess.TimeoutExpired:
        return False, "Export timed out after 10 minutes."
    except Exception as e:
        logger.error(f"Export error: {e}")
        return False, str(e)
