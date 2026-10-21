// Клиент API: обёртка над fetch и хуки TanStack Query для разрабатываемых модулей
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export class ApiError extends Error {
  constructor(public status: number, public data: { error?: string }) {
    super(data?.error ?? `HTTP ${status}`);
  }
}

export const tokenStore = {
  get: () => localStorage.getItem("swl_token"),
  set: (t: string | null) => (t ? localStorage.setItem("swl_token", t) : localStorage.removeItem("swl_token")),
};

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/* ---------- типы ---------- */
export type OrderStatus = "awaiting_payment" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type ModerationStatus = "pending" | "approved" | "rejected";

export interface User { id: number; email: string; firstName: string; phone: string | null; role: "client" | "manager" | "admin" }
export interface Variant { id: number; productId: number; size: string; color: string; stock: number; additionalPrice: string }
export interface Product {
  id: number; name: string; category: string; description: string; basePrice: string; imageColor: string;
  customizationAvailable: boolean; rating: string; reviewCount: number; variants?: Variant[];
}
export interface CartItem {
  id: number; quantity: number; customization: boolean; customizationDetails: string | null; productId: number;
  productName: string; imageColor: string; size: string; color: string; stock: number; price: number; total: number;
}
export interface Cart { items: CartItem[]; subtotal: number }
export interface OrderItem {
  id: number; productId: number; productName: string; imageColor: string; size: string; color: string;
  quantity: number; price: number; total: number; customization: boolean;
}
export interface Order {
  id: number; orderNumber: string; status: OrderStatus; totalAmount: number; deliveryCost: number;
  deliveryMethod: string; paymentMethod: "card" | "sbp" | "cash"; addressText: string | null; createdAt: string;
  items: OrderItem[];
}
export interface Review {
  id: number; userId: number; productId: number; orderItemId: number; rating: number; comment: string | null;
  moderationStatus: ModerationStatus; createdAt: string; authorName?: string; productName?: string;
}
export interface ProductReviews { rating: number; reviewCount: number; distribution: { rating: number; count: number }[]; reviews: Review[] }
export interface Notification { id: number; text: string; link: string | null; isRead: boolean; createdAt: string }

/* ---------- ключи запросов ---------- */
export const getGetCartQueryKey = () => ["cart"] as const;
export const getGetOrdersQueryKey = () => ["orders"] as const;
export const getGetOrderQueryKey = (id: number) => ["orders", id] as const;
export const getGetOrderReviewsQueryKey = (id: number) => ["orders", id, "reviews"] as const;

/* ---------- каталог и корзина ---------- */
export const useGetProducts = (category?: string) =>
  useQuery({ queryKey: ["products", category ?? "all"], queryFn: () =>
    api<Product[]>(`/products${category ? `?category=${encodeURIComponent(category)}` : ""}`) });
export const useGetProduct = (id: number) =>
  useQuery({ queryKey: ["products", "one", id], queryFn: () => api<Product>(`/products/${id}`) });
export const useGetCart = (enabled = true) =>
  useQuery({ queryKey: getGetCartQueryKey(), queryFn: () => api<Cart>("/cart"), enabled });

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { productVariantId: number; quantity: number; customization: boolean; customizationDetails?: string }) =>
      api("/cart", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetCartQueryKey() }),
  });
}
export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => api(`/cart/${id}`, { method: "PATCH", body: { quantity } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetCartQueryKey() }),
  });
}
export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/cart/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetCartQueryKey() }),
  });
}

/* ---------- заказы ---------- */
export const useGetAddresses = () =>
  useQuery({ queryKey: ["addresses"], queryFn: () => api<{ id: number; addressText: string }[]>("/addresses") });
export function useCreateOrder() {
  return useMutation({
    mutationFn: ({ data }: { data: { deliveryMethod: string; paymentMethod: string; addressText: string } }) =>
      api<Order>("/orders", { method: "POST", body: data }),
  });
}
export const useGetOrders = () => useQuery({ queryKey: getGetOrdersQueryKey(), queryFn: () => api<Order[]>("/orders") });
export const useGetOrder = (id: number) =>
  useQuery({ queryKey: getGetOrderQueryKey(id), queryFn: () => api<Order>(`/orders/${id}`) });
export function usePayOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<Order>(`/orders/${id}/pay`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() }),
  });
}

/* ---------- отзывы ---------- */
export const useGetOrderReviews = (orderId: number) =>
  useQuery({ queryKey: getGetOrderReviewsQueryKey(orderId), queryFn: () => api<Review[]>(`/orders/${orderId}/reviews`) });
export const useGetProductReviews = (productId: number) =>
  useQuery({ queryKey: ["products", productId, "reviews"], queryFn: () => api<ProductReviews>(`/products/${productId}/reviews`) });
export function useCreateReview() {
  return useMutation({
    mutationFn: ({ data }: { data: { orderItemId: number; rating: number; comment?: string } }) =>
      api<Review>("/reviews", { method: "POST", body: data }),
  });
}

/* ---------- администрирование ---------- */
export const useAdminReviews = (status: ModerationStatus) =>
  useQuery({ queryKey: ["admin", "reviews", status], queryFn: () =>
    api<{ reviews: Review[]; counts: Record<ModerationStatus, number> }>(`/admin/reviews?status=${status}`) });
export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api(`/admin/reviews/${id}/${action}`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}
export const useAdminOrders = () =>
  useQuery({ queryKey: ["admin", "orders"], queryFn: () => api<(Order & { customer: string })[]>("/admin/orders") });
export function useSetOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api(`/admin/orders/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });
}
export const useAdminProducts = () =>
  useQuery({ queryKey: ["admin", "products"], queryFn: () => api<Product[]>("/admin/products") });

/* ---------- уведомления ---------- */
export const useNotifications = (enabled: boolean) =>
  useQuery({ queryKey: ["notifications"], queryFn: () => api<Notification[]>("/notifications"), enabled, refetchInterval: 15000 });
export function useReadNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/notifications/read", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
