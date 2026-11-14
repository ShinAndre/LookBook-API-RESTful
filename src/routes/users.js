import { Router } from "express";
import { createUser, deleteUser, updateUser } from "../repositories/users.js";
import { badRequest, notFound } from "../responses.js";
import { parseId, validateUser } from "../validators.js";

const router = Router();

router.post("/", async (req, res) => {
  if (!validateUser(req.body)) return badRequest(res);
  const { name, surname, email } = req.body;
  const id = await createUser({ name, surname, email });
  res.status(201).json({ id, name, surname, email });
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !validateUser(req.body)) return badRequest(res);
  const { name, surname, email } = req.body;
  if (!(await updateUser(id, { name, surname, email }))) return notFound(res);
  res.json({ id, name, surname, email });
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return badRequest(res);
  if (!(await deleteUser(id))) return notFound(res);
  res.status(204).end();
});

export default router;
