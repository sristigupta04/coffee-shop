import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Admin User
  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@example.com",
      password: "123456", // Later hash with bcrypt
      role: Role.ADMIN,
    },
  });

  // Sample Products
  await prisma.product.createMany({
    data: [
      {
        name: "Espresso",
        description: "Strong black coffee",
        price: 120,
        image: "/images/espresso.jpg",
        category: "Espresso",
        stock: 20,
      },
      {
        name: "Cappuccino",
        description: "Coffee with steamed milk",
        price: 180,
        image: "/images/cappuccino.jpg",
        category: "Milk Coffee",
        stock: 25,
      },
      {
        name: "Latte",
        description: "Creamy latte coffee",
        price: 200,
        image: "/images/latte.jpg",
        category: "Milk Coffee",
        stock: 30,
      },
      {
        name: "Mocha",
        description: "Chocolate flavored coffee",
        price: 220,
        image: "/images/mocha.jpg",
        category: "Special",
        stock: 15,
      },
    ],
  });

  console.log("✅ Database Seeded");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });