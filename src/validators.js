const isText = (value) => typeof value === "string" && value.trim() !== "";

const isId = (value) => Number.isInteger(value) && value > 0;

const isIdList = (value) =>
  Array.isArray(value) && value.length > 0 && value.every(isId) && new Set(value).size === value.length;

const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

export const parseId = (value) => (/^[1-9]\d*$/.test(value) ? Number(value) : null);

export const validateProduct = ({ name, num_photos } = {}) =>
  isText(name) && Number.isInteger(num_photos) && num_photos >= 0;

export const validateUser = ({ name, surname, email } = {}) =>
  isText(name) && isText(surname) && typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validateOrder = ({ products, users } = {}) => isIdList(products) && isIdList(users);

export const validateOrderFilters = ({ date, product_id }) =>
  (date === undefined || isDate(date)) && (product_id === undefined || parseId(product_id) !== null);
