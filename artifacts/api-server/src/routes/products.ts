import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import { db, productsTable, productVariantsTable } from "@workspace/db";

const router = Router();

router.get("/products", async (req, res): Promise<void> => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const rows = category
    ? await db.select().from(productsTable).where(eq(productsTable.category, category)).orderBy(asc(productsTable.id))
    : await db.select().from(productsTable).orderBy(asc(productsTable.id));
  res.json(rows);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, id));
  res.json({ ...product, variants });
});

export default router;
