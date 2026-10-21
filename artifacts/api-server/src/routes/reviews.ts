import { Router, type Request } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db, orderItemsTable, ordersTable, productVariantsTable, reviewsTable, usersTable, productsTable,
} from "@workspace/db";
import { requireAuth, type JwtPayload } from "../lib/auth";

const router = Router();

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const { orderItemId, rating, comment } = req.body;

  if (!orderItemId || !rating) {
    res.status(400).json({ error: "orderItemId and rating are required" });
    return;
  }
  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be between 1 and 5" });
    return;
  }
  if (comment && String(comment).length > 1000) {
    res.status(400).json({ error: "comment must be at most 1000 characters" });
    return;
  }

  const [orderItem] = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.id, orderItemId))
    .limit(1);

  if (!orderItem) {
    res.status(400).json({ error: "Order item not found" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderItem.orderId), eq(ordersTable.userId, userId)))
    .limit(1);

  if (!order) {
    res.status(403).json({ error: "Not your order" });
    return;
  }
  if (order.status !== "delivered") {
    res.status(400).json({ error: "Can only review delivered orders" });
    return;
  }

  const existing = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.userId, userId), eq(reviewsTable.orderItemId, orderItemId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(400).json({ error: "Already reviewed this item" });
    return;
  }

  let productId: number | null = null;
  if (orderItem.productVariantId) {
    const [variant] = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, orderItem.productVariantId))
      .limit(1);
    if (variant) productId = variant.productId;
  }
  if (!productId) {
    res.status(400).json({ error: "Could not resolve product for this order item" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    userId,
    productId,
    orderItemId,
    rating,
    comment: comment ?? null,
    moderationStatus: "pending",
  }).returning();

  res.status(201).json(review);
});

router.get("/products/:id/reviews", async (req, res): Promise<void> => {
  const productId = Number(req.params.id);
  const rows = await db
    .select({ review: reviewsTable, authorName: usersTable.firstName })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .where(and(eq(reviewsTable.productId, productId), eq(reviewsTable.moderationStatus, "approved")))
    .orderBy(desc(reviewsTable.createdAt));
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  const distribution = [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: rows.filter((x) => x.review.rating === r).length }));
  res.json({
    rating: product ? parseFloat(product.rating) : 0,
    reviewCount: rows.length,
    distribution,
    reviews: rows.map(({ review, authorName }) => ({ ...review, authorName })),
  });
});

router.get("/orders/:id/reviews", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, Number(req.params.id)));
  if (items.length === 0) {
    res.json([]);
    return;
  }
  const rows = await db.select().from(reviewsTable).where(and(
    eq(reviewsTable.userId, userId), inArray(reviewsTable.orderItemId, items.map((i) => i.id))));
  res.json(rows);
});

export default router;
