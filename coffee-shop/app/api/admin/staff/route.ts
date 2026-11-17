import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";
export async function GET(req: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 10)
    );

const where: Prisma.StaffWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { designation: { contains: search, mode: "insensitive" } },
      ];
    }

    if (department) {
      where.department = department;
    }

    if (status === "ACTIVE") {
      where.isActive = true;
    } else if (status === "INACTIVE") {
      where.isActive = false;
    }

    const [staff, total, activeCount, inactiveCount] =
      await Promise.all([
        prisma.staff.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),

        prisma.staff.count({ where }),

        prisma.staff.count({ where: { isActive: true } }),

        prisma.staff.count({ where: { isActive: false } }),
      ]);

    return NextResponse.json({
      success: true,
      staff,
      summary: {
        total: activeCount + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET STAFF ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      name,
      email,
      phone,
      designation,
      department,
      employmentType,
      joiningDate,
      address,
      notes,
    } = body;

    if (
      !name?.trim() ||
      !phone?.trim() ||
      !designation?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, phone and designation are required",
        },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    if (
      employmentType &&
      !["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"].includes(
        employmentType
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid employment type" },
        { status: 400 }
      );
    }

    if (email) {
      const existingStaff = await prisma.staff.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (existingStaff) {
        return NextResponse.json(
          { success: false, message: "Email already exists" },
          { status: 409 }
        );
      }
    }

    const staff = await prisma.staff.create({
      data: {
        name: name.trim(),
        email: email?.trim().toLowerCase() || null,
        phone: phone.trim(),
        designation: designation.trim(),
        department: department?.trim() || null,
        employmentType: employmentType || "FULL_TIME",
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        address: address?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Staff member added successfully",
        staff,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE STAFF ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to add staff member" },
      { status: 500 }
    );
  }
}