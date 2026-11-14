import { Router } from "express";
import { createProduct, deleteProduct, updateProduct } from "../repositories/products.js";
import { badRequest, notFound } from "../responses.js";
import { parseId, validateProduct } from "../validators.js";

const router = Router();

router.post("/", async (req, res) => {
  if (!validateProduct(req.body)) return badRequest(res);
  const { name, num_photos } = req.body;
  const id = await createProduct({ name, num_photos });
  res.status(201).json({ id, name, num_photos });
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !validateProduct(req.body)) return badRequest(res);
  const { name, num_photos } = req.body;
  if (!(await updateProduct(id, { name, num_photos }))) return notFound(res);
  res.json({ id, name, num_photos });
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res);
  if (!(await deleteProduct(id))) return notFound(res);
  res.status(204).end();
});

export default router;
