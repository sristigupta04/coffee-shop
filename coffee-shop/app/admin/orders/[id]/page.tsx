
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  MapPin,
  Package,
  User,
  RotateCcw,
  Warehouse,
  ShoppingBag,
} from "lucide-react";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import StatusBadge from "@/components/admin/StatusBadge";
import OrderStatusControl from "@/components/admin/OrderStatusControl";
import RefundOrderButton from "./RefundOrderButton";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

const currency = (amount: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(parsedDate);
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
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

function SectionHeading({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-[#754426]">{icon}</span>
      <h2 className="font-bold text-[#2B1B14]">{title}</h2>
    </div>
  );
}

function CustomizationDetails({
  customizations,
}: {
  customizations: unknown;
}) {
  if (
    customizations === null ||
    customizations === undefined ||
    customizations === ""
  ) {
    return null;
  }

  let details: unknown = customizations;

  if (typeof customizations === "string") {
    try {
      details = JSON.parse(customizations);
    } catch {
      details = customizations;
    }
  }

  const formatted =
    typeof details === "object"
      ? JSON.stringify(details, null, 2)
      : String(details);

  return (
    <div className="mt-3 rounded-lg bg-[#F8F3ED] p-3">
      <p className="mb-2 text-xs font-semibold text-[#754426]">
        Customizations
      </p>

      <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-[#80695B]">
        {formatted}
      </pre>
    </div>
  );
}

export default async function AdminOrderDetailsPage({
  params,
}: Props) {
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
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const refundStatus = order.refundStatus || "NOT_REQUESTED";
  const refundCompleted = refundStatus === "PROCESSED";

  const customerName = order.user?.name || "Guest Customer";
  const customerPhone = order.phone || order.user?.phone || null;

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

          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">

            {/* Ordered Products */}
            <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white">
              <div className="border-b border-[#EADED4] p-5">
                <SectionHeading
                  icon={<Package size={20} />}
                  title={`Ordered Products (${order.items.length})`}
                />
              </div>

              {order.items.length > 0 ? (
                <div className="divide-y divide-[#EADED4]">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[#2B1B14]">
                          {item.product?.name ?? "Product unavailable"}
                        </h3>

                        <p className="mt-1 text-sm text-[#80695B]">
                          Quantity: {item.quantity}
                        </p>

                        <p className="text-sm text-[#80695B]">
                          Unit price: {currency(item.price)}
                        </p>

                        <CustomizationDetails
                          customizations={item.customizations}
                        />
                      </div>

                      <p className="font-bold text-[#754426]">
                        {currency(
                          Number(item.price) * item.quantity
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <ShoppingBag
                    size={34}
                    className="mx-auto mb-3 text-[#C6AA96]"
                  />
                  <p className="font-semibold text-[#5F493B]">
                    No order items found
                  </p>
                </div>
              )}
            </section>

            {/* Customer Information */}
            <section className="rounded-2xl border border-[#EADED4] bg-white p-5">
              <SectionHeading
                icon={<User size={20} />}
                title="Customer Information"
              />

              <DetailRow
                label="Customer"
                value={customerName}
              />

              <DetailRow
                label="Email"
                value={order.user?.email || "Not available"}
              />

              <DetailRow
                label="Phone"
                value={customerPhone || "Not available"}
              />

              <DetailRow
                label="Customer ID"
                value={order.user?.id ?? "Guest order"}
              />
            </section>

            {/* Order Information */}
            <section className="rounded-2xl border border-[#EADED4] bg-white p-5">
              <SectionHeading
                icon={<MapPin size={20} />}
                title="Order Information"
              />

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

            {/* Refund Information */}
            <section className="rounded-2xl border border-[#EADED4] bg-white p-5">
              <SectionHeading
                icon={<RotateCcw size={20} />}
                title="Refund Information"
              />

              <DetailRow
                label="Refund Status"
                value={<StatusBadge status={refundStatus} />}
              />

              <DetailRow
                label="Refund Amount"
                value={
                  order.refundAmount !== null
                    ? currency(order.refundAmount)
                    : "Not available"
                }
              />

              <DetailRow
                label="Razorpay Refund ID"
                value={
                  order.refundId ? (
                    <span className="break-all">
                      {order.refundId}
                    </span>
                  ) : (
                    "Not generated"
                  )
                }
              />

              <DetailRow
                label="Refund Reason"
                value={order.refundReason || "Not specified"}
              />

              <DetailRow
                label="Refund Date"
                value={
                  order.refundedAt
                    ? formatDate(order.refundedAt)
                    : "Not completed"
                }
              />

              <div className="mt-4 rounded-xl bg-[#F8F3ED] p-4">
                <p className="text-sm font-semibold text-[#2B1B14]">
                  {refundCompleted
                    ? "Refund successfully processed"
                    : refundStatus === "REFUNDING" ||
                        refundStatus === "PENDING"
                      ? "Refund is being processed"
                      : refundStatus === "FAILED"
                        ? "Refund failed"
                        : "No refund has been requested"}
                </p>

                <p className="mt-1 text-xs leading-5 text-[#80695B]">
                  Refund details are displayed from the order database.
                  Check the Razorpay Dashboard for the latest gateway status.
                </p>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <aside className="space-y-6">

            {/* Order Status */}
            <OrderStatusControl
              orderId={order.id}
              currentStatus={order.status}
            />

            {/* Refund Action */}
            <section className="rounded-2xl border border-[#EADED4] bg-white p-5">
              <SectionHeading
                icon={<RotateCcw size={20} />}
                title="Refund Action"
              />

              <p className="mb-4 text-sm leading-6 text-[#80695B]">
                Initiate a full refund for an eligible Razorpay payment.
                Failed refunds can be retried.
              </p>

              <RefundOrderButton
                orderId={order.id}
                paymentWay={order.paymentWay || ""}
                paymentStatus={order.paymentStatus}
                orderStatus={order.status}
                refundStatus={refundStatus}
              />
            </section>

            {/* Payment Summary */}
            <section className="h-fit rounded-2xl border border-[#EADED4] bg-white p-5">
              <SectionHeading
                icon={<CreditCard size={20} />}
                title="Payment Summary"
              />

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
                <>
                  <DetailRow
                    label="Coupon Code"
                    value={order.coupon.code}
                  />

                  <DetailRow
                    label="Coupon Discount"
                    value={`${order.coupon.discount}${
                      order.coupon.discountType === "PERCENTAGE"
                        ? "%"
                        : " INR"
                    }`}
                  />
                </>
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

            {/* Stock Tracking */}
            <section className="rounded-2xl border border-[#EADED4] bg-white p-5">
              <SectionHeading
                icon={<Warehouse size={20} />}
                title="Stock Tracking"
              />

              <DetailRow
                label="Stock Deducted"
                value={
                  <StatusBadge
                    status={
                      order.stockDeducted
                        ? "DEDUCTED"
                        : "NOT_DEDUCTED"
                    }
                  />
                }
              />

              <p className="mt-3 text-xs leading-5 text-[#80695B]">
                Stock restoration is controlled by the stock tracking field
                to prevent duplicate restoration.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
