import React, { useEffect, useState } from 'react';
import socket from '../socket';

const ProctorDashboard = () => {
    const [students, setStudents] = useState({});

    useEffect(() => {
        socket.connect();

        socket.on('update-students', (data) => {
            setStudents({ ...data });
        });

        return () => {
            socket.off('update-students');
            socket.disconnect();
        };
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Proctor Dashboard</h1>
            <p style={{ color: '#555' }}>
                Connected students: <strong>{Object.keys(students).length}</strong>
            </p>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '16px',
                    marginTop: '20px',
                }}
            >
                {Object.keys(students).length === 0 ? (
                    <p style={{ color: '#888' }}>Waiting for students to connect...</p>
                ) : (
                    Object.entries(students).map(([id, data]) => (
                        <StudentCard key={id} data={data} />
                    ))
                )}
            </div>
        </div>
    );
};

const getScoreProfile = (score) => {
    if (score < 5) return { color: '#e8f5e9', border: '#4caf50', label: 'Normal', textColor: '#2e7d32' };
    if (score <= 8) return { color: '#fffde7', border: '#ffeb3b', label: 'Caution', textColor: '#f57f17' };
    return { color: '#ffebee', border: '#f44336', label: '⚠ Alert', textColor: '#c62828' };
};

const StudentCard = ({ data }) => {
    const profile = getScoreProfile(data.score);

    return (
        <div
            style={{
                padding: '18px',
                borderRadius: '10px',
                border: `2px solid ${profile.border}`,
                backgroundColor: profile.color,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
            }}
        >
            <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{data.name}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Suspicion Score</p>
                    <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: profile.textColor }}>
                        {data.score}
                    </p>
                </div>
                <div
                    style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: profile.border,
                        color: data.score > 8 ? 'white' : '#333',
                        fontSize: '13px',
                        fontWeight: 'bold',
                    }}
                >
                    {profile.label}
                </div>
            </div>
        </div>
    );
};

export default ProctorDashboard;
