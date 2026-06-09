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
      else if (created.role === 'SELLER') navigate('/ventas', { replace: true });
      else navigate('/client', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar la cuenta');
    }
  };

  return (
    <div className="page">
      <h1>Crear cuenta</h1>
      <form onSubmit={onSubmit} className="card">
        {error ? <p>{error}</p> : null}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
        {canChooseRole ? (
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="CLIENT">CLIENT</option>
            <option value="PARENT">PARENT</option>
            <option value="SELLER">SELLER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        ) : null}
        <button type="submit">Registrarme</button>
        <p>
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </form>
    </div>
  );
}
