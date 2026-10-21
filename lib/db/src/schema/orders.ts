import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { productVariantsTable } from "./products";

export const ORDER_STATUSES = ["awaiting_payment", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["card", "sbp", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ordersTable = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status", { enum: ORDER_STATUSES }).notNull().default("awaiting_payment"),
  totalAmount: text("total_amount").notNull(),
  deliveryCost: text("delivery_cost").notNull().default("0"),
  deliveryMethod: text("delivery_method").notNull(),
  paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }).notNull(),
  addressText: text("address_text"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orderItemsTable = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  productVariantId: integer("product_variant_id").notNull().references(() => productVariantsTable.id),
  quantity: integer("quantity").notNull(),
  price: text("price").notNull(),
  total: text("total").notNull(),
  customization: integer("customization", { mode: "boolean" }).notNull().default(false),
  customizationDetails: text("customization_details"),
});

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
