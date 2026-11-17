
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Save,
  RefreshCw,
  Store,
  ShoppingBag,
  Bell,
  Settings as SettingsIcon,
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type ShopSettings = {
  shopName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  taxRate: number;
  deliveryCharge: number;
  freeDeliveryAbove: number | null;
  minOrderAmount: number;
  estimatedDeliveryTime: number;
  acceptingOrders: boolean;
  allowPickup: boolean;
  allowDelivery: boolean;
  enableEmailNotifications: boolean;
  enableOrderNotifications: boolean;
  enableLowStockNotifications: boolean;
  maintenanceMode: boolean;
};

const defaultSettings: ShopSettings = {
  shopName: "BrewBites",
  tagline: "",
  email: "",
  phone: "",
  address: "",
  currency: "INR",
  timezone: "Asia/Kolkata",
  taxRate: 0,
  deliveryCharge: 0,
  freeDeliveryAbove: null,
  minOrderAmount: 0,
  estimatedDeliveryTime: 30,
  acceptingOrders: true,
  allowPickup: true,
  allowDelivery: true,
  enableEmailNotifications: true,
  enableOrderNotifications: true,
  enableLowStockNotifications: true,
  maintenanceMode: false,
};

type Section = "general" | "business" | "orders" | "notifications" | "system";

const sections: {
  id: Section;
  label: string;
  icon: typeof Store;
  description: string;
}[] = [
  {
    id: "general",
    label: "General",
    icon: Store,
    description: "Shop name and contact information",
  },
  {
    id: "business",
    label: "Business",
    icon: Building2,
    description: "Currency, tax and delivery settings",
  },
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingBag,
    description: "Order availability and fulfillment",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Manage shop notifications",
  },
  {
    id: "system",
    label: "System",
    icon: SettingsIcon,
    description: "System and maintenance settings",
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to load settings");
      }

      const savedSettings = data.settings ?? data.data ?? data;

      setSettings({
        ...defaultSettings,
        ...savedSettings,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load settings"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const update = <K extends keyof ShopSettings>(
    key: K,
    value: ShopSettings[K]
  ) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to save settings");
      }

      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[#e7ddd2] bg-white px-4 py-3 text-sm text-[#2B1B14] outline-none transition focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10";

  const labelClass = "mb-2 block text-sm font-medium text-[#49372d]";

  const renderInput = (
    label: string,
    key: keyof ShopSettings,
    type: "text" | "number" | "email" | "tel" = "text",
    placeholder = ""
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        className={inputClass}
        value={settings[key] == null ? "" : String(settings[key])}
        placeholder={placeholder}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        onChange={(event) => {
          const value = event.target.value;

          if (key === "freeDeliveryAbove" && value === "") {
            update("freeDeliveryAbove", null);
            return;
          }

          if (type === "number") {
            const numberValue = value === "" ? 0 : Number(value);

            if (!Number.isFinite(numberValue)) return;

            update(key, numberValue as ShopSettings[typeof key]);
          } else {
            update(key, value as ShopSettings[typeof key]);
          }
        }}
      />
    </div>
  );

  const renderToggle = (
    label: string,
    description: string,
    key: keyof ShopSettings
  ) => (
    <div className="flex items-center justify-between gap-4 border-b border-[#f0e8df] py-4 last:border-0">
      <div>
        <p className="text-sm font-semibold text-[#2B1B14]">{label}</p>
        <p className="mt-1 text-xs text-[#927e70]">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={Boolean(settings[key])}
        onClick={() =>
          update(key, !Boolean(settings[key]) as ShopSettings[typeof key])
        }
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          settings[key] ? "bg-[#754426]" : "bg-[#d8cec4]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            settings[key] ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );

  const sectionContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <>
            <SectionHeading
              title="General Settings"
              description="Manage your coffee shop information."
            />
            <div className="grid gap-5 md:grid-cols-2">
              {renderInput("Shop Name", "shopName", "text", "BrewBites")}
              {renderInput("Tagline", "tagline", "text", "Your daily coffee happiness")}
              {renderInput("Email Address", "email", "email")}
              {renderInput("Phone Number", "phone", "tel")}
              <div className="md:col-span-2">
                <label className={labelClass}>Shop Address</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={settings.address}
                  onChange={(event) => update("address", event.target.value)}
                  placeholder="Enter complete shop address"
                />
              </div>
            </div>
          </>
        );

      case "business":
        return (
          <>
            <SectionHeading
              title="Business Settings"
              description="Configure currency, taxes and delivery charges."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Currency</label>
                <select
                  className={inputClass}
                  value={settings.currency}
                  onChange={(event) => update("currency", event.target.value)}
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
              {renderInput("Timezone", "timezone")}
              {renderInput("Tax Rate (%)", "taxRate", "number")}
              {renderInput("Delivery Charge (₹)", "deliveryCharge", "number")}
              {renderInput(
                "Free Delivery Above (₹)",
                "freeDeliveryAbove",
                "number",
                "Leave empty to disable"
              )}
              {renderInput("Minimum Order Amount (₹)", "minOrderAmount", "number")}
            </div>
          </>
        );

      case "orders":
        return (
          <>
            <SectionHeading
              title="Order Settings"
              description="Control order availability and fulfillment options."
            />
            <div className="space-y-1">
              {renderToggle(
                "Accept Orders",
                "Allow customers to place new orders.",
                "acceptingOrders"
              )}
              {renderToggle(
                "Pickup Orders",
                "Allow customers to collect orders from the shop.",
                "allowPickup"
              )}
              {renderToggle(
                "Delivery Orders",
                "Allow customers to order home delivery.",
                "allowDelivery"
              )}
            </div>
            <div className="mt-5 max-w-md">
              {renderInput(
                "Estimated Delivery Time (minutes)",
                "estimatedDeliveryTime",
                "number"
              )}
            </div>
          </>
        );

      case "notifications":
        return (
          <>
            <SectionHeading
              title="Notification Settings"
              description="Choose which notifications the system should enable."
            />
            <div className="space-y-1">
              {renderToggle(
                "Email Notifications",
                "Enable email notifications.",
                "enableEmailNotifications"
              )}
              {renderToggle(
                "Order Notifications",
                "Receive notifications about order activity.",
                "enableOrderNotifications"
              )}
              {renderToggle(
                "Low Stock Notifications",
                "Get notified when product stock is low.",
                "enableLowStockNotifications"
              )}
            </div>
          </>
        );

      case "system":
        return (
          <>
            <SectionHeading
              title="System Settings"
              description="Manage system availability."
            />
            <div className="space-y-1">
              {renderToggle(
                "Maintenance Mode",
                "Enable maintenance mode when the shop is unavailable.",
                "maintenanceMode"
              )}
            </div>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Maintenance mode may affect customer access. Enable it only when
              required.
            </div>
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#754426]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffaf3] p-4 md:p-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-[#A76535]">
              BREWBITES ADMIN
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#2B1B14]">
              Shop Settings
            </h1>
            <p className="mt-1 text-sm text-[#927e70]">
              Manage your shop configuration and preferences.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadSettings}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl border border-[#e7ddd2] bg-white px-4 py-3 text-sm font-semibold text-[#49372d] hover:bg-[#f8f3ed] disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#754426] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5f351d] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-[#eee4da] bg-white p-3 shadow-sm">
            <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-[#a18c7d]">
              Settings Menu
            </p>

            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      active
                        ? "bg-[#754426] text-white"
                        : "text-[#59483d] hover:bg-[#f8f3ed]"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-semibold">
                      {section.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="rounded-2xl border border-[#eee4da] bg-white p-5 shadow-sm md:p-7">
            {sectionContent()}

            <div className="mt-8 flex justify-end border-t border-[#f0e8df] pt-5">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#754426] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5f351d] disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-[#2B1B14]">{title}</h2>
      <p className="mt-1 text-sm text-[#927e70]">{description}</p>
    </div>
  );
}
