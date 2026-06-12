import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ResponsiveNavbar from './components/ResponsiveNavbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import StockDashboard from './pages/StockDashboard';
import SellerPOS from './pages/SellerPOS';
import ClientPanel from './pages/ClientPanel';
import ClientsPage from './pages/ClientsPage';
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

export default function App() {
  return (
    <>
      <ResponsiveNavbar />
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
        <Route path="/clientes" element={<Guard roles={["ADMIN", "SELLER"]}><ClientsPage /></Guard>} />
        <Route path="/client" element={<Guard roles={["CLIENT", "PARENT"]}><ClientPanel /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
