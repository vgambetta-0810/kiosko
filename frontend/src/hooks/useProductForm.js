import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

const EMPTY_PRODUCT = {
  name: '',
  sku: '',
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
    sku: mode === 'duplicate' ? '' : product.sku || '',
    codigoBarras: mode === 'duplicate' ? '' : product.codigoBarras || '',
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const nextForm = toFormProduct(product, mode);
    setForm(nextForm);
    setCategoryInput(nextForm.category);
    setSelectedCategory(nextForm.category ? [{ id: nextForm.categoryId, name: nextForm.category }] : []);
    setError('');
  }, [isOpen, mode, product]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const searchCategories = useCallback(async (query = '') => {
    setCategoryLoading(true);
    try {
      const res = await api.get('/categories', { params: { q: query } });
      setCategories(res.data || []);
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  const resolveCategory = useCallback(async () => {
    const currentSelection = selectedCategory[0];
    const selectedName = currentSelection?.customOption
      ? String(currentSelection.label || '').trim()
      : String(currentSelection?.name || '').trim();
    const finalCategoryName = selectedName || String(categoryInput || form.category || '').trim();

    if (!finalCategoryName) throw new Error('La categoria es obligatoria');

    let categoryId = currentSelection?.id || form.categoryId;
    if (!UUID_REGEX.test(String(categoryId || ''))) categoryId = '';

    if (!categoryId) {
      const existing = categories.find((category) => String(category.name || '').toLowerCase() === finalCategoryName.toLowerCase());
      if (existing?.id) {
        categoryId = existing.id;
      } else {
        const createdCategoryRes = await api.post('/categories', { name: finalCategoryName });
        categoryId = createdCategoryRes.data.id;
      }
    }

    return { categoryId, category: finalCategoryName };
  }, [categories, categoryInput, form.category, form.categoryId, selectedCategory]);

  const submit = useCallback(
    async (event) => {
      event.preventDefault();
      setSaving(true);
      setError('');

      try {
        const categoryPayload = await resolveCategory();
        const payload = {
          name: form.name.trim(),
          sku: form.sku.trim() || null,
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
        setError(err?.response?.data?.message || err.message || 'No se pudo guardar el producto');
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
    saving,
    error,
    handleChange,
    searchCategories,
    setSelectedCategory,
    setCategoryInput,
    submit
  };
}
