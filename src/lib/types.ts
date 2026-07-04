export type Role = "admin" | "staff";
export type DiscountType = "none" | "percent" | "fixed";
export type UnitType = "kg" | "pair" | "item" | "set" | "custom" | string;

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  unit_type: UnitType;
  default_price: number;
  active: boolean;
  note: string | null;
}

export interface OrderItemInput {
  service_id: string | null;
  service_name_snapshot: string;
  unit_type: UnitType | null;
  quantity: number;
  unit_price: number;
  note?: string | null;
}

export interface OrderInput {
  customer_name?: string | null;
  customer_phone?: string | null;
  due_at?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  note?: string | null;
  items: OrderItemInput[];
}

export interface Order {
  id: string;
  order_no: string;
  received_at: string;
  due_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_total: number;
  final_total: number;
  note: string | null;
  is_completed: boolean;
  completed_at: string | null;
  bill_drive_file_id: string | null;
  bill_drive_web_url: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;
}

export interface ShopInfo {
  shop_name: string;
  business_type: string;
  address: string;
  phone: string;
}

export interface FormReviewState {
  last_form_review_at: string | null;
  next_form_review_at: string | null;
  reminder_snooze_until: string | null;
  form_review_note: string | null;
  staff_can_see: boolean;
}

/** Variables available for PDF bill mapping. */
export const BILL_VARIABLES = [
  "shop_name", "shop_address", "shop_phone",
  "order_no", "received_at", "due_at",
  "customer_name", "customer_phone", "service_table",
  "subtotal", "discount_type", "discount_value", "discount_total",
  "final_total", "note", "created_by",
] as const;
export type BillVariable = (typeof BILL_VARIABLES)[number];
