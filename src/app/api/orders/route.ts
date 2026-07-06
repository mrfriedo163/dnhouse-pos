import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createOrder } from "@/lib/order-service";
import type { OrderInput } from "@/lib/types";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: OrderInput;
  try { body = (await request.json()) as OrderInput; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Order must have items" }, { status: 400 });
  }

  try {
    const { order } = await createOrder(body, profile.id, true);
    return NextResponse.json({ order });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to create order" }, { status: 500 });
  }
}
