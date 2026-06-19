import { useEffect, useId, useRef, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const buildNavLinks = (role) => {
  const links = [{ to: '/', label: 'Inicio' }];

  if (role === 'ADMIN') {
    links.push(
      { to: '/inventario', label: 'Inventario' },
      { to: '/movimientos', label: 'Movimientos' },
      { to: '/ventas', label: 'Ventas' },
      { to: '/clientes', label: 'Clientes' },
      { to: '/proveedores', label: 'Proveedores' },
      { to: '/compras', label: 'Compras' }
    );
  }

  if (role === 'SELLER') {
    links.push({ to: '/ventas', label: 'Ventas' }, { to: '/clientes', label: 'Clientes' });
  }

  if (role === 'CLIENT' || role === 'PARENT') {
    links.push({ to: '/client', label: 'Panel' });
  }

  return links;
};

export default function ResponsiveNavbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const menuId = useId();
  const menuButtonRef = useRef(null);
  const firstMobileLinkRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
  const links = user ? buildNavLinks(user.role) : [];

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    firstMobileLinkRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  if (!user || isAuthRoute) return null;

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const renderLinks = (variant) =>
    links.map((link, index) => (
      <NavLink
        key={`${variant}-${link.to}`}
        ref={variant === 'mobile' && index === 0 ? firstMobileLinkRef : null}
        to={link.to}
        end={link.to === '/'}
        className={({ isActive }) => (isActive ? 'active' : '')}
        onClick={() => setIsMenuOpen(false)}
      >
        {link.label}
      </NavLink>
    ));

  const renderThemeToggle = (variant) => (
    <button
      type="button"
      className={`theme-toggle theme-toggle--${variant}`}
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
    >
      {theme === 'dark' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span>{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
    </button>
  );

  return (
    <>
      <nav className="top-nav" aria-label="Navegacion principal">
        <div className="top-nav__brand" aria-hidden="true">Kiosko</div>

        <div className="top-nav__links top-nav__links--desktop">
          {renderLinks('desktop')}
        </div>

        <div className="top-nav__actions top-nav__actions--desktop">
          {renderThemeToggle('desktop')}
          <button type="button" className="logout-btn logout-btn--desktop" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="top-nav__menu-button"
          aria-label={isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </nav>

      <div className={`top-nav__mobile-layer${isMenuOpen ? ' is-open' : ''}`} hidden={!isMenuOpen}>
        <button
          type="button"
          className="top-nav__backdrop"
          aria-label="Cerrar menu"
          tabIndex={isMenuOpen ? 0 : -1}
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          id={menuId}
          className="top-nav__mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegacion"
        >
          <div className="top-nav__mobile-header">
            <span>Menu</span>
            <button type="button" className="top-nav__close-button" aria-label="Cerrar menu" onClick={() => setIsMenuOpen(false)}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="top-nav__links top-nav__links--mobile">
            {renderLinks('mobile')}
            {renderThemeToggle('mobile')}
            <button type="button" className="logout-btn logout-btn--mobile" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
