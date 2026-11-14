import { Router } from "express";
import { createOrder, deleteOrder, findOrders, updateOrder } from "../repositories/orders.js";
import { badRequest, notFound } from "../responses.js";
import { parseId, validateOrder, validateOrderFilters } from "../validators.js";

const router = Router();

router.get("/", async (req, res) => {
  if (!validateOrderFilters(req.query)) return badRequest(res);
  const { date, product_id } = req.query;
  res.json(await findOrders({ date, product_id }));
});

router.post("/", async (req, res) => {
  if (!validateOrder(req.body)) return badRequest(res);
  const { products, users } = req.body;
  const id = await createOrder({ products, users });
  res.status(201).json({ id, products, users });
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !validateOrder(req.body)) return badRequest(res);
  const { products, users } = req.body;
  if (!(await updateOrder(id, { products, users }))) return notFound(res);
  res.json({ id, products, users });
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res);
  if (!(await deleteOrder(id))) return notFound(res);
  res.status(204).end();
});

export default router;
