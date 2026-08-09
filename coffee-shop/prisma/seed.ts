



import { PrismaClient, Role } from "@prisma/client";



const prisma = new PrismaClient();

async function main() {
  // Optional: old data clear
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Admin User
  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@example.com",
      password: "123456",
      role: Role.ADMIN,
    },
  });

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

  const categories = [
    "Espresso",
    "Milk Coffee",
    "Cold Coffee",
    "Special",
    "Dessert",
  ];

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

  const products = Array.from({ length: 200 }, (_, index) => {
    const name = coffeeNames[index % coffeeNames.length];

    return {
      name: `${name} ${Math.floor(index / coffeeNames.length) + 1}`,
      description: `Freshly prepared ${name.toLowerCase()} with rich coffee flavor.`,
      price: 120 + (index % 10) * 20,
      image: images[index % images.length],
      category: categories[index % categories.length],
      stock: 50 + (index % 20) * 5,
    };
  });

  // Create 200 products
  await prisma.product.createMany({
    data: products,
  });

  console.log("✅ 200 products created successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });