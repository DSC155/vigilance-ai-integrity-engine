import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import socket from '../socket';

const FRAME_RATE = 15;
const EMIT_INTERVAL_MS = 1000;
const FACE_ABSENT_THRESHOLD_SEC = 3;
const YAW_THRESHOLD_DEG = 25;

const StudentDashboard = () => {
    const videoRef = useRef(null);
    const cameraRef = useRef(null);
    const faceMeshRef = useRef(null);

    const frameDataRef = useRef({
        faceCount: 0,
        yawAngle: 0,
        faceAbsentSeconds: 0,
        multiFaceFlag: false,
        tabSwitches: 0,
        pastes: 0,
        copies: 0,
        devtoolsOpen: false,
        eventScore: 0,
    });

    const [displayData, setDisplayData] = useState({
        faceCount: 0,
        yawAngle: 0,
        faceAbsentSeconds: 0,
        suspicionScore: 0,
        tabSwitches: 0,
        pastes: 0,
        copies: 0,
        devtoolsOpen: false,
    });

    const user = JSON.parse(localStorage.getItem('user'));

    const calculateYaw = useCallback((landmarks) => {
        const noseTip = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        const eyeCenterX = (leftEye.x + rightEye.x) / 2;
        const eyeWidth = Math.abs(rightEye.x - leftEye.x);

        if (eyeWidth === 0) return 0;

        const offset = noseTip.x - eyeCenterX;
        const normalizedOffset = offset / eyeWidth;
        return normalizedOffset * 90;
    }, []);

    const onFaceMeshResults = useCallback((results) => {
        const faces = results.multiFaceLandmarks || [];
        const faceCount = faces.length;
        let yawAngle = 0;

        if (faceCount > 0) {
            yawAngle = calculateYaw(faces[0]);
        }

        frameDataRef.current.faceCount = faceCount;
        frameDataRef.current.yawAngle = parseFloat(Math.abs(yawAngle).toFixed(1));
        frameDataRef.current.multiFaceFlag = faceCount > 1;
    }, [calculateYaw]);

    useEffect(() => {
        socket.connect();
        socket.emit('student-join', { name: user.name });

        const faceMesh = new FaceMesh({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
            maxNumFaces: 3,
            refineLandmarks: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        faceMesh.onResults(onFaceMeshResults);
        faceMeshRef.current = faceMesh;

        if (videoRef.current) {
            const camera = new Camera(videoRef.current, {
                onFrame: async () => {
                    if (faceMeshRef.current && videoRef.current) {
                        await faceMeshRef.current.send({ image: videoRef.current });
                    }
                },
                width: 640,
                height: 480,
                facingMode: 'user',
                frameRate: FRAME_RATE,
            });
            camera.start();
            cameraRef.current = camera;
        }

        const increaseSuspicion = (points) => {
            frameDataRef.current.eventScore += points;
            // The score will be emitted in the next tick of the 1s emitTimer
            // to ensure we don't spam the server and maintain a single source of truth.
        };

        // 1️⃣ Tab Switch / Visibility Change
        const handleVisibilityChange = () => {
            if (document.hidden) {
                increaseSuspicion(3);
                frameDataRef.current.tabSwitches += 1;
            }
        };

        // 2️⃣ Window Blur
        const handleBlur = () => {
            increaseSuspicion(2);
        };

        // 3️⃣ Copy Detection
        const handleCopy = () => {
            increaseSuspicion(2);
            frameDataRef.current.copies += 1;
        };

        // 4️⃣ Paste Detection
        const handlePaste = (e) => {
            increaseSuspicion(4);
            const pastedText = e.clipboardData?.getData('text') || "";
            console.log(`Pasted content length: ${pastedText.length}`);
            frameDataRef.current.pastes += 1;
        };

        // 5️⃣ DevTools Detection (Interval)
        const devToolsTimer = setInterval(() => {
            if (window.outerWidth - window.innerWidth > 160 ||
                window.outerHeight - window.innerHeight > 160) {
                increaseSuspicion(3);
                frameDataRef.current.devtoolsOpen = true;
            } else {
                frameDataRef.current.devtoolsOpen = false;
            }
        }, 1000);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("copy", handleCopy);
        document.addEventListener("paste", handlePaste);

        // Increment faceAbsentSeconds every second when face is absent
        const absentTimer = setInterval(() => {
            if (frameDataRef.current.faceCount === 0) {
                frameDataRef.current.faceAbsentSeconds += 1;
            } else {
                frameDataRef.current.faceAbsentSeconds = 0;
            }
        }, 1000);

        // Calculate and emit suspicion score every second
        const emitTimer = setInterval(() => {
            const { faceCount, yawAngle, faceAbsentSeconds, multiFaceFlag, eventScore } =
                frameDataRef.current;

            let visionScore = 0;
            if (multiFaceFlag) visionScore += 5;
            if (faceAbsentSeconds >= FACE_ABSENT_THRESHOLD_SEC) visionScore += 3;
            if (yawAngle > YAW_THRESHOLD_DEG) visionScore += 2;

            const totalScore = visionScore + eventScore;

            socket.emit('update-suspicion', { score: totalScore });

            setDisplayData({
                faceCount,
                yawAngle,
                faceAbsentSeconds,
                suspicionScore: totalScore,
                tabSwitches: frameDataRef.current.tabSwitches,
                pastes: frameDataRef.current.pastes,
                copies: frameDataRef.current.copies,
                devtoolsOpen: frameDataRef.current.devtoolsOpen,
            });
        }, EMIT_INTERVAL_MS);

        return () => {
            clearInterval(absentTimer);
            clearInterval(emitTimer);
            clearInterval(devToolsTimer);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("copy", handleCopy);
            document.removeEventListener("paste", handlePaste);
            if (cameraRef.current) cameraRef.current.stop();
            if (faceMeshRef.current) faceMeshRef.current.close();
            socket.disconnect();
        };
    }, [onFaceMeshResults, user.name]);

    const getScoreColor = (score) => {
        if (score < 5) return '#4caf50';
        if (score <= 8) return '#ffeb3b';
        return '#f44336';
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '720px', margin: '0 auto' }}>
            <h1>Student Dashboard</h1>
            <p>Welcome, <strong>{user.name}</strong> — Monitoring is active.</p>

            <video
                ref={videoRef}
                style={{
                    width: '100%',
                    borderRadius: '10px',
                    border: '2px solid #333',
                    marginBottom: '20px',
                    display: 'block',
                }}
                playsInline
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <MetricCard label="Faces Detected" value={displayData.faceCount} />
                <MetricCard label="Yaw Angle" value={`${displayData.yawAngle}°`} />
                <MetricCard label="Face Absent Duration" value={`${displayData.faceAbsentSeconds}s`} />
                <MetricCard
                    label="Suspicion Score"
                    value={displayData.suspicionScore}
                    style={{ backgroundColor: getScoreColor(displayData.suspicionScore) }}
                />
                <MetricCard label="Tab Switch Count" value={displayData.tabSwitches} />
                <MetricCard label="Copy Count" value={displayData.copies} />
                <MetricCard label="Paste Count" value={displayData.pastes} />
                <MetricCard
                    label="DevTools Detected"
                    value={displayData.devtoolsOpen ? "YES" : "NO"}
                    style={{ color: displayData.devtoolsOpen ? "#f44336" : "inherit", fontWeight: displayData.devtoolsOpen ? "bold" : "normal" }}
                />
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, style = {} }) => (
    <div
        style={{
            padding: '15px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            textAlign: 'center',
            backgroundColor: '#f9f9f9',
            ...style,
        }}
    >
        <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>{label}</p>
        <h2 style={{ margin: '6px 0 0', fontSize: '28px' }}>{value}</h2>
    </div>
);

export default StudentDashboard;
