
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { cloudinary } from "@/app/lib/cloudinary";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const DOCUMENT_TYPES = [
  "ID_PROOF",
  "ADDRESS_PROOF",
  "RESUME",
  "OFFER_LETTER",
  "JOINING_LETTER",
  "CONTRACT",
  "CERTIFICATE",
  "OTHER",
];

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return { authorized: false, status: 401 };
  }

  if (user.role !== "ADMIN") {
    return { authorized: false, status: 403 };
  }

  return { authorized: true, status: 200 };
}

function uploadToCloudinary(
  buffer: Buffer,
  resourceType: "image" | "raw",
  publicId: string
): Promise<{
  secure_url: string;
  public_id: string;
  resource_type: string;
}> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "brewbitess/staff-documents",
        public_id: publicId,
        resource_type: resourceType,
        type: "authenticated",
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      }
    );

    stream.end(buffer);
  });
}

export async function GET() {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: auth.status }
      );
    }

    const documents = await prisma.staffDocument.findMany({
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    const result = documents.map((document) => {
      const fileUrl =
        document.cloudinaryPublicId &&
        document.cloudinaryResourceType
          ? cloudinary.url(document.cloudinaryPublicId, {
              secure: true,
              sign_url: true,
              type: "authenticated",
              resource_type: document.cloudinaryResourceType,
            })
          : document.fileUrl;

      return {
        ...document,
        fileUrl,
      };
    });

    return NextResponse.json({
      success: true,
      documents: result,
      total: result.length,
    });
  } catch (error) {
    console.error("STAFF DOCUMENTS GET ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch staff documents." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let uploaded:
    | {
        public_id: string;
        resource_type: string;
      }
    | null = null;

  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: auth.status }
      );
    }

    const formData = await req.formData();

    const staffId = String(formData.get("staffId") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const type = String(formData.get("type") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const expiryDateValue = String(formData.get("expiryDate") || "").trim();
    const file = formData.get("file");

    if (!staffId || !name || !type || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Staff, document name, type and file are required." },
        { status: 400 }
      );
    }

    if (name.length > 150) {
      return NextResponse.json(
        { success: false, message: "Document name cannot exceed 150 characters." },
        { status: 400 }
      );
    }

    if (!DOCUMENT_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, message: "Invalid document type." },
        { status: 400 }
      );
    }

    if (description.length > 1000) {
      return NextResponse.json(
        { success: false, message: "Description cannot exceed 1000 characters." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Only PDF, JPG, PNG and WEBP files are allowed." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "File must be smaller than or equal to 10 MB." },
        { status: 400 }
      );
    }

    let expiryDate: Date | null = null;

    if (expiryDateValue) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDateValue)) {
        return NextResponse.json(
          { success: false, message: "Invalid expiry date." },
          { status: 400 }
        );
      }

      expiryDate = new Date(`${expiryDateValue}T00:00:00.000Z`);

      if (
        Number.isNaN(expiryDate.getTime()) ||
        expiryDate.toISOString().slice(0, 10) !== expiryDateValue
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid expiry date." },
          { status: 400 }
        );
      }
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Staff member not found." },
        { status: 404 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const resourceType = file.type === "application/pdf" ? "raw" : "image";

    // Cloudinary raw assets need the extension in their public ID.
    const publicId =
      resourceType === "raw"
        ? `${randomUUID()}.${extension}`
        : randomUUID();

    const buffer = Buffer.from(await file.arrayBuffer());

    const upload = await uploadToCloudinary(
      buffer,
      resourceType,
      publicId
    );

    uploaded = {
      public_id: upload.public_id,
      resource_type: upload.resource_type,
    };

    const document = await prisma.staffDocument.create({
      data: {
        staff: {
          connect: { id: staffId },
        },
        name,
        type: type as Prisma.StaffDocumentCreateInput["type"],
        fileUrl: upload.secure_url,
        mimeType: file.type,
        sizeBytes: file.size,
        expiryDate,
        description: description || null,
        cloudinaryPublicId: upload.public_id,
        cloudinaryResourceType: upload.resource_type,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const fileUrl = cloudinary.url(upload.public_id, {
      secure: true,
      sign_url: true,
      type: "authenticated",
      resource_type: upload.resource_type,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Staff document uploaded successfully.",
        document: {
          ...document,
          fileUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Remove uploaded file if database creation fails.
    if (uploaded) {
      try {
        await cloudinary.uploader.destroy(uploaded.public_id, {
          resource_type: uploaded.resource_type as "image" | "raw",
          type: "authenticated",
        });
      } catch (cleanupError) {
        console.error("CLOUDINARY CLEANUP ERROR:", cleanupError);
      }
    }

    console.error("STAFF DOCUMENT POST ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to upload staff document." },
      { status: 500 }
    );
  }
}
