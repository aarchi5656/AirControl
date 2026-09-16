# 🖐️ AirControl — AI Gesture-Controlled Interface

AirControl is an AI-powered gesture-controlled web interface that allows users to interact with a dashboard using hand gestures through their webcam.

The project uses computer vision and hand landmark detection to recognize gestures and translate them into actions such as clicking, double-clicking, scrolling, and cursor movement.

## 🚀 Live Demo

🔗 Live Demo: (https://aircontrol-ai.netlify.app)

> Allow camera permission to interact with the AirControl interface.

## ✨ Features

- 🖐️ Real-time hand gesture detection
- ☝️ Index finger — Virtual cursor movement
- 👌 Pinch — Click
- 👍 Thumb Up — Double Click
- ✌️ Two Fingers — Scroll
- ✊ Fist — Pause/Inactive state
- 📷 Webcam-based interaction
- ⚡ Real-time gesture feedback
- 📊 Interactive dashboard with system statistics
- 🌐 Browser-based interface
- 📱 Responsive dashboard UI

## 🧠 How It Works

1. The browser requests webcam access.
2. MediaPipe detects the user's hand and hand landmarks.
3. The gesture engine analyzes landmark positions and distances.
4. The detected gesture is mapped to a specific action.
5. The dashboard updates the current gesture, action, confidence, and activity information in real time.

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- HTML5
- CSS3

### Computer Vision
- MediaPipe Tasks Vision
- Hand Landmarker
- Webcam API

### Backend / API
- Python
- Flask
- Flask-CORS

### Tools
- Git
- GitHub
- VS Code
- Netlify

## 📁 Project Structure

```text
AirControl/
│
├── app/
│   ├── api.py
│   ├── controller.py
│   ├── gesture_engine.py
│   ├── hand_tracker.py
│   └── main.py
│
├── dashboard/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── camera.js
│   │   └── gestureEngine.js
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── requirements.txt
└── README.md

🎯 Gesture Controls
Gesture	Action
☝️ Index Finger	Move Virtual Cursor
👌 Pinch	Click
👍 Thumb Up	Double Click
✌️ Two Fingers	Scroll

🔮 Future Improvements
Multi-hand gesture support
Custom gesture configuration
Improved gesture accuracy
Voice + gesture hybrid control
More accessibility-focused controls
Local companion application for OS-level control
Gesture usage analytics
Additional browser interaction controls

👩‍💻 Author
Aarchi Sharma
