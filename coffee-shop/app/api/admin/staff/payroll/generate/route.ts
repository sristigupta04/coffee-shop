
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countDays(start: Date, end: Date) {
  return Math.floor(
    (end.getTime() - start.getTime()) / 86400000
  ) + 1;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const periodStart = parseDate(body.periodStart);
    const periodEnd = parseDate(body.periodEnd);

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, message: "Valid payroll dates are required" },
        { status: 400 }
      );
    }

    if (periodEnd < periodStart) {
      return NextResponse.json(
        { success: false, message: "Period end cannot be before period start" },
        { status: 400 }
      );
    }

    const staffId =
      typeof body.staffId === "string" ? body.staffId : null;

    const includeOvertime = body.includeOvertime === true;
    const notes =
      typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null;

    if (body.staffId && !staffId) {
      return NextResponse.json(
        { success: false, message: "Invalid staff ID" },
        { status: 400 }
      );
    }

    const staffRecords = await prisma.staff.findMany({
      where: {
        isActive: true,
        ...(staffId ? { id: staffId } : {}),
      },
      select: {
        id: true,
        name: true,
        baseSalary: true,
      },
    });

    if (staffRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: "No active staff found" },
        { status: 404 }
      );
    }

    const periodDays = countDays(periodStart, periodEnd);

    const attendanceRecords = await prisma.staffAttendance.findMany({
      where: {
        staffId: { in: staffRecords.map((staff) => staff.id) },
        date: {
          gte: periodStart,
          lt: new Date(periodEnd.getTime() + 86400000),
        },
      },
      select: {
        staffId: true,
        status: true,
        overtimeMinutes: true,
      },
    });

    /*
      Approved overtime records are loaded separately.
      The schema's StaffOvertime fields are used here:
      staffId, date, minutes, amount, status.
    */
    let overtimeRecords: Array<{
      staffId: string;
      minutes: number;
      amount: number;
    }> = [];

    if (includeOvertime) {
      overtimeRecords = await prisma.staffOvertime.findMany({
        where: {
          staffId: { in: staffRecords.map((staff) => staff.id) },
          date: {
            gte: periodStart,
            lt: new Date(periodEnd.getTime() + 86400000),
          },
          status: "APPROVED",
        },
        select: {
          staffId: true,
          minutes: true,
          amount: true,
        },
      });
    }

    const createdPayrolls = [];
    let skipped = 0;

    for (const staff of staffRecords) {
      const existing = await prisma.staffPayroll.findUnique({
        where: {
          staffId_periodStart: {
            staffId: staff.id,
            periodStart,
          },
        },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const staffAttendance = attendanceRecords.filter(
        (record) => record.staffId === staff.id
      );

      const presentDays = staffAttendance.filter(
        (record) =>
          record.status === "PRESENT" || record.status === "LATE"
      ).length;

      const absentDays = staffAttendance.filter(
        (record) => record.status === "ABSENT"
      ).length;

      const leaveDays = staffAttendance.filter(
        (record) => record.status === "LEAVE"
      ).length;

      const staffOvertime = overtimeRecords.filter(
        (record) => record.staffId === staff.id
      );

      const overtimeMinutes = staffOvertime.reduce(
        (sum, record) => sum + record.minutes,
        0
      );

      const overtimeAmount = includeOvertime
        ? money(
            staffOvertime.reduce(
              (sum, record) => sum + record.amount,
              0
            )
          )
        : 0;

      /*
        Assumption: baseSalary is monthly salary.
        Basic salary is prorated by calendar days in the selected period,
        using a 30-day payroll month.
        Confirm this rule against your actual salary policy before production.
      */
      const basicSalary = money(
        (staff.baseSalary / 30) * periodDays
      );

      const allowances = 0;
      const deductions = 0;
      const bonus = 0;

      const grossSalary = money(
        basicSalary + allowances + overtimeAmount + bonus
      );

      const netSalary = money(grossSalary - deductions);

      const payrollNumber =
        `PAY-${periodStart.toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

      try {
        const payroll = await prisma.staffPayroll.create({
          data: {
            staffId: staff.id,
            payrollNumber,
            periodStart,
            periodEnd,
            basicSalary,
            allowances,
            deductions,
            overtimeAmount,
            bonus,
            grossSalary,
            netSalary,
            paidAmount: 0,
            workingDays: periodDays,
            presentDays,
            absentDays,
            leaveDays,
            overtimeHours: Number((overtimeMinutes / 60).toFixed(2)),
            notes,
          },
          include: {
            staff: {
              select: {
                name: true,
              },
            },
          },
        });

        createdPayrolls.push({
          id: payroll.id,
          payrollNumber: payroll.payrollNumber,
          staff: payroll.staff,
          netSalary: payroll.netSalary,
        });
      } catch (error) {
        // Handles duplicate generation if another request created it concurrently.
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          skipped++;
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payroll generation completed",
      created: createdPayrolls.length,
      skipped,
      payrolls: createdPayrolls,
    });
  } catch (error) {
    console.error("Generate payroll error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate payroll",
      },
      { status: 500 }
    );
  }
}
