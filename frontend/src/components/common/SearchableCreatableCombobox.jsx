import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, LoaderCircle, Plus, Search, X } from 'lucide-react';
import './SearchableCreatableCombobox.css';

const MENU_GAP = 6;
const VIEWPORT_GAP = 8;
const MAX_MENU_HEIGHT = 280;

const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const getKey = (value) => normalize(value).toLocaleLowerCase('es');
const defaultGetOptionLabel = (option) => option?.name || '';
const defaultGetOptionValue = (option) => option?.id || option?.code || '';
const defaultGetOptionDescription = () => '';

const setExternalRef = (ref, value) => {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
};

function SearchableCreatableCombobox({
  id,
  label,
  selectedOption = null,
  options = [],
  placeholder,
  loading = false,
  error = '',
  disabled = false,
  required = false,
  allowCreate = true,
  allowClear = true,
  clearSelectionOnInput = false,
  createDescription = 'Crear nueva opcion',
  createLabel,
  createOnNoResultsOnly = false,
  filterOptions = true,
  keepQueryOnBlur = false,
  loadingLabel,
  showSearchIcon = true,
  getOptionLabel = defaultGetOptionLabel,
  getOptionValue = defaultGetOptionValue,
  getOptionDescription = defaultGetOptionDescription,
  onSearch,
  onSelect,
  onCreate,
  onClear,
  onInputChange,
  onEnterNext,
  inputRef
}) {
  const rootRef = useRef(null);
  const controlRef = useRef(null);
  const internalInputRef = useRef(null);
  const menuRef = useRef(null);
  const [query, setQuery] = useState(getOptionLabel(selectedOption));
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState('');

  const selectedValue = getOptionValue(selectedOption);
  const normalizedQuery = normalize(query);
  const filteredOptions = useMemo(() => {
    if (!filterOptions) return options;
    const key = getKey(normalizedQuery);
    const seen = new Set();

    return options.filter((option) => {
      const value = getOptionValue(option);
      const labelValue = getOptionLabel(option);
      const optionKey = `${value}-${getKey(labelValue)}`;
      if (!labelValue || seen.has(optionKey)) return false;
      seen.add(optionKey);
      return !key || getKey(labelValue).includes(key);
    });
  }, [filterOptions, getOptionLabel, getOptionValue, normalizedQuery, options]);
  const hasExactMatch = filteredOptions.some((option) => getKey(getOptionLabel(option)) === getKey(normalizedQuery));
  const menuItems = useMemo(() => {
    const items = filteredOptions.map((option) => ({ type: 'option', option }));
    const canCreate = createOnNoResultsOnly ? !items.length : !hasExactMatch;
    if (allowCreate && normalizedQuery && canCreate) {
      items.unshift({ type: 'create', option: { name: normalizedQuery } });
    }
    return items;
  }, [allowCreate, createOnNoResultsOnly, filteredOptions, hasExactMatch, normalizedQuery]);

  useEffect(() => {
    setQuery(getOptionLabel(selectedOption));
  }, [getOptionLabel, selectedOption]);

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
    const resizeObserver = new ResizeObserver(updateMenuPosition);
    resizeObserver.observe(controlRef.current);
    window.addEventListener('resize', updateMenuPosition);
    window.visualViewport?.addEventListener('resize', updateMenuPosition);
    window.visualViewport?.addEventListener('scroll', updateMenuPosition);
    document.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateMenuPosition);
      window.visualViewport?.removeEventListener('resize', updateMenuPosition);
      window.visualViewport?.removeEventListener('scroll', updateMenuPosition);
      document.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !onSearch) return undefined;
    const timeoutId = window.setTimeout(() => onSearch(normalizedQuery), normalizedQuery ? 280 : 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, normalizedQuery, onSearch]);

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

  const closeMenu = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const selectOption = (option) => {
    const nextQuery = getOptionLabel(option);
    setQuery(nextQuery);
    onInputChange?.(nextQuery);
    setLocalError('');
    onSelect(option);
    closeMenu();
    internalInputRef.current?.focus();
  };

  const selectItem = async (item) => {
    if (item.type === 'option') {
      selectOption(item.option);
      return;
    }

    if (!onCreate || creating) return;
    setCreating(true);
    setLocalError('');
    try {
      const created = await onCreate(normalizedQuery);
      if (created) selectOption(created);
      else closeMenu();
    } catch (createError) {
      setLocalError(createError?.response?.data?.message || createError.message || 'No se pudo crear la opcion');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
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

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (isOpen && activeIndex >= 0 && menuItems[activeIndex]) {
        selectItem(menuItems[activeIndex]);
        return;
      }
      if (onEnterNext) onEnterNext();
    }
  };

  const feedback = localError || error;
  const feedbackId = feedback ? `${id}-error` : undefined;
  const activeDescendant = isOpen && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;
  const busy = loading || creating;

  const menu = isOpen && menuPosition
    ? createPortal(
        <div
          ref={menuRef}
          id={`${id}-menu`}
          className="entity-combobox__menu"
          style={menuPosition}
          role="listbox"
          aria-label={label}
          onMouseDown={(event) => event.preventDefault()}
        >
          {busy ? (
            <div className="entity-combobox__status">
              <LoaderCircle size={16} className="entity-combobox__spinner" aria-hidden="true" />
              {creating ? 'Creando opcion...' : loadingLabel || 'Cargando opciones...'}
            </div>
          ) : null}
          {feedback ? <div className="entity-combobox__status entity-combobox__status--error">{feedback}</div> : null}
          {!busy && !feedback && !menuItems.length ? <div className="entity-combobox__status">Sin resultados</div> : null}

          {!busy
            ? menuItems.map((item, index) => {
                const option = item.option;
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = item.type === 'option' && Boolean(selectedValue && selectedValue === optionValue);

                return (
                  <button
                    key={item.type === 'create' ? `create-${getKey(normalizedQuery)}` : optionValue || getKey(optionLabel)}
                    id={`${id}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    className={`entity-combobox__option${activeIndex === index ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectItem(item)}
                  >
                    <span className={`entity-combobox__option-icon${item.type === 'create' ? ' is-create' : ''}`}>
                      {item.type === 'create' ? <Plus size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                    </span>
                    <span className="entity-combobox__option-copy">
                      <strong>{item.type === 'create' ? (createLabel ? createLabel(normalizedQuery) : `Crear "${normalizedQuery}"`) : optionLabel}</strong>
                      <small>{item.type === 'create' ? createDescription : getOptionDescription(option)}</small>
                    </span>
                    {isSelected ? <Check size={17} className="entity-combobox__selected-check" aria-hidden="true" /> : null}
                  </button>
                );
              })
            : null}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={rootRef}
      className={`entity-combobox${isOpen ? ' is-open' : ''}${feedback ? ' has-error' : ''}${showSearchIcon ? '' : ' entity-combobox--no-search-icon'}`}
    >
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div ref={controlRef} className="entity-combobox__control">
        {showSearchIcon ? <Search size={17} className="entity-combobox__search-icon" aria-hidden="true" /> : null}
        <input
          ref={(node) => {
            internalInputRef.current = node;
            setExternalRef(inputRef, node);
          }}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={`${id}-menu`}
          aria-expanded={isOpen}
          aria-activedescendant={activeDescendant}
          aria-describedby={feedbackId}
          aria-invalid={Boolean(feedback)}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            onInputChange?.(nextQuery);
            if (clearSelectionOnInput && selectedOption) onClear?.();
            setLocalError('');
            setIsOpen(true);
            setActiveIndex(nextQuery.trim() ? 0 : -1);
          }}
          onFocus={(event) => {
            setIsOpen(true);
            setActiveIndex(-1);
            event.currentTarget.select();
          }}
          onBlur={(event) => {
            const nextTarget = event.relatedTarget;
            if (!rootRef.current?.contains(nextTarget) && !menuRef.current?.contains(nextTarget)) {
              if (!keepQueryOnBlur || selectedOption) {
                const nextQuery = getOptionLabel(selectedOption);
                setQuery(nextQuery);
                onInputChange?.(nextQuery);
              }
              closeMenu();
            }
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="entity-combobox__actions">
          {busy ? <LoaderCircle size={16} className="entity-combobox__spinner" aria-label="Cargando" /> : null}
          {allowClear && selectedOption && !disabled ? (
            <button
              type="button"
              tabIndex={-1}
              className="entity-combobox__icon-button"
              aria-label={`Limpiar ${label}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery('');
                onInputChange?.('');
                onClear?.();
                internalInputRef.current?.focus();
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            tabIndex={-1}
            className="entity-combobox__icon-button"
            aria-label={isOpen ? `Cerrar ${label}` : `Mostrar ${label}`}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setIsOpen((current) => !current);
              internalInputRef.current?.focus();
            }}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {feedback ? (
        <small id={feedbackId} className="entity-combobox__feedback" role="alert">
          {feedback}
        </small>
      ) : null}
      {menu}
    </div>
  );
}

export default SearchableCreatableCombobox;
