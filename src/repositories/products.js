import pool from "../db.js";

export const createProduct = async ({ name, num_photos }) => {
  const [result] = await pool.execute("INSERT INTO products (name, num_photos) VALUES (?, ?)", [name, num_photos]);
  return result.insertId;
};

export const updateProduct = async (id, { name, num_photos }) => {
  const [result] = await pool.execute("UPDATE products SET name = ?, num_photos = ? WHERE id = ?", [
    name,
    num_photos,
    id,
  ]);
  return result.affectedRows > 0;
};

export const deleteProduct = async (id) => {
  const [result] = await pool.execute("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows > 0;
};
