import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CLIENT');
  const [error, setError] = useState('');

  const canChooseRole = user?.role === 'ADMIN';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const created = await register({
        name,
        email,
        password,
        role: canChooseRole ? role : 'CLIENT'
      });
      if (created.role === 'ADMIN') navigate('/admin', { replace: true });
      else if (created.role === 'SELLER') navigate('/pos', { replace: true });
      else navigate('/client', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="page">
      <h1>Create account</h1>
      <form onSubmit={onSubmit} className="card">
        {error ? <p>{error}</p> : null}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        {canChooseRole ? (
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="CLIENT">CLIENT</option>
            <option value="PARENT">PARENT</option>
            <option value="SELLER">SELLER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        ) : null}
        <button type="submit">Register</button>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
