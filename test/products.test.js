import { expect } from "chai";
import sinon from "sinon";
import request from "supertest";
import app from "../src/app.js";
import pool from "../src/db.js";

const product = { name: "Giacca", num_photos: 3 };

describe("Products API", () => {
  afterEach(() => sinon.restore());

  it("POST creates a product", async () => {
    const execute = sinon.stub(pool, "execute").resolves([{ insertId: 1 }]);

    const res = await request(app).post("/api/products").send(product);

    expect(res.status).to.equal(201);
    expect(res.body).to.deep.equal({ id: 1, ...product });
    expect(execute.firstCall.args).to.deep.equal([
      "INSERT INTO products (name, num_photos) VALUES (?, ?)",
      ["Giacca", 3],
    ]);
  });

  it("POST returns 400 on invalid body", async () => {
    const execute = sinon.stub(pool, "execute");
    const res = await request(app).post("/api/products").send({ name: "", num_photos: -1 });
    expect(res.status).to.equal(400);
    expect(execute.called).to.equal(false);
  });

  it("PUT updates a product", async () => {
    const execute = sinon.stub(pool, "execute").resolves([{ affectedRows: 1 }]);
    const res = await request(app).put("/api/products/1").send(product);
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ id: 1, ...product });
    expect(execute.firstCall.args[1]).to.deep.equal(["Giacca", 3, 1]);
  });

  it("PUT returns 404 when missing", async () => {
    sinon.stub(pool, "execute").resolves([{ affectedRows: 0 }]);
    const res = await request(app).put("/api/products/1").send(product);
    expect(res.status).to.equal(404);
  });

  it("DELETE returns 204", async () => {
    sinon.stub(pool, "execute").resolves([{ affectedRows: 1 }]);
    const res = await request(app).delete("/api/products/1");
    expect(res.status).to.equal(204);
  });

  it("DELETE returns 404 when missing", async () => {
    sinon.stub(pool, "execute").resolves([{ affectedRows: 0 }]);
    const res = await request(app).delete("/api/products/1");
    expect(res.status).to.equal(404);
  });

  it("DELETE returns 409 when the product is in an order", async () => {
    sinon.stub(pool, "execute").rejects(Object.assign(new Error(), { code: "ER_ROW_IS_REFERENCED_2" }));
    const res = await request(app).delete("/api/products/1");
    expect(res.status).to.equal(409);
  });
});
