import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import StockDashboard from './pages/StockDashboard';
import SellerPOS from './pages/SellerPOS';
import ClientPanel from './pages/ClientPanel';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import SalesHistory from './pages/SalesHistory';

const Guard = ({ roles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'SELLER') return <Navigate to="/ventas" replace />;
  return <Navigate to="/client" replace />;
};

const Navigation = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user || location.pathname === '/login' || location.pathname === '/register') return null;

  const links = [{ to: '/', label: 'Inicio' }];
  if (user.role === 'ADMIN') {
    links.push({ to: '/admin', label: 'Admin' }, { to: '/analytics', label: 'Analitica' }, { to: '/inventario', label: 'Inventario' }, { to: '/ventas', label: 'Ventas' });
  }
  if (user.role === 'SELLER') links.push({ to: '/ventas', label: 'Ventas' });
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<Guard roles={["ADMIN"]}><AdminDashboard /></Guard>} />
        <Route path="/analytics" element={<Guard roles={["ADMIN"]}><AnalyticsDashboard /></Guard>} />
        <Route path="/inventario" element={<Guard roles={["ADMIN"]}><StockDashboard /></Guard>} />
        <Route path="/stock" element={<Navigate to="/inventario" replace />} />
        <Route path="/pos" element={<Navigate to="/ventas" replace />} />
        <Route path="/ventas" element={<Guard roles={["ADMIN", "SELLER"]}><SellerPOS /></Guard>} />
        <Route path="/ventas/historial" element={<Guard roles={["ADMIN", "SELLER"]}><SalesHistory /></Guard>} />
        <Route path="/client" element={<Guard roles={["CLIENT", "PARENT"]}><ClientPanel /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
