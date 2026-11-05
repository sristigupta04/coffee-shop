
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
// ROUTE PARAMS
// ==========================================

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ==========================================
// GET: SINGLE SUPPLIER DETAILS
// ==========================================

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

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
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error("Supplier GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch supplier." },
      { status: 500 }
    );
  }
}

// ==========================================
// PUT: UPDATE SUPPLIER DETAILS
// ==========================================

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();

    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found." },
        { status: 404 }
      );
    }

    const allowedFields = [
      "name",
      "contactPerson",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "pincode",
      "notes",
    ] as const;

    const updateData: Record<string, string | null> = {};

    for (const field of allowedFields) {
      if (!(field in body)) continue;

      const value = body[field];

      if (value !== null && typeof value !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid ${field} value.`,
          },
          { status: 400 }
        );
      }

      if (typeof value === "string" && value.length > 500) {
        return NextResponse.json(
          {
            success: false,
            message: `${field} cannot exceed 500 characters.`,
          },
          { status: 400 }
        );
      }

      updateData[field] =
        typeof value === "string" && value.trim()
          ? value.trim()
          : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide at least one field to update.",
        },
        { status: 400 }
      );
    }

    if (
      "name" in updateData &&
      (!updateData.name || updateData.name.length > 150)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid supplier name is required.",
        },
        { status: 400 }
      );
    }

    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid email address." },
          { status: 400 }
        );
      }
    }

    // Check duplicate name
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
        return NextResponse.json(
          {
            success: false,
            message: "Another supplier already uses this name.",
          },
          { status: 409 }
        );
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Supplier updated successfully.",
      supplier,
    });
  } catch (error) {
    console.error("Supplier PUT error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update supplier." },
      { status: 500 }
    );
  }
}

// ==========================================
// PATCH: ACTIVATE / DEACTIVATE SUPPLIER
// ==========================================

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "isActive must be true or false.",
        },
        { status: 400 }
      );
    }

    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found." },
        { status: 404 }
      );
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        isActive: body.isActive,
      },
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

    return NextResponse.json(
      { success: false, message: "Failed to update supplier status." },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE: SAFE SUPPLIER DELETION
// ==========================================

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Check supplier and linked purchase orders
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found." },
        { status: 404 }
      );
    }

    if (supplier._count.purchaseOrders > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This supplier has purchase order records and cannot be deleted. Deactivate the supplier instead.",
          linkedPurchaseOrders: supplier._count.purchaseOrders,
          suggestion: "Use PATCH with { isActive: false }.",
        },
        { status: 409 }
      );
    }

    // Delete only if no purchase orders are linked
    await prisma.supplier.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Supplier deleted successfully.",
    });
  } catch (error) {
    console.error("Supplier DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete supplier.",
      },
      { status: 500 }
    );
  }
}
