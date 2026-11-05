
import {
  Clock3,
  CheckCircle2,
  XCircle,
  Coffee,
  Package,
  Truck,
  CreditCard,
  RefreshCcw,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
};

type StatusStyle = {
  label: string;
  className: string;
  icon: LucideIcon;
};

const statusConfig: Record<string, StatusStyle> = {
  // Order statuses
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Clock3,
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-50 text-blue-800 border-blue-200",
    icon: CheckCircle2,
  },
  PREPARING: {
    label: "Preparing",
    className: "bg-orange-50 text-orange-800 border-orange-200",
    icon: Coffee,
  },
  READY: {
    label: "Ready",
    className: "bg-teal-50 text-teal-800 border-teal-200",
    icon: Package,
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    className: "bg-indigo-50 text-indigo-800 border-indigo-200",
    icon: Truck,
  },
  DELIVERED: {
    label: "Delivered",
    className: "bg-green-50 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-50 text-red-800 border-red-200",
    icon: XCircle,
  },

  // Payment statuses
  PAID: {
    label: "Paid",
    className: "bg-green-50 text-green-800 border-green-200",
    icon: CreditCard,
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-50 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    icon: CreditCard,
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-50 text-red-800 border-red-200",
    icon: AlertCircle,
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-purple-50 text-purple-800 border-purple-200",
    icon: RefreshCcw,
  },

  // Inventory statuses
  IN_STOCK: {
    label: "In Stock",
    className: "bg-green-50 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  LOW_STOCK: {
    label: "Low Stock",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    icon: AlertCircle,
  },
  OUT_OF_STOCK: {
    label: "Out of Stock",
    className: "bg-red-50 text-red-800 border-red-200",
    icon: XCircle,
  },

  // General statuses
  ACTIVE: {
    label: "Active",
    className: "bg-green-50 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  INACTIVE: {
    label: "Inactive",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: XCircle,
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-50 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-800 border-red-200",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Clock3,
  },
};

export default function StatusBadge({
  status,
  size = "md",
  showIcon = true,
}: StatusBadgeProps) {
  const normalizedStatus = status.trim().toUpperCase();

  const config = statusConfig[normalizedStatus] ?? {
    label: normalizedStatus.replaceAll("_", " ").toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    className: "bg-[#f5e9df] text-[#754426] border-[#eaded4]",
    icon: AlertCircle,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border font-semibold ${config.className} ${
        size === "sm"
          ? "px-2 py-1 text-[10px] sm:text-xs"
          : "px-2.5 py-1.5 text-xs sm:text-sm"
      }`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {showIcon && (
        <Icon
          size={size === "sm" ? 12 : 14}
          className="shrink-0"
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
