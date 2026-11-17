
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const stringFields = [
  "shopName",
  "tagline",
  "logo",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "postalCode",
  "country",
  "currency",
  "timezone",
  "openingTime",
  "closingTime",
] as const;

const nullableStringFields = [
  "tagline",
  "logo",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "postalCode",
] as const;

const numberFields = [
  "taxPercentage",
  "minimumOrderAmount",
  "deliveryFee",
  "freeDeliveryAbove",
] as const;

const booleanFields = [
  "acceptOrders",
  "allowScheduledOrders",
  "emailNotifications",
  "orderNotifications",
  "paymentNotifications",
  "lowStockNotifications",
  "maintenanceMode",
] as const;

type SettingsBody = Record<string, unknown>;

async function checkAdmin(): Promise<NextResponse | null> {
  const user = await getcurrentuser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please login first" },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, message: "Admin access required" },
      { status: 403 }
    );
  }

  return null;
}

async function getOrCreateSettings() {
  return prisma.shopSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function GET() {
  try {
    const authResponse = await checkAdmin();

    if (authResponse) return authResponse;

    const settings = await getOrCreateSettings();

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Admin settings GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load shop settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authResponse = await checkAdmin();

    if (authResponse) return authResponse;

    let body: SettingsBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid settings data" },
        { status: 400 }
      );
    }

    const data: Prisma.ShopSettingsUpdateInput = {};

    for (const field of stringFields) {
      if (!(field in body)) continue;

      const value = body[field];

      if (
        nullableStringFields.includes(
          field as (typeof nullableStringFields)[number]
        ) &&
        (value === null || value === "")
      ) {
        Object.assign(data, { [field]: null });
        continue;
      }

      if (typeof value !== "string" || !value.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: `${field} must be a valid non-empty string`,
          },
          { status: 400 }
        );
      }

      Object.assign(data, { [field]: value.trim() });
    }

    for (const field of numberFields) {
      if (!(field in body)) continue;

      const value = body[field];

      if (field === "freeDeliveryAbove" && value === null) {
        data.freeDeliveryAbove = null;
        continue;
      }

      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `${field} must be a valid non-negative number`,
          },
          { status: 400 }
        );
      }

      if (field === "taxPercentage" && value > 100) {
        return NextResponse.json(
          {
            success: false,
            message: "Tax percentage cannot exceed 100",
          },
          { status: 400 }
        );
      }

      Object.assign(data, { [field]: value });
    }

    for (const field of booleanFields) {
      if (!(field in body)) continue;

      const value = body[field];

      if (typeof value !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            message: `${field} must be true or false`,
          },
          { status: 400 }
        );
      }

      Object.assign(data, { [field]: value });
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid settings provided" },
        { status: 400 }
      );
    }

    await getOrCreateSettings();

    const settings = await prisma.shopSettings.update({
      where: { id: "default" },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Shop settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Admin settings PATCH error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update shop settings" },
      { status: 500 }
    );
  }
}
