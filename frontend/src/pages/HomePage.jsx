import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  const links = [];
  if (user?.role === 'ADMIN') links.push({ to: '/admin', label: 'Ir al panel de administración' }, { to: '/stock', label: 'Ir a gestión de stock' });
  if (user?.role === 'SELLER') links.push({ to: '/ventas', label: 'Nueva venta' });
  if (user?.role === 'CLIENT' || user?.role === 'PARENT') links.push({ to: '/client', label: 'Ir al panel de cliente' });

  return (
    <div className="page">
      <h1>Inicio</h1>
      <div className="card">
        <p>Bienvenido{user?.name ? `, ${user.name}` : ''}.</p>
        <p>Desde aquí puedes acceder rápidamente a las secciones principales según tu rol.</p>
        {links.map((link) => (
          <Link key={link.to} to={link.to}>{link.label}</Link>
        ))}
      </div>
    </div>
  );
}
