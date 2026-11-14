import express from "express";
import { badRequest } from "./responses.js";
import productsRouter from "./routes/products.js";

const app = express();

app.use(express.json());

app.use("/api/products", productsRouter);

app.use((err, req, res, _next) => {
  if (err.type === "entity.parse.failed") return badRequest(res);
  if (err.code === "ER_ROW_IS_REFERENCED_2") return res.status(409).json({ message: "Used in an order" });
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
