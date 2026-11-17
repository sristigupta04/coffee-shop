
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const document = await prisma.staffDocument.findUnique({
      where: { id },
      select: {
        id: true,
        cloudinaryPublicId: true,
        cloudinaryResourceType: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Document not found." },
        { status: 404 }
      );
    }

    if (document.cloudinaryPublicId) {
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return NextResponse.json(
          { success: false, message: "Cloudinary is not configured." },
          { status: 500 }
        );
      }

      const resourceType =
        document.cloudinaryResourceType === "image" ||
        document.cloudinaryResourceType === "video"
          ? document.cloudinaryResourceType
          : "raw";

      const result = await cloudinary.uploader.destroy(
        document.cloudinaryPublicId,
        {
          resource_type: resourceType,
          type: "authenticated",
          invalidate: true,
        }
      );

      if (result.result !== "ok" && result.result !== "not found") {
        return NextResponse.json(
          {
            success: false,
            message: "Unable to delete document from file storage.",
          },
          { status: 502 }
        );
      }
    }

    await prisma.staffDocument.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Staff document deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE STAFF DOCUMENT ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete staff document." },
      { status: 500 }
    );
  }
}
