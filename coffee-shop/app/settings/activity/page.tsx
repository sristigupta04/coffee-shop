"use client";

import { useEffect, useState } from "react";
import {
  Activity as ActivityIcon,
  CheckCircle2,
  ShoppingBag,
  Heart,
  User,
  MapPin,
  LogIn,
  LogOut,
  Settings,
  CreditCard,
  Bell,
  Trash2,
} from "lucide-react";

type Activity = {
  id: string;
  title: string;
  description: string;
  time: string;
  date: string;
  createdAt: string;
};

export default function Activity() {
  const [active, setActive] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clear, setClear] = useState(false);

  // =========================
  // FETCH ACTIVITY
  // =========================
  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          "/api/settings/activity",
          {
            credentials: "include",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message ||
              "Failed to fetch activity"
          );
        }

        const formatted = (data.data || []).map(
          (activity: any) => {
            const activityDate = new Date(
              activity.createdAt
            );

            return {
              id: activity.id,
              title:
                activity.title ||
                "Account Activity",
              description:
                activity.description ||
                "Activity recorded on your account.",
              time: activityDate.toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              ),
              date: activityDate.toLocaleDateString(
                [],
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }
              ),
              createdAt: activity.createdAt,
            };
          }
        );

        setActive(formatted);
      } catch (error) {
        console.error(
          "Error fetching activity:",
          error
        );

        setError(
          "Unable to load account activity."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  // =========================
  // CLEAR ALL
  // =========================
  const handleClear = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all activities?"
    );

    if (!confirmed) return;

    try {
      setClear(true);

      const res = await fetch(
        "/api/settings/activity",
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to clear activities"
        );
      }

      setActive([]);
    } catch (error) {
      console.error(
        "Error clearing activities:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to clear activities"
      );
    } finally {
      setClear(false);
    }
  };

  // =========================
  // DATE GROUPS
  // =========================
  const today = new Date();

  const isSameDay = (
    first: Date,
    second: Date
  ) => {
    return (
      first.getDate() ===
        second.getDate() &&
      first.getMonth() ===
        second.getMonth() &&
      first.getFullYear() ===
        second.getFullYear()
    );
  };

  const yesterday = new Date();
  yesterday.setDate(
    yesterday.getDate() - 1
  );

  const todayActive = active.filter(
    (activity) =>
      isSameDay(
        new Date(activity.createdAt),
        today
      )
  );

  const yesterdayActive = active.filter(
    (activity) =>
      isSameDay(
        new Date(activity.createdAt),
        yesterday
      )
  );

  const olderActive = active.filter(
    (activity) => {
      const activityDate = new Date(
        activity.createdAt
      );

      return (
        activityDate <
        new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate()
        )
      );
    }
  );

  // =========================
  // ICON
  // =========================
  const getActivityIcon = (
    title: string
  ) => {
    const value = title.toLowerCase();

    if (
      value.includes("order") ||
      value.includes("cart")
    ) {
      return ShoppingBag;
    }

    if (
      value.includes("wishlist") ||
      value.includes("favorite")
    ) {
      return Heart;
    }

    if (
      value.includes("login") ||
      value.includes("sign in")
    ) {
      return LogIn;
    }

    if (
      value.includes("logout") ||
      value.includes("sign out")
    ) {
      return LogOut;
    }

    if (
      value.includes("address") ||
      value.includes("location")
    ) {
      return MapPin;
    }

    if (
      value.includes("payment") ||
      value.includes("razorpay")
    ) {
      return CreditCard;
    }

    if (
      value.includes("notification")
    ) {
      return Bell;
    }

    if (
      value.includes("profile") ||
      value.includes("account")
    ) {
      return User;
    }

    if (
      value.includes("setting")
    ) {
      return Settings;
    }

    if (
      value.includes("success") ||
      value.includes("complete")
    ) {
      return CheckCircle2;
    }

    return ActivityIcon;
  };

  // =========================
  // ACTIVITY GROUP
  // =========================
  const ActivityGroup = ({
    title,
    activities,
  }: {
    title: string;
    activities: Activity[];
  }) => {
    if (activities.length === 0) {
      return null;
    }

    return (
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f4e37]">
            {title}
          </h2>

          <div className="h-px flex-1 bg-[#ddd0c3]" />

          <span className="text-xs text-[#927c6d]">
            {activities.length}
          </span>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#e3d8cd] bg-[#fffdfa] shadow-[0_5px_25px_rgba(59,33,21,0.05)]">
          {activities.map(
            (activity, index) => {
              const Icon =
                getActivityIcon(
                  activity.title
                );

              return (
                <div
                  key={activity.id}
                  className={`
                    group
                    flex
                    gap-4
                    p-5
                    transition-colors
                    duration-200
                    hover:bg-[#faf5ef]
                    ${
                      index !==
                      activities.length - 1
                        ? "border-b border-[#e8dfd6]"
                        : ""
                    }
                  `}
                >
                  {/* ICON */}
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-[#eee0d0]
                      text-[#6f4e37]
                      transition-colors
                      group-hover:bg-[#e4d1bd]
                    "
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.8}
                    />
                  </div>

                  {/* CONTENT */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                      <h3 className="font-semibold text-[#3b2115]">
                        {activity.title}
                      </h3>

                      <span className="shrink-0 text-xs font-medium text-[#8c7768]">
                        {activity.time}
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-[#75655a]">
                      {activity.description}
                    </p>

                    <p className="mt-2 text-xs text-[#a08d7d]">
                      {activity.date}
                    </p>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-[#f7f1e8] px-4 py-10 text-[#3e2416] sm:px-6">
      <div className="mx-auto max-w-4xl">

        {/* =========================
            HEADER
        ========================= */}
        <div className="mb-10 flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3b2115] text-white">
                <ActivityIcon
                  size={20}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#3b2115] sm:text-4xl">
                  Account Activity
                </h1>

                <p className="mt-1 text-sm text-[#7b6252]">
                  Review recent activity on your account
                </p>
              </div>
            </div>
          </div>

          {active.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={clear}
              className="
                flex
                items-center
                gap-2
                rounded-full
                border
                border-[#e1cfc1]
                bg-[#fffdfa]
                px-4
                py-2.5
                text-sm
                font-medium
                text-[#8b4a24]
                transition
                hover:border-[#8b4a24]
                hover:bg-[#f8eee5]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <Trash2
                size={15}
                strokeWidth={1.8}
              />

              {clear
                ? "Clearing..."
                : "Clear All"}
            </button>
          )}
        </div>

        {/* =========================
            LOADING
        ========================= */}
        {loading && (
          <div className="rounded-3xl border border-[#e3d8cd] bg-[#fffdfa] p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#d9c9bb] border-t-[#6f4e37]" />

            <p className="mt-4 text-sm text-[#7b6252]">
              Loading your activity...
            </p>
          </div>
        )}

        {/* =========================
            ERROR
        ========================= */}
        {!loading && error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            <p className="font-medium">
              {error}
            </p>
          </div>
        )}

        {/* =========================
            EMPTY
        ========================= */}
        {!loading &&
          !error &&
          active.length === 0 && (
            <div className="rounded-3xl border border-[#e3d8cd] bg-[#fffdfa] p-12 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eee0d0] text-[#6f4e37]">
                <ActivityIcon
                  size={28}
                  strokeWidth={1.5}
                />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-[#3b2115]">
                No Recent Activity
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7b6252]">
                Your account activity will appear
                here when you place orders, update
                your profile, manage your wishlist,
                or perform other actions.
              </p>
            </div>
          )}

        {/* =========================
            ACTIVITY
        ========================= */}
        {!loading &&
          !error &&
          active.length > 0 && (
            <div className="space-y-9">

              <ActivityGroup
                title="Today"
                activities={todayActive}
              />

              <ActivityGroup
                title="Yesterday"
                activities={
                  yesterdayActive
                }
              />

              <ActivityGroup
                title="Older"
                activities={
                  olderActive
                }
              />

            </div>
          )}
      </div>
    </main>
  );
}