import pool, { withTransaction } from "../db.js";

const insertOrderLinks = async (connection, order_id, products, users) => {
  for (const product_id of products) {
    await connection.execute("INSERT INTO order_products (order_id, product_id) VALUES (?, ?)", [order_id, product_id]);
  }
  for (const user_id of users) {
    await connection.execute("INSERT INTO order_users (order_id, user_id) VALUES (?, ?)", [order_id, user_id]);
  }
};

export const findOrders = async ({ date, product_id }) => {
  const conditions = [];
  const params = [];

  if (date) {
    conditions.push("DATE(created_at) = ?");
    params.push(date);
  }
  if (product_id) {
    conditions.push("id IN (SELECT order_id FROM order_products WHERE product_id = ?)");
    params.push(Number(product_id));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const [orders] = await pool.execute(`SELECT id, created_at FROM orders ${where} ORDER BY created_at`, params);
  if (orders.length === 0) return [];

  const ids = orders.map((order) => order.id);
  const placeholders = ids.map(() => "?").join(", ");
  const [orderProducts] = await pool.execute(
    `SELECT order_id, product_id FROM order_products WHERE order_id IN (${placeholders})`,
    ids,
  );
  const [orderUsers] = await pool.execute(
    `SELECT order_id, user_id FROM order_users WHERE order_id IN (${placeholders})`,
    ids,
  );

  const byId = new Map(orders.map((order) => [order.id, { ...order, products: [], users: [] }]));
  for (const row of orderProducts) byId.get(row.order_id).products.push(row.product_id);
  for (const row of orderUsers) byId.get(row.order_id).users.push(row.user_id);
  return [...byId.values()];
};

export const createOrder = ({ products, users }) =>
  withTransaction(async (connection) => {
    const [result] = await connection.execute("INSERT INTO orders () VALUES ()");
    await insertOrderLinks(connection, result.insertId, products, users);
    return result.insertId;
  });

export const updateOrder = (id, { products, users }) =>
  withTransaction(async (connection) => {
    const [rows] = await connection.execute("SELECT id FROM orders WHERE id = ? FOR UPDATE", [id]);
    if (rows.length === 0) return false;
    await connection.execute("DELETE FROM order_products WHERE order_id = ?", [id]);
    await connection.execute("DELETE FROM order_users WHERE order_id = ?", [id]);
    await insertOrderLinks(connection, id, products, users);
    return true;
  });

export const deleteOrder = async (id) => {
  const [result] = await pool.execute("DELETE FROM orders WHERE id = ?", [id]);
  return result.affectedRows > 0;
};
