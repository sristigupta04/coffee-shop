
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

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
// GET: PURCHASE ORDER LIST
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(
      1,
      Number(searchParams.get("page")) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20)
    );

    // Filters
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const search = searchParams.get("search")?.trim();

    const validStatuses = [
      "DRAFT",
      "ORDERED",
      "PARTIALLY_RECEIVED",
      "RECEIVED",
      "CANCELLED",
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid purchase order status.",
        },
        { status: 400 }
      );
    }

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(status
        ? {
            status: status as
              | "DRAFT"
              | "ORDERED"
              | "PARTIALLY_RECEIVED"
              | "RECEIVED"
              | "CANCELLED",
          }
        : {}),

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

    // ==========================================
    // FETCH PURCHASE ORDERS, COUNT AND SUMMARY
    // ==========================================

    const [purchaseOrders, totalRecords, statusCounts] =
      await prisma.$transaction([
        // Purchase order list
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
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * limit,
          take: limit,
        }),

        // Total records matching filters
        prisma.purchaseOrder.count({ where }),

        // All orders for overall summary
        prisma.purchaseOrder.findMany({
          select: {
            status: true,
            totalAmount: true,
          },
        }),
      ]);

    // ==========================================
    // SUMMARY
    // ==========================================

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
          summary.draft += 1;
          break;

        case "ORDERED":
          summary.ordered += 1;
          break;

        case "PARTIALLY_RECEIVED":
          summary.partiallyReceived += 1;
          break;

        case "RECEIVED":
          summary.received += 1;
          break;

        case "CANCELLED":
          summary.cancelled += 1;
          break;
      }
    }

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,
      purchaseOrders,
      summary,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        hasNextPage: page * limit < totalRecords,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Purchase orders GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch purchase orders.",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// POST: CREATE PURCHASE ORDER
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();

    const {
      supplierId,
      items,
      tax = 0,
      shippingCost = 0,
      notes,
      expectedDate,
    } = body;

    // ==========================================
    // VALIDATE SUPPLIER
    // ==========================================

    if (
      typeof supplierId !== "string" ||
      !supplierId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier is required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDATE ITEMS
    // ==========================================

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Add between 1 and 100 purchase order items.",
        },
        { status: 400 }
      );
    }

    const productIds = new Set<string>();

    for (const item of items) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        !item.productId.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid product ID.",
          },
          { status: 400 }
        );
      }

      if (productIds.has(item.productId)) {
        return NextResponse.json(
          {
            success: false,
            message: "A product can only appear once in an order.",
          },
          { status: 400 }
        );
      }

      productIds.add(item.productId);

      if (
        !Number.isSafeInteger(item.orderedQuantity) ||
        item.orderedQuantity <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Ordered quantity must be a positive integer.",
          },
          { status: 400 }
        );
      }

      if (
        typeof item.unitCost !== "number" ||
        !Number.isFinite(item.unitCost) ||
        item.unitCost < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Unit cost must be a valid non-negative number.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(
          item.orderedQuantity * item.unitCost
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid item total.",
          },
          { status: 400 }
        );
      }
    }

    // ==========================================
    // VALIDATE TAX AND SHIPPING
    // ==========================================

    if (
      typeof tax !== "number" ||
      !Number.isFinite(tax) ||
      tax < 0 ||
      typeof shippingCost !== "number" ||
      !Number.isFinite(shippingCost) ||
      shippingCost < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax and shipping cost must be non-negative numbers.",
        },
        { status: 400 }
      );
    }

    if (
      notes !== undefined &&
      notes !== null &&
      (typeof notes !== "string" || notes.length > 1000)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Notes cannot exceed 1000 characters.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDATE EXPECTED DATE
    // ==========================================

    let parsedExpectedDate: Date | null = null;

    if (expectedDate !== undefined && expectedDate !== null) {
      if (
        typeof expectedDate !== "string" ||
        !Number.isFinite(Date.parse(expectedDate))
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid expected delivery date.",
          },
          { status: 400 }
        );
      }

      parsedExpectedDate = new Date(expectedDate);
    }

    // ==========================================
    // DATABASE TRANSACTION
    // ==========================================

    const purchaseOrder = await prisma.$transaction(
      async (tx) => {
        const supplier = await tx.supplier.findUnique({
          where: {
            id: supplierId,
          },
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
            id: {
              in: [...productIds],
            },
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (products.length !== productIds.size) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        const subtotal = items.reduce(
          (
            total: number,
            item: {
              orderedQuantity: number;
              unitCost: number;
            }
          ) =>
            total +
            item.orderedQuantity * item.unitCost,
          0
        );

        const totalAmount = subtotal + tax + shippingCost;

        if (
          !Number.isFinite(subtotal) ||
          !Number.isFinite(totalAmount)
        ) {
          throw new Error("INVALID_ORDER_TOTAL");
        }

        const orderNumber = `PO-${Date.now()}-${randomUUID()
          .slice(0, 8)
          .toUpperCase()}`;

        return tx.purchaseOrder.create({
          data: {
            orderNumber,
            supplierId,
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
              create: items.map(
                (item: {
                  productId: string;
                  orderedQuantity: number;
                  unitCost: number;
                }) => ({
                  productId: item.productId,
                  orderedQuantity: item.orderedQuantity,
                  receivedQuantity: 0,
                  unitCost: item.unitCost,
                  totalCost:
                    item.orderedQuantity * item.unitCost,
                })
              ),
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
      if (error.message === "SUPPLIER_NOT_FOUND") {
        return NextResponse.json(
          {
            success: false,
            message: "Supplier not found.",
          },
          { status: 404 }
        );
      }

      if (error.message === "SUPPLIER_INACTIVE") {
        return NextResponse.json(
          {
            success: false,
            message: "This supplier is inactive.",
          },
          { status: 400 }
        );
      }

      if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json(
          {
            success: false,
            message: "One or more products were not found.",
          },
          { status: 404 }
        );
      }

      if (error.message === "INVALID_ORDER_TOTAL") {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid purchase order total.",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create purchase order.",
      },
      { status: 500 }
    );
  }
}
