import { Router, type Request } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db, cartItemsTable, ordersTable, orderItemsTable, productVariantsTable, productsTable, userAddressesTable,
  type Order,
} from "@workspace/db";
import { requireAuth, type JwtPayload } from "../lib/auth";
import { notify } from "../lib/notify";

const router = Router();

// Стоимость доставки по коду способа доставки, руб.
export const DELIVERY_COSTS: Record<string, number> = {
  cdek: 350,
  pochta: 200,
  boxberry: 280,
  pickup: 0,
};

async function loadItems(orderIds: number[]) {
  if (orderIds.length === 0) return [];
  return db
    .select({ item: orderItemsTable, variant: productVariantsTable, product: productsTable })
    .from(orderItemsTable)
    .innerJoin(productVariantsTable, eq(productVariantsTable.id, orderItemsTable.productVariantId))
    .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
    .where(inArray(orderItemsTable.orderId, orderIds));
}

type ItemRow = Awaited<ReturnType<typeof loadItems>>[number];

function formatOrder(order: Order, items: ItemRow[]) {
  return {
    ...order,
    totalAmount: parseFloat(order.totalAmount),
    deliveryCost: parseFloat(order.deliveryCost),
    items: items.map(({ item, variant, product }) => ({
      id: item.id, productId: product.id, productName: product.name, imageColor: product.imageColor,
      size: variant.size, color: variant.color, quantity: item.quantity, price: parseFloat(item.price),
      total: parseFloat(item.total), customization: item.customization,
    })),
  };
}

router.get("/addresses", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const rows = await db.select().from(userAddressesTable).where(eq(userAddressesTable.userId, userId))
    .orderBy(desc(userAddressesTable.id));
  res.json(rows);
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const { deliveryMethod, paymentMethod, addressText } = req.body;

  if (!deliveryMethod || !paymentMethod) {
    res.status(400).json({ error: "deliveryMethod and paymentMethod are required" });
    return;
  }
  if (deliveryMethod !== "pickup" && !addressText?.trim()) {
    res.status(400).json({ error: "Укажите адрес доставки" });
    return;
  }

  const cartItems = await db
    .select()
    .from(cartItemsTable)
    .where(eq(cartItemsTable.userId, userId));

  if (cartItems.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  let itemsTotal = 0;
  const orderLines = [];
  const unavailable: string[] = [];

  for (const ci of cartItems) {
    const [variant] = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, ci.productVariantId))
      .limit(1);
    const [product] = variant
      ? await db.select().from(productsTable)
          .where(eq(productsTable.id, variant.productId)).limit(1)
      : [undefined];
    if (!variant || variant.stock < ci.quantity) {
      unavailable.push(`${product?.name ?? "Товар"} (${variant?.size ?? "?"})`);
      continue;
    }
    const price =
      parseFloat(product?.basePrice ?? "0") +
      parseFloat(variant?.additionalPrice ?? "0") +
      (ci.customization ? 500 : 0);
    const total = price * ci.quantity;
    itemsTotal += total;
    orderLines.push({ ...ci, price: String(price), total: String(total) });
  }

  if (unavailable.length > 0) {
    res.status(409).json({ error: `Недостаточно товара на складе: ${unavailable.join(", ")}` });
    return;
  }

  const deliveryCost = DELIVERY_COSTS[deliveryMethod] ?? 300;
  const totalAmount = itemsTotal + deliveryCost;
  const orderNumber = `ORD-${Date.now()}`;
  const initialStatus =
    paymentMethod === "cash" ? "confirmed" : "awaiting_payment";

  const [order] = await db.insert(ordersTable).values({
    userId,
    orderNumber,
    status: initialStatus,
    totalAmount: String(totalAmount),
    deliveryCost: String(deliveryCost),
    deliveryMethod,
    paymentMethod,
    addressText: addressText ?? null,
  }).returning();

  await db.insert(orderItemsTable).values(
    orderLines.map(({ id: _cartItemId, userId: _userId, ...l }) => ({ ...l, orderId: order.id }))
  );
  for (const l of orderLines) {
    const [variant] = await db.select().from(productVariantsTable)
      .where(eq(productVariantsTable.id, l.productVariantId)).limit(1);
    await db.update(productVariantsTable).set({ stock: variant.stock - l.quantity })
      .where(eq(productVariantsTable.id, l.productVariantId));
  }
  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));

  if (addressText) {
    const [saved] = await db.select().from(userAddressesTable)
      .where(and(eq(userAddressesTable.userId, userId), eq(userAddressesTable.addressText, addressText))).limit(1);
    if (!saved) await db.insert(userAddressesTable).values({ userId, addressText });
  }
  await notify(userId, `Заказ ${orderNumber} оформлен`, `/orders/${order.id}`);

  res.status(201).json(formatOrder(order, []));
});

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id));
  const items = await loadItems(orders.map((o) => o.id));
  res.json(orders.map((o) => formatOrder(o, items.filter((r) => r.item.orderId === o.id))));
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId, role } = (req as Request & { user: JwtPayload }).user;
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(req.params.id))).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.userId !== userId && role === "client") {
    res.status(403).json({ error: "Not your order" });
    return;
  }
  res.json(formatOrder(order, await loadItems([order.id])));
});

// Демонстрационная оплата картой или через СБП
router.post("/orders/:id/pay", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, Number(req.params.id)), eq(ordersTable.userId, userId))).limit(1);
  if (!order || order.status !== "awaiting_payment") {
    res.status(400).json({ error: "Заказ не ожидает оплаты" });
    return;
  }
  const [updated] = await db.update(ordersTable).set({ status: "confirmed" })
    .where(eq(ordersTable.id, order.id)).returning();
  await notify(userId, `Заказ ${order.orderNumber} оплачен`, `/orders/${order.id}`);
  res.json(formatOrder(updated, await loadItems([order.id])));
});

export default router;
