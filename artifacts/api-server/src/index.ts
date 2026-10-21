import express from "express";
import cors from "cors";
import { initDb } from "@workspace/db";
import authRouter from "./routes/auth";
import productsRouter from "./routes/products";
import cartRouter from "./routes/cart";
import ordersRouter from "./routes/orders";
import reviewsRouter from "./routes/reviews";
import adminReviewsRouter from "./routes/adminReviews";
import adminOrdersRouter from "./routes/adminOrders";
import notificationsRouter from "./routes/notifications";

const app = express();
app.use(cors());
app.use(express.json());

const api = express.Router();
api.use(authRouter);
api.use(productsRouter);
api.use(cartRouter);
api.use(ordersRouter);
api.use(reviewsRouter);
api.use(notificationsRouter);
api.use(adminReviewsRouter);
api.use(adminOrdersRouter);
app.use("/api", api);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT ?? 3001);
initDb().then(() => {
  app.listen(PORT, () => console.log(`API StreetWearLab: http://localhost:${PORT}/api`));
});
