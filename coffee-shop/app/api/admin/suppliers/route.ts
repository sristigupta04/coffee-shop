
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

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

function optionalString(
  value: unknown,
  field: string,
  maxLength = 500
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`INVALID_FIELD:${field}`);
  }

  return value.trim() || null;
}

// GET: Supplier List
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";

    if (!["ALL", "ACTIVE", "INACTIVE"].includes(status)) {
      return errorResponse("Invalid supplier status.");
    }

    if (search.length > 200) {
      return errorResponse("Search cannot exceed 200 characters.");
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
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
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

    return errorResponse("Failed to fetch suppliers.", 500);
  }
}

// POST: Create Supplier
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

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length > 150) {
      return errorResponse(
        "Supplier name is required (maximum 150 characters)."
      );
    }

    let contactPerson: string | null;
    let email: string | null;
    let phone: string | null;
    let address: string | null;
    let city: string | null;
    let state: string | null;
    let pincode: string | null;
    let notes: string | null;

    try {
      contactPerson = optionalString(
        body.contactPerson,
        "contact person",
        150
      );

      email = optionalString(body.email, "email", 254);
      phone = optionalString(body.phone, "phone", 30);
      address = optionalString(body.address, "address", 500);
      city = optionalString(body.city, "city", 100);
      state = optionalString(body.state, "state", 100);
      pincode = optionalString(body.pincode, "pincode", 20);
      notes = optionalString(body.notes, "notes", 1000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "";

      if (message.startsWith("INVALID_FIELD:")) {
        return errorResponse(
          `Invalid ${message.split(":")[1]} value.`
        );
      }

      throw error;
    }

    const cleanEmail = email?.toLowerCase() ?? null;

    if (
      cleanEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return errorResponse("Invalid email address.");
    }

    // Check duplicate supplier name.
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingSupplier) {
      return errorResponse(
        "A supplier with this name already exists.",
        409
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson,
        email: cleanEmail,
        phone,
        address,
        city,
        state,
        pincode,
        notes,
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

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse(
        "A supplier with these unique details already exists.",
        409
      );
    }

    return errorResponse("Failed to create supplier.", 500);
  }
}
