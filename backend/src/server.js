import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { validate } from "./lib/validate.js";
import { badRequest, notFound } from "./lib/httpErrors.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { printKitchenTicket } from "./services/printService.js";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: CORS_ORIGIN.length ? CORS_ORIGIN : true,
  credentials: true
};

const io = new SocketIOServer(httpServer, { cors: corsOptions });

app.use(cors(corsOptions));
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

io.on("connection", (socket) => {
  socket.on("join", ({ role }) => { if (role) socket.join(`role:${role}`); });
});

const emitAll = (event, payload) => io.emit(event, payload);

const VALID_STATUSES = [
  "OPEN",
  "SENT_TO_KITCHEN",
  "IN_PREP",
  "READY",
  "SERVED",
  "PAID",
  "CANCELLED"
];

// AUTH
const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(3) });

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const body = validate(LoginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.active) throw badRequest("INVALID_CREDENTIALS", "Credenciales inválidas");

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw badRequest("INVALID_CREDENTIALS", "Credenciales inválidas");

    const token = jwt.sign(
      { sub: user.id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
  } catch (e) { next(e); }
});

app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.user.sub);
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, active: true } });
    res.json({ data: user });
  } catch (e) { next(e); }
});

// TABLES
app.get("/api/tables", requireAuth, async (_req, res, next) => {
  try {
    const tables = await prisma.table.findMany({ orderBy: { label: "asc" }, include: { currentOrder: true } });
    res.json({ data: tables });
  } catch (e) { next(e); }
});

app.patch("/api/tables/:id/status", requireAuth, requireRole("ADMIN", "WAITER", "CASHIER"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = validate(z.object({ status: z.string().min(1) }), req.body);
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) throw notFound("TABLE_NOT_FOUND", "Mesa no encontrada");

    const updated = await prisma.table.update({ where: { id }, data: { status: body.status } });
    emitAll("table:updated", { tableId: id });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

app.post("/api/tables/:id/open-order", requireAuth, requireRole("ADMIN", "WAITER"), async (req, res, next) => {
  try {
    const tableId = Number(req.params.id);
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw notFound("TABLE_NOT_FOUND", "Mesa no encontrada");

    if (table.currentOrderId) {
      const order = await prisma.order.findUnique({
        where: { id: table.currentOrderId },
        include: { items: { include: { product: true } }, table: true }
      });
      return res.json({ data: order });
    }

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { tableId, status: "OPEN", createdByUserId: Number(req.user.sub), totalCents: 0 },
        include: { items: { include: { product: true } }, table: true }
      });

      await tx.table.update({ where: { id: tableId }, data: { status: "OCCUPIED", currentOrderId: order.id } });
      return order;
    });

    emitAll("order:new", { orderId: created.id, tableId });
    emitAll("table:updated", { tableId });
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

// PRODUCTS
app.get("/api/products", requireAuth, async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, sku: true, name: true, priceCents: true, stock: true }
    });
    res.json({ data: products });
  } catch (e) { next(e); }
});

// ORDERS
app.get("/api/orders", requireAuth, async (req, res, next) => {
  try {
    const status = (req.query.status || "").toString().trim();
    const where = status ? { status } : {};
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { table: true, items: { include: { product: true } } }
    });
    res.json({ data: orders });
  } catch (e) { next(e); }
});

app.get("/api/orders/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { table: true, items: { include: { product: true } } }
    });
    if (!order) throw notFound("ORDER_NOT_FOUND", "Pedido no encontrado");
    res.json({ data: order });
  } catch (e) { next(e); }
});


// ADMIN: All orders
app.get("/api/admin/orders", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        table: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } }
      }
    });
    res.json({ data: orders });
  } catch (e) { next(e); }
});


const AddItemsSchema = z.object({
  items: z.array(z.object({ productId: z.number().int().positive(), qty: z.number().int().positive().max(999) })).min(1)
});

app.post("/api/orders/:id/items", requireAuth, requireRole("ADMIN", "WAITER"), async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const body = validate(AddItemsSchema, req.body);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw notFound("ORDER_NOT_FOUND", "Pedido no encontrado");
    if (order.status === "PAID" || order.status === "CANCELLED") throw badRequest("ORDER_CLOSED", "Pedido cerrado");

    const ids = [...new Set(body.items.map(i => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const byId = new Map(products.map(p => [p.id, p]));

    for (const it of body.items) {
      const p = byId.get(it.productId);
      if (!p) throw badRequest("PRODUCT_NOT_FOUND", `Producto no encontrado: ${it.productId}`);
      if (p.stock < it.qty) throw badRequest("INSUFFICIENT_STOCK", `Stock insuficiente para ${p.name}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const it of body.items) {
        const p = byId.get(it.productId);
        await tx.orderItem.create({ data: { orderId, productId: p.id, qty: it.qty, priceCents: p.priceCents } });
        await tx.product.update({ where: { id: p.id }, data: { stock: { decrement: it.qty } } });
      }

      const items = await tx.orderItem.findMany({ where: { orderId } });
      const totalCents = items.reduce((acc, it) => acc + it.qty * it.priceCents, 0);

      return tx.order.update({
        where: { id: orderId },
        data: { totalCents },
        include: { table: true, items: { include: { product: true } } }
      });
    });

    emitAll("order:updated", { orderId });
    res.status(201).json({ data: updated });
  } catch (e) { next(e); }
});

app.patch("/api/orders/:id/status", requireAuth, requireRole("ADMIN", "KITCHEN", "CASHIER", "WAITER"), async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const body = validate(z.object({ status: z.string().min(1) }), req.body);

    if (!VALID_STATUSES.includes(body.status)) {
      throw badRequest("INVALID_STATUS", "Estado no permitido");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true, items: { include: { product: true } } }
    });
    if (!order) throw notFound("ORDER_NOT_FOUND", "Pedido no encontrado");

    const updated = await prisma.order.update({ where: { id: orderId }, data: { status: body.status } });

    if (body.status === "SENT_TO_KITCHEN") await printKitchenTicket(order);

    emitAll("order:updated", { orderId });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

app.patch("/api/orders/:id/pay", requireAuth, requireRole("ADMIN", "CASHIER"), async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw notFound("ORDER_NOT_FOUND", "Pedido no encontrado");

    const paid = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
      const table = await tx.table.findUnique({ where: { id: order.tableId } });
      if (table?.currentOrderId === orderId) {
        await tx.table.update({ where: { id: order.tableId }, data: { status: "FREE", currentOrderId: null } });
      }
      return updated;
    });

    emitAll("order:updated", { orderId });
    emitAll("table:updated", { tableId: order.tableId });
    res.json({ data: paid });
  } catch (e) { next(e); }
});


app.patch("/api/orders/:id/close", requireAuth, requireRole("ADMIN", "CASHIER"), async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw notFound("ORDER_NOT_FOUND", "Pedido no encontrado");

    const paid = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
      const table = await tx.table.findUnique({ where: { id: order.tableId } });
      if (table?.currentOrderId === orderId) {
        await tx.table.update({ where: { id: order.tableId }, data: { status: "FREE", currentOrderId: null } });
      }
      return updated;
    });

    emitAll("order:updated", { orderId });
    emitAll("table:updated", { tableId: order.tableId });
    res.json({ data: paid });
  } catch (e) { next(e); }
});



// ERROR HANDLER
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const payload = { error: { code: err.code || "INTERNAL_ERROR", message: status === 500 ? "Error interno" : (err.message || "Error"), details: err.details } };
  if (status === 500) console.error(err);
  res.status(status).json(payload);
});

httpServer.listen(PORT, () => console.log(`✅ API+WS en http://localhost:${PORT}`));
