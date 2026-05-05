import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@kiosco.com');
  const [password, setPassword] = useState('admin1234');

  return (
    <div className="page">
      <h1>School Kiosk Login</h1>
      <form onSubmit={(e) => { e.preventDefault(); login(email, password); }} className="card">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button type="submit">Login</button>
        <a href={`${import.meta.env.VITE_API_URL}/auth/google`}>Login with Google</a>
      </form>
    </div>
  );
}
