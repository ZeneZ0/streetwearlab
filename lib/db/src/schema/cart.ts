import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";
import { productVariantsTable } from "./products";

export const cartItemsTable = sqliteTable("cart_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  productVariantId: integer("product_variant_id").notNull().references(() => productVariantsTable.id),
  quantity: integer("quantity").notNull().default(1),
  customization: integer("customization", { mode: "boolean" }).notNull().default(false),
  customizationDetails: text("customization_details"),
});

export type CartItem = typeof cartItemsTable.$inferSelect;
