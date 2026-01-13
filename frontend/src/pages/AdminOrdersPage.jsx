import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { formatMoney } from "../lib/money.js";
import OrderTimeline from "../components/OrderTimeline.jsx";
import { getSocket } from "../lib/socket.js";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.getAdminOrders();
      setOrders(res.data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const s = getSocket();
    const onUpdate = () => load();
    s.on("order:new", onUpdate);
    s.on("order:updated", onUpdate);
    s.on("table:updated", onUpdate);
    return () => {
      s.off("order:new", onUpdate);
      s.off("order:updated", onUpdate);
      s.off("table:updated", onUpdate);
    };
  }, []);

  async function closeOrder(id) {
    if (!confirm("¿Cerrar pedido (marcar PAID) y liberar mesa?")) return;
    await api.closeOrder(id);
    await load();
  }

  async function setStatus(id, status) {
    await api.setOrderStatus(id, status);
    await load();
  }

  return (
    <div className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>Administración — Pedidos</h2>
        <button className="btn secondary" onClick={load}>
          Refrescar
        </button>
      </div>

      <div className="muted" style={{ marginTop: 8 }}>
        Vista global para auditoría, soporte y cierres.
      </div>

      {err && (
        <div
          style={{
            marginTop: 12,
            background: "#fee2e2",
            border: "1px solid #fecaca",
            padding: 10,
            borderRadius: 12,
          }}
        >
          <b>Error:</b> {err}
        </div>
      )}

      {loading ? (
        <div className="muted" style={{ marginTop: 12 }}>
          Cargando…
        </div>
      ) : (
        <div className="list" style={{ marginTop: 12 }}>
          {orders.map((o) => (
            <div className="item" key={o.id}>
              <div className="row">
                <div>
                  <div style={{ fontWeight: 900 }}>
                    Pedido #{o.id} — Mesa {o.table?.label || "—"}
                  </div>
                  <div className="muted">Mesero: {o.createdBy?.name || "—"}</div>
                </div>
                <div style={{ fontWeight: 900 }}>{formatMoney(o.totalCents)}</div>
              </div>

              <div style={{ marginTop: 10 }}>
                <OrderTimeline status={o.status} />
              </div>

              <div className="hr" />

              <div className="row" style={{ flexWrap: "wrap" }}>
                <span className="pill">{o.status}</span>

                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {o.status !== "CANCELLED" && o.status !== "PAID" && (
                    <button className="btn secondary" onClick={() => setStatus(o.id, "CANCELLED")}>
                      Cancelar
                    </button>
                  )}

                  {o.status !== "PAID" && (
                    <button className="btn" onClick={() => closeOrder(o.id)}>
                      Cerrar (PAID)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {orders.length === 0 && <div className="muted">Sin pedidos.</div>}
        </div>
      )}
    </div>
  );
}
