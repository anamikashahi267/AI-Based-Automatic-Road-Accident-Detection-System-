import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
INSTANCE_DIR = BASE_DIR / "instance"
DATABASE_PATH = INSTANCE_DIR / "incidents.db"
ALLOWED_EXTENSIONS = {".mp4", ".avi"}
MAX_UPLOAD_BYTES = 200 * 1024 * 1024

CAMERAS = {
    "CAM-01": {"name": "Downtown Junction", "area": "Central District"},
    "CAM-02": {"name": "North Highway", "area": "North Outer Ring Road"},
    "CAM-03": {"name": "Market Street", "area": "Old Town"},
    "CAM-04": {"name": "Riverside Bridge", "area": "East Riverside"},
}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
CORS(app)


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                analyzed_at TEXT NOT NULL,
                filename TEXT NOT NULL,
                camera_id TEXT NOT NULL,
                camera_name TEXT NOT NULL,
                location TEXT NOT NULL,
                status TEXT NOT NULL,
                confidence REAL,
                video_offset_seconds REAL NOT NULL,
                motion_score REAL NOT NULL,
                detection_method TEXT NOT NULL
            )
            """
        )


def serialize_incident(row):
    return {
        "id": row["id"],
        "analyzed_at": row["analyzed_at"],
        "filename": row["filename"],
        "camera_id": row["camera_id"],
        "camera_name": row["camera_name"],
        "location": row["location"],
        "status": row["status"],
        "confidence": row["confidence"],
        "video_offset_seconds": row["video_offset_seconds"],
        "motion_score": row["motion_score"],
        "detection_method": row["detection_method"],
    }


def inspect_video(video_path):
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError("OpenCV could not read this video. Check the file and codec.")

    fps = capture.get(cv2.CAP_PROP_FPS)
    sample_every = max(1, round(fps * 0.5)) if fps and fps > 0 else 15
    previous_frame = None
    motion_samples = []
    frame_index = 0
    try:
        while True:
            success, frame = capture.read()
            if not success:
                break
            if frame_index % sample_every == 0:
                resized = cv2.resize(frame, (320, 180))
                gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
                if previous_frame is not None:
                    difference = cv2.absdiff(previous_frame, gray)
                    motion_score = float(np.mean(difference) / 255)
                    motion_samples.append((motion_score, frame_index / fps if fps else 0))
                previous_frame = gray
            frame_index += 1
    finally:
        capture.release()

    if not motion_samples:
        raise ValueError("The video is too short or has no readable frames to analyze.")

    scores = [sample[0] for sample in motion_samples]
    median_motion = float(np.median(scores))
    peak_motion, peak_time = max(motion_samples, key=lambda sample: sample[0])

    # This is an unvalidated motion-change heuristic, not a trained accident model.
    possible_incident = peak_motion >= 0.18 and peak_motion >= max(0.18, median_motion * 2.5)
    return {
        "status": "possible_incident" if possible_incident else "safe",
        "video_offset_seconds": round(peak_time, 1),
        "motion_score": round(peak_motion, 4),
    }


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "mode": "demo_heuristic"})


@app.get("/api/cameras")
def cameras():
    return jsonify(
        [
            {"id": camera_id, **camera}
            for camera_id, camera in CAMERAS.items()
        ]
    )


@app.get("/api/incidents")
def incidents():
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM incidents ORDER BY analyzed_at DESC"
        ).fetchall()
    return jsonify([serialize_incident(row) for row in rows])


@app.get("/api/stats")
def stats():
    with get_connection() as connection:
        totals = connection.execute(
            """
            SELECT COUNT(*) AS analyzed,
                   SUM(CASE WHEN status = 'possible_incident' THEN 1 ELSE 0 END) AS accidents
            FROM incidents
            """
        ).fetchone()
    analyzed = totals["analyzed"]
    accidents = totals["accidents"] or 0
    return jsonify(
        {"analyzed": analyzed, "accidents": accidents, "safe": analyzed - accidents}
    )


@app.post("/api/analyze")
def analyze():
    uploaded_file = request.files.get("video")
    camera_id = request.form.get("camera_id", "")
    if uploaded_file is None or not uploaded_file.filename:
        return jsonify({"error": "Choose an MP4 or AVI video to analyze."}), 400
    if camera_id not in CAMERAS:
        return jsonify({"error": "Choose a valid sample camera."}), 400

    filename = secure_filename(uploaded_file.filename)
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Only MP4 and AVI video files are supported."}), 400

    incident_id = str(uuid.uuid4())
    stored_path = UPLOAD_DIR / f"{incident_id}{extension}"
    uploaded_file.save(stored_path)
    try:
        result = inspect_video(stored_path)
    except ValueError as error:
        stored_path.unlink(missing_ok=True)
        return jsonify({"error": str(error)}), 400
    except Exception:
        stored_path.unlink(missing_ok=True)
        app.logger.exception("Video analysis failed")
        return jsonify({"error": "Video analysis failed. Please try another file."}), 500

    camera = CAMERAS[camera_id]
    record = {
        "id": incident_id,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "filename": filename,
        "camera_id": camera_id,
        "camera_name": camera["name"],
        "location": camera["area"],
        "confidence": None,
        "detection_method": "OpenCV motion heuristic (demo only; no trained model)",
        **result,
    }
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO incidents (
                id, analyzed_at, filename, camera_id, camera_name, location,
                status, confidence, video_offset_seconds, motion_score, detection_method
            ) VALUES (
                :id, :analyzed_at, :filename, :camera_id, :camera_name, :location,
                :status, :confidence, :video_offset_seconds, :motion_score, :detection_method
            )
            """,
            record,
        )

    return jsonify(
        {
            **record,
            "alert": {
                "simulated": True,
                "message": "Demo alert generated locally. No message was sent to authorities.",
            }
            if result["status"] == "possible_incident"
            else None,
        }
    ), 201


@app.errorhandler(413)
def file_too_large(_error):
    return jsonify({"error": "Video exceeds the 200 MB upload limit."}), 413


initialize_database()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
