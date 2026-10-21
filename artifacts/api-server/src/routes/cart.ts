import { Router, type Request } from "express";
import { and, eq } from "drizzle-orm";
import { db, cartItemsTable, productVariantsTable, productsTable } from "@workspace/db";
import { requireAuth, type JwtPayload } from "../lib/auth";

const router = Router();
export const CUSTOMIZATION_PRICE = 500;

router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const rows = await db
    .select({ item: cartItemsTable, variant: productVariantsTable, product: productsTable })
    .from(cartItemsTable)
    .innerJoin(productVariantsTable, eq(productVariantsTable.id, cartItemsTable.productVariantId))
    .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
    .where(eq(cartItemsTable.userId, userId));
  const items = rows.map(({ item, variant, product }) => {
    const price = parseFloat(product.basePrice) + parseFloat(variant.additionalPrice) +
      (item.customization ? CUSTOMIZATION_PRICE : 0);
    return {
      id: item.id, quantity: item.quantity, customization: item.customization,
      customizationDetails: item.customizationDetails, productId: product.id, productName: product.name,
      imageColor: product.imageColor, size: variant.size, color: variant.color, stock: variant.stock,
      price, total: price * item.quantity,
    };
  });
  res.json({ items, subtotal: items.reduce((s, i) => s + i.total, 0) });
});

router.post("/cart", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const { productVariantId, quantity = 1, customization = false, customizationDetails } = req.body ?? {};
  const [variant] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, productVariantId)).limit(1);
  if (!variant || variant.stock < 1) {
    res.status(400).json({ error: "Выбранный вариант отсутствует на складе" });
    return;
  }
  const [existing] = await db.select().from(cartItemsTable).where(and(
    eq(cartItemsTable.userId, userId), eq(cartItemsTable.productVariantId, productVariantId),
    eq(cartItemsTable.customization, !!customization))).limit(1);
  if (existing) {
    await db.update(cartItemsTable).set({ quantity: Math.min(existing.quantity + quantity, variant.stock) })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({
      userId, productVariantId, quantity: Math.min(quantity, variant.stock), customization: !!customization,
      customizationDetails: customization ? customizationDetails ?? null : null,
    });
  }
  res.status(201).json({ ok: true });
});

router.patch("/cart/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const quantity = Math.max(1, Number(req.body?.quantity ?? 1));
  await db.update(cartItemsTable).set({ quantity })
    .where(and(eq(cartItemsTable.id, Number(req.params.id)), eq(cartItemsTable.userId, userId)));
  res.json({ ok: true });
});

router.delete("/cart/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  await db.delete(cartItemsTable)
    .where(and(eq(cartItemsTable.id, Number(req.params.id)), eq(cartItemsTable.userId, userId)));
  res.json({ ok: true });
});

export default router;
