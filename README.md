# GastroMaster Pro — POS Restaurante (v2)

Incluye: **roles**, **mesas**, **toma de pedidos**, **pantalla cocina**, **caja**, y **sincronización en tiempo real** (Socket.IO).

## Requisitos
- Node.js 20+
- npm 9+

## Backend
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```
API/WS: http://localhost:4000

### Usuarios seed
- Admin: admin@gastromaster.local / Admin123!
- Mesero: waiter@gastromaster.local / Waiter123!
- Cocina: kitchen@gastromaster.local / Kitchen123!
- Caja: cashier@gastromaster.local / Cashier123!

## Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
App: http://localhost:5173

## Roles y pantallas
- WAITER: /tables
- KITCHEN: /kitchen
- CASHIER: /cashier
- ADMIN: acceso a todo


## Admin
- Panel: `/admin/orders` (solo ADMIN)
- Cierre: botón **Cerrar (PAID)** libera la mesa.
