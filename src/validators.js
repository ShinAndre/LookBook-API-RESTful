export const parseId = (value) => (/^[1-9]\d*$/.test(value) ? Number(value) : null);
