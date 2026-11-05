
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

async function getAuthorizedCart(userId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      authorized: false as const,
      status: 401,
      message: "Please login to access your cart.",
    };
  }

  if (session.user.id !== userId) {
    return {
      authorized: false as const,
      status: 403,
      message: "You cannot access another user's cart.",
    };
  }

  return {
    authorized: true as const,
    userId: session.user.id,
  };
}

// Validate customizations and calculate the final unit price.
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
        where: {
          isAvailable: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: {
      sortOrder: "asc",
    },
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
  let finalPrice = 0;

  for (const group of groups) {
    const selection = input.find(
      (item) => item.groupId === group.id
    );

    const selectedIds = selection?.optionIds ?? [];

    if (new Set(selectedIds).size !== selectedIds.length) {
      throw new Error(`Duplicate options in ${group.name}.`);
    }

    const minSelections = group.isRequired
      ? Math.max(1, group.minSelections)
      : group.minSelections;

    if (selectedIds.length < minSelections) {
      throw new Error(
        `Please select at least ${minSelections} option(s) for ${group.name}.`
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

      finalPrice += option.priceAdjustment;
    }
  }

  // Reject selections referring to inactive or nonexistent groups.
  for (const selection of input) {
    if (!groups.some((group) => group.id === selection.groupId)) {
      throw new Error("Invalid or inactive customization group.");
    }
  }

  // Stable key: same selected options always produce the same key.
  const customizationKey = snapshots
    .map((item) => item.optionId)
    .sort()
    .join("_");

  return {
    snapshots,
    customizationKey,
    adjustment: finalPrice,
  };
}

// GET CART
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: userId } = await params;

    const authorization = await getAuthorizedCart(userId);

    if (!authorization.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: authorization.message,
        },
        { status: authorization.status }
      );
    }

    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
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
      message: "Cart fetched successfully.",
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

// PUT CART ITEM / ADD OR UPDATE QUANTITY
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: userId } = await params;

    const authorization = await getAuthorizedCart(userId);

    if (!authorization.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: authorization.message,
        },
        { status: authorization.status }
      );
    }

    const body = await request.json();

    const { productId, quantity, cartItemId } = body;

    const newQuantity = Number(quantity);

    if (
      !Number.isInteger(newQuantity) ||
      newQuantity < 0 ||
      newQuantity > 99
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be an integer between 0 and 99.",
        },
        { status: 400 }
      );
    }

    // Quantity update for a specific cart line.
    // This is important when one product has multiple customizations.
    if (cartItemId) {
      const cart = await prisma.cart.findUnique({
        where: { userId },
      });

      if (!cart) {
        return NextResponse.json(
          { success: false, message: "Cart not found." },
          { status: 404 }
        );
      }

      const existingItem = await prisma.cartItem.findFirst({
        where: {
          id: cartItemId,
          cartId: cart.id,
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { success: false, message: "Cart item not found." },
          { status: 404 }
        );
      }

      if (newQuantity === 0) {
        await prisma.cartItem.delete({
          where: { id: existingItem.id },
        });

        return NextResponse.json({
          success: true,
          message: "Cart item removed.",
        });
      }

      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: true },
      });

      return NextResponse.json({
        success: true,
        message: "Cart quantity updated.",
        data: updatedItem,
      });
    }

    if (typeof productId !== "string" || !productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    if (newQuantity === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Use cartItemId to remove a cart item.",
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 }
      );
    }

    if (!product.isAvailable || product.stock < newQuantity) {
      return NextResponse.json(
        {
          success: false,
          message: "Product is unavailable or has insufficient stock.",
        },
        { status: 400 }
      );
    }

    // If customizations are omitted, preserve the legacy default product line.
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
        { success: false, message: "Invalid calculated price." },
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

    let cartItem;

    if (existingItem) {
      if (newQuantity > product.stock) {
        return NextResponse.json(
          {
            success: false,
            message: "Requested quantity exceeds available stock.",
          },
          { status: 400 }
        );
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          price: unitPrice,
          customizations:
            snapshots.length > 0
              ? (snapshots as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
        include: { product: true },
      });
    } else {
      cartItem = await prisma.cartItem.create({
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
        include: { product: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cart item saved successfully.",
      data: cartItem,
    });
  } catch (error) {
    console.error("UPDATE CART ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update cart item.",
      },
      { status: 400 }
    );
  }
}

// DELETE CART ITEM
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: userId } = await params;

    const authorization = await getAuthorizedCart(userId);

    if (!authorization.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: authorization.message,
        },
        { status: authorization.status }
      );
    }

    const body = await request.json();

    const { cartItemId, productId } = body;

    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return NextResponse.json(
        { success: false, message: "Cart not found." },
        { status: 404 }
      );
    }

    if (cartItemId) {
      const item = await prisma.cartItem.findFirst({
        where: {
          id: cartItemId,
          cartId: cart.id,
        },
      });

      if (!item) {
        return NextResponse.json(
          { success: false, message: "Cart item not found." },
          { status: 404 }
        );
      }

      await prisma.cartItem.delete({
        where: { id: item.id },
      });
    } else if (productId) {
      // Supports the existing Clear Cart flow.
      // Removes every customization variant of this product.
      await prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Cart item ID or product ID is required.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cart item removed successfully.",
    });
  } catch (error) {
    console.error("DELETE CART ITEM ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to remove cart item.",
      },
      { status: 500 }
    );
  }
}
