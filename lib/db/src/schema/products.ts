import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const productsTable = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  basePrice: text("base_price").notNull(),
  customizationAvailable: integer("customization_available", { mode: "boolean" }).notNull().default(false),
  imageColor: text("image_color").notNull().default("#d9d9d9"),
  rating: text("rating").notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
});

export const productVariantsTable = sqliteTable("product_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  size: text("size").notNull(),
  color: text("color").notNull(),
  stock: integer("stock").notNull().default(0),
  additionalPrice: text("additional_price").notNull().default("0"),
});

export type Product = typeof productsTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
