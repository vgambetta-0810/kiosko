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
      setError(err?.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="page">
      <h1>Inicio de sesión del kiosco escolar</h1>
      <form onSubmit={onSubmit} className="card">
        {error ? <p>{error}</p> : null}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
        <button type="submit">Ingresar</button>
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            setError('');
            try {
              const user = await loginWithGoogle(credentialResponse.credential);
              navigate(routeByRole(user.role), { replace: true });
            } catch (err) {
              setError(err?.response?.data?.message || 'Error al iniciar sesión con Google');
            }
          }}
          onError={() => setError('Error al iniciar sesión con Google')}
        />
        <p>
          ¿No tienes cuenta? <Link to="/register">Crear una</Link>
        </p>
      </form>
    </div>
  );
}
