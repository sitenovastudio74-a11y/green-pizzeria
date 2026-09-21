const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const boatPizzas = [
    "a05cb5b3-31c3-48aa-a927-b99cd4bd3175", // Margherita Boat Pizza
    "1be5093d-3d10-4894-b872-678c266df574", // Funghi Boat Pizza
    "6d3c74b8-b58d-4a76-97b9-126392b93db4", // Piccante Boat Pizza
    "d99ec207-3c4b-4eac-86f9-faf08c8e0926", // Tuscan Verde Boat Pizza
    "f4f4f6c9-97c2-40f3-ad1e-af15d51664a3", // Quattro Formaggi Boat Pizza
    "0b241166-07ba-44b2-bc02-178b5b4e0e20", // The Farm House Boat Pizza
  ];

  const regularPizzas = [
    "1c2608e2-db54-411d-9889-403b316f5809", // Margherita Pizza
    "1eb47d34-b8de-4410-bb1d-6fadce70253d", // Funghi
    "a1f3c7a5-1877-467e-8fb9-9af6729bb682", // Piccante
    "bbc2ea98-b486-4bff-9fa3-76c2a6265bda", // Tuscan Verde
    "fa965fa8-1d20-4c72-9274-b0d768aab618", // Quattro Formaggi
    "0b2daa5a-5aef-452f-9c41-889a02e83ba5", // The Farm House
    "3275e870-673f-49d1-8859-d53ba86e83e6", // Burrata Pesto
  ];

  const pastas = [
    "d5feebe4-5cd7-4639-b11f-901628a8a99f", // Arrabbiata Pasta
    "6cc8cac0-76cb-4be5-baa6-04f85c96bbb5", // Alfredo Pasta
    "346fc87f-8551-426a-9827-2c07faf09d30", // Pesto Pasta
  ];

  const beverages = [
    "0afc323b-3ca4-4b80-83f5-e467f2e14aee", // Coca-Cola
    "6a4cc028-d315-4908-9fdd-b6202971511b", // Sprite
    "16157e7b-7865-4325-92ce-ad2a4a259b70", // Limca
    "cedc398d-8154-4f8b-bae8-329e4d256178", // Diet Coke
  ];

  // 1. Double Boat Combo
  await prisma.combo.create({
    data: {
      name: "Double Boat Combo",
      description:
        "A combo of two authentic Neapolitan-style boat pizzas loaded with premium toppings.",
      price: 399,
      isEligibleForCoupons: false,
      isActive: true,
      sortOrder: 1,
      slots: {
        create: [
          {
            label: "Choice of boat pizza",
            selectCount: 2,
            sortOrder: 0,
            eligibleProducts: {
              create: boatPizzas.map((productId) => ({ productId })),
            },
          },
        ],
      },
    },
  });
  console.log("Created: Double Boat Combo");

  // 2. The Italian Duo (12 inches)
  await prisma.combo.create({
    data: {
      name: "The Italian Duo (12 inches)",
      description:
        "(Also available in onion, no garlic sauce) Choice of any 2 pizza (12 inches) each.",
      price: 799,
      isEligibleForCoupons: false,
      isActive: true,
      sortOrder: 2,
      slots: {
        create: [
          {
            label: "Choice of pizza (12 inches)",
            selectCount: 2,
            sortOrder: 0,
            eligibleProducts: {
              create: regularPizzas.map((productId) => ({ productId })),
            },
          },
        ],
      },
    },
  });
  console.log("Created: The Italian Duo (12 inches)");

  // 3. The Napoli Trio
  await prisma.combo.create({
    data: {
      name: "The Napoli Trio",
      description:
        "Choice of pasta + choice of boat pizza + choice of beverage (250 ml). A wholesome meal.",
      price: 599,
      isEligibleForCoupons: false,
      isActive: true,
      sortOrder: 3,
      slots: {
        create: [
          {
            label: "Choice of pasta",
            selectCount: 1,
            sortOrder: 0,
            eligibleProducts: {
              create: pastas.map((productId) => ({ productId })),
            },
          },
          {
            label: "Choice of boat pizza",
            selectCount: 1,
            sortOrder: 1,
            eligibleProducts: {
              create: boatPizzas.map((productId) => ({ productId })),
            },
          },
          {
            label: "Choice of beverage (250 ml)",
            selectCount: 1,
            sortOrder: 2,
            eligibleProducts: {
              create: beverages.map((productId) => ({ productId })),
            },
          },
        ],
      },
    },
  });
  console.log("Created: The Napoli Trio");

  console.log("\nAll 3 combos created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
