// Административные маршруты для демонстрации: смена статуса заказа и просмотр товаров
import { Router } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { db, ordersTable, usersTable, productsTable, productVariantsTable, ORDER_STATUSES, type OrderStatus } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { notify } from "../lib/notify";

const router = Router();
router.use(["/admin/orders", "/admin/products"], requireAuth, requireRole("admin", "manager"));

const STATUS_RU: Record<OrderStatus, string> = {
  awaiting_payment: "ожидает оплаты", confirmed: "подтверждён", shipped: "отправлен",
  delivered: "доставлен", cancelled: "отменён",
};

router.get("/admin/orders", async (_req, res): Promise<void> => {
  const rows = await db.select({ order: ordersTable, customer: usersTable.firstName })
    .from(ordersTable).innerJoin(usersTable, eq(usersTable.id, ordersTable.userId))
    .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id));
  res.json(rows.map(({ order, customer }) => ({ ...order, customer, totalAmount: parseFloat(order.totalAmount) })));
});

router.patch("/admin/orders/:id/status", async (req, res): Promise<void> => {
  const status = req.body?.status as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) {
    res.status(400).json({ error: "Unknown status" });
    return;
  }
  const [order] = await db.update(ordersTable).set({ status })
    .where(eq(ordersTable.id, Number(req.params.id))).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  await notify(order.userId, `Заказ ${order.orderNumber}: статус «${STATUS_RU[status]}»`, `/orders/${order.id}`);
  res.json(order);
});

router.get("/admin/products", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(asc(productsTable.id));
  const variants = await db.select().from(productVariantsTable);
  res.json(products.map((p) => ({ ...p, variants: variants.filter((v) => v.productId === p.id) })));
});

export default router;
