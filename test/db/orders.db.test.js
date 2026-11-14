import { expect } from "chai";
import request from "supertest";
import app from "../../src/app.js";
import pool from "../../src/db.js";

const missingProductId = 999999999;

const countOrders = async () => {
  const [[{ total }]] = await pool.execute("SELECT COUNT(*) AS total FROM orders");
  return total;
};

describe("Orders API on a real database", () => {
  let productId;
  let userId;

  before(async () => {
    const [product] = await pool.execute("INSERT INTO products (name, num_photos) VALUES ('Test product', 1)");
    productId = product.insertId;
    const [user] = await pool.execute("INSERT INTO users (name, surname, email) VALUES ('Test', 'User', ?)", [
      `test-${Date.now()}@example.com`,
    ]);
    userId = user.insertId;
  });

  after(async () => {
    await pool.execute("DELETE FROM orders WHERE id IN (SELECT order_id FROM order_products WHERE product_id = ?)", [
      productId,
    ]);
    await pool.execute("DELETE FROM products WHERE id = ?", [productId]);
    await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
    await pool.end();
  });

  it("POST leaves no half-created order when a product does not exist", async () => {
    const ordersBefore = await countOrders();

    const res = await request(app)
      .post("/api/orders")
      .send({ products: [productId, missingProductId], users: [userId] });

    expect(res.status).to.equal(422);
    expect(await countOrders()).to.equal(ordersBefore);
  });

  it("PUT keeps the existing links when a product does not exist", async () => {
    const created = await request(app)
      .post("/api/orders")
      .send({ products: [productId], users: [userId] });
    expect(created.status).to.equal(201);

    const res = await request(app)
      .put(`/api/orders/${created.body.id}`)
      .send({ products: [missingProductId], users: [userId] });

    expect(res.status).to.equal(422);
    const [products] = await pool.execute("SELECT product_id FROM order_products WHERE order_id = ?", [created.body.id]);
    const [users] = await pool.execute("SELECT user_id FROM order_users WHERE order_id = ?", [created.body.id]);
    expect(products.map((row) => row.product_id)).to.deep.equal([productId]);
    expect(users.map((row) => row.user_id)).to.deep.equal([userId]);
  });
});
