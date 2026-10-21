import { db, notificationsTable } from "@workspace/db";

export async function notify(userId: number, text: string, link?: string): Promise<void> {
  await db.insert(notificationsTable).values({ userId, text, link: link ?? null });
}
