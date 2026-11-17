
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function escapePdfText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createPdf(lines: string[]) {
  const commands = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    `(BREWBITES - EMPLOYEE PAYSLIP) Tj`,
    "/F1 10 Tf",
  ];

  lines.forEach((line) => {
    commands.push("0 -24 Td");
    commands.push(`(${escapePdfText(line)}) Tj`);
  });

  commands.push("ET");

  const stream = commands.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatAmount(value: number) {
  return `INR ${Number(value || 0).toFixed(2)}`;
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Payroll ID is required" },
        { status: 400 }
      );
    }

    const payroll = await prisma.staffPayroll.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            name: true,
            email: true,
            designation: true,
            department: true,
            branch: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json(
        { success: false, message: "Payroll record not found" },
        { status: 404 }
      );
    }

    const lines = [
      `Payroll Number: ${payroll.payrollNumber}`,
      `Employee: ${payroll.staff.name}`,
      `Email: ${payroll.staff.email || "N/A"}`,
      `Designation: ${payroll.staff.designation || "N/A"}`,
      `Department: ${payroll.staff.department || "N/A"}`,
      `Branch: ${payroll.staff.branch?.name || "N/A"}`,
      `Period Start: ${formatDate(payroll.periodStart)}`,
      `Period End: ${formatDate(payroll.periodEnd)}`,
      "",
      "SALARY DETAILS",
      `Basic Salary: ${formatAmount(Number(payroll.basicSalary))}`,
      `Allowances: ${formatAmount(Number(payroll.allowances))}`,
      `Overtime Amount: ${formatAmount(Number(payroll.overtimeAmount))}`,
      `Bonus: ${formatAmount(Number(payroll.bonus))}`,
      `Gross Salary: ${formatAmount(Number(payroll.grossSalary))}`,
      `Deductions: ${formatAmount(Number(payroll.deductions))}`,
      `Net Salary: ${formatAmount(Number(payroll.netSalary))}`,
      "",
      "ATTENDANCE DETAILS",
      `Working Days: ${payroll.workingDays}`,
      `Present Days: ${payroll.presentDays}`,
      `Absent Days: ${payroll.absentDays}`,
      `Leave Days: ${payroll.leaveDays}`,
      `Overtime Hours: ${payroll.overtimeHours}`,
      "",
      "PAYMENT DETAILS",
      `Paid Amount: ${formatAmount(Number(payroll.paidAmount))}`,
      `Balance: ${formatAmount(
        Math.max(
          0,
          Number(payroll.netSalary) - Number(payroll.paidAmount)
        )
      )}`,
      `Status: ${payroll.status}`,
      `Payment Date: ${
        payroll.paymentDate
          ? formatDate(payroll.paymentDate)
          : "Not paid"
      }`,
      `Payment Method: ${payroll.paymentMethod || "N/A"}`,
      `Payment Reference: ${payroll.paymentReference || "N/A"}`,
      "",
      `Notes: ${payroll.notes || "N/A"}`,
      "",
      "This is a computer-generated payslip.",
    ];

    const pdf = createPdf(lines);

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${payroll.payrollNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Payslip PDF error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to generate payslip PDF",
      },
      { status: 500 }
    );
  }
}
