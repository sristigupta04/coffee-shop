
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Starting database seed...");

  // 1. Create or update Admin user
  const hashedPassword = await bcrypt.hash("123456", 12);

  await prisma.user.upsert({
    where: {
      email: "admin@example.com",
    },
    update: {
      name: "Admin",
      role: Role.ADMIN,
    },
    create: {
      name: "Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log("Admin user created/updated.");

  // 2. Create categories
  const categoryNames = [
    "Espresso",
    "Milk Coffee",
    "Cold Coffee",
    "Special",
    "Dessert",
  ];

  const categoryMap = new Map<string, string>();

  for (const name of categoryNames) {
    const slug = slugify(name);

    const category = await prisma.category.upsert({
      where: {
        slug,
      },
      update: {
        name,
        isActive: true,
      },
      create: {
        name,
        slug,
        description: `${name} collection at BrewBites.`,
        isActive: true,
      },
    });

    categoryMap.set(name, category.id);
  }

  console.log("Categories created/updated.");

  // 3. Product names
  const coffeeNames = [
    "Espresso",
    "Cappuccino",
    "Latte",
    "Americano",
    "Mocha",
    "Cold Brew",
    "Flat White",
    "Macchiato",
    "Irish Coffee",
    "Vanilla Latte",
    "Caramel Latte",
    "Hazelnut Coffee",
    "Chocolate Mocha",
    "Iced Latte",
    "Iced Mocha",
    "Affogato",
    "Cafe au Lait",
    "Cortado",
    "Black Coffee",
    "Brown Sugar Latte",
  ];

  // 4. Product images
  const images = [
    "/Cappuccino.jpg",
    "/coffee1.jpg",
    "/coffee2.jpg",
    "/coffee3.jpg",
    "/coffee4.jpg",
    "/coffee6.jpg",
    "/hot.png",
    "/cold.png",
    "/desserts.png",
  ];

  // 5. Assign products to categories
  function getCategory(index: number): string {
    if (index % 10 === 0) return "Dessert";
    if (index % 3 === 0) return "Cold Coffee";
    if (index % 3 === 1) return "Milk Coffee";
    if (index % 3 === 2) return "Espresso";

    return "Special";
  }

  // 6. Create or update 200 products
  for (let index = 0; index < 200; index++) {
    const coffeeName = coffeeNames[index % coffeeNames.length];

    const productName = `${coffeeName} ${
      Math.floor(index / coffeeNames.length) + 1
    }`;

    const categoryName = getCategory(index);
    const categoryId = categoryMap.get(categoryName);

    if (!categoryId) {
      throw new Error(`Category not found: ${categoryName}`);
    }

    const productData = {
      name: productName,
      description: `Freshly prepared ${coffeeName.toLowerCase()} with rich coffee flavor.`,
      price: 120 + (index % 10) * 20,
      image: images[index % images.length],
      categoryId,
      stock: 50 + (index % 20) * 5,
      isAvailable: true,
    };

    const existingProduct = await prisma.product.findFirst({
      where: {
        name: productName,
      },
    });

    if (existingProduct) {
      await prisma.product.update({
        where: {
          id: existingProduct.id,
        },
        data: productData,
      });
    } else {
      await prisma.product.create({
        data: productData,
      });
    }
  }

  console.log("200 products created/updated successfully.");
  console.log("Database seeding completed!");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
