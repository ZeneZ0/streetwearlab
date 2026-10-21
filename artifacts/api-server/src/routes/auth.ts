import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, signToken, type JwtPayload } from "../lib/auth";

const router = Router();

const publicUser = (u: typeof usersTable.$inferSelect) => ({
  id: u.id, email: u.email, firstName: u.firstName, phone: u.phone, role: u.role,
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, firstName, phone } = req.body ?? {};
  if (!email || !password || !firstName) {
    res.status(400).json({ error: "Заполните имя, email и пароль" });
    return;
  }
  const [exists] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (exists) {
    res.status(400).json({ error: "Пользователь с таким email уже зарегистрирован" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    email, firstName, phone: phone ?? null, passwordHash: bcrypt.hashSync(password, 10), role: "client",
  }).returning();
  res.status(201).json({ token: signToken({ userId: user.id, role: user.role }), user: publicUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email ?? "")).limit(1);
  if (!user || !bcrypt.compareSync(password ?? "", user.passwordHash)) {
    res.status(401).json({ error: "Неверный email или пароль" });
    return;
  }
  res.json({ token: signToken({ userId: user.id, role: user.role }), user: publicUser(user) });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(publicUser(user));
});

export default router;
