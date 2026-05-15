import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import StockDashboard from './pages/StockDashboard';
import SellerPOS from './pages/SellerPOS';
import ClientPanel from './pages/ClientPanel';
import HomePage from './pages/HomePage';

const Guard = ({ roles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page">Cargando sesión...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/inicio" replace />;
  return children;
};

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page">Cargando sesión...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/inicio" replace />;
};

const Navigation = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user || location.pathname === '/login' || location.pathname === '/register') return null;

  const links = [{ to: '/inicio', label: 'Inicio' }];
  if (user.role === 'ADMIN') links.push({ to: '/admin', label: 'Admin' }, { to: '/stock', label: 'Stock' }, { to: '/pos', label: 'POS' });
  if (user.role === 'SELLER') links.push({ to: '/pos', label: 'POS' });
  if (user.role === 'CLIENT' || user.role === 'PARENT') links.push({ to: '/client', label: 'Panel' });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="top-nav">
      <div className="top-nav__links">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {link.label}
          </NavLink>
        ))}
      </div>
      <button type="button" className="logout-btn" onClick={handleLogout}>Cerrar sesion</button>
    </nav>
  );
};

export default function App() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/inicio" element={<Guard><HomePage /></Guard>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<Guard roles={["ADMIN"]}><AdminDashboard /></Guard>} />
        <Route path="/stock" element={<Guard roles={["ADMIN"]}><StockDashboard /></Guard>} />
        <Route path="/pos" element={<Guard roles={["ADMIN", "SELLER"]}><SellerPOS /></Guard>} />
        <Route path="/client" element={<Guard roles={["CLIENT", "PARENT"]}><ClientPanel /></Guard>} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </>
  );
}
