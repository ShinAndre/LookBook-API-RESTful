const isText = (value) => typeof value === "string" && value.trim() !== "";

export const parseId = (value) => (/^[1-9]\d*$/.test(value) ? Number(value) : null);

export const validateProduct = ({ name, num_photos } = {}) =>
  isText(name) && Number.isInteger(num_photos) && num_photos >= 0;

export const validateUser = ({ name, surname, email } = {}) =>
  isText(name) && isText(surname) && typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
