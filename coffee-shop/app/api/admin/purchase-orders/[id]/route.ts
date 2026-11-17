
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PurchaseOrderItemInput = {
  productId: string;
  orderedQuantity: number;
  unitCost: number;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

async function authorizeAdmin() {
  const auth = await getcurrentuser();

  if (!auth?.id || auth.role !== "ADMIN") {
    return null;
  }

  return auth;
}

function isValidAmount(value: unknown): boolean {
  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= 1_000_000_000
  );
}

// GET: Purchase Order Details
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

    if (!id?.trim()) {
      return errorResponse("Invalid purchase order ID");
    }

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

    if (!id?.trim()) {
      return errorResponse("Invalid purchase order ID");
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body");
    }

    const {
      supplierId,
      items,
      tax = 0,
      shippingCost = 0,
      notes = "",
      expectedDate,
    } = body;

    if (
      typeof supplierId !== "string" ||
      !supplierId.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return errorResponse(
        "Supplier and at least one item are required"
      );
    }

    if (items.length > 100) {
      return errorResponse("Maximum 100 items allowed");
    }

    if (!isValidAmount(tax) || !isValidAmount(shippingCost)) {
      return errorResponse("Invalid tax or shipping cost");
    }

    if (typeof notes !== "string" || notes.length > 1000) {
      return errorResponse("Notes must be under 1000 characters");
    }

    let parsedExpectedDate: Date | null = null;

    if (expectedDate !== undefined && expectedDate !== null && expectedDate !== "") {
      if (typeof expectedDate !== "string") {
        return errorResponse("Invalid expected date");
      }

      parsedExpectedDate = new Date(expectedDate);

      if (Number.isNaN(parsedExpectedDate.getTime())) {
        return errorResponse("Invalid expected date");
      }
    }

    const normalizedItems: PurchaseOrderItemInput[] = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        return errorResponse("Invalid purchase order item");
      }

      const productId = item.productId;
      const quantity = Number(item.orderedQuantity);
      const unitCost = Number(item.unitCost);

      if (
        typeof productId !== "string" ||
        !productId.trim() ||
        !Number.isSafeInteger(quantity) ||
        quantity <= 0 ||
        quantity > 1_000_000 ||
        !isValidAmount(unitCost)
      ) {
        return errorResponse("Invalid product quantity or unit cost");
      }

      normalizedItems.push({
        productId,
        orderedQuantity: quantity,
        unitCost,
      });
    }

    const productIds = normalizedItems.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      return errorResponse("Duplicate products are not allowed");
    }

    const subtotal = normalizedItems.reduce(
      (sum, item) => sum + item.orderedQuantity * item.unitCost,
      0
    );

    const taxAmount = Number(tax);
    const shippingAmount = Number(shippingCost);
    const totalAmount = subtotal + taxAmount + shippingAmount;

    if (
      !Number.isFinite(subtotal) ||
      !Number.isFinite(totalAmount) ||
      totalAmount > 1_000_000_000
    ) {
      return errorResponse("Invalid purchase order total");
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new Error("PURCHASE_ORDER_NOT_FOUND");
      }

      if (existing.status !== "DRAFT") {
        throw new Error("ONLY_DRAFT_CAN_BE_EDITED");
      }

      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, isActive: true },
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

      // Conditional update prevents editing an order that is no longer a draft.
      const updateResult = await tx.purchaseOrder.updateMany({
        where: {
          id,
          status: "DRAFT",
        },
        data: {
          supplierId,
          subtotal,
          tax: taxAmount,
          shippingCost: shippingAmount,
          totalAmount,
          notes: notes.trim() || null,
          expectedDate: parsedExpectedDate,
        },
      });

      if (updateResult.count !== 1) {
        throw new Error("ONLY_DRAFT_CAN_BE_EDITED");
      }

      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      await tx.purchaseOrderItem.createMany({
        data: normalizedItems.map((item) => ({
          purchaseOrderId: id,
          productId: item.productId,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: 0,
          unitCost: item.unitCost,
          totalCost: item.orderedQuantity * item.unitCost,
        })),
      });

      return tx.purchaseOrder.findUniqueOrThrow({
        where: { id },
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
      return errorResponse(
        "Only draft purchase orders can be edited",
        409
      );
    }

    if (message === "SUPPLIER_NOT_AVAILABLE") {
      return errorResponse("Supplier not found or inactive", 404);
    }

    if (message === "PRODUCT_NOT_FOUND") {
      return errorResponse("One or more products were not found", 404);
    }

    return errorResponse("Failed to update purchase order", 500);
  }
}

// PATCH: Change Purchase Order Status
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

    if (!id?.trim()) {
      return errorResponse("Invalid purchase order ID");
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body");
    }

    const status = body.status;

    if (status !== "ORDERED" && status !== "CANCELLED") {
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

      const updateResult = await tx.purchaseOrder.updateMany({
        where: {
          id,
          status: "DRAFT",
        },
        data: {
          status,
          ...(status === "ORDERED"
            ? { orderedAt: new Date() }
            : {}),
        },
      });

      if (updateResult.count !== 1) {
        throw new Error("INVALID_STATUS_TRANSITION");
      }

      return tx.purchaseOrder.findUniqueOrThrow({
        where: { id },
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
      return errorResponse(
        "Only draft orders can change to this status",
        409
      );
    }

    if (message === "EMPTY_PURCHASE_ORDER") {
      return errorResponse("Cannot order an empty purchase order");
    }

    return errorResponse("Failed to update purchase order status", 500);
  }
}

// DELETE: Delete Draft Purchase Order
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

    if (!id?.trim()) {
      return errorResponse("Invalid purchase order ID");
    }

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

      if (
        purchaseOrder.items.some(
          (item) => item.receivedQuantity > 0
        )
      ) {
        throw new Error("ITEMS_ALREADY_RECEIVED");
      }

      const deleteResult = await tx.purchaseOrder.deleteMany({
        where: {
          id,
          status: "DRAFT",
        },
      });

      if (deleteResult.count !== 1) {
        throw new Error("ONLY_DRAFT_CAN_BE_DELETED");
      }
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
      return errorResponse(
        "Only draft purchase orders can be deleted",
        409
      );
    }

    if (message === "ITEMS_ALREADY_RECEIVED") {
      return errorResponse(
        "Cannot delete an order with received items",
        409
      );
    }

    return errorResponse("Failed to delete purchase order", 500);
  }
}
