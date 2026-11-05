
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";

type CustomizationInput = {
  groupId: string;
  optionIds: string[];
};

type CustomizationSnapshot = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
};

async function validateCustomizations(
  productId: string,
  input: CustomizationInput[] = []
) {
  if (!Array.isArray(input)) {
    throw new Error("Invalid customization data.");
  }

  const groups = await prisma.productCustomizationGroup.findMany({
    where: {
      productId,
      isActive: true,
    },
    include: {
      options: {
        where: { isAvailable: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const selectedGroupIds = new Set<string>();

  for (const selection of input) {
    if (
      !selection ||
      typeof selection.groupId !== "string" ||
      !Array.isArray(selection.optionIds) ||
      !selection.optionIds.every(
        (id) => typeof id === "string"
      )
    ) {
      throw new Error("Invalid customization selection.");
    }

    if (selectedGroupIds.has(selection.groupId)) {
      throw new Error("Duplicate customization group.");
    }

    selectedGroupIds.add(selection.groupId);
  }

  const snapshots: CustomizationSnapshot[] = [];
  let adjustment = 0;

  for (const group of groups) {
    const selection = input.find(
      (item) => item.groupId === group.id
    );

    const selectedIds = selection?.optionIds ?? [];

    if (new Set(selectedIds).size !== selectedIds.length) {
      throw new Error(`Duplicate options in ${group.name}.`);
    }

    const minimum = group.isRequired
      ? Math.max(1, group.minSelections)
      : group.minSelections;

    if (selectedIds.length < minimum) {
      throw new Error(
        `Please select at least ${minimum} option(s) for ${group.name}.`
      );
    }

    if (selectedIds.length > group.maxSelections) {
      throw new Error(
        `You can select maximum ${group.maxSelections} option(s) for ${group.name}.`
      );
    }

    if (
      group.selectionType === "SINGLE" &&
      selectedIds.length > 1
    ) {
      throw new Error(
        `Only one option can be selected for ${group.name}.`
      );
    }

    for (const optionId of selectedIds) {
      const option = group.options.find(
        (item) => item.id === optionId
      );

      if (!option) {
        throw new Error(
          `Invalid or unavailable option in ${group.name}.`
        );
      }

      snapshots.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceAdjustment: option.priceAdjustment,
      });

      adjustment += option.priceAdjustment;
    }
  }

  for (const selection of input) {
    if (!groups.some((group) => group.id === selection.groupId)) {
      throw new Error("Invalid or inactive customization group.");
    }
  }

  const customizationKey = snapshots
    .map((item) => item.optionId)
    .sort()
    .join("_");

  return {
    snapshots,
    customizationKey,
    adjustment,
  };
}

// GET CART
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const cart = await prisma.cart.findUnique({
      where: {
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: cart ? "Cart items found." : "Cart is empty.",
      data: cart,
    });
  } catch (error) {
    console.error("GET CART ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch cart.",
      },
      { status: 500 }
    );
  }
}

// POST - ADD PRODUCT TO CART
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    const { productId, quantity = 1 } = body;

    const newQuantity = Number(quantity);

    if (
      typeof productId !== "string" ||
      !productId.trim() ||
      !Number.isInteger(newQuantity) ||
      newQuantity < 1 ||
      newQuantity > 99
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid product ID and quantity are required.",
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    if (!product.isAvailable || product.stock < newQuantity) {
      return NextResponse.json(
        {
          success: false,
          message: "Product is unavailable or stock is insufficient.",
        },
        { status: 400 }
      );
    }

    const selections: CustomizationInput[] =
      body.customizations === undefined
        ? []
        : body.customizations;

    const {
      snapshots,
      customizationKey,
      adjustment,
    } = await validateCustomizations(productId, selections);

    const unitPrice = product.price + adjustment;

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid calculated price.",
        },
        { status: 400 }
      );
    }

    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_customizationKey: {
          cartId: cart.id,
          productId,
          customizationKey,
        },
      },
    });

    if (existingItem && existingItem.quantity + newQuantity > product.stock) {
      return NextResponse.json(
        {
          success: false,
          message: "Requested quantity exceeds available stock.",
        },
        { status: 400 }
      );
    }

    const cartItem = existingItem
      ? await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + newQuantity,
            price: unitPrice,
            customizations:
              snapshots.length > 0
                ? (snapshots as unknown as Prisma.InputJsonValue)
                : Prisma.JsonNull,
          },
          include: {
            product: true,
          },
        })
      : await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity: newQuantity,
            price: unitPrice,
            customizationKey,
            customizations:
              snapshots.length > 0
                ? (snapshots as unknown as Prisma.InputJsonValue)
                : Prisma.JsonNull,
          },
          include: {
            product: true,
          },
        });

    return NextResponse.json(
      {
        success: true,
        message: "Product added to cart successfully.",
        data: cartItem,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("ADD TO CART ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to add product to cart.",
      },
      { status: 400 }
    );
  }
}
