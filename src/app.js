import express from "express";
import { badRequest } from "./responses.js";

const app = express();

app.use(express.json());

app.use((err, req, res, _next) => {
  if (err.type === "entity.parse.failed") return badRequest(res);
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
