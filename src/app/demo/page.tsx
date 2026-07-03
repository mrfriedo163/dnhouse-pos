"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";

type DiscountMode = "cash" | "percent";
type LocalRole = "admin" | "staff";

type LocalUser = {
  id: string;
  name: string;
  role: LocalRole;
};

type DemoOrder = {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  service: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountMode?: DiscountMode;
  discountValue?: number;
  note: string;
  createdAt: string;
  completedAt: string | null;
  syncedAt?: string | null;
};

const STORAGE_KEY = "dn-house-pos-demo-orders";
const SETTINGS_KEY = "dn-house-pos-demo-settings";
const AUTH_KEY = "dn-house-pos-demo-auth";
const DEFAULT_PASSWORD = "123456789";
const CUSTOM_SERVICE_NAME = "Dịch vụ khác";

const localUsers: LocalUser[] = [
  { id: "admin", name: "Boss DN House", role: "admin" },
  { id: "staff", name: "Nhân viên DN House", role: "staff" },
];

const services = [
  { name: "Giặt thường dưới 3kg", unitPrice: 35000, unit: "lần" },
  { name: "Giặt từ 3kg trở lên", unitPrice: 7000, unit: "kg" },
  { name: "Giặt sấy từ 3kg trở lên", unitPrice: 9000, unit: "kg" },
  { name: "Chăn, drap", unitPrice: 15000, unit: "kg" },
  { name: "Chăn bông", unitPrice: 25000, unit: "kg" },
  { name: "Rèm cửa", unitPrice: 25000, unit: "kg" },
  { name: "Vệ sinh giày", unitPrice: 50000, unit: "đôi" },
  { name: "Tẩy điểm", unitPrice: 15000, unit: "món" },
  { name: CUSTOM_SERVICE_NAME, unitPrice: 0, unit: "tùy chỉnh" },
];

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function makeOrderNo(count: number) {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `DN-${ymd}-${String(count + 1).padStart(4, "0")}`;
}

function clampNumber(value: number, min = 0, max = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function orderSubtotal(order: Pick<DemoOrder, "quantity" | "unitPrice">) {
  return order.quantity * order.unitPrice;
}

function orderTotal(order: Pick<DemoOrder, "quantity" | "unitPrice" | "discount">) {
  return Math.max(0, orderSubtotal(order) - order.discount);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function DemoPosPage() {
  const [authLoaded, setAuthLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [loginId, setLoginId] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceName, setServiceName] = useState(services[1].name);
  const [customServiceName, setCustomServiceName] = useState("");
  const [customUnitPrice, setCustomUnitPrice] = useState(0);
  const [quantity, setQuantity] = useState(3);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("cash");
  const [discountCash, setDiscountCash] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [note, setNote] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [autoPrint, setAutoPrint] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    const authRaw = window.localStorage.getItem(AUTH_KEY);
    if (authRaw) {
      const saved = JSON.parse(authRaw) as { id?: string };
      setCurrentUser(localUsers.find((user) => user.id === saved.id) ?? null);
    }
    setAuthLoaded(true);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) setOrders(JSON.parse(raw));
    const settingsRaw = window.localStorage.getItem(SETTINGS_KEY);
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw) as { webhookUrl?: string; autoPrint?: boolean };
      setWebhookUrl(settings.webhookUrl ?? "");
      setAutoPrint(settings.autoPrint ?? true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ webhookUrl, autoPrint }));
  }, [webhookUrl, autoPrint]);

  const selectedService = services.find((service) => service.name === serviceName) ?? services[0];
  const isCustomService = selectedService.name === CUSTOM_SERVICE_NAME;
  const activeServiceName = isCustomService ? (customServiceName.trim() || CUSTOM_SERVICE_NAME) : selectedService.name;
  const activeUnitPrice = isCustomService ? clampNumber(customUnitPrice) : selectedService.unitPrice;
  const activeUnit = isCustomService ? "tùy chỉnh" : selectedService.unit;
  const subtotal = clampNumber(quantity) * activeUnitPrice;
  const computedDiscount =
    discountMode === "percent"
      ? Math.round(subtotal * clampNumber(discountPercent, 0, 100) / 100)
      : clampNumber(discountCash, 0, subtotal);
  const previewTotal = Math.max(0, subtotal - computedDiscount);

  const todayOrders = useMemo(
    () => orders.filter((order) => todayKey(new Date(order.createdAt)) === todayKey()),
    [orders],
  );
  const pendingOrders = orders.filter((order) => !order.completedAt);
  const todayRevenue = todayOrders.reduce(
    (sum, order) => sum + orderTotal(order),
    0,
  );
  const isAdmin = currentUser?.role === "admin";

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const user = localUsers.find((item) => item.id === loginId.trim().toLowerCase());
    if (!user || loginPassword !== DEFAULT_PASSWORD) {
      setLoginError("Sai ID hoặc mật khẩu.");
      return;
    }
    setCurrentUser(user);
    window.localStorage.setItem(AUTH_KEY, JSON.stringify({ id: user.id, role: user.role }));
    setLoginPassword("");
    setLoginError(null);
  }

  function logout() {
    window.localStorage.removeItem(AUTH_KEY);
    setCurrentUser(null);
    setLoginPassword("");
  }

  async function syncOrder(order: DemoOrder) {
    if (!webhookUrl.trim()) return;
    setSyncStatus("Đang gửi đơn lên data online...");
    try {
      await fetch(webhookUrl.trim(), {
        method: "POST",
        mode: "no-cors",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "DN House POS",
          action: "create_order",
          order: {
            ...order,
            subtotal: orderSubtotal(order),
            total: orderTotal(order),
          },
        }),
      });
      const syncedAt = new Date().toISOString();
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, syncedAt } : item));
      setSyncStatus("Đã gửi data online. Nếu dùng Google Apps Script, kiểm tra Sheet để xác nhận.");
    } catch (error) {
      setSyncStatus("Chưa gửi được data online. Kiểm tra lại link webhook.");
    }
  }

  function printInvoice(order: DemoOrder) {
    const win = window.open("", "_blank", "width=420,height=720");
    if (!win) {
      setSyncStatus("Trình duyệt chặn cửa sổ in hóa đơn. Hãy cho phép pop-up hoặc bấm in lại.");
      return;
    }
    const subtotalValue = orderSubtotal(order);
    const totalValue = orderTotal(order);
    const printedAt = new Date().toLocaleString("vi-VN");
    win.document.write(`
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(order.orderNo)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 18px; color: #102A43; background: #f8fafc; }
            .receipt { max-width: 380px; margin: 0 auto; border: 1px solid #dbeafe; border-radius: 14px; background: #fff; padding: 18px; }
            .brand { display: flex; align-items: center; justify-content: center; gap: 10px; }
            .logo { width: 46px; height: 46px; border-radius: 8px; object-fit: cover; border: 1px solid #dbeafe; }
            h1 { font-size: 20px; margin: 0; text-align: center; letter-spacing: 0; }
            h2 { margin: 12px 0 0; text-align: center; font-size: 14px; }
            .sub { text-align: center; font-size: 12px; margin: 6px 0 14px; line-height: 1.45; }
            .line { border-top: 1px dashed #9ca3af; margin: 12px 0; }
            .row { display: flex; justify-content: space-between; gap: 12px; margin: 8px 0; font-size: 13px; }
            .row span:last-child { text-align: right; font-weight: 700; }
            .total { font-size: 18px; font-weight: 800; color: #c2410c; }
            .muted { color: #64748b; }
            .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; text-align: center; font-size: 12px; }
            .sign-box { min-height: 64px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
            .actions { display: flex; gap: 8px; margin: 14px auto 0; max-width: 380px; }
            button { flex: 1; border: 0; border-radius: 10px; padding: 10px 12px; background: #102A43; color: white; font-weight: 800; cursor: pointer; }
            button.secondary { background: #e0f2fe; color: #102A43; }
            @media print {
              body { padding: 0; background: #fff; }
              .receipt { border: 0; border-radius: 0; padding: 8px; }
              .actions { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="brand">
              <img class="logo" src="/dn-house-logo.jpg" alt="DN House" />
              <div>
                <h1>DN HOUSE</h1>
                <div class="sub">Laundry And More...</div>
              </div>
            </div>
            <h2>PHIẾU NHẬN ĐỒ / BILL</h2>
            <div class="sub">648/24 KV Bình Trung, Long Tuyền, Bình Thủy, TP. Cần Thơ<br/>Hotline/Zalo: 0945 632 853</div>
            <div class="line"></div>
            <div class="row"><b>Mã đơn</b><span>${escapeHtml(order.orderNo)}</span></div>
            <div class="row"><b>Khách</b><span>${escapeHtml(order.customerName)}</span></div>
            <div class="row"><b>SĐT</b><span>${escapeHtml(order.customerPhone || "-")}</span></div>
            <div class="row"><b>Ngày nhận</b><span>${escapeHtml(new Date(order.createdAt).toLocaleString("vi-VN"))}</span></div>
            <div class="row"><b>Ngày in</b><span>${escapeHtml(printedAt)}</span></div>
            <div class="line"></div>
            <div class="row"><span>${escapeHtml(order.service)}</span><span>${escapeHtml(order.quantity)} x ${escapeHtml(formatVnd(order.unitPrice))}</span></div>
            <div class="row"><span>Tạm tính</span><span>${formatVnd(subtotalValue)}</span></div>
            <div class="row"><span>Giảm giá</span><span>${formatVnd(order.discount)}</span></div>
            <div class="row total"><span>Tổng</span><span>${formatVnd(totalValue)}</span></div>
            ${order.note ? `<div class="line"></div><div class="muted">Ghi chú: ${escapeHtml(order.note)}</div>` : ""}
            <div class="line"></div>
            <div class="sub">Cảm ơn quý khách. Hẹn gặp lại!</div>
            <div class="sign">
              <div class="sign-box">Khách hàng</div>
              <div class="sign-box">DN House</div>
            </div>
          </div>
          <div class="actions">
            <button onclick="window.print()">In bill</button>
            <button class="secondary" onclick="window.close()">Đóng</button>
          </div>
          <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  function exportDeclarationCsv() {
    const headers = [
      "Mã đơn",
      "Ngày nhận",
      "Tên khách",
      "Số điện thoại",
      "Dịch vụ",
      "Số lượng",
      "Đơn giá",
      "Tạm tính",
      "Giảm giá",
      "Tổng tiền",
      "Trạng thái",
      "Ghi chú",
    ];
    const rows = orders.map((order) => [
      order.orderNo,
      new Date(order.createdAt).toLocaleString("vi-VN"),
      order.customerName,
      order.customerPhone,
      order.service,
      order.quantity,
      order.unitPrice,
      orderSubtotal(order),
      order.discount,
      orderTotal(order),
      order.completedAt ? "Đã trả đồ" : "Đang xử lý",
      order.note,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dn-house-ke-khai-${todayKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function createOrder(e: React.FormEvent) {
    e.preventDefault();
    const order: DemoOrder = {
      id: crypto.randomUUID(),
      orderNo: makeOrderNo(orders.length),
      customerName: customerName.trim() || "Khách lẻ",
      customerPhone: customerPhone.trim(),
      service: activeServiceName,
      quantity,
      unitPrice: activeUnitPrice,
      discount: computedDiscount,
      discountMode,
      discountValue: discountMode === "percent" ? discountPercent : discountCash,
      note: note.trim(),
      createdAt: new Date().toISOString(),
      completedAt: null,
      syncedAt: null,
    };
    setOrders([order, ...orders]);
    void syncOrder(order);
    if (autoPrint) printInvoice(order);
    setCustomerName("");
    setCustomerPhone("");
    setQuantity(3);
    setCustomServiceName("");
    setCustomUnitPrice(0);
    setDiscountMode("cash");
    setDiscountCash(0);
    setDiscountPercent(0);
    setNote("");
  }

  function completeOrder(id: string) {
    setOrders((current) =>
      current.map((order) => order.id === id ? { ...order, completedAt: new Date().toISOString() } : order),
    );
  }

  function deleteOrder(id: string) {
    setOrders((current) => current.filter((order) => order.id !== id));
  }

  if (!authLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <CardTitle>Đang mở DN House POS...</CardTitle>
        </Card>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,42,67,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,42,67,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <Card className="relative w-full max-w-md p-6 shadow-lift">
          <div className="mb-6 text-center">
            <Image src="/dn-house-logo.jpg" alt="DN House" width={76} height={76} className="mx-auto rounded-xl border border-sky-100 bg-white object-cover shadow-soft" priority />
            <h1 className="mt-4 text-2xl font-black text-navy">DN House POS</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Đăng nhập để vào phần mềm quản lý đơn</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>ID tài khoản</Label>
              <Select value={loginId} onChange={(e) => setLoginId(e.target.value)}>
                <option value="admin">admin - Boss</option>
                <option value="staff">staff - Nhân viên</option>
              </Select>
            </div>
            <div>
              <Label>Mật khẩu</Label>
              <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="123456789" required />
            </div>
            {loginError && <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{loginError}</div>}
            <Button type="submit" className="w-full">Đăng nhập</Button>
          </form>
          <div className="mt-4 rounded-lg bg-skySoft p-3 text-xs font-semibold text-slate-600">
            Tài khoản test: <b>admin</b> hoặc <b>staff</b>. Mật khẩu: <b>123456789</b>.
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-sky-100 bg-white/90 backdrop-blur-xl">
        <div className="app-shell flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Image src="/dn-house-logo.jpg" alt="DN House" width={44} height={44} className="rounded-lg border border-sky-100 bg-white object-cover shadow-soft" priority />
            <div>
              <div className="text-base font-black text-navy">DN House POS</div>
              <div className="text-xs font-semibold text-slate-500">{currentUser.name} · {isAdmin ? "Admin" : "Staff"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/login" className="hidden rounded-lg border border-sky-100 px-3 py-2 text-xs font-bold text-slate-600 shadow-soft sm:block">
              Bản Supabase
            </a>
            <button type="button" onClick={logout} className="rounded-lg border border-sky-100 px-3 py-2 text-xs font-bold text-slate-600 shadow-soft">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="app-shell space-y-5 py-5">
        <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-widest text-promo">POS nội bộ</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black text-navy md:text-3xl">Quản lý đơn giặt sấy DN House</h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">Tạo đơn, theo dõi đơn đang xử lý và đánh dấu trả đồ ngay trên máy này.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-skySoft px-4 py-3">
                <div className="text-xl font-black">{todayOrders.length}</div>
                <div className="text-xs font-bold text-slate-500">đơn hôm nay</div>
              </div>
              <div className="rounded-xl bg-skySoft px-4 py-3">
                <div className="text-xl font-black">{pendingOrders.length}</div>
                <div className="text-xs font-bold text-slate-500">đang xử lý</div>
              </div>
              <div className="rounded-xl bg-skySoft px-4 py-3">
                <div className="text-xl font-black">{isAdmin ? formatVnd(todayRevenue) : "Ẩn"}</div>
                <div className="text-xs font-bold text-slate-500">doanh thu</div>
              </div>
            </div>
          </div>
        </section>

        {isAdmin && (
          <Card>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <CardTitle>Kết nối data online</CardTitle>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Dán Google Apps Script webhook hoặc endpoint riêng. Khi tạo đơn, POS sẽ tự gửi data đơn hàng lên đó.
                </p>
                <div className="mt-3">
                  <Label>Webhook URL</Label>
                  <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
                </div>
                {syncStatus && <div className="mt-2 text-sm font-bold text-emerald-700">{syncStatus}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm font-bold shadow-soft">
                  <input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} />
                  Tự in hóa đơn
                </label>
                <Button type="button" variant="secondary" onClick={exportDeclarationCsv} disabled={orders.length === 0}>
                  Xuất dữ liệu kê khai
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <Card className="h-fit">
            <CardTitle>Tạo đơn mới</CardTitle>
            <form onSubmit={createOrder} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <Label>Tên khách</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Khách lẻ" />
                </div>
                <div>
                  <Label>Số điện thoại</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="09..." />
                </div>
              </div>
              <div>
                <Label>Dịch vụ</Label>
                <Select value={serviceName} onChange={(e) => setServiceName(e.target.value)}>
                  {services.map((service) => (
                    <option key={service.name} value={service.name}>
                      {service.name === CUSTOM_SERVICE_NAME ? service.name : `${service.name} - ${formatVnd(service.unitPrice)}/${service.unit}`}
                    </option>
                  ))}
                </Select>
              </div>
              {isCustomService && (
                <div className="rounded-xl border border-sky-100 bg-skySoft p-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <Label>Tên dịch vụ khác</Label>
                      <Input value={customServiceName} onChange={(e) => setCustomServiceName(e.target.value)} placeholder="Ví dụ: Giặt thú bông, xử lý đặc biệt..." required />
                    </div>
                    <div>
                      <Label>Giá tự kê</Label>
                      <Input type="number" min={0} step={1000} value={customUnitPrice} onChange={(e) => setCustomUnitPrice(Number(e.target.value))} placeholder="Nhập giá" required />
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Số lượng</Label>
                  <Input type="number" min={0.1} step={0.1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
                </div>
                <div>
                  <Label>Thành tiền</Label>
                  <div className="rounded-lg border border-sky-100 bg-skySoft px-3 py-2 text-sm font-black text-navy">
                    {formatVnd(subtotal)} <span className="text-xs font-bold text-slate-500">/{activeUnit}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-sky-100 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label className="mb-0">Giảm giá</Label>
                  <div className="grid grid-cols-2 rounded-lg border border-sky-100 bg-skySoft p-1 text-xs font-black">
                    <button
                      type="button"
                      className={`rounded-md px-3 py-1.5 transition ${discountMode === "cash" ? "bg-brand text-white shadow-soft" : "text-slate-600"}`}
                      onClick={() => setDiscountMode("cash")}
                    >
                      Giá
                    </button>
                    <button
                      type="button"
                      className={`rounded-md px-3 py-1.5 transition ${discountMode === "percent" ? "bg-brand text-white shadow-soft" : "text-slate-600"}`}
                      onClick={() => setDiscountMode("percent")}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Số tiền giảm</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={discountMode === "cash" ? discountCash : computedDiscount}
                      onChange={(e) => setDiscountCash(Number(e.target.value))}
                      disabled={discountMode === "percent"}
                    />
                  </div>
                  <div>
                    <Label>Phần trăm</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  {discountMode === "percent"
                    ? `Đang áp dụng ${clampNumber(discountPercent, 0, 100)}%, tự giảm ${formatVnd(computedDiscount)}.`
                    : `Đang áp dụng giảm trực tiếp ${formatVnd(computedDiscount)}.`}
                </div>
              </div>

              <div>
                <Label>Ghi chú</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: giao chiều nay" />
              </div>
              <div className="rounded-xl border border-sky-100 bg-skySoft p-3">
                <div className="text-xs font-bold text-slate-500">Tạm tính sau giảm</div>
                <div className="text-2xl font-black text-navy">{formatVnd(previewTotal)}</div>
              </div>
              <Button type="submit" className="w-full">Tạo đơn</Button>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Đơn đang xử lý</CardTitle>
              <span className="rounded-full bg-skySoft px-3 py-1 text-xs font-black text-navy">{pendingOrders.length} đơn</span>
            </div>
            <div className="mt-4 space-y-3">
              {orders.length === 0 && (
                <div className="rounded-xl border border-dashed border-sky-200 p-6 text-center text-sm font-semibold text-slate-500">
                  Chưa có đơn nào. Tạo thử một đơn ở cột bên trái.
                </div>
              )}
              {orders.map((order) => {
                const total = orderTotal(order);
                return (
                  <div key={order.id} className="rounded-xl border border-sky-100 bg-white p-4 shadow-soft">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-navy">{order.orderNo}</span>
                          <span className={order.completedAt ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700" : "rounded-full bg-orange-50 px-2 py-1 text-xs font-black text-orange-700"}>
                            {order.completedAt ? "Đã trả đồ" : "Đang xử lý"}
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-600">
                          {order.customerName} {order.customerPhone ? `· ${order.customerPhone}` : ""}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {order.service} · {order.quantity} x {formatVnd(order.unitPrice)}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-400">
                          {order.syncedAt ? "Đã gửi data online" : webhookUrl ? "Chưa đồng bộ" : "Local"}
                        </div>
                        {order.discount > 0 && (
                          <div className="mt-1 text-sm font-semibold text-emerald-700">
                            Giảm {formatVnd(order.discount)}
                            {order.discountMode === "percent" && order.discountValue ? ` (${order.discountValue}%)` : ""}
                          </div>
                        )}
                        {order.note && <div className="mt-1 text-sm italic text-slate-500">{order.note}</div>}
                      </div>
                      <div className="flex flex-col gap-2 md:items-end">
                        <div className="text-xl font-black text-promo">{formatVnd(total)}</div>
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={() => printInvoice(order)}>In</Button>
                          {!order.completedAt && <Button type="button" onClick={() => completeOrder(order.id)}>Trả đồ</Button>}
                          {isAdmin && <Button type="button" variant="ghost" onClick={() => deleteOrder(order.id)}>Xóa</Button>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
