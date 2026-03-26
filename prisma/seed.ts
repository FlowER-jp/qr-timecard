import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default admin
  const hashedPassword = await bcrypt.hash("admin1234", 10);
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
    },
  });

  // Create default closing setting (25th of each month)
  const existing = await prisma.closingSetting.findFirst();
  if (!existing) {
    await prisma.closingSetting.create({
      data: { closingDay: 25 },
    });
  }

  // Sample employees
  const employees = [
    { employeeCode: "E001", name: "山田 太郎", pin: "1234" },
    { employeeCode: "E002", name: "鈴木 花子", pin: "5678" },
  ];

  for (const emp of employees) {
    const hashedPin = await bcrypt.hash(emp.pin, 10);
    await prisma.employee.upsert({
      where: { employeeCode: emp.employeeCode },
      update: {},
      create: {
        employeeCode: emp.employeeCode,
        name: emp.name,
        pin: hashedPin,
      },
    });
  }

  console.log("Seed completed.");
  console.log("Admin: username=admin, password=admin1234");
  console.log("Employee E001: PIN=1234");
  console.log("Employee E002: PIN=5678");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
