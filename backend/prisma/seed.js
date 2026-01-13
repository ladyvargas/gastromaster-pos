import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser({ email, name, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, active: true },
    create: { email, name, role, passwordHash, active: true }
  });
}

async function main() {
  await upsertUser({ email: "admin@gastromaster.local", name: "Admin", password: "Admin123!", role: "ADMIN" });
  await upsertUser({ email: "waiter@gastromaster.local", name: "Mesero", password: "Waiter123!", role: "WAITER" });
  await upsertUser({ email: "kitchen@gastromaster.local", name: "Cocina", password: "Kitchen123!", role: "KITCHEN" });
  await upsertUser({ email: "cashier@gastromaster.local", name: "Caja", password: "Cashier123!", role: "CASHIER" });

  for (let i = 1; i <= 10; i++) {
    const label = `M${i}`;
    await prisma.table.upsert({ where: { label }, update: {}, create: { label, status: "FREE" } });
  }

  const products = [
    { sku: "CAF-ESP-001", name: "Café Espresso", priceCents: 200, stock: 200 },
    { sku: "CAF-LAT-002", name: "Café Latte", priceCents: 350, stock: 120 },
    { sku: "SAN-JAM-003", name: "Sandwich Jamón y Queso", priceCents: 550, stock: 60 },
    { sku: "JUG-NAR-004", name: "Jugo de Naranja", priceCents: 300, stock: 90 },
    { sku: "POS-TOR-005", name: "Postre (Torta)", priceCents: 450, stock: 40 },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { name: p.name, priceCents: p.priceCents, stock: p.stock },
      create: p
    });
  }

  console.log("✅ Seed completado.");
}

main().catch((e)=>{ console.error(e); process.exit(1); }).finally(async()=>{ await prisma.$disconnect(); });
