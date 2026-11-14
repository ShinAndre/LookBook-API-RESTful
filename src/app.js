import express from "express";
import { badRequest } from "./responses.js";
import ordersRouter from "./routes/orders.js";
import productsRouter from "./routes/products.js";
import usersRouter from "./routes/users.js";

const app = express();

app.use(express.json());

app.use("/api/products", productsRouter);
app.use("/api/users", usersRouter);
app.use("/api/orders", ordersRouter);

const duplicateMessage = (err) => {
  if (err.message?.includes("uq_users_email")) return "Email already in use";
  if (err.message?.includes("uq_order_products_product")) return "Product already in another order";
  return "Already exists";
};

app.use((err, req, res, _next) => {
  if (err.type === "entity.parse.failed") return badRequest(res);
  if (err.code === "ER_NO_REFERENCED_ROW_2") return res.status(422).json({ message: "Product or user not found" });
  if (err.code === "ER_ROW_IS_REFERENCED_2") return res.status(409).json({ message: "Used in an order" });
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: duplicateMessage(err) });
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
