import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data));

            if (res.data.role === 'student') {
                navigate('/student');
            } else {
                navigate('/proctor');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Vigilance - Login</h2>
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                /><br /><br />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                /><br /><br />
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;
