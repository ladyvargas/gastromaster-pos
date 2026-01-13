import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { formatMoney } from "../lib/money.js";
import { getSocket } from "../lib/socket.js";

export default function CashierPage(){
  const [orders,setOrders]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState(null);

  async function load(){
    setLoading(true); setErr(null);
    try{
      const ready=await api.getOrders("READY");
      const open=await api.getOrders("OPEN");
      const all=[...ready.data,...open.data];
      all.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      setOrders(all);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{
    load();
    const s=getSocket();
    const onUpdate=()=>load();
    s.on("order:updated", onUpdate);
    s.on("table:updated", onUpdate);
    return ()=>{ s.off("order:updated", onUpdate); s.off("table:updated", onUpdate); };
  },[]);

  async function pay(id){
    await api.payOrder(id);
    await load();
  }

  return (
    <div className="card">
      <div className="row">
        <h2 style={{margin:0}}>Caja</h2>
        <button className="btn secondary" onClick={load}>Refrescar</button>
      </div>
      <div className="muted" style={{marginTop:8}}>Pedidos listos o abiertos para cobro.</div>
      {err && <div style={{marginTop:12, background:"#fee2e2", border:"1px solid #fecaca", padding:10, borderRadius:12}}><b>Error:</b> {err}</div>}
      {loading ? <div className="muted" style={{marginTop:12}}>Cargando…</div> : (
        <div className="list" style={{marginTop:12}}>
          {orders.map(o=>(
            <div className="item" key={o.id}>
              <div className="row">
                <div>
                  <div style={{fontWeight:900}}>Pedido #{o.id} — Mesa {o.table?.label}</div>
                  <div className="muted">Estado: <b>{o.status}</b> · Total: <b>{formatMoney(o.totalCents)}</b></div>
                </div>
                <button className="btn" onClick={()=>pay(o.id)} disabled={o.status==="PAID"}>{o.status==="PAID"?"Pagado":"Cobrar"}</button>
              </div>
              <div className="hr" />
              <div className="muted">
                {o.items?.map(it=>(<div key={it.id}>{it.qty}× {it.product?.name}</div>))}
              </div>
            </div>
          ))}
          {orders.length===0 && <div className="muted">No hay pedidos para caja.</div>}
        </div>
      )}
    </div>
  );
}
