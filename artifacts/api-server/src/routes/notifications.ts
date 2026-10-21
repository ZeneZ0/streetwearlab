import { Router, type Request } from "express";
import { desc, eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth, type JwtPayload } from "../lib/auth";

const router = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const rows = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.id)).limit(20);
  res.json(rows);
});

router.post("/notifications/read", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, userId));
  res.json({ ok: true });
});

export default router;
