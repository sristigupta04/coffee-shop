
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReceiveItem = {
  purchaseOrderItemId: string;
  receivedQuantity: number;
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

export async function POST(
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

    let body: { items?: unknown };

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body");
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse(
        "At least one receiving item is required"
      );
    }

    if (body.items.length > 100) {
      return errorResponse("Maximum 100 items allowed");
    }

    const items: ReceiveItem[] = [];

    for (const item of body.items) {
      if (!item || typeof item !== "object") {
        return errorResponse("Invalid receiving item");
      }

      const receivedItem = item as Record<string, unknown>;

      if (
        typeof receivedItem.purchaseOrderItemId !== "string" ||
        !receivedItem.purchaseOrderItemId.trim() ||
        typeof receivedItem.receivedQuantity !== "number" ||
        !Number.isSafeInteger(receivedItem.receivedQuantity) ||
        receivedItem.receivedQuantity <= 0
      ) {
        return errorResponse(
          "Each item requires a valid ID and positive integer quantity"
        );
      }

      items.push({
        purchaseOrderItemId: receivedItem.purchaseOrderItemId,
        receivedQuantity: receivedItem.receivedQuantity,
      });
    }

    const itemIds = items.map(
      (item) => item.purchaseOrderItemId
    );

    if (new Set(itemIds).size !== itemIds.length) {
      return errorResponse(
        "Duplicate purchase order items are not allowed"
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const purchaseOrder = await tx.purchaseOrder.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    stock: true,
                  },
                },
              },
            },
          },
        });

        if (!purchaseOrder) {
          throw new Error("PURCHASE_ORDER_NOT_FOUND");
        }

        if (
          !["ORDERED", "PARTIALLY_RECEIVED"].includes(
            purchaseOrder.status
          )
        ) {
          throw new Error("INVALID_PURCHASE_ORDER_STATUS");
        }

        const receivingSummary: {
          purchaseOrderItemId: string;
          productId: string;
          productName: string;
          receivedQuantity: number;
          remainingQuantity: number;
          previousStock: number;
          newStock: number;
        }[] = [];

        for (const receivedItem of items) {
          const orderItem = purchaseOrder.items.find(
            (item) =>
              item.id === receivedItem.purchaseOrderItemId
          );

          if (!orderItem) {
            throw new Error("PURCHASE_ORDER_ITEM_NOT_FOUND");
          }

          const remainingQuantity =
            orderItem.orderedQuantity -
            orderItem.receivedQuantity;

          if (remainingQuantity <= 0) {
            throw new Error(
              `ITEM_ALREADY_RECEIVED:${orderItem.product.name}`
            );
          }

          if (receivedItem.receivedQuantity > remainingQuantity) {
            throw new Error(
              `RECEIVING_EXCEEDS_ORDERED:${orderItem.product.name}`
            );
          }

          const previousReceived = orderItem.receivedQuantity;
          const newReceived =
            previousReceived + receivedItem.receivedQuantity;

          // Prevent concurrent receiving of the same PO item.
          const itemUpdate = await tx.purchaseOrderItem.updateMany({
            where: {
              id: orderItem.id,
              purchaseOrderId: purchaseOrder.id,
              receivedQuantity: previousReceived,
            },
            data: {
              receivedQuantity: newReceived,
            },
          });

          if (itemUpdate.count !== 1) {
            throw new Error("CONCURRENT_RECEIVING");
          }

          // Safely calculate updated product stock.
          const previousStock = orderItem.product.stock;
          const newStock =
            previousStock + receivedItem.receivedQuantity;

          if (
            !Number.isSafeInteger(previousStock) ||
            !Number.isSafeInteger(newStock) ||
            newStock < 0
          ) {
            throw new Error("INVALID_PRODUCT_STOCK");
          }

          // Update stock with compare-and-update protection.
          const productUpdate = await tx.product.updateMany({
            where: {
              id: orderItem.productId,
              stock: previousStock,
            },
            data: {
              stock: {
                increment: receivedItem.receivedQuantity,
              },
            },
          });

          if (productUpdate.count !== 1) {
            throw new Error("PRODUCT_STOCK_CHANGED");
          }

          // Record inventory movement.
          await tx.stockMovement.create({
            data: {
              productId: orderItem.productId,
              userId: auth.id,
              purchaseOrderId: purchaseOrder.id,
              purchaseOrderItemId: orderItem.id,
              type: "ADD",
              quantity: receivedItem.receivedQuantity,
              previousStock,
              newStock,
              reason: `Purchase Order ${purchaseOrder.orderNumber} receiving`,
            },
          });

          receivingSummary.push({
            purchaseOrderItemId: orderItem.id,
            productId: orderItem.productId,
            productName: orderItem.product.name,
            receivedQuantity: receivedItem.receivedQuantity,
            remainingQuantity:
              orderItem.orderedQuantity - newReceived,
            previousStock,
            newStock,
          });
        }

        // Calculate the final purchase order status.
        const updatedItems = await tx.purchaseOrderItem.findMany({
          where: {
            purchaseOrderId: purchaseOrder.id,
          },
        });

        const allReceived =
          updatedItems.length > 0 &&
          updatedItems.every(
            (item) =>
              item.receivedQuantity >= item.orderedQuantity
          );

        const anyReceived = updatedItems.some(
          (item) => item.receivedQuantity > 0
        );

        const newStatus = allReceived
          ? "RECEIVED"
          : anyReceived
            ? "PARTIALLY_RECEIVED"
            : "ORDERED";

        // Update purchase order status.
        const updatedOrder = await tx.purchaseOrder.update({
          where: { id: purchaseOrder.id },
          data: {
            status: newStatus,
            ...(allReceived
              ? { receivedAt: new Date() }
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

        return {
          purchaseOrder: updatedOrder,
          receivingSummary,
        };
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Stock received and inventory updated successfully",
      ...result,
    });
  } catch (error) {
    console.error("Purchase order receiving error:", error);

    const message =
      error instanceof Error ? error.message : "";

    if (message === "PURCHASE_ORDER_NOT_FOUND") {
      return errorResponse("Purchase order not found", 404);
    }

    if (message === "INVALID_PURCHASE_ORDER_STATUS") {
      return errorResponse(
        "Only ordered or partially received orders can receive stock",
        409
      );
    }

    if (message === "PURCHASE_ORDER_ITEM_NOT_FOUND") {
      return errorResponse(
        "Purchase order item not found",
        404
      );
    }

    if (message.startsWith("RECEIVING_EXCEEDS_ORDERED:")) {
      const productName = message.split(":")[1];

      return errorResponse(
        `Received quantity exceeds remaining quantity for ${productName}`,
        409
      );
    }

    if (message.startsWith("ITEM_ALREADY_RECEIVED:")) {
      return errorResponse(
        "This purchase order item has already been fully received",
        409
      );
    }

    if (message === "CONCURRENT_RECEIVING") {
      return errorResponse(
        "Receiving was updated by another request. Refresh and try again.",
        409
      );
    }

    if (message === "PRODUCT_STOCK_CHANGED") {
      return errorResponse(
        "Product stock changed during receiving. Please retry.",
        409
      );
    }

    if (message === "INVALID_PRODUCT_STOCK") {
      return errorResponse(
        "Invalid product stock value",
        409
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2034"
    ) {
      return errorResponse(
        "A concurrent inventory update occurred. Please retry.",
        409
      );
    }

    return errorResponse(
      "Failed to receive purchase order stock",
      500
    );
  }
}
