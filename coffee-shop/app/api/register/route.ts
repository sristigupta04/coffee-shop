import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, email, phone, password } = body;

    if (!name || !email ||!phone || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();
    let normalizedPhone = String(phone).trim();
 
    

    normalizedPhone = normalizedPhone.replace(/\D/g, "");
    if(/^\d{10}$/.test(normalizedPhone)){
      normalizedPhone = "+91" + normalizedPhone;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email format",
        },
        { status: 400 }
      );
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid phone format",
        },
        { status: 400 }
      );
    }

    if(String(password).length < 6){
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters long",
        },
        { status: 400 }
      );
    } 

    const existingemail = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingemail) {
      return NextResponse.json(
        {
          success: false,
          message: "Email already exists",
        },
        { status: 409 }
      );
    }

    const existingphone = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
      },
    });

    if (existingphone) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number already exists",
        },
        { status: 409 }
      );
    }

  
    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        data: user,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}