export const badRequest = (res) => res.status(400).json({ message: "Invalid request" });

export const notFound = (res) => res.status(404).json({ message: "Not found" });
