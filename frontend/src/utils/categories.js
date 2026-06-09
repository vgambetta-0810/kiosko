export const normalizeCategoryName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

export const getCategoryKey = (value) => normalizeCategoryName(value).toLocaleLowerCase('es');

export const getUniqueCategories = (categories = []) => {
  const seen = new Set();

  return categories.filter((category) => {
    const key = getCategoryKey(category?.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
