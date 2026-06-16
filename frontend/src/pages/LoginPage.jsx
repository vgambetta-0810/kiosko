import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedEmail = localStorage.getItem('remember_login_email');
    if (storedEmail) {
      setEmail(storedEmail);
      setRememberMe(true);
    }
  }, []);

  const routeByRole = (role) => {
    if (role === 'ADMIN') return '/';
    if (role === 'SELLER') return '/ventas';
    return '/client';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);

      if (rememberMe) {
        localStorage.setItem('remember_login_email', email);
      } else {
        localStorage.removeItem('remember_login_email');
      }

      navigate(routeByRole(user.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al iniciar sesion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-shell__orb auth-shell__orb--primary" aria-hidden="true" />
      <div className="auth-shell__orb auth-shell__orb--secondary" aria-hidden="true" />

      <form onSubmit={onSubmit} className="auth-card">
        <div className="auth-header">
          <p className="auth-kicker">Kiosko Escolar</p>
          <h1>Iniciar sesion</h1>
          <p>Accede con tu cuenta para gestionar ventas, stock y paneles.</p>
        </div>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tuemail@kiosko.com"
          />
        </label>

        <label className="auth-field">
          <span>Contrasena</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contrasena"
          />
        </label>

        <div className="auth-row">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Recordarme</span>
          </label>

          <Link to="/register" className="auth-link">
            Crear cuenta
          </Link>
        </div>

        <button type="submit" className="auth-button" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              Ingresando...
            </>
          ) : (
            'Ingresar'
          )}
        </button>

        <div className="auth-divider">o continuar con</div>
        <div className="auth-google">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              setError('');
              try {
                const user = await loginWithGoogle(credentialResponse.credential);
                navigate(routeByRole(user.role), { replace: true });
              } catch (err) {
                setError(err?.response?.data?.message || 'Error al iniciar sesion con Google');
              }
            }}
            onError={() => setError('Error al iniciar sesion con Google')}
          />
        </div>
      </form>
    </div>
  );
}
