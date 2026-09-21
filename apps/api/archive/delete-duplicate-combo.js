const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.combo.delete({
    where: { id: "0d3bd95b-9938-439d-b169-181ccb0651bd" },
  });
  console.log("Deleted duplicate Double Boat Combo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
