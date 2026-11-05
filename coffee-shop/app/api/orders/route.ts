
import { prisma } from "@/app/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { getcurrentuser } from "@/app/lib/auth";
import { createactive } from "@/app/lib/activity";

// ==========================================
// GET USER ORDERS
// ==========================================

export async function GET() {
  try {
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      { success: true, data: orders },
      { status: 200 }
    );
  } catch (error) {
    console.error("Orders fetch error:", error);

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ==========================================
// CREATE COD ORDER
// ==========================================

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Request body
    const body = await req.json();

    const {
      address,
      phone,
      paymentWay,
      couponCode,
      orderType,
    } = body;

    const allowedOrderTypes = [
      "DINE_IN",
      "PICKUP",
      "DELIVERY",
    ];

    // This route handles COD only.
    if (paymentWay !== "COD") {
      return NextResponse.json(
        {
          success: false,
          message: "Use the online payment endpoint for online orders",
        },
        { status: 400 }
      );
    }

    if (!allowedOrderTypes.includes(orderType)) {
      return NextResponse.json(
        { success: false, message: "Invalid order type" },
        { status: 400 }
      );
    }

    if (orderType === "DELIVERY" && !address?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery address is required",
        },
        { status: 400 }
      );
    }

    if (orderType !== "DINE_IN" && !phone?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number is required",
        },
        { status: 400 }
      );
    }

    if (
      orderType !== "DINE_IN" &&
      !/^\d{10}$/.test(phone.trim())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid 10-digit phone number",
        },
        { status: 400 }
      );
    }

    // 3. Fetch cart
    const cart = await prisma.cart.findUnique({
      where: {
        userId: user.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400 }
      );
    }

    // 4. Validate products and stock
    for (const item of cart.items) {
      if (!item.product.isAvailable) {
        return NextResponse.json(
          {
            success: false,
            message: `${item.product.name} is not available`,
          },
          { status: 400 }
        );
      }

      if (item.quantity > item.product.stock) {
        return NextResponse.json(
          {
            success: false,
            message: `Insufficient stock for ${item.product.name}`,
          },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(Number(item.price)) ||
        Number(item.price) < 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid cart item: ${item.product.name}`,
          },
          { status: 400 }
        );
      }
    }

    // 5. Calculate item total
    // CartItem.price already includes customization charges.
    const totalPrice = cart.items.reduce(
      (sum, item) =>
        sum + Number(item.price) * item.quantity,
      0
    );

    // 6. Tax calculation (10%)
    const tax = totalPrice * 0.1;
    const subtotal = totalPrice + tax;

    // 7. Coupon validation
    let discountAmount = 0;
    let couponId: string | undefined;
    let couponUsageLimit: number | null = null;

    if (couponCode?.trim()) {
      const coupon = await prisma.coupon.findUnique({
        where: {
          code: couponCode.trim().toUpperCase(),
        },
      });

      if (
        !coupon ||
        !coupon.isActive ||
        coupon.expireDate < new Date()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid or expired coupon code",
          },
          { status: 400 }
        );
      }

      if (subtotal < Number(coupon.minimumAmount)) {
        return NextResponse.json(
          {
            success: false,
            message: `Minimum order amount is ₹${coupon.minimumAmount}`,
          },
          { status: 400 }
        );
      }

      if (
        coupon.usageLimit !== null &&
        coupon.usedCount >= coupon.usageLimit
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Coupon usage limit has been reached",
          },
          { status: 400 }
        );
      }

      // FLAT discount
      if (coupon.discountType === "FLAT") {
        discountAmount = Number(coupon.discount);
      }

      // PERCENTAGE discount
      else if (coupon.discountType === "PERCENTAGE") {
        discountAmount =
          (subtotal * Number(coupon.discount)) / 100;

        if (coupon.maximumDiscount !== null) {
          discountAmount = Math.min(
            discountAmount,
            Number(coupon.maximumDiscount)
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid coupon discount type",
          },
          { status: 400 }
        );
      }

      discountAmount = Math.min(
        Math.max(0, discountAmount),
        subtotal
      );

      couponId = coupon.id;
      couponUsageLimit = coupon.usageLimit;
    }

    // 8. Final amount
    const finalAmount = Math.max(
      0,
      Math.round((subtotal - discountAmount) * 100) / 100
    );

    // 9. Atomic transaction
    const order = await prisma.$transaction(
      async (tx) => {
        // Recheck and decrement stock atomically.
        for (const item of cart.items) {
          const updatedProduct = await tx.product.updateMany({
            where: {
              id: item.productId,
              isAvailable: true,
              stock: {
                gte: item.quantity,
              },
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          if (updatedProduct.count !== 1) {
            throw new Error(
              `Insufficient stock for ${item.product.name}`
            );
          }
        }

        // Atomically reserve coupon usage.
        if (couponId) {
          const couponUpdate = await tx.coupon.updateMany({
            where: {
              id: couponId,
              isActive: true,
              expireDate: {
                gte: new Date(),
              },
              ...(couponUsageLimit !== null
                ? {
                    usedCount: {
                      lt: couponUsageLimit,
                    },
                  }
                : {}),
            },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          });

          if (couponUpdate.count !== 1) {
            throw new Error(
              "Coupon is no longer available"
            );
          }
        }

        // Create order and order items.
        const newOrder = await tx.order.create({
          data: {
            userId: user.id,
            totalPrice: finalAmount,
            status: "PENDING",
            orderType,

            address:
              orderType === "DELIVERY"
                ? address.trim()
                : "",

            phone:
              orderType === "DINE_IN"
                ? ""
                : phone.trim(),

            paymentWay: "COD",
            paymentStatus: "PENDING",

            // Stock has already been deducted above.
            stockDeducted: true,

            discountAmount,

            ...(couponId ? { couponId } : {}),

            items: {
              create: cart.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: Number(item.price),
                customizations:
                  item.customizations ?? undefined,
              })),
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Clear user's cart after successful order creation.
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
          },
        });

        // Create notification.
        await tx.notification.create({
          data: {
            userId: user.id,
            type: "ORDER_UPDATE",
            title: "Order Confirmed",
            message: `Your order #${newOrder.id} has been placed successfully.`,
          },
        });

        return newOrder;
      }
    );

    // 10. Activity log
    await createactive(
      user.id,
      "Order Created",
      `Order with ID ${order.id} has been created successfully.`
    );

    // 11. Success response
    return NextResponse.json(
      {
        success: true,
        message: "Order placed successfully",
        data: order,
        breakdown: {
          itemTotal: totalPrice,
          tax,
          subtotal,
          discountAmount,
          finalAmount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
