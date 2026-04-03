# Vigilance: AI Integrity Engine

Vigilance is a real-time, AI-powered online examination proctoring system designed to ensure academic integrity during remote assessments. Through advanced computer vision and behavioral analysis, it tracks test-taker actions, evaluates their behavior, and generates a live "suspicion score" to alert human proctors.

## 🚀 Key Features

*   **Real-time AI Vision (MediaPipe)**: Detects face presence, tracks head yaw angle, and identifies cases where multiple faces are present in the webcam frame.
*   **Behavioral Monitoring**: Detects tab switching, window blurring, copy/paste keyboard events, and unauthorized opening of developer tools.
*   **Live Suspicion Scoring**: Combines vision-based anomalies and behavioral infractions to compute an aggregated suspicion score dynamically.
*   **Proctor Dashboard**: A real-time monitoring interface for proctors over WebSockets, visually categorizing student statuses into Normal, Caution, and Alert states.
*   **Role-Based Access Control**: Secure login and dashboards specific to 'student' and 'proctor' roles using JWT tokens.

## 🛠️ Tech Stack

*   **Frontend**: React, Vite, React Router DOM
*   **AI / Vision**: Google MediaPipe (`@mediapipe/face_mesh`, `@mediapipe/camera_utils`)
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB (Mongoose)
*   **Real-time Communication**: Socket.IO, Socket.IO-Client
*   **Authentication**: JWT, bcryptjs

## 📁 Architecture

```text
vigilance-system/
├── backend/               # Express API and web socket server
│   ├── config/            # Database config
│   ├── middleware/        # Authentication & validation
│   ├── models/            # Mongoose schemas (e.g. User.js)
│   ├── routes/            # REST API Routes (/api/auth)
│   ├── sockets/           # Socket.IO state sync and handlers
│   └── server.js          # Entry point
└── frontend/              # React single page application
    ├── src/
    │   ├── pages/         # Login, StudentDashboard, ProctorDashboard
    │   ├── socket.js      # Global socket instance connection
    │   └── ...
    └── package.json       # Frontend dependencies
```

## ⚙️ Setup and Installation

### Prerequisites
*   Node.js (v16+ recommended)
*   MongoDB instance (local or MongoDB Atlas)

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd vigilance-system/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file inside `backend/` and add the following:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```
4. Start the server:
   ```bash
   node server.js
   ```

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd vigilance-system/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the application in your browser (typically at `http://localhost:5173`).

## 🧠 Evaluation Metrics for "Suspicion Score"

The system monitors behavior locally and incrementally increases a student's suspicion score based on:

*   **Vision Penalties**: 
    *   No face detected for > 3 seconds (+3 pts)
    *   Looking away (Yaw angle > 25°) (+2 pts)
    *   Multiple faces detected (+5 pts)
*   **System/Browser Penalties**: 
    *   Copying data (+2 pts)
    *   Pasting data (+4 pts)
    *   Switching tabs or minimizing window (+3 pts)
    *   Window losing focus (+2 pts)
    *   Unusual resizing/Opening DevTools (+3 pts)
