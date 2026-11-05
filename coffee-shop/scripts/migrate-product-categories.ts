
import { prisma } from "../app/lib/prisma";

async function main() {
  console.log("Checking product categories...");

  // Fetch products with their related categories
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  console.log(`Total products found: ${products.length}`);

  // Check products with missing category relations
  const invalidProducts = products.filter(
    (product) =>
      !product.categoryId ||
      !product.category ||
      product.category.id !== product.categoryId
  );

  if (invalidProducts.length > 0) {
    console.error("\nProducts with invalid category relations:");

    invalidProducts.forEach((product) => {
      console.error({
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
      });
    });

    throw new Error(
      `${invalidProducts.length} products have invalid category relations.`
    );
  }

  // Group products by category
  const categorySummary = new Map<
    string,
    { name: string; count: number }
  >();

  for (const product of products) {
    const categoryId = product.category.id;
    const existing = categorySummary.get(categoryId);

    if (existing) {
      existing.count++;
    } else {
      categorySummary.set(categoryId, {
        name: product.category.name,
        count: 1,
      });
    }
  }

  console.log("\nCategory summary:");

  for (const category of categorySummary.values()) {
    console.log(`${category.name}: ${category.count} products`);
  }

  console.log("\nCategory validation completed successfully.");
}

main()
  .catch((error) => {
    console.error("Category validation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
