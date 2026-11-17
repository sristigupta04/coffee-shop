
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const FIELD_LIMITS = {
  name: 150,
  contactPerson: 150,
  email: 254,
  phone: 30,
  address: 500,
  city: 100,
  state: 100,
  pincode: 20,
  notes: 1000,
} as const;

type SupplierField = keyof typeof FIELD_LIMITS;

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

async function parseBody(
  request: NextRequest
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

// GET: Single Supplier Details
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) return auth.response;

    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("Invalid supplier ID.");
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
        purchaseOrders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],
          take: 10,
        },
      },
    });

    if (!supplier) {
      return errorResponse("Supplier not found.", 404);
    }

    return NextResponse.json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error("Supplier GET error:", error);
    return errorResponse("Failed to fetch supplier.", 500);
  }
}

// PUT: Update Supplier Details
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) return auth.response;

    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("Invalid supplier ID.");
    }

    const body = await parseBody(request);

    if (!body) {
      return errorResponse("Invalid JSON request body.");
    }

    const allowedFields = Object.keys(
      FIELD_LIMITS
    ) as SupplierField[];

    const updateData: Partial<
      Record<SupplierField, string | null>
    > = {};

    for (const field of allowedFields) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) {
        continue;
      }

      const value = body[field];

      if (value !== null && typeof value !== "string") {
        return errorResponse(`Invalid ${field} value.`);
      }

      if (
        typeof value === "string" &&
        value.length > FIELD_LIMITS[field]
      ) {
        return errorResponse(
          `${field} cannot exceed ${FIELD_LIMITS[field]} characters.`
        );
      }

      const trimmedValue =
        typeof value === "string" ? value.trim() : "";

      // Supplier name is required by the Prisma schema.
      if (field === "name") {
        if (!trimmedValue) {
          return errorResponse("A valid supplier name is required.");
        }

        updateData.name = trimmedValue;
      } else {
        updateData[field] = trimmedValue || null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse(
        "Provide at least one valid field to update."
      );
    }

    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)
      ) {
        return errorResponse("Invalid email address.");
      }
    }

    if (updateData.phone && updateData.phone.length < 7) {
      return errorResponse(
        "Phone number must contain at least 7 characters."
      );
    }

    if (
      updateData.pincode &&
      !/^[a-zA-Z0-9 -]+$/.test(updateData.pincode)
    ) {
      return errorResponse("Invalid pincode.");
    }

    if (updateData.name) {
      const duplicate = await prisma.supplier.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: updateData.name,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        return errorResponse(
          "Another supplier already uses this name.",
          409
        );
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData as Prisma.SupplierUpdateInput,
    });

    return NextResponse.json({
      success: true,
      message: "Supplier updated successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Supplier PUT error:", error);

    if (isPrismaError(error, "P2025")) {
      return errorResponse("Supplier not found.", 404);
    }

    if (isPrismaError(error, "P2002")) {
      return errorResponse(
        "A supplier with these unique details already exists.",
        409
      );
    }

    return errorResponse("Failed to update supplier.", 500);
  }
}

// PATCH: Activate / Deactivate Supplier
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) return auth.response;

    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("Invalid supplier ID.");
    }

    const body = await parseBody(request);

    if (!body) {
      return errorResponse("Invalid JSON request body.");
    }

    if (typeof body.isActive !== "boolean") {
      return errorResponse("isActive must be true or false.");
    }

    const result = await prisma.supplier.updateMany({
      where: { id },
      data: {
        isActive: body.isActive,
      },
    });

    if (result.count === 0) {
      return errorResponse("Supplier not found.", 404);
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: body.isActive
        ? "Supplier activated successfully."
        : "Supplier deactivated successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Supplier PATCH error:", error);

    return errorResponse(
      "Failed to update supplier status.",
      500
    );
  }
}

// DELETE: Safe Supplier Deletion
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) return auth.response;

    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("Invalid supplier ID.");
    }

    await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id },
        select: {
          id: true,
          _count: {
            select: {
              purchaseOrders: true,
            },
          },
        },
      });

      if (!supplier) {
        throw new Error("SUPPLIER_NOT_FOUND");
      }

      if (supplier._count.purchaseOrders > 0) {
        throw new Error("SUPPLIER_HAS_PURCHASE_ORDERS");
      }

      const result = await tx.supplier.deleteMany({
        where: {
          id,
          purchaseOrders: {
            none: {},
          },
        },
      });

      if (result.count !== 1) {
        throw new Error("SUPPLIER_HAS_PURCHASE_ORDERS");
      }
    });

    return NextResponse.json({
      success: true,
      message: "Supplier deleted successfully.",
    });
  } catch (error) {
    console.error("Supplier DELETE error:", error);

    const message =
      error instanceof Error ? error.message : "";

    if (message === "SUPPLIER_NOT_FOUND") {
      return errorResponse("Supplier not found.", 404);
    }

    if (message === "SUPPLIER_HAS_PURCHASE_ORDERS") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This supplier has purchase order records and cannot be deleted. Deactivate the supplier instead.",
          suggestion: "Use PATCH with { isActive: false }.",
        },
        { status: 409 }
      );
    }

    if (isPrismaError(error, "P2003")) {
      return errorResponse(
        "Supplier has linked records and cannot be deleted.",
        409
      );
    }

    return errorResponse("Failed to delete supplier.", 500);
  }
}
