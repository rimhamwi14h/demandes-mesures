import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient, Role } from "../generated/prisma/client.js";

const connectionString = process.env["DATABASE_URL"];
const technicianEmail = process.env["SEED_TECHNICIAN_EMAIL"]
  ?.trim()
  .toLowerCase();
const technicianPassword = process.env["SEED_TECHNICIAN_PASSWORD"];

if (!connectionString || !technicianEmail || !technicianPassword) {
  throw new Error(
    "DATABASE_URL, SEED_TECHNICIAN_EMAIL and " +
      "SEED_TECHNICIAN_PASSWORD must be defined in api/.env.",
  );
}

if (technicianPassword.length < 12) {
  throw new Error("The demonstration password must contain at least 12 characters.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Placeholder names: the client has not provided the real team names.
  const teams = [
    "Équipe 1",
    "Équipe 2",
    "Équipe 3",
    "Équipe 4",
    "Équipe 5",
    "Équipe 6",
  ];

  const passwordHash = await hash(technicianPassword!, 12);

  await prisma.$transaction(async (tx) => {
    await tx.team.createMany({
      data: teams.map((name) => ({ name })),
      skipDuplicates: true,
    });

    const technician = await tx.user.upsert({
      where: {
        email: technicianEmail!,
      },
      update: {},
      create: {
        name: "Julien",
        email: technicianEmail!,
        passwordHash,
        role: Role.TECHNICIAN,
      },
    });

    if (technician.role !== Role.TECHNICIAN) {
      throw new Error(
        "This email already belongs to a non-technician account. " +
          "Choose another SEED_TECHNICIAN_EMAIL.",
      );
    }
  });

  const savedTeams = await prisma.team.findMany({
    select: {
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const savedTechnician = await prisma.user.findUniqueOrThrow({
    where: {
      email: technicianEmail!,
    },
    select: {
      name: true,
      email: true,
      role: true,
    },
  });

  console.log("Database initialization completed.");
  console.table(savedTeams);
  console.table([savedTechnician]);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });