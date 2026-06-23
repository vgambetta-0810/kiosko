import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { getCategoryKey, normalizeCategoryName } from '../utils/categories';
import { isNonNegativeInteger } from '../utils/quantity';

const EMPTY_PRODUCT = {
  name: '',
  codigoBarras: '',
  category: '',
  categoryId: '',
  price: '',
  cost: '',
  stock: ''
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toFormProduct = (product, mode) => {
  if (!product) return EMPTY_PRODUCT;

  return {
    name: mode === 'duplicate' ? `${product.name || ''} copia` : product.name || '',
    codigoBarras: mode === 'duplicate' ? '' : product.codigoBarras || product.sku || '',
    category: product.category || product.categoryEntity?.name || '',
    categoryId: product.categoryId || product.categoryEntity?.id || '',
    price: product.price ?? '',
    cost: product.cost ?? '',
    stock: product.stock ?? ''
  };
};

export default function useProductForm({ mode, product, isOpen, onSaved }) {
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const categorySearchId = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    const nextForm = toFormProduct(product, mode);
    setForm(nextForm);
    setCategoryInput(nextForm.category);
    setSelectedCategory(nextForm.category ? [{ id: nextForm.categoryId, name: nextForm.category }] : []);
    setCategoryError('');
    setError('');
  }, [isOpen, mode, product]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const searchCategories = useCallback(async (query = '') => {
    const searchId = ++categorySearchId.current;
    setCategoryLoading(true);
    setCategoryError('');

    try {
      const res = await api.get('/categories', { params: { q: query } });
      if (searchId === categorySearchId.current) setCategories(res.data || []);
    } catch (err) {
      if (searchId === categorySearchId.current) {
        setCategoryError(err?.response?.data?.message || 'No se pudieron cargar las categorias');
      }
    } finally {
      if (searchId === categorySearchId.current) setCategoryLoading(false);
    }
  }, []);

  const changeCategoryInput = useCallback((value) => {
    setCategoryInput(value);
    setSelectedCategory([]);
    setCategoryError('');
    setForm((prev) => ({ ...prev, category: value, categoryId: '' }));
  }, []);

  const selectCategory = useCallback((category) => {
    const name = normalizeCategoryName(category?.name);
    if (!name) return;

    const selection = { ...category, name };
    setSelectedCategory([selection]);
    setCategoryInput(name);
    setCategoryError('');
    setForm((prev) => ({ ...prev, category: name, categoryId: category?.id || '' }));
  }, []);

  const clearCategory = useCallback(() => {
    setSelectedCategory([]);
    setCategoryInput('');
    setCategoryError('');
    setForm((prev) => ({ ...prev, category: '', categoryId: '' }));
  }, []);

  const resolveCategory = useCallback(async () => {
    const currentSelection = selectedCategory[0];
    const finalCategoryName = normalizeCategoryName(currentSelection?.name || categoryInput || form.category);

    if (!finalCategoryName) {
      const categoryRequiredError = new Error('La categoria es obligatoria');
      categoryRequiredError.isCategoryError = true;
      throw categoryRequiredError;
    }

    let categoryId = currentSelection?.id || form.categoryId;
    if (!UUID_REGEX.test(String(categoryId || ''))) categoryId = '';

    if (!categoryId) {
      const existing = categories.find((category) => getCategoryKey(category.name) === getCategoryKey(finalCategoryName));
      if (existing?.id) {
        categoryId = existing.id;
        return { categoryId, category: existing.name };
      } else {
        try {
          const createdCategoryRes = await api.post('/categories', { name: finalCategoryName });
          return { categoryId: createdCategoryRes.data.id, category: createdCategoryRes.data.name };
        } catch (err) {
          const categoryCreationError = new Error(err?.response?.data?.message || 'No se pudo crear la categoria');
          categoryCreationError.isCategoryError = true;
          throw categoryCreationError;
        }
      }
    }

    return { categoryId, category: currentSelection?.name || finalCategoryName };
  }, [categories, categoryInput, form.category, form.categoryId, selectedCategory]);

  const submit = useCallback(
    async (event) => {
      event.preventDefault();
      setSaving(true);
      setError('');
      setCategoryError('');

      try {
        if (!isNonNegativeInteger(form.stock === '' ? 0 : form.stock)) {
          setError('El stock debe ser un número entero mayor o igual a cero');
          return;
        }
        const categoryPayload = await resolveCategory();
        const payload = {
          name: form.name.trim(),
          codigoBarras: form.codigoBarras.trim() || null,
          category: categoryPayload.category,
          categoryId: categoryPayload.categoryId,
          price: Number(form.price),
          cost: Number(form.cost),
          stock: form.stock === '' ? 0 : Number(form.stock)
        };

        if (mode === 'edit') {
          await api.patch(`/products/${product.id || product._id}`, payload);
        } else {
          await api.post('/products', payload);
        }

        await onSaved();
      } catch (err) {
        const message = err?.response?.data?.message || err.message || 'No se pudo guardar el producto';
        if (err.isCategoryError) setCategoryError(message);
        else setError(message);
      } finally {
        setSaving(false);
      }
    },
    [form, mode, onSaved, product, resolveCategory]
  );

  return {
    form,
    categories,
    selectedCategory,
    categoryInput,
    categoryLoading,
    categoryError,
    saving,
    error,
    handleChange,
    searchCategories,
    selectCategory,
    changeCategoryInput,
    clearCategory,
    submit
  };
}
