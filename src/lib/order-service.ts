import { createAdminClient } from "./supabase/admin";
import { computeOrderTotals, lineTotal } from "./calc";
import { buildOrderNo, datePart } from "./order-number";
import type { OrderInput } from "./types";

async function getOrderPrefix(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin.from("app_settings").select("value").eq("key", "order_prefix").maybeSingle();
  const v = data?.value;
  return typeof v === "string" ? v : "DN";
}

/**
 * Create an order + items server-side with authoritative revenue math and a
 * collision-safe daily order number. Returns the created order row + items.
 */
export async function createOrder(input: OrderInput, createdByProfileId: string, completeImmediately = false) {
  const admin = createAdminClient();
  const now = new Date();
  const prefix = await getOrderPrefix(admin);

  // Compute totals server-side (never trust the client).
  const items = input.items
    .filter((it) => it.quantity > 0)
    .map((it) => ({ ...it, line_total: lineTotal(it.quantity, it.unit_price) }));
  if (items.length === 0) throw new Error("Order must have at least one item");
  const totals = computeOrderTotals(items, input.discount_type, input.discount_value);

  // Retry on unique(order_no) collision.
  const today = datePart(now);
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .like("order_no", `${prefix}-${today}-%`);
    const orderNo = buildOrderNo(prefix, now, (count ?? 0) + 1 + attempt);

    const { data: order, error } = await admin
      .from("orders")
      .insert({
        order_no: orderNo,
        received_at: now.toISOString(),
        due_at: input.due_at ?? null,
        customer_name: input.customer_name ?? null,
        customer_phone: input.customer_phone ?? null,
        subtotal: totals.subtotal,
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        discount_total: totals.discount_total,
        final_total: totals.final_total,
        note: input.note ?? null,
        created_by: createdByProfileId,
        is_completed: completeImmediately,
        completed_at: completeImmediately ? now.toISOString() : null,
        completed_by: completeImmediately ? createdByProfileId : null,
      })
      .select("*")
      .single();

    if (error) {
      if ((error as any).code === "23505") { lastErr = error; continue; } // unique violation -> retry
      throw error;
    }

    const itemRows = items.map((it) => ({
      order_id: order.id,
      service_id: it.service_id,
      service_name_snapshot: it.service_name_snapshot,
      unit_type: it.unit_type,
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_total: it.line_total,
      note: it.note ?? null,
    }));
    const { error: itemErr } = await admin.from("order_items").insert(itemRows);
    if (itemErr) throw itemErr;

    await admin.from("audit_logs").insert({
      actor_id: createdByProfileId,
      action: "order.create",
      entity_type: "order",
      entity_id: order.id,
      after_data: { order_no: order.order_no, final_total: order.final_total },
    });

    return { order, items: itemRows };
  }
  throw lastErr ?? new Error("Could not allocate order number");
}

/**
 * Admin edit of an order. Recomputes revenue server-side, replaces items,
 * and writes a before/after audit log. received_at is preserved (revenue date
 * must not silently move) unless explicitly passed.
 */
export async function updateOrder(
  orderId: string,
  input: OrderInput & { received_at?: string | null },
  actorProfileId: string,
) {
  const admin = createAdminClient();
  const { data: before } = await admin.from("orders").select("*").eq("id", orderId).is("deleted_at", null).single();
  if (!before) throw new Error("Order not found");

  const items = input.items
    .filter((it) => it.quantity > 0)
    .map((it) => ({ ...it, line_total: lineTotal(it.quantity, it.unit_price) }));
  if (items.length === 0) throw new Error("Order must have at least one item");
  const totals = computeOrderTotals(items, input.discount_type, input.discount_value);

  const { data: order, error } = await admin.from("orders").update({
    customer_name: input.customer_name ?? null,
    customer_phone: input.customer_phone ?? null,
    due_at: input.due_at ?? null,
    received_at: input.received_at ?? before.received_at,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    subtotal: totals.subtotal,
    discount_total: totals.discount_total,
    final_total: totals.final_total,
    note: input.note ?? null,
    updated_at: new Date().toISOString(),
    updated_by: actorProfileId,
  }).eq("id", orderId).is("deleted_at", null).select("*").single();
  if (error) throw error;

  // Replace items.
  await admin.from("order_items").delete().eq("order_id", orderId);
  await admin.from("order_items").insert(items.map((it) => ({
    order_id: orderId, service_id: it.service_id, service_name_snapshot: it.service_name_snapshot,
    unit_type: it.unit_type, quantity: it.quantity, unit_price: it.unit_price, line_total: it.line_total, note: it.note ?? null,
  })));

  await admin.from("audit_logs").insert({
    actor_id: actorProfileId, action: "order.edit", entity_type: "order", entity_id: orderId,
    before_data: { subtotal: before.subtotal, discount_total: before.discount_total, final_total: before.final_total },
    after_data: { subtotal: order.subtotal, discount_total: order.discount_total, final_total: order.final_total },
  });
  return { order };
}
