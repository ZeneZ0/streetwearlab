import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, reviewsTable, productsTable, usersTable, MODERATION_STATUSES, type ModerationStatus } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { notify } from "../lib/notify";

const router = Router();
router.use("/admin/reviews", requireAuth, requireRole("admin"));

// Средний рейтинг товара по одобренным отзывам
async function recalculateRating(productId: number): Promise<void> {
  const [stats] = await db
    .select({ avg: sql<number>`COALESCE(ROUND(AVG(${reviewsTable.rating}), 1), 0)`, count: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.productId, productId), eq(reviewsTable.moderationStatus, "approved")));
  await db.update(productsTable)
    .set({ rating: String(stats.avg), reviewCount: Number(stats.count) })
    .where(eq(productsTable.id, productId));
}

router.get("/admin/reviews", async (req, res): Promise<void> => {
  const status = (req.query.status as ModerationStatus) ?? "pending";
  if (!MODERATION_STATUSES.includes(status)) {
    res.status(400).json({ error: "Unknown status" });
    return;
  }
  const rows = await db
    .select({ review: reviewsTable, productName: productsTable.name, authorName: usersTable.firstName })
    .from(reviewsTable)
    .innerJoin(productsTable, eq(productsTable.id, reviewsTable.productId))
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .where(eq(reviewsTable.moderationStatus, status))
    .orderBy(desc(reviewsTable.createdAt));
  const counts = await db
    .select({ status: reviewsTable.moderationStatus, count: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .groupBy(reviewsTable.moderationStatus);
  res.json({
    reviews: rows.map(({ review, productName, authorName }) => ({ ...review, productName, authorName })),
    counts: Object.fromEntries(MODERATION_STATUSES.map((s) => [s, Number(counts.find((c) => c.status === s)?.count ?? 0)])),
  });
});

async function setStatus(id: number, status: ModerationStatus) {
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
  if (!review) return null;
  const [updated] = await db.update(reviewsTable).set({ moderationStatus: status })
    .where(eq(reviewsTable.id, id)).returning();
  if (status === "approved" || review.moderationStatus === "approved") {
    await recalculateRating(review.productId);
  }
  await notify(review.userId, status === "approved"
    ? "Ваш отзыв опубликован" : "Ваш отзыв отклонён модератором");
  return updated;
}

router.patch("/admin/reviews/:id/approve", async (req, res): Promise<void> => {
  const updated = await setStatus(Number(req.params.id), "approved");
  if (!updated) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(updated);
});

router.patch("/admin/reviews/:id/reject", async (req, res): Promise<void> => {
  const updated = await setStatus(Number(req.params.id), "rejected");
  if (!updated) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(updated);
});

export default router;
