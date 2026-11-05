
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function authorizeAdmin() {
  const auth = await getcurrentuser();

  if (!auth?.id || auth.role !== "ADMIN") {
    return null;
  }

  return auth;
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

// GET: Purchase Order details
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth) {
      return errorResponse("Unauthorized access", 401);
    }

    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!purchaseOrder) {
      return errorResponse("Purchase order not found", 404);
    }

    return NextResponse.json({
      success: true,
      purchaseOrder,
    });
  } catch (error) {
    console.error("GET purchase order error:", error);
    return errorResponse("Failed to fetch purchase order", 500);
  }
}

// PUT: Update Draft Purchase Order
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth) {
      return errorResponse("Unauthorized access", 401);
    }

    const { id } = await params;
    const body = await request.json();

    const {
      supplierId,
      items,
      tax = 0,
      shippingCost = 0,
      notes = "",
      expectedDate,
    } = body;

    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return errorResponse("Supplier and at least one item are required");
    }

    if (items.length > 100) {
      return errorResponse("Maximum 100 items allowed");
    }

    if (
      !Number.isFinite(Number(tax)) ||
      Number(tax) < 0 ||
      !Number.isFinite(Number(shippingCost)) ||
      Number(shippingCost) < 0
    ) {
      return errorResponse("Invalid tax or shipping cost");
    }

    if (typeof notes !== "string" || notes.length > 1000) {
      return errorResponse("Notes must be under 1000 characters");
    }

    if (
      expectedDate &&
      Number.isNaN(new Date(expectedDate).getTime())
    ) {
      return errorResponse("Invalid expected date");
    }

    const productIds = items.map((item: any) => item.productId);

    if (
      items.some(
        (item: any) =>
          !item.productId ||
          !Number.isInteger(Number(item.orderedQuantity)) ||
          Number(item.orderedQuantity) <= 0 ||
          !Number.isFinite(Number(item.unitCost)) ||
          Number(item.unitCost) < 0
      )
    ) {
      return errorResponse("Invalid product quantity or unit cost");
    }

    if (new Set(productIds).size !== productIds.length) {
      return errorResponse("Duplicate products are not allowed");
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!existing) {
        throw new Error("PURCHASE_ORDER_NOT_FOUND");
      }

      if (existing.status !== "DRAFT") {
        throw new Error("ONLY_DRAFT_CAN_BE_EDITED");
      }

      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier || !supplier.isActive) {
        throw new Error("SUPPLIER_NOT_AVAILABLE");
      }

      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: { id: true },
      });

      if (products.length !== productIds.length) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const normalizedItems = items.map((item: any) => {
        const quantity = Number(item.orderedQuantity);
        const unitCost = Number(item.unitCost);

        return {
          productId: item.productId,
          orderedQuantity: quantity,
          receivedQuantity: 0,
          unitCost,
          totalCost: quantity * unitCost,
        };
      });

      const subtotal = normalizedItems.reduce(
        (sum: number, item: any) => sum + item.totalCost,
        0
      );

      const taxAmount = Number(tax);
      const shippingAmount = Number(shippingCost);
      const totalAmount = subtotal + taxAmount + shippingAmount;

      if (!Number.isFinite(totalAmount)) {
        throw new Error("INVALID_TOTAL");
      }

      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId,
          subtotal,
          tax: taxAmount,
          shippingCost: shippingAmount,
          totalAmount,
          notes: notes.trim() || null,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          items: {
            create: normalizedItems,
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Purchase order updated successfully",
      purchaseOrder: result,
    });
  } catch (error) {
    console.error("PUT purchase order error:", error);

    const message = error instanceof Error ? error.message : "";

    if (message === "PURCHASE_ORDER_NOT_FOUND") {
      return errorResponse("Purchase order not found", 404);
    }

    if (message === "ONLY_DRAFT_CAN_BE_EDITED") {
      return errorResponse("Only draft purchase orders can be edited", 409);
    }

    if (message === "SUPPLIER_NOT_AVAILABLE") {
      return errorResponse("Supplier not found or inactive", 404);
    }

    if (message === "PRODUCT_NOT_FOUND") {
      return errorResponse("One or more products were not found", 404);
    }

    if (message === "INVALID_TOTAL") {
      return errorResponse("Invalid purchase order total");
    }

    return errorResponse("Failed to update purchase order", 500);
  }
}

// PATCH: Change Purchase Order status
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth) {
      return errorResponse("Unauthorized access", 401);
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!["ORDERED", "CANCELLED"].includes(status)) {
      return errorResponse(
        "Allowed status changes: ORDERED or CANCELLED"
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!purchaseOrder) {
        throw new Error("PURCHASE_ORDER_NOT_FOUND");
      }

      if (purchaseOrder.status !== "DRAFT") {
        throw new Error("INVALID_STATUS_TRANSITION");
      }

      if (status === "ORDERED" && purchaseOrder.items.length === 0) {
        throw new Error("EMPTY_PURCHASE_ORDER");
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status,
          ...(status === "ORDERED"
            ? { orderedAt: new Date() }
            : {}),
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Purchase order ${status.toLowerCase()} successfully`,
      purchaseOrder: result,
    });
  } catch (error) {
    console.error("PATCH purchase order error:", error);

    const message = error instanceof Error ? error.message : "";

    if (message === "PURCHASE_ORDER_NOT_FOUND") {
      return errorResponse("Purchase order not found", 404);
    }

    if (message === "INVALID_STATUS_TRANSITION") {
      return errorResponse("Only draft orders can change to this status", 409);
    }

    if (message === "EMPTY_PURCHASE_ORDER") {
      return errorResponse("Cannot order an empty purchase order");
    }

    return errorResponse("Failed to update purchase order status", 500);
  }
}

// DELETE: Delete Draft Purchase Order only
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth) {
      return errorResponse("Unauthorized access", 401);
    }

    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!purchaseOrder) {
        throw new Error("PURCHASE_ORDER_NOT_FOUND");
      }

      if (purchaseOrder.status !== "DRAFT") {
        throw new Error("ONLY_DRAFT_CAN_BE_DELETED");
      }

      if (purchaseOrder.items.some((item) => item.receivedQuantity > 0)) {
        throw new Error("ITEMS_ALREADY_RECEIVED");
      }

      await tx.purchaseOrder.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Draft purchase order deleted successfully",
    });
  } catch (error) {
    console.error("DELETE purchase order error:", error);

    const message = error instanceof Error ? error.message : "";

    if (message === "PURCHASE_ORDER_NOT_FOUND") {
      return errorResponse("Purchase order not found", 404);
    }

    if (message === "ONLY_DRAFT_CAN_BE_DELETED") {
      return errorResponse("Only draft purchase orders can be deleted", 409);
    }

    if (message === "ITEMS_ALREADY_RECEIVED") {
      return errorResponse("Cannot delete an order with received items", 409);
    }

    return errorResponse("Failed to delete purchase order", 500);
  }
}
