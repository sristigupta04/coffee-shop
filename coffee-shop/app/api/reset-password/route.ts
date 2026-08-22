import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Token and password are required.",
        },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    // Hash the raw reset token
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired reset link.",
        },
        { status: 400 }
      );
    }

    // Check expiry
    if (resetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({
        where: {
          id: resetToken.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "This reset link has expired.",
        },
        { status: 400 }
      );
    }

    // Create bcrypt password hash
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("RESET USER ID:", resetToken.userId);
    console.log("RESET HASH LENGTH:", hashedPassword.length);

    // Update the SAME user using userId from reset token
    const updatedUser = await prisma.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        password: hashedPassword,
      },
      select: {
        id: true,
        password: true,
      },
    });

    console.log("RESET UPDATED USER:", updatedUser.id);
    console.log(
      "RESET SAVED HASH LENGTH:",
      updatedUser.password.length
    );

    // Delete token so it cannot be reused
    await prisma.passwordResetToken.delete({
      where: {
        id: resetToken.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to reset password.",
      },
      { status: 500 }
    );
  }
}