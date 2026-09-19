import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

// PATCH — Make address default
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login",
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const address = await prisma.address.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          message: "Address not found",
        },
        { status: 404 }
      );
    }

    if (body.isDefault === true) {
      await prisma.address.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: {
        id,
      },
      data: {
        isDefault: Boolean(body.isDefault),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Default address updated",
      data: updatedAddress,
    });
  } catch (error) {
    console.error("UPDATE ADDRESS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update address",
      },
      { status: 500 }
    );
  }
}


// DELETE — Delete address
export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    const address = await prisma.address.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          message: "Address not found",
        },
        { status: 404 }
      );
    }

    await prisma.address.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("DELETE ADDRESS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete address",
      },
      { status: 500 }
    );
  }
}