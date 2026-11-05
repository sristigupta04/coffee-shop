
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  MapPin,
  Package,
  User,
} from "lucide-react";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import StatusBadge from "@/components/admin/StatusBadge";
import OrderStatusControl from "@/components/admin/OrderStatusControl";

type Props = {
  params: Promise<{ id: string }>;
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#EADED4] py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-[#80695B]">{label}</span>
      <span className="break-words text-sm font-medium text-[#2B1B14] sm:text-right">
        {value}
      </span>
    </div>
  );
}

export default async function AdminOrderDetailsPage({ params }: Props) {
  const user = await getcurrentuser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              price: true,
            },
          },
        },
      },
   coupon: {
  select: {
    code: true,
    discount: true,
    discountType: true,
  },
},
    },
  });

  if (!order) {
    notFound();
  }

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/admin/orders"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#754426] transition hover:text-[#2B1B14]"
          >
            <ArrowLeft size={17} />
            Back to Orders
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#A76535]">
                ORDER MANAGEMENT
              </p>

              <h1 className="mt-1 break-all text-2xl font-bold text-[#2B1B14] sm:text-3xl">
                Order #{order.id.slice(-8).toUpperCase()}
              </h1>

              <p className="mt-2 text-sm text-[#80695B]">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Ordered Products */}
            <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white">
              <div className="flex items-center gap-3 border-b border-[#EADED4] p-5">
                <Package className="text-[#754426]" size={20} />
                <h2 className="font-bold text-[#2B1B14]">
                  Ordered Products
                </h2>
              </div>

              <div className="divide-y divide-[#EADED4]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#2B1B14]">
                        {item.product?.name ?? "Product unavailable"}
                      </h3>

                      <p className="mt-1 text-sm text-[#80695B]">
                        Quantity: {item.quantity}
                      </p>

                      <p className="text-sm text-[#80695B]">
                        Unit price: {currency(item.price)}
                      </p>
                    </div>

                    <p className="font-bold text-[#754426]">
                      {currency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Customer Information */}
            <section className="rounded-2xl border border-[#EADED4] bg-white p-5">
              <div className="mb-3 flex items-center gap-3">
                <User size={20} className="text-[#754426]" />
                <h2 className="font-bold text-[#2B1B14]">
                  Customer Information
                </h2>
              </div>

              <DetailRow
                label="Customer"
                value={order.user?.name || "Guest"}
              />

              <DetailRow
                label="Email"
                value={order.user?.email || "Not available"}
              />

              <DetailRow
                label="Phone"
                value={order.phone || order.user?.phone || "Not available"}
              />

              <DetailRow
                label="Customer ID"
                value={order.user?.id ?? "Guest order"}
              />
            </section>

            {/* Order Information */}
            <section className="rounded-2xl border border-[#EADED4] bg-white p-5">
              <div className="mb-3 flex items-center gap-3">
                <MapPin size={20} className="text-[#754426]" />
                <h2 className="font-bold text-[#2B1B14]">
                  Order Information
                </h2>
              </div>

              <DetailRow
                label="Order Type"
                value={order.orderType.replaceAll("_", " ")}
              />

              <DetailRow
                label="Delivery Address"
                value={order.address || "Not applicable"}
              />

              <DetailRow
                label="Scheduled For"
                value={
                  order.scheduledFor
                    ? formatDate(order.scheduledFor)
                    : "Not scheduled"
                }
              />

              <DetailRow
                label="Order Date"
                value={formatDate(order.createdAt)}
              />
            </section>
          </div>

          {/* Right column */}
          <aside className="space-y-6">
            {/* Status control */}
            <OrderStatusControl
              orderId={order.id}
              currentStatus={order.status}
            />

            {/* Payment summary */}
            <section className="h-fit rounded-2xl border border-[#EADED4] bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <CreditCard size={20} className="text-[#754426]" />
                <h2 className="font-bold text-[#2B1B14]">
                  Payment Summary
                </h2>
              </div>

              <DetailRow
                label="Payment Method"
                value={order.paymentWay || "Not specified"}
              />

              <DetailRow
                label="Payment Status"
                value={<StatusBadge status={order.paymentStatus} />}
              />

              <DetailRow
                label="Subtotal"
                value={currency(subtotal)}
              />

              <DetailRow
                label="Discount"
                value={`-${currency(order.discountAmount)}`}
              />

              <DetailRow
                label="Delivery Fee"
                value={currency(order.deliveryFee)}
              />

              {order.coupon && (
                <DetailRow
                  label="Coupon"
                  value={order.coupon.code}
                />
              )}

              <div className="mt-4 border-t border-[#EADED4] pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#2B1B14]">
                    Total Amount
                  </span>

                  <span className="text-xl font-bold text-[#754426]">
                    {currency(order.totalPrice)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#F8F3ED] p-3">
                <CalendarDays
                  size={17}
                  className="mt-0.5 shrink-0 text-[#754426]"
                />

                <p className="text-xs leading-5 text-[#80695B]">
                  Payment and order information is displayed directly from
                  your database.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
