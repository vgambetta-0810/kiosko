import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import StockDashboard from './pages/StockDashboard';
import SellerPOS from './pages/SellerPOS';
import ClientPanel from './pages/ClientPanel';

const Guard = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<Guard roles={["ADMIN"]}><AdminDashboard /></Guard>} />
      <Route path="/stock" element={<Guard roles={["ADMIN"]}><StockDashboard /></Guard>} />
      <Route path="/pos" element={<Guard roles={["ADMIN", "SELLER"]}><SellerPOS /></Guard>} />
      <Route path="/client" element={<Guard roles={["CLIENT", "PARENT"]}><ClientPanel /></Guard>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
