
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
// GET: SUPPLIER LIST
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status") || "ALL";

    if (!["ALL", "ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid supplier status." },
        { status: 400 }
      );
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        ...(status === "ACTIVE" ? { isActive: true } : {}),
        ...(status === "INACTIVE" ? { isActive: false } : {}),
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  contactPerson: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  phone: {
                    contains: search,
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(
      (supplier) => supplier.isActive
    ).length;

    return NextResponse.json({
      success: true,
      suppliers,
      summary: {
        totalSuppliers,
        activeSuppliers,
        inactiveSuppliers: totalSuppliers - activeSuppliers,
      },
    });
  } catch (error) {
    console.error("Suppliers GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch suppliers." },
      { status: 500 }
    );
  }
}

// ==========================================
// POST: CREATE SUPPLIER
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();

    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      notes,
    } = body;

    // Required field
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 150
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier name is required (maximum 150 characters).",
        },
        { status: 400 }
      );
    }

    // Optional string validation
    const optionalFields = {
      contactPerson,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      notes,
    };

    for (const [field, value] of Object.entries(optionalFields)) {
      if (
        value !== undefined &&
        value !== null &&
        (typeof value !== "string" || value.length > 500)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid ${field} value.`,
          },
          { status: 400 }
        );
      }
    }

    const cleanEmail =
      typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : null;

    if (
      cleanEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid email address." },
        { status: 400 }
      );
    }

    const cleanPhone =
      typeof phone === "string" && phone.trim()
        ? phone.trim()
        : null;

    // Check duplicate supplier name
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingSupplier) {
      return NextResponse.json(
        {
          success: false,
          message: "A supplier with this name already exists.",
        },
        { status: 409 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        email: cleanEmail,
        phone: cleanPhone,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        pincode: pincode?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Supplier created successfully.",
        supplier,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Suppliers POST error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create supplier." },
      { status: 500 }
    );
  }
}
