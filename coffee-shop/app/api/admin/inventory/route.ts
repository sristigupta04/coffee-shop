
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// ==========================================
// ADMIN AUTHORIZATION
// ==========================================

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
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

  return {
    authorized: true as const,
    user,
  };
}

// ==========================================
// GET: INVENTORY LIST + SUMMARY
// ==========================================

export async function GET() {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const products = await prisma.product.findMany({
      orderBy: [
        { stock: "asc" },
        { name: "asc" },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalProducts = products.length;

    const totalStock = products.reduce(
      (total, product) => total + product.stock,
      0
    );

    const lowStockLimit = 10;

    const lowStock = products.filter(
      (product) =>
        product.stock > 0 &&
        product.stock <= lowStockLimit
    ).length;

    const outOfStock = products.filter(
      (product) => product.stock === 0
    ).length;

    const inventoryValue = products.reduce(
      (total, product) =>
        total + product.price * product.stock,
      0
    );

    return NextResponse.json({
      success: true,
      products,
      summary: {
        totalProducts,
        totalStock,
        lowStock,
        outOfStock,
        inventoryValue,
        lowStockLimit,
      },
    });
  } catch (error) {
    console.error("Inventory GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch inventory.",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// PATCH: STOCK ADJUSTMENT + AUDIT LOG
// ==========================================

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();

    const { productId, action, quantity, reason } = body;

    // Validate product ID
    if (
      typeof productId !== "string" ||
      !productId.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Valid product ID is required." },
        { status: 400 }
      );
    }

    // Validate action
    if (!["ADD", "REMOVE", "SET"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          message: "Action must be ADD, REMOVE or SET.",
        },
        { status: 400 }
      );
    }

    // Validate quantity
    if (
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      (action !== "SET" && quantity <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Quantity must be a valid positive integer. SET accepts zero.",
        },
        { status: 400 }
      );
    }

    // Validate reason
    if (
      reason !== undefined &&
      reason !== null &&
      (typeof reason !== "string" || reason.length > 500)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Reason must be a string of maximum 500 characters.",
        },
        { status: 400 }
      );
    }

    const cleanReason =
      typeof reason === "string" && reason.trim()
        ? reason.trim()
        : null;

    // ======================================
    // ATOMIC DATABASE TRANSACTION
    // ======================================

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          stock: true,
        },
      });

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const previousStock = product.stock;

      let newStock = previousStock;

      if (action === "ADD") {
        newStock = previousStock + quantity;
      }

      if (action === "REMOVE") {
        if (quantity > previousStock) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        newStock = previousStock - quantity;
      }

      if (action === "SET") {
        newStock = quantity;
      }

      if (!Number.isSafeInteger(newStock)) {
        throw new Error("INVALID_STOCK_VALUE");
      }

      // Compare-and-update prevents overwriting
      // another stock adjustment made concurrently.
      const updated = await tx.product.updateMany({
        where: {
          id: productId,
          stock: previousStock,
        },
        data: {
          stock: newStock,
        },
      });

      if (updated.count !== 1) {
        throw new Error("STOCK_CONFLICT");
      }

      // Save audit history in the SAME transaction.
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          userId: auth.user.id,
          type: action,
          quantity:
            action === "SET"
              ? Math.abs(newStock - previousStock)
              : quantity,
          previousStock,
          newStock,
          reason: cleanReason,
        },
      });

      return {
        product: {
          id: product.id,
          name: product.name,
          previousStock,
          newStock,
        },
        movement,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Stock updated and movement history saved.",
      data: result,
    });
  } catch (error) {
    console.error("Inventory PATCH error:", error);

    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json(
          { success: false, message: "Product not found." },
          { status: 404 }
        );
      }

      if (error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          {
            success: false,
            message: "Cannot remove more stock than available.",
          },
          { status: 400 }
        );
      }

      if (error.message === "STOCK_CONFLICT") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Stock changed during this operation. Refresh and try again.",
          },
          { status: 409 }
        );
      }

      if (error.message === "INVALID_STOCK_VALUE") {
        return NextResponse.json(
          { success: false, message: "Invalid stock value." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update stock.",
      },
      { status: 500 }
    );
  }
}
