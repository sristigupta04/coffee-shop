
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};
type AdminCheck =
  | { authorized: true }
  | {
      authorized: false;
      status: 401 | 403;
      message: string;
    };

async function checkAdmin(): Promise<AdminCheck> {
  const user = await getcurrentuser();

  if (!user) {
    return {
      authorized: false,
      status: 401,
      message: "Unauthorized",
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false,
      status: 403,
      message: "Forbidden",
    };
  }

  return { authorized: true };
}
// GET: Fetch single staff member
export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await checkAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await params;

    const staff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Staff member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      staff,
    });
  } catch (error) {
    console.error("GET STAFF DETAILS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch staff details" },
      { status: 500 }
    );
  }
}

// PATCH: Update staff details or status
export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await checkAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existingStaff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!existingStaff) {
      return NextResponse.json(
        { success: false, message: "Staff member not found" },
        { status: 404 }
      );
    }

    const {
      name,
      email,
      phone,
      designation,
      department,
      employmentType,
      joiningDate,
      isActive,
      address,
      notes,
    } = body;

    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json(
        { success: false, message: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (phone !== undefined && (!phone || !phone.trim())) {
      return NextResponse.json(
        { success: false, message: "Phone cannot be empty" },
        { status: 400 }
      );
    }

    if (
      designation !== undefined &&
      (!designation || !designation.trim())
    ) {
      return NextResponse.json(
        { success: false, message: "Designation cannot be empty" },
        { status: 400 }
      );
    }

    if (
      email !== undefined &&
      email !== null &&
      email !== "" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    if (
      employmentType !== undefined &&
      !["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"].includes(
        employmentType
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid employment type" },
        { status: 400 }
      );
    }

    if (
      joiningDate !== undefined &&
      (typeof joiningDate !== "string" ||
        Number.isNaN(Date.parse(joiningDate)))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid joining date" },
        { status: 400 }
      );
    }

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid active status" },
        { status: 400 }
      );
    }

    const normalizedEmail =
      email === undefined
        ? undefined
        : email?.trim().toLowerCase() || null;

    if (normalizedEmail) {
      const duplicateEmail = await prisma.staff.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id },
        },
      });

      if (duplicateEmail) {
        return NextResponse.json(
          { success: false, message: "Email already exists" },
          { status: 409 }
        );
      }
    }

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: normalizedEmail }),
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(designation !== undefined && {
          designation: designation.trim(),
        }),
        ...(department !== undefined && {
          department: department?.trim() || null,
        }),
        ...(employmentType !== undefined && { employmentType }),
        ...(joiningDate !== undefined && {
          joiningDate: new Date(joiningDate),
        }),
        ...(isActive !== undefined && { isActive }),
        ...(address !== undefined && {
          address: address?.trim() || null,
        }),
        ...(notes !== undefined && {
          notes: notes?.trim() || null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Staff updated successfully",
      staff: updatedStaff,
    });
  } catch (error) {
    console.error("UPDATE STAFF ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update staff" },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete staff member
export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await checkAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await params;

    const staff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Staff member not found" },
        { status: 404 }
      );
    }

    await prisma.staff.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    console.error("DELETE STAFF ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete staff member" },
      { status: 500 }
    );
  }
}
