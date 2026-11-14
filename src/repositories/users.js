import pool from "../db.js";

export const createUser = async ({ name, surname, email }) => {
  const [result] = await pool.execute("INSERT INTO users (name, surname, email) VALUES (?, ?, ?)", [
    name,
    surname,
    email,
  ]);
  return result.insertId;
};

export const updateUser = async (id, { name, surname, email }) => {
  const [result] = await pool.execute("UPDATE users SET name = ?, surname = ?, email = ? WHERE id = ?", [
    name,
    surname,
    email,
    id,
  ]);
  return result.affectedRows > 0;
};

export const deleteUser = async (id) => {
  const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [id]);
  return result.affectedRows > 0;
};
