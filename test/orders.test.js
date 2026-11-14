import { expect } from "chai";
import sinon from "sinon";
import request from "supertest";
import app from "../src/app.js";
import pool from "../src/db.js";

const created_at = "2026-11-09T10:00:00.000Z";
const order = { products: [1, 2], users: [3, 4] };
const foreignKeyError = () => Object.assign(new Error(), { code: "ER_NO_REFERENCED_ROW_2" });

const stubOrders = () => {
  const execute = sinon.stub(pool, "execute");
  execute.onCall(0).resolves([[{ id: 1, created_at }, { id: 2, created_at }]]);
  execute.onCall(1).resolves([[{ order_id: 1, product_id: 1 }, { order_id: 1, product_id: 2 }]]);
  execute.onCall(2).resolves([[{ order_id: 1, user_id: 3 }]]);
  return execute;
};

const stubConnection = () => {
  const connection = {
    beginTransaction: sinon.stub().resolves(),
    commit: sinon.stub().resolves(),
    rollback: sinon.stub().resolves(),
    release: sinon.stub(),
    execute: sinon.stub(),
  };
  sinon.stub(pool, "getConnection").resolves(connection);
  return connection;
};

describe("Orders API", () => {
  afterEach(() => sinon.restore());

  it("GET returns all orders with their products and users", async () => {
    const execute = stubOrders();

    const res = await request(app).get("/api/orders");

    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([
      { id: 1, created_at, products: [1, 2], users: [3] },
      { id: 2, created_at, products: [], users: [] },
    ]);
    expect(execute.firstCall.args[0]).to.not.include("WHERE");
  });

  it("GET reads only the links of the orders found", async () => {
    const execute = stubOrders();
    await request(app).get("/api/orders");
    expect(execute.secondCall.args[0]).to.include("FROM order_products WHERE order_id IN (?, ?)");
    expect(execute.secondCall.args[1]).to.deep.equal([1, 2]);
    expect(execute.thirdCall.args[0]).to.include("FROM order_users WHERE order_id IN (?, ?)");
    expect(execute.thirdCall.args[1]).to.deep.equal([1, 2]);
  });

  it("GET skips the link queries when no order matches", async () => {
    const execute = sinon.stub(pool, "execute").resolves([[]]);
    const res = await request(app).get("/api/orders?date=2026-11-09");
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
    expect(execute.callCount).to.equal(1);
  });

  it("GET filters by insertion date", async () => {
    const execute = stubOrders();
    await request(app).get("/api/orders?date=2026-11-09");
    expect(execute.firstCall.args[0]).to.include("WHERE DATE(created_at) = ?");
    expect(execute.firstCall.args[1]).to.deep.equal(["2026-11-09"]);
  });

  it("GET filters by product", async () => {
    const execute = stubOrders();
    await request(app).get("/api/orders?product_id=2");
    expect(execute.firstCall.args[0]).to.include("WHERE product_id = ?");
    expect(execute.firstCall.args[1]).to.deep.equal([2]);
  });

  it("GET returns 400 on invalid filters", async () => {
    const execute = sinon.stub(pool, "execute");
    const res = await request(app).get("/api/orders?date=2026-13-01");
    expect(res.status).to.equal(400);
    expect(execute.called).to.equal(false);
  });

  it("POST creates an order with its products and users in one transaction", async () => {
    const execute = sinon.stub(pool, "execute");
    const connection = stubConnection();
    connection.execute.resolves([{ insertId: 1 }]);

    const res = await request(app).post("/api/orders").send(order);

    expect(res.status).to.equal(201);
    expect(res.body).to.deep.equal({ id: 1, ...order });
    expect(connection.execute.callCount).to.equal(5);
    expect(connection.execute.secondCall.args[1]).to.deep.equal([1, 1]);
    expect(connection.execute.lastCall.args[1]).to.deep.equal([1, 4]);
    expect(connection.commit.calledOnce).to.equal(true);
    expect(connection.release.calledOnce).to.equal(true);
    expect(execute.called).to.equal(false);
  });

  it("POST returns 400 on invalid body", async () => {
    const res = await request(app).post("/api/orders").send({ products: [], users: [] });
    expect(res.status).to.equal(400);
  });

  it("POST returns 400 on duplicated ids", async () => {
    const getConnection = sinon.stub(pool, "getConnection");
    const res = await request(app).post("/api/orders").send({ products: [1, 1], users: [3] });
    expect(res.status).to.equal(400);
    expect(getConnection.called).to.equal(false);
  });

  it("POST rolls back and returns 422 when a product does not exist", async () => {
    const connection = stubConnection();
    connection.execute.onFirstCall().resolves([{ insertId: 1 }]);
    connection.execute.onSecondCall().resolves([{}]);
    connection.execute.onThirdCall().rejects(foreignKeyError());

    const res = await request(app).post("/api/orders").send(order);

    expect(res.status).to.equal(422);
    expect(connection.rollback.calledOnce).to.equal(true);
    expect(connection.commit.called).to.equal(false);
    expect(connection.release.calledOnce).to.equal(true);
  });

  it("PUT replaces products and users in one transaction", async () => {
    const connection = stubConnection();
    connection.execute.resolves([[{ id: 1 }]]);

    const res = await request(app).put("/api/orders/1").send(order);

    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ id: 1, ...order });
    expect(connection.execute.getCall(1).args[0]).to.include("DELETE FROM order_products");
    expect(connection.execute.getCall(2).args[0]).to.include("DELETE FROM order_users");
    expect(connection.commit.calledOnce).to.equal(true);
    expect(connection.release.calledOnce).to.equal(true);
  });

  it("PUT rolls back and returns 422 when a product does not exist", async () => {
    const connection = stubConnection();
    connection.execute.resolves([[{ id: 1 }]]);
    connection.execute.onCall(3).rejects(foreignKeyError());

    const res = await request(app).put("/api/orders/1").send(order);

    expect(res.status).to.equal(422);
    expect(connection.rollback.calledOnce).to.equal(true);
    expect(connection.commit.called).to.equal(false);
    expect(connection.release.calledOnce).to.equal(true);
  });

  it("PUT returns 404 when missing", async () => {
    const connection = stubConnection();
    connection.execute.resolves([[]]);
    const res = await request(app).put("/api/orders/1").send(order);
    expect(res.status).to.equal(404);
    expect(connection.execute.callCount).to.equal(1);
    expect(connection.release.calledOnce).to.equal(true);
  });

  it("DELETE returns 204", async () => {
    sinon.stub(pool, "execute").resolves([{ affectedRows: 1 }]);
    const res = await request(app).delete("/api/orders/1");
    expect(res.status).to.equal(204);
  });

  it("DELETE returns 404 when missing", async () => {
    sinon.stub(pool, "execute").resolves([{ affectedRows: 0 }]);
    const res = await request(app).delete("/api/orders/1");
    expect(res.status).to.equal(404);
  });
});
