
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const PAYMENT_METHODS = [
  "BANK_TRANSFER",
  "UPI",
  "CASH",
  "CHEQUE",
  "OTHER",
];

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { getcurrentuser } = await import("@/app/lib/auth");
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const amount = Number(body.amount);
    const paymentMethod = body.paymentMethod;
    const paymentReference =
      typeof body.paymentReference === "string"
        ? body.paymentReference.trim()
        : null;
    const notes =
      typeof body.notes === "string" ? body.notes.trim() : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid payment amount" },
        { status: 400 }
      );
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, message: "Invalid payment method" },
        { status: 400 }
      );
    }

    if (
      typeof body.paymentDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.paymentDate)
    ) {
      return NextResponse.json(
        { success: false, message: "Valid payment date is required" },
        { status: 400 }
      );
    }

    const paymentDate = new Date(`${body.paymentDate}T12:00:00.000Z`);

    if (Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid payment date" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const payroll = await tx.staffPayroll.findUnique({
        where: { id },
      });

      if (!payroll) {
        throw new Error("PAYROLL_NOT_FOUND");
      }

      if (
        payroll.status !== "APPROVED" &&
        payroll.status !== "PARTIALLY_PAID"
      ) {
        throw new Error("PAYROLL_NOT_PAYABLE");
      }

      const outstanding = Math.max(
        payroll.netSalary - payroll.paidAmount,
        0
      );

      if (amount > outstanding) {
        throw new Error("PAYMENT_EXCEEDS_OUTSTANDING");
      }

      const newPaidAmount = payroll.paidAmount + amount;
      const newStatus =
        newPaidAmount >= payroll.netSalary ? "PAID" : "PARTIALLY_PAID";

      return tx.staffPayroll.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paymentDate,
          paymentMethod,
          paymentReference,
          notes: notes || payroll.notes,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Payment amount updated successfully",
      payroll: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PAYROLL_NOT_FOUND") {
        return NextResponse.json(
          { success: false, message: "Payroll not found" },
          { status: 404 }
        );
      }

      if (error.message === "PAYROLL_NOT_PAYABLE") {
        return NextResponse.json(
          { success: false, message: "Payroll is not approved for payment" },
          { status: 400 }
        );
      }

      if (error.message === "PAYMENT_EXCEEDS_OUTSTANDING") {
        return NextResponse.json(
          { success: false, message: "Payment exceeds outstanding amount" },
          { status: 400 }
        );
      }
    }

    console.error("Payroll payment POST error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to record payroll payment" },
      { status: 500 }
    );
  }
}
