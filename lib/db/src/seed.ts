// Наполнение базы демонстрационными данными: npm run db:seed
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  client, db, initDb, usersTable, productsTable, productVariantsTable, cartItemsTable,
  ordersTable, orderItemsTable, reviewsTable, userAddressesTable, notificationsTable,
} from "./index";

const SIZES = ["S", "M", "L", "XL", "XXL"];

const PRODUCTS = [
  { name: "ACID WASH OVERSIZED TEE", category: "Футболки", basePrice: 15100, colors: ["STONE GRAY X4", "BLACK"], custom: true, color: "#bdbdbd",
    description: "Оверсайз-футболка из плотного хлопка 260 г/м² с эффектом «варёнки». Каждое изделие окрашивается вручную." },
  { name: "HEAVYWEIGHT HOODIE BLACK", category: "Худи", basePrice: 7900, colors: ["BLACK"], custom: true, color: "#2b2b2b",
    description: "Худи из футера 420 г/м² с двойным капюшоном и прямым кроем." },
  { name: "CARGO PANTS WIDE", category: "Брюки", basePrice: 6400, colors: ["OLIVE", "BLACK"], custom: false, color: "#6b6b4e",
    description: "Широкие брюки-карго из рипстопа с шестью карманами." },
  { name: "LOGO CAP", category: "Аксессуары", basePrice: 3490, colors: ["BLACK", "WHITE"], custom: true, color: "#e7e7e7",
    description: "Шестипанельная кепка с вышитым логотипом." },
  { name: "BASIC TEE WHITE", category: "Футболки", basePrice: 2990, colors: ["WHITE"], custom: true, color: "#f2f2f2",
    description: "Базовая футболка прямого кроя из хлопка 200 г/м²." },
  { name: "TRACK JACKET", category: "Куртки", basePrice: 9900, colors: ["NAVY"], custom: false, color: "#3a4a6b",
    description: "Спортивная куртка на молнии с контрастными лампасами." },
];

async function main() {
  await initDb();
  for (const t of ["notifications", "reviews", "order_items", "orders", "cart_items", "user_addresses",
                   "product_variants", "products", "users"]) {
    await client.execute(`DELETE FROM ${t}`);
    await client.execute({ sql: "DELETE FROM sqlite_sequence WHERE name = ?", args: [t] }).catch(() => {});
  }

  const hash = (p: string) => bcrypt.hashSync(p, 10);
  const users = await db.insert(usersTable).values([
    { email: "client@demo.ru", passwordHash: hash("123456"), firstName: "Иван Петров", phone: "+7 900 000-00-01", role: "client" },
    { email: "admin@demo.ru", passwordHash: hash("admin123"), firstName: "Администратор", role: "admin" },
    { email: "alexey@demo.ru", passwordHash: hash("123456"), firstName: "Алексей К.", role: "client" },
    { email: "maria@demo.ru", passwordHash: hash("123456"), firstName: "Мария С.", role: "client" },
    { email: "dmitry@demo.ru", passwordHash: hash("123456"), firstName: "Дмитрий П.", role: "client" },
    { email: "anna@demo.ru", passwordHash: hash("123456"), firstName: "Анна Смирнова", role: "client" },
  ]).returning();
  const [ivan, , alexey, maria, dmitry, anna] = users;

  const variants: Record<string, number[]> = {};
  for (const p of PRODUCTS) {
    const [prod] = await db.insert(productsTable).values({
      name: p.name, category: p.category, description: p.description, basePrice: String(p.basePrice),
      customizationAvailable: p.custom, imageColor: p.color,
    }).returning();
    variants[p.name] = [];
    for (const color of p.colors) {
      for (const size of p.name === "LOGO CAP" ? ["ONE SIZE"] : SIZES) {
        const [v] = await db.insert(productVariantsTable).values({
          productId: prod.id, size, color, stock: size === "S" ? 0 : 12, additionalPrice: size === "XXL" ? "0" : "0",
        }).returning();
        variants[p.name].push(v.id);
      }
    }
  }
  const v = (name: string, idx = 2) => variants[name][idx];

  await db.insert(userAddressesTable).values({
    userId: ivan.id, addressText: "Россия, г. Иркутск, ул. Лермонтова, 83, 664074",
  });

  // заказы с позициями; цена позиции фиксируется на момент оформления
  async function order(userId: number, num: string, status: any, date: string, delivery: string, cost: number,
                       pay: any, lines: { variant: number; price: number; qty?: number; custom?: boolean }[]) {
    const total = lines.reduce((s, l) => s + l.price * (l.qty ?? 1), 0) + cost;
    const [o] = await db.insert(ordersTable).values({
      userId, orderNumber: num, status, totalAmount: String(total), deliveryCost: String(cost), deliveryMethod: delivery,
      paymentMethod: pay, addressText: "Россия, г. Иркутск, ул. Лермонтова, 83, 664074", createdAt: date,
    }).returning();
    const items = await db.insert(orderItemsTable).values(lines.map((l) => ({
      orderId: o.id, productVariantId: l.variant, quantity: l.qty ?? 1, price: String(l.price),
      total: String(l.price * (l.qty ?? 1)), customization: !!l.custom,
    }))).returning();
    return { o, items };
  }

  await order(ivan.id, "ORD-1782012573902", "confirmed", "2026-06-21 10:15:00", "pochta", 200, "cash",
    [{ variant: v("LOGO CAP", 0), price: 3490 }]);
  await order(ivan.id, "ORD-1781934410087", "awaiting_payment", "2026-06-20 18:40:00", "cdek", 350, "card",
    [{ variant: v("CARGO PANTS WIDE", 1), price: 6400 }]);
  await order(ivan.id, "ORD-1781852201344", "delivered", "2026-06-19 12:00:00", "cdek", 350, "sbp",
    [{ variant: v("HEAVYWEIGHT HOODIE BLACK", 2), price: 7900 }, { variant: v("CARGO PANTS WIDE", 1), price: 6400 }]);
  await order(ivan.id, "ORD-1781507794979", "delivered", "2026-06-15 09:30:00", "pochta", 200, "card",
    [{ variant: v("ACID WASH OVERSIZED TEE", 4), price: 15600, custom: true }]);

  // отзывы других покупателей
  const seedReview = async (u: any, product: string, num: string, rating: number, comment: string, status: any, date: string) => {
    const { items } = await order(u.id, num, "delivered", date, "cdek", 350, "card", [{ variant: v(product, product === "LOGO CAP" ? 0 : 3), price: PRODUCTS.find((p) => p.name === product)!.basePrice }]);
    const [pv] = await db.select().from(productVariantsTable).where(eq(productVariantsTable.id, items[0].productVariantId));
    await db.insert(reviewsTable).values({ userId: u.id, productId: pv.productId, orderItemId: items[0].id, rating, comment,
                                           moderationStatus: status, createdAt: date });
  };
  await seedReview(alexey, "ACID WASH OVERSIZED TEE", "ORD-1780000000001", 5, "Плотная ткань, принт после стирки не потрескался. Оверсайз как на фото.", "approved", "2026-06-18 11:00:00");
  await seedReview(maria, "ACID WASH OVERSIZED TEE", "ORD-1780000000002", 5, "Взяла XXL под свободную посадку — то, что нужно. Доставка СДЭК за 4 дня.", "approved", "2026-06-16 11:00:00");
  await seedReview(dmitry, "ACID WASH OVERSIZED TEE", "ORD-1780000000003", 4, "Качество отличное, но цвет чуть светлее, чем на сайте.", "approved", "2026-06-11 11:00:00");
  await seedReview(anna, "HEAVYWEIGHT HOODIE BLACK", "ORD-1780000000004", 5, "Очень тёплое худи, капюшон держит форму.", "pending", "2026-06-22 11:00:00");
  await seedReview(dmitry, "LOGO CAP", "ORD-1780000000005", 1, "Пришла не та расцветка, хочу вернуть деньги!!!", "pending", "2026-06-21 11:00:00");

  // пересчёт рейтингов по одобренным отзывам
  await client.execute(`UPDATE products SET
      rating = COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.product_id = products.id AND r.moderation_status = 'approved'), 0),
      review_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = products.id AND r.moderation_status = 'approved')`);

  // корзина демо-клиента
  await db.insert(cartItemsTable).values([
    { userId: ivan.id, productVariantId: v("HEAVYWEIGHT HOODIE BLACK", 2), quantity: 1 },
    { userId: ivan.id, productVariantId: v("BASIC TEE WHITE", 1), quantity: 2 },
  ]);
  await db.insert(notificationsTable).values([
    { userId: ivan.id, text: "Заказ ORD-1781852201344 доставлен. Оцените покупку!", link: "/orders/3" },
  ]);
  console.log("База заполнена. Клиент: client@demo.ru / 123456, администратор: admin@demo.ru / admin123");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
