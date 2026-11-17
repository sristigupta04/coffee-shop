
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_THRESHOLD = 10;
const MAX_THRESHOLD = 10000;

// ==========================================
// ADMIN AUTHORIZATION
// ==========================================

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return { authorized: true as const };
}

// ==========================================
// GET: LOW STOCK ALERTS
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const rawThreshold = request.nextUrl.searchParams.get("threshold");

    const threshold =
      rawThreshold === null
        ? DEFAULT_THRESHOLD
        : Number(rawThreshold);

    if (
      !Number.isSafeInteger(threshold) ||
      threshold < 1 ||
      threshold > MAX_THRESHOLD
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Threshold must be an integer between 1 and 10000.",
        },
        { status: 400 }
      );
    }

    // Include all products, even when isAvailable is false.
    // Stock alerts must reflect actual inventory levels.
    const products = await prisma.product.findMany({
      where: {
        stock: {
          lte: threshold,
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        stock: true,
        price: true,
        isAvailable: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedAt: true,
      },
      orderBy: [
        { stock: "asc" },
        { name: "asc" },
      ],
    });

    const outOfStock = products.filter(
      (product) => product.stock === 0
    );

    const lowStock = products.filter(
      (product) => product.stock > 0
    );

    const alerts = products.map((product) => ({
      ...product,
      alertType:
        product.stock === 0
          ? "OUT_OF_STOCK"
          : "LOW_STOCK",
      recommendedRestock: Math.max(
        0,
        threshold * 2 - product.stock
      ),
    }));

    return NextResponse.json({
      success: true,
      threshold,
      summary: {
        totalAlerts: alerts.length,
        outOfStock: outOfStock.length,
        lowStock: lowStock.length,
      },
      alerts,
    });
  } catch (error) {
    console.error("Inventory alerts GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch inventory alerts.",
      },
      { status: 500 }
    );
  }
}
