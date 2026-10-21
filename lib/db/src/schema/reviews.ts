import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { productsTable } from "./products";
import { orderItemsTable } from "./orders";

export const MODERATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const reviewsTable = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  orderItemId: integer("order_item_id").notNull().unique().references(() => orderItemsTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  moderationStatus: text("moderation_status", { enum: MODERATION_STATUSES }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Review = typeof reviewsTable.$inferSelect;
