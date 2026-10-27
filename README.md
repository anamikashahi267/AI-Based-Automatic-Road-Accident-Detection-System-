# AI-Based Automatic Road Accident Detection System

A beginner-friendly student prototype for uploading road surveillance videos, previewing them, and running a local OpenCV motion-analysis demo. It includes a React/Vite dashboard, a Flask API, predefined sample camera locations, SQLite incident history, and clearly labeled simulated alerts.

> **Important:** There is no trained accident-detection model in this project. Results are produced by an unvalidated frame-motion heuristic, not AI or a reliable accident classifier. Motion can be mistaken for an incident, and real incidents can be missed. Do not use this prototype for real-time monitoring or emergency response. Alerts are simulated locally; no messages are sent to authorities.

## Features

- Dashboard with analyzed-video, possible-incident, and no-incident-signal totals.
- MP4/AVI upload with an in-browser video preview before analysis.
- OpenCV samples frames and flags unusually large frame-to-frame image changes as a **possible incident signal**.
- Camera IDs map to predefined sample locations. The app does not infer GPS coordinates from video.
- SQLite stores analysis history. Confidence scores are left unavailable because the demo heuristic is not calibrated.
- Live Monitoring shows sample status cards only, not real CCTV streams.
- Responsive dark dashboard with Dashboard, Video Analysis, Live Monitoring, and Incident History pages.
- Uploads are limited to 200 MB and stored locally under `backend/uploads/`.

## Project structure

```text
.
├── backend/
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── .gitignore
```

The backend creates `backend/instance/incidents.db` and `backend/uploads/` on first run. These runtime files are ignored by Git.

## Requirements

- Python 3.9 or later
- Node.js 18 or later and npm
- OpenCV-compatible video codecs for the supplied MP4/AVI files

## Run locally

Open two terminals in the project folder.

### 1. Start the Flask backend

Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python backend\app.py
```

If PowerShell blocks virtual-environment activation, use `.\.venv\Scripts\python.exe` in place of `python` for the install and run commands.

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python backend/app.py
```

The API listens at `http://127.0.0.1:5000`. Keep this terminal running.

### 2. Start the React frontend

Open a second terminal in the project folder, then:

Windows PowerShell:

```bash
cd frontend
npm install
npm run dev
```

macOS/Linux:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`). Keep this terminal running too.

## Try the prototype

1. Select **Video Analysis**, choose an MP4 or AVI clip, and preview it.
2. Select one of the predefined sample cameras and click **Analyze video**.
3. Review the motion-heuristic result, the camera's predefined location, and the approximate video timestamp of the largest sampled frame change.
4. Open **Dashboard** or **Incident History** to see saved analyses. A possible-incident result creates a simulated alert only.
5. **Live Monitoring** contains demonstration cards; no camera is connected.

## How the demo heuristic works

The backend samples the clip approximately twice per second, resizes sampled frames, converts them to grayscale, and calculates normalized average pixel change between neighboring samples. It reports a possible-incident signal when the peak score is at least `0.18` and at least `2.5` times the median sampled motion. This simple threshold has not been trained, calibrated, or validated against accident footage and is not evidence that an accident occurred. No confidence score is generated.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Backend status and demo mode |
| `GET` | `/api/cameras` | Predefined sample camera IDs and locations |
| `GET` | `/api/stats` | Dashboard totals |
| `GET` | `/api/incidents` | Saved analysis history |
| `POST` | `/api/analyze` | Analyze a multipart `video` and `camera_id` |

Analysis errors return a JSON `error` message with an appropriate HTTP status. The API is intended for local development and does not include production security or deployment configuration.
