import { expect } from "chai";
import sinon from "sinon";
import request from "supertest";
import app from "../src/app.js";
import pool from "../src/db.js";

const user = { name: "Mario", surname: "Rossi", email: "mario@rossi.it" };

describe("Users API", () => {
  afterEach(() => sinon.restore());

  it("POST creates a user", async () => {
    const execute = sinon.stub(pool, "execute").resolves([{ insertId: 1 }]);

    const res = await request(app).post("/api/users").send(user);

    expect(res.status).to.equal(201);
    expect(res.body).to.deep.equal({ id: 1, ...user });
    expect(execute.firstCall.args[1]).to.deep.equal(["Mario", "Rossi", "mario@rossi.it"]);
  });

  it("POST returns 400 on invalid email", async () => {
    const execute = sinon.stub(pool, "execute");
    const res = await request(app).post("/api/users").send({ ...user, email: "mario" });
    expect(res.status).to.equal(400);
    expect(execute.called).to.equal(false);
  });

  it("PUT updates a user", async () => {
    const execute = sinon.stub(pool, "execute").resolves([{ affectedRows: 1 }]);
    const res = await request(app).put("/api/users/1").send(user);
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ id: 1, ...user });
    expect(execute.firstCall.args[1]).to.deep.equal(["Mario", "Rossi", "mario@rossi.it", 1]);
  });

  it("PUT returns 404 when missing", async () => {
    sinon.stub(pool, "execute").resolves([{ affectedRows: 0 }]);
    const res = await request(app).put("/api/users/1").send(user);
    expect(res.status).to.equal(404);
  });

  it("DELETE returns 204", async () => {
    sinon.stub(pool, "execute").resolves([{ affectedRows: 1 }]);
    const res = await request(app).delete("/api/users/1");
    expect(res.status).to.equal(204);
  });

  it("DELETE returns 404 when missing", async () => {
    sinon.stub(pool, "execute").resolves([{ affectedRows: 0 }]);
    const res = await request(app).delete("/api/users/1");
    expect(res.status).to.equal(404);
  });

  it("POST returns 409 when the email is already in use", async () => {
    sinon.stub(pool, "execute").rejects(
      Object.assign(new Error("Duplicate entry 'mario@rossi.it' for key 'users.uq_users_email'"), {
        code: "ER_DUP_ENTRY",
      }),
    );
    const res = await request(app).post("/api/users").send(user);
    expect(res.status).to.equal(409);
    expect(res.body).to.deep.equal({ message: "Email already in use" });
  });
});
