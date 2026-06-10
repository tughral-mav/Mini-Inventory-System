import { PrismaClient, StockMovementType } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Electronics", description: "Phones, laptops, and accessories" },
  { name: "Groceries", description: "Food and household consumables" },
  { name: "Stationery", description: "Office and school supplies" },
];

const products: Record<
  string,
  { name: string; description: string; price: number; stock: number }[]
> = {
  Electronics: [
    { name: "Wireless Mouse", description: "2.4GHz ergonomic mouse", price: 19.99, stock: 42 },
    { name: "USB-C Charger", description: "65W fast charger", price: 29.5, stock: 3 }, // low stock
    { name: "Noise-Cancelling Headphones", description: "Over-ear, 30h battery", price: 129.0, stock: 0 }, // out of stock
  ],
  Groceries: [
    { name: "Olive Oil 1L", description: "Extra virgin", price: 12.75, stock: 60 },
    { name: "Whole Bean Coffee", description: "Medium roast, 1kg", price: 18.0, stock: 4 }, // low stock
  ],
  Stationery: [
    { name: "Gel Pen Pack", description: "Pack of 10, black", price: 6.25, stock: 120 },
    { name: "A4 Notebook", description: "200 pages, ruled", price: 4.5, stock: 2 }, // low stock
  ],
};

// Neon free-tier compute auto-suspends; the first cold connection can time out
// while it wakes. Retry a lightweight ping until the DB responds.
async function warmup(attempts = 15) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await prisma.$queryRaw`select 1`;
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("Database did not wake up after several attempts.");
}

async function main() {
  await warmup();
  console.log("Seeding database...");

  // Idempotent reset so the seed can be re-run safely in development.
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  for (const cat of categories) {
    const category = await prisma.category.create({ data: cat });

    for (const p of products[cat.name]) {
      await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          categoryId: category.id,
          movements: {
            create: {
              delta: p.stock,
              resulting: p.stock,
              type: StockMovementType.INITIAL,
              note: "Initial seed stock",
            },
          },
        },
      });
    }
  }

  const productCount = await prisma.product.count();
  const categoryCount = await prisma.category.count();
  console.log(`Seed complete: ${categoryCount} categories, ${productCount} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
