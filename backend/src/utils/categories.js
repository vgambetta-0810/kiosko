const Category = require('../models/Category');

let categoryCreationQueue = Promise.resolve();

const normalizeCategoryName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const getCategoryKey = (value) => normalizeCategoryName(value).toLowerCase();

const findCategoryByName = async (name) => {
  const key = getCategoryKey(name);
  if (!key) return null;

  const categories = await Category.findAll();
  return categories.find((category) => getCategoryKey(category.name) === key) || null;
};

const findOrCreateCategory = async (name) => {
  const normalizedName = normalizeCategoryName(name);
  if (!normalizedName) return null;

  const operation = categoryCreationQueue.then(async () => {
    const existing = await findCategoryByName(normalizedName);
    if (existing) return existing;

    try {
      return await Category.create({ name: normalizedName });
    } catch (err) {
      if (err.name !== 'SequelizeUniqueConstraintError') throw err;
      return findCategoryByName(normalizedName);
    }
  });

  categoryCreationQueue = operation.catch(() => undefined);
  return operation;
};

module.exports = {
  normalizeCategoryName,
  getCategoryKey,
  findCategoryByName,
  findOrCreateCategory
};
