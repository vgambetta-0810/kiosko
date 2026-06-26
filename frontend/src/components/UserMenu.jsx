import { useEffect, useId, useRef, useState } from 'react';
import { LogOut, Settings, UserRound, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserMenu({ variant = 'desktop', onNavigate, triggerRef: externalTriggerRef }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const firstItemRef = useRef(null);
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = variant === 'mobile';

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    if (!isMobile) firstItemRef.current?.focus();

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile, isOpen]);

  const close = () => setIsOpen(false);

  const runAction = (action) => {
    close();
    onNavigate?.();
    action();
  };

  const changeAccount = () => {
    logout();
    navigate('/login', { replace: true, state: { switchAccount: true } });
  };

  const manageAccount = () => {
    navigate('/cuenta');
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const items = [
    { label: 'Cambiar cuenta', description: user?.email || 'Iniciar con otra cuenta', icon: UsersRound, action: changeAccount },
    { label: 'Gestionar cuenta', description: 'Perfil y contrasena', icon: Settings, action: manageAccount },
    { label: 'Cerrar sesion', description: 'Finalizar esta sesion', icon: LogOut, action: signOut, danger: true }
  ];

  const setTriggerRef = (node) => {
    buttonRef.current = node;
    if (externalTriggerRef) externalTriggerRef.current = node;
  };

  return (
    <div className={`user-menu user-menu--${variant}${isOpen ? ' is-open' : ''}`}>
      <button
        ref={setTriggerRef}
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <UserRound size={16} aria-hidden="true" />
        <span>Cuenta</span>
      </button>

      <div ref={menuRef} id={menuId} className="user-menu__panel" role="menu" aria-hidden={!isOpen}>
        <div className="user-menu__header">
          <strong>{user?.name || 'Usuario'}</strong>
          <span>{user?.role || 'Cuenta'}</span>
        </div>
        <div className="user-menu__items">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                ref={index === 0 ? firstItemRef : null}
                type="button"
                role="menuitem"
                tabIndex={isOpen ? 0 : -1}
                className={`user-menu__item${item.danger ? ' user-menu__item--danger' : ''}`}
                onClick={() => runAction(item.action)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
