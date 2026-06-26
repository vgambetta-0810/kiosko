import { useEffect, useMemo, useState } from 'react';
import { KeyRound, LoaderCircle, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const roleLabels = {
  ADMIN: 'Administrador',
  SELLER: 'Vendedor',
  CLIENT: 'Cliente',
  PARENT: 'Responsable'
};

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const formatDate = (value) => {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : dateFormatter.format(date);
};

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const hasPassword = Boolean(profile?.hasPassword);

  const profileRows = useMemo(
    () => [
      { label: 'Nombre', value: profile?.name || '-' },
      { label: 'Email', value: profile?.email || '-' },
      { label: 'Rol', value: roleLabels[profile?.role] || profile?.role || '-' },
      { label: 'Fecha de creacion', value: formatDate(profile?.createdAt) },
      { label: 'Ultima actualizacion', value: formatDate(profile?.updatedAt) },
      { label: 'Ultimos accesos', value: 'No disponible' }
    ],
    [profile]
  );

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar tu cuenta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePasswordField = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    setMessage('');

    if (passwordForm.newPassword.length < 6) {
      setError('La nueva contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.patch('/auth/password', passwordForm);
      setProfile(data);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      setPasswordForm(emptyPasswordForm);
      setMessage('Contrasena actualizada correctamente');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cambiar la contrasena');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page account-page">
      <header className="account-header">
        <div>
          <p className="clients-kicker">Mi cuenta</p>
          <h1>Gestionar cuenta</h1>
          <p>Revisa tu perfil y administra el acceso a tu cuenta.</p>
        </div>
        <button type="button" className="sales-refresh" onClick={loadProfile} disabled={loading}>
          {loading ? <LoaderCircle size={16} className="sales-action-spinner" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
          <span>Actualizar</span>
        </button>
      </header>

      {error ? <p className="inventory-error">{error}</p> : null}
      {message ? <p className="inventory-success">{message}</p> : null}

      <section className="account-grid">
        <article className="card account-card">
          <div className="account-card__title">
            <UserRound size={22} aria-hidden="true" />
            <div>
              <h2>Perfil</h2>
              <p>Informacion asociada a tu usuario.</p>
            </div>
          </div>
          <dl className="account-details">
            {profileRows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="card account-card">
          <div className="account-card__title">
            <ShieldCheck size={22} aria-hidden="true" />
            <div>
              <h2>Acceso</h2>
              <p>Estado de inicio de sesion y credenciales.</p>
            </div>
          </div>
          <dl className="account-details">
            <div>
              <dt>Contrasena</dt>
              <dd>{hasPassword ? 'Configurada' : 'Pendiente de crear'}</dd>
            </div>
            <div>
              <dt>Google</dt>
              <dd>{profile?.hasGoogle ? 'Vinculado' : 'No vinculado'}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="card account-card account-password-card">
        <div className="account-card__title">
          <KeyRound size={22} aria-hidden="true" />
          <div>
            <h2>Cambiar contrasena</h2>
            <p>{hasPassword ? 'Ingresa tu contrasena actual y elegi una nueva.' : 'Crea una contrasena para este usuario.'}</p>
          </div>
        </div>

        <form className="account-form" onSubmit={changePassword}>
          {hasPassword ? (
            <label>
              Contrasena actual
              <input
                type="password"
                autoComplete="current-password"
                required
                value={passwordForm.currentPassword}
                onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
              />
            </label>
          ) : null}
          <label>
            Nueva contrasena
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={passwordForm.newPassword}
              onChange={(event) => updatePasswordField('newPassword', event.target.value)}
            />
          </label>
          <label>
            Confirmar contrasena
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={passwordForm.confirmPassword}
              onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
            />
          </label>
          <button type="submit" className="inventory-primary-action" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar contrasena'}
          </button>
        </form>
      </section>
    </div>
  );
}
