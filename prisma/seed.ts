import { PrismaClient, Role, TransactionSource, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.festgeldAccount.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      stackUserId: "seed-admin",
      customerId: "10000001",
      displayName: "Admin",
      role: Role.ADMIN
    }
  });

  const customerOne = await prisma.user.create({
    data: {
      stackUserId: "seed-max",
      customerId: "47291836",
      displayName: "Max Mustermann",
      role: Role.CUSTOMER
    }
  });

  const customerTwo = await prisma.user.create({
    data: {
      stackUserId: "seed-erika",
      customerId: "58302714",
      displayName: "Erika Musterfrau",
      role: Role.CUSTOMER
    }
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: customerOne.id,
        type: TransactionType.INCOMING,
        amount: 250000,
        description: "Gehalt April",
        date: new Date("2026-04-01"),
        source: TransactionSource.ADMIN
      },
      {
        userId: customerOne.id,
        type: TransactionType.OUTGOING,
        amount: 7450,
        description: "Stromabschlag",
        date: new Date("2026-04-03"),
        source: TransactionSource.ADMIN
      },
      {
        userId: customerTwo.id,
        type: TransactionType.INCOMING,
        amount: 315000,
        description: "Gehalt April",
        date: new Date("2026-04-01"),
        source: TransactionSource.ADMIN
      },
      {
        userId: customerTwo.id,
        type: TransactionType.OUTGOING,
        amount: 12500,
        description: "Miete",
        date: new Date("2026-04-02"),
        source: TransactionSource.ADMIN
      },
      {
        userId: customerOne.id,
        type: TransactionType.OUTGOING,
        amount: 1800,
        description: "Überweisung an 58302714 · Lunch",
        date: new Date("2026-04-04"),
        source: TransactionSource.TRANSFER,
        transferId: "seed-transfer-1"
      },
      {
        userId: customerTwo.id,
        type: TransactionType.INCOMING,
        amount: 1800,
        description: "Überweisung von 47291836 · Lunch",
        date: new Date("2026-04-04"),
        source: TransactionSource.TRANSFER,
        transferId: "seed-transfer-1"
      }
    ]
  });

  await prisma.festgeldAccount.createMany({
    data: [
      {
        userId: customerOne.id,
        label: "Festgeld 12 Monate",
        amount: 100000,
        interestRate: 3.1,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-01-01")
      },
      {
        userId: customerTwo.id,
        label: "Festgeld 6 Monate",
        amount: 50000,
        interestRate: 2.8,
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-08-01")
      }
    ]
  });

  console.log("Seed fertig", {
    admin: admin.stackUserId,
    customers: [customerOne.stackUserId, customerTwo.stackUserId]
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
