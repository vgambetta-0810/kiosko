import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const roleRef = useRef(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('CLIENT');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canChooseRole = user?.role === 'ADMIN';

  const routeByRole = (userRole) => {
    if (userRole === 'ADMIN') return '/admin';
    if (userRole === 'SELLER') return '/ventas';
    return '/client';
  };

  const validateForm = () => {
    const nextErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName) nextErrors.name = 'Ingresá tu nombre.';
    if (!trimmedEmail) nextErrors.email = 'Ingresá tu email.';
    else if (!emailPattern.test(trimmedEmail)) nextErrors.email = 'Ingresá un email válido.';
    if (!password) nextErrors.password = 'Ingresá una contraseña.';
    else if (password.length < 6) nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Confirmá tu contraseña.';
    else if (confirmPassword !== password) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const clearFieldError = (fieldName) => {
    setFieldErrors((current) => ({ ...current, [fieldName]: '' }));
  };

  const focusNextOnEnter = (event, nextField) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    nextField?.current?.focus();
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setSuccess('');
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const created = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: canChooseRole ? role : 'CLIENT'
      });
      setSuccess('Cuenta creada correctamente.');
      navigate(routeByRole(created.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-shell__orb auth-shell__orb--primary" aria-hidden="true" />
      <div className="auth-shell__orb auth-shell__orb--secondary" aria-hidden="true" />

      <form ref={formRef} onSubmit={onSubmit} className="auth-card" noValidate>
        <div className="auth-header">
          <p className="auth-kicker">Kiosko Escolar</p>
          <h1>Crear cuenta</h1>
          <p>Registrá tu cuenta para gestionar ventas, stock y paneles.</p>
        </div>

        <label className="auth-field">
          <span>Nombre</span>
          <input
            type="text"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearFieldError('name');
            }}
            onKeyDown={(event) => focusNextOnEnter(event, emailRef)}
            placeholder="Tu nombre"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
          />
          {fieldErrors.name ? (
            <span className="auth-field-error" id="register-name-error">
              {fieldErrors.name}
            </span>
          ) : null}
        </label>

        <label className="auth-field">
          <span>Email</span>
          <input
            ref={emailRef}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError('email');
            }}
            onKeyDown={(event) => focusNextOnEnter(event, passwordRef)}
            placeholder="tuemail@kiosko.com"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
          />
          {fieldErrors.email ? (
            <span className="auth-field-error" id="register-email-error">
              {fieldErrors.email}
            </span>
          ) : null}
        </label>

        <label className="auth-field">
          <span>Contraseña</span>
          <input
            ref={passwordRef}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError('password');
            }}
            onKeyDown={(event) => focusNextOnEnter(event, confirmPasswordRef)}
            placeholder="Ingresá una contraseña"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
          />
          {fieldErrors.password ? (
            <span className="auth-field-error" id="register-password-error">
              {fieldErrors.password}
            </span>
          ) : null}
        </label>

        <label className="auth-field">
          <span>Confirmar contraseña</span>
          <input
            ref={confirmPasswordRef}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFieldError('confirmPassword');
            }}
            onKeyDown={(event) => {
              if (!canChooseRole || event.key !== 'Enter') return;
              focusNextOnEnter(event, roleRef);
            }}
            placeholder="Repetí la contraseña"
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
          />
          {fieldErrors.confirmPassword ? (
            <span className="auth-field-error" id="register-confirm-password-error">
              {fieldErrors.confirmPassword}
            </span>
          ) : null}
        </label>

        {canChooseRole ? (
          <label className="auth-field">
            <span>Rol</span>
            <select
              ref={roleRef}
              value={role}
              onChange={(event) => setRole(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                formRef.current?.requestSubmit();
              }}
            >
              <option value="CLIENT">CLIENT</option>
              <option value="PARENT">PARENT</option>
              <option value="SELLER">SELLER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
        ) : null}

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        {success ? <p className="auth-success">{success}</p> : null}

        <button type="submit" className="auth-button" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              Creando cuenta...
            </>
          ) : (
            'Crear cuenta'
          )}
        </button>

        <p className="auth-footer">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="auth-link">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
