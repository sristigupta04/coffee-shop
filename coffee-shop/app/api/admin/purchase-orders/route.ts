
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "DRAFT",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;

type PurchaseOrderStatus = (typeof VALID_STATUSES)[number];

type PurchaseOrderInputItem = {
  productId: string;
  orderedQuantity: number;
  unitCost: number;
};

const MAX_AMOUNT = 9_000_000_000_000;

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user?.id) {
    return {
      authorized: false as const,
      response: errorResponse("Please login first.", 401),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false as const,
      response: errorResponse("Admin access required.", 403),
    };
  }

  return { authorized: true as const };
}

// GET: Purchase Order List
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;

    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");

    const page = rawPage === null ? 1 : Number(rawPage);
    const limit = rawLimit === null ? 20 : Number(rawLimit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1_000_000
    ) {
      return errorResponse("Invalid page number.");
    }

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return errorResponse(
        "Limit must be between 1 and 100."
      );
    }

    const rawStatus = searchParams.get("status");
    const supplierId = searchParams.get("supplierId")?.trim();
    const search = searchParams.get("search")?.trim();

    if (
      rawStatus &&
      rawStatus !== "ALL" &&
      !VALID_STATUSES.includes(rawStatus as PurchaseOrderStatus)
    ) {
      return errorResponse("Invalid purchase order status.");
    }

    if (search && search.length > 200) {
      return errorResponse(
        "Search cannot exceed 200 characters."
      );
    }

    if (supplierId && supplierId.length > 191) {
      return errorResponse("Invalid supplier ID.");
    }

    const status =
      rawStatus && rawStatus !== "ALL"
        ? (rawStatus as PurchaseOrderStatus)
        : undefined;

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(status ? { status } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(search
        ? {
            OR: [
              {
                orderNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                supplier: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [purchaseOrders, totalRecords, statusCounts] =
      await prisma.$transaction([
        prisma.purchaseOrder.findMany({
          where,
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            _count: {
              select: {
                items: true,
              },
            },
          },
          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),

        prisma.purchaseOrder.count({ where }),

        prisma.purchaseOrder.findMany({
          select: {
            status: true,
            totalAmount: true,
          },
        }),
      ]);

    const summary = {
      total: 0,
      draft: 0,
      ordered: 0,
      partiallyReceived: 0,
      received: 0,
      cancelled: 0,
      totalPurchaseValue: 0,
    };

    for (const item of statusCounts) {
      summary.total += 1;
      summary.totalPurchaseValue += item.totalAmount;

      switch (item.status) {
        case "DRAFT":
          summary.draft++;
          break;
        case "ORDERED":
          summary.ordered++;
          break;
        case "PARTIALLY_RECEIVED":
          summary.partiallyReceived++;
          break;
        case "RECEIVED":
          summary.received++;
          break;
        case "CANCELLED":
          summary.cancelled++;
          break;
      }
    }

    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      purchaseOrders,
      summary,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Purchase orders GET error:", error);
    return errorResponse("Failed to fetch purchase orders.", 500);
  }
}

// POST: Create Purchase Order
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await request.json();

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return errorResponse("Invalid request body.");
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return errorResponse("Invalid JSON request body.");
    }

    const supplierId =
      typeof body.supplierId === "string"
        ? body.supplierId.trim()
        : "";

    const items = body.items;
    const tax = body.tax === undefined ? 0 : body.tax;
    const shippingCost =
      body.shippingCost === undefined ? 0 : body.shippingCost;
    const notes = body.notes;
    const expectedDate = body.expectedDate;

    if (!supplierId || supplierId.length > 191) {
      return errorResponse("A valid supplier is required.");
    }

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 100
    ) {
      return errorResponse(
        "Add between 1 and 100 purchase order items."
      );
    }

    const validatedItems: PurchaseOrderInputItem[] = [];
    const productIds = new Set<string>();

    for (const item of items) {
      if (
        typeof item !== "object" ||
        item === null ||
        Array.isArray(item)
      ) {
        return errorResponse("Invalid purchase order item.");
      }

      const productItem = item as Record<string, unknown>;

      const productId =
        typeof productItem.productId === "string"
          ? productItem.productId.trim()
          : "";

      const orderedQuantity = productItem.orderedQuantity;
      const unitCost = productItem.unitCost;

      if (!productId || productId.length > 191) {
        return errorResponse("Invalid product ID.");
      }

      if (productIds.has(productId)) {
        return errorResponse(
          "A product can only appear once in an order."
        );
      }

      if (
        typeof orderedQuantity !== "number" ||
        !Number.isSafeInteger(orderedQuantity) ||
        orderedQuantity <= 0 ||
        orderedQuantity > 2_147_483_647
      ) {
        return errorResponse(
          "Ordered quantity must be a valid positive integer."
        );
      }

      if (
        typeof unitCost !== "number" ||
        !Number.isFinite(unitCost) ||
        unitCost < 0 ||
        unitCost > MAX_AMOUNT
      ) {
        return errorResponse(
          "Unit cost must be a valid non-negative number."
        );
      }

      const itemTotal = orderedQuantity * unitCost;

      if (
        !Number.isFinite(itemTotal) ||
        itemTotal > MAX_AMOUNT
      ) {
        return errorResponse("Invalid item total.");
      }

      productIds.add(productId);

      validatedItems.push({
        productId,
        orderedQuantity,
        unitCost,
      });
    }

    if (
      typeof tax !== "number" ||
      !Number.isFinite(tax) ||
      tax < 0 ||
      tax > MAX_AMOUNT ||
      typeof shippingCost !== "number" ||
      !Number.isFinite(shippingCost) ||
      shippingCost < 0 ||
      shippingCost > MAX_AMOUNT
    ) {
      return errorResponse(
        "Tax and shipping cost must be valid non-negative numbers."
      );
    }

    if (
      notes !== undefined &&
      notes !== null &&
      (typeof notes !== "string" || notes.length > 1000)
    ) {
      return errorResponse(
        "Notes cannot exceed 1000 characters."
      );
    }

    let parsedExpectedDate: Date | null = null;

    if (
      expectedDate !== undefined &&
      expectedDate !== null &&
      expectedDate !== ""
    ) {
      if (
        typeof expectedDate !== "string" ||
        !Number.isFinite(Date.parse(expectedDate))
      ) {
        return errorResponse("Invalid expected delivery date.");
      }

      parsedExpectedDate = new Date(expectedDate);
    }

    const subtotal = validatedItems.reduce(
      (total, item) =>
        total + item.orderedQuantity * item.unitCost,
      0
    );

    const totalAmount = subtotal + tax + shippingCost;

    if (
      !Number.isFinite(subtotal) ||
      !Number.isFinite(totalAmount) ||
      totalAmount > MAX_AMOUNT
    ) {
      return errorResponse("Invalid purchase order total.");
    }

    const purchaseOrder = await prisma.$transaction(
      async (tx) => {
        const supplier = await tx.supplier.findUnique({
          where: { id: supplierId },
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        });

        if (!supplier) {
          throw new Error("SUPPLIER_NOT_FOUND");
        }

        if (!supplier.isActive) {
          throw new Error("SUPPLIER_INACTIVE");
        }

        const products = await tx.product.findMany({
          where: {
            id: { in: [...productIds] },
          },
          select: { id: true },
        });

        if (products.length !== productIds.size) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        const orderNumber = `PO-${Date.now()}-${randomUUID()
          .slice(0, 8)
          .toUpperCase()}`;

        return tx.purchaseOrder.create({
          data: {
            orderNumber,
            supplierId: supplier.id,
            status: "DRAFT",
            subtotal,
            tax,
            shippingCost,
            totalAmount,
            notes:
              typeof notes === "string" && notes.trim()
                ? notes.trim()
                : null,
            expectedDate: parsedExpectedDate,
            items: {
              create: validatedItems.map((item) => ({
                productId: item.productId,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: 0,
                unitCost: item.unitCost,
                totalCost:
                  item.orderedQuantity * item.unitCost,
              })),
            },
          },
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
                  },
                },
              },
            },
          },
        });
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Purchase order created successfully.",
        purchaseOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Purchase order POST error:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "SUPPLIER_NOT_FOUND":
          return errorResponse("Supplier not found.", 404);

        case "SUPPLIER_INACTIVE":
          return errorResponse("This supplier is inactive.");

        case "PRODUCT_NOT_FOUND":
          return errorResponse(
            "One or more products were not found.",
            404
          );
      }
    }

    return errorResponse(
      "Failed to create purchase order.",
      500
    );
  }
}
