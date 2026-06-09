import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, LoaderCircle, Plus, Search, X } from 'lucide-react';
import { getCategoryKey, getUniqueCategories, normalizeCategoryName } from '../../utils/categories';
import './CategoryCombobox.css';

const MENU_GAP = 6;
const VIEWPORT_GAP = 8;
const MAX_MENU_HEIGHT = 280;

function CategoryCombobox({
  id,
  value = '',
  options = [],
  selectedOption,
  isLoading = false,
  error = '',
  disabled = false,
  placeholder = 'Buscar categoría o crear nueva',
  onSearch,
  onInputChange,
  onSelect,
  onClear
}) {
  const rootRef = useRef(null);
  const controlRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);

  const normalizedValue = normalizeCategoryName(value);
  const uniqueOptions = useMemo(() => getUniqueCategories(options), [options]);
  const hasExactMatch = useMemo(
    () => uniqueOptions.some((category) => getCategoryKey(category.name) === getCategoryKey(normalizedValue)),
    [normalizedValue, uniqueOptions]
  );
  const menuItems = useMemo(() => {
    const items = uniqueOptions.map((category) => ({ type: 'category', category }));

    if (normalizedValue && !hasExactMatch) {
      items.unshift({
        type: 'create',
        category: { id: '', name: normalizedValue, customOption: true }
      });
    }

    return items;
  }, [hasExactMatch, normalizedValue, uniqueOptions]);

  const updateMenuPosition = () => {
    const control = controlRef.current;
    if (!control) return;

    const rect = control.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_GAP;
    const spaceAbove = rect.top - MENU_GAP - VIEWPORT_GAP;
    const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const availableSpace = placeAbove ? spaceAbove : spaceBelow;

    setMenuPosition({
      bottom: placeAbove ? window.innerHeight - rect.top + MENU_GAP : undefined,
      left: Math.max(VIEWPORT_GAP, Math.min(rect.left, window.innerWidth - rect.width - VIEWPORT_GAP)),
      maxHeight: Math.max(80, Math.min(MAX_MENU_HEIGHT, availableSpace)),
      top: placeAbove ? undefined : rect.bottom + MENU_GAP,
      width: Math.min(rect.width, window.innerWidth - VIEWPORT_GAP * 2)
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    updateMenuPosition();
    const settleTimeout = window.setTimeout(updateMenuPosition, 220);
    const resizeObserver = new ResizeObserver(updateMenuPosition);
    resizeObserver.observe(controlRef.current);
    window.addEventListener('resize', updateMenuPosition);
    window.visualViewport?.addEventListener('resize', updateMenuPosition);
    window.visualViewport?.addEventListener('scroll', updateMenuPosition);
    document.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.clearTimeout(settleTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateMenuPosition);
      window.visualViewport?.removeEventListener('resize', updateMenuPosition);
      window.visualViewport?.removeEventListener('scroll', updateMenuPosition);
      document.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const timeoutId = window.setTimeout(() => onSearch(normalizedValue), normalizedValue ? 220 : 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, normalizedValue, onSearch]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex >= menuItems.length) setActiveIndex(menuItems.length ? 0 : -1);
  }, [activeIndex, menuItems.length]);

  const openMenu = () => {
    if (disabled) return;
    setIsOpen(true);
    setActiveIndex(menuItems.length ? 0 : -1);
  };

  const selectItem = (item) => {
    onSelect(item.category);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (event) => {
    onInputChange(event.target.value);
    setIsOpen(true);
    setActiveIndex(0);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (menuItems.length ? (current + 1 + menuItems.length) % menuItems.length : -1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => {
        if (!menuItems.length) return -1;
        return current < 0 ? menuItems.length - 1 : (current - 1 + menuItems.length) % menuItems.length;
      });
      return;
    }

    if (event.key === 'Enter' && isOpen && menuItems.length) {
      event.preventDefault();
      selectItem(menuItems[activeIndex >= 0 ? activeIndex : 0]);
    }
  };

  const handleBlur = (event) => {
    const nextTarget = event.relatedTarget;
    if (!rootRef.current?.contains(nextTarget) && !menuRef.current?.contains(nextTarget)) {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const selectedKey = getCategoryKey(selectedOption?.name);
  const feedbackId = error ? `${id}-error` : undefined;
  const activeDescendant = isOpen && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  const menu = isOpen && menuPosition
    ? createPortal(
        <div
          ref={menuRef}
          id={`${id}-menu`}
          className="category-combobox__menu"
          style={menuPosition}
          role="listbox"
          aria-label="Categorías"
          onMouseDown={(event) => event.preventDefault()}
        >
          {isLoading ? (
            <div className="category-combobox__status">
              <LoaderCircle size={16} className="category-combobox__spinner" aria-hidden="true" />
              Buscando categorías...
            </div>
          ) : null}

          {error ? (
            <div className="category-combobox__status category-combobox__status--error">
              No se pudieron cargar las categorías
            </div>
          ) : null}

          {!isLoading && !error && !menuItems.length ? (
            <div className="category-combobox__status">No hay categorías disponibles</div>
          ) : null}

          {menuItems.map((item, index) => {
            const category = item.category;
            const isSelected =
              item.type === 'category'
                ? Boolean(
                    (selectedOption?.id && selectedOption.id === category.id) ||
                      (!selectedOption?.id && selectedKey === getCategoryKey(category.name))
                  )
                : Boolean(selectedOption?.customOption && selectedKey === getCategoryKey(category.name));

            return (
              <button
                key={item.type === 'create' ? `create-${getCategoryKey(category.name)}` : category.id || getCategoryKey(category.name)}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                className={`category-combobox__option${activeIndex === index ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectItem(item)}
              >
                <span className={`category-combobox__option-icon${item.type === 'create' ? ' is-create' : ''}`}>
                  {item.type === 'create' ? <Plus size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                </span>
                <span className="category-combobox__option-copy">
                  <strong>{item.type === 'create' ? `Crear categoría “${category.name}”` : category.name}</strong>
                  <small>{item.type === 'create' ? 'Se creará al guardar el producto' : 'Categoría existente'}</small>
                </span>
                {isSelected ? <Check size={17} className="category-combobox__selected-check" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={rootRef}
      className={`category-combobox${isOpen ? ' is-open' : ''}${error ? ' has-error' : ''}`}
      onBlur={handleBlur}
    >
      <div ref={controlRef} className="category-combobox__control">
        <Search size={17} className="category-combobox__search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={`${id}-menu`}
          aria-expanded={isOpen}
          aria-activedescendant={activeDescendant}
          aria-describedby={feedbackId}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={openMenu}
          onKeyDown={handleKeyDown}
        />
        <div className="category-combobox__actions">
          {isLoading ? <LoaderCircle size={16} className="category-combobox__spinner" aria-label="Cargando categorías" /> : null}
          {value && !disabled ? (
            <button
              type="button"
              className="category-combobox__icon-button"
              aria-label="Limpiar categoría"
              title="Limpiar categoría"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onClear();
                openMenu();
                inputRef.current?.focus();
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="category-combobox__icon-button"
            aria-label={isOpen ? 'Cerrar categorías' : 'Mostrar categorías'}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (isOpen) setIsOpen(false);
              else {
                openMenu();
                inputRef.current?.focus();
              }
            }}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {error ? (
        <small id={feedbackId} className="category-combobox__feedback" role="alert">
          {error}
        </small>
      ) : null}
      {menu}
    </div>
  );
}

export default CategoryCombobox;
