import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const routeByRole = (role) => {
    if (role === 'ADMIN') return '/admin';
    if (role === 'SELLER') return '/pos';
    return '/client';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      navigate(routeByRole(user.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="page">
      <h1>School Kiosk Login</h1>
      <form onSubmit={onSubmit} className="card">
        {error ? <p>{error}</p> : null}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit">Login</button>
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            setError('');
            try {
              const user = await loginWithGoogle(credentialResponse.credential);
              navigate(routeByRole(user.role), { replace: true });
            } catch (err) {
              setError(err?.response?.data?.message || 'Google login failed');
            }
          }}
          onError={() => setError('Google login failed')}
        />
        <p>
          No account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}
