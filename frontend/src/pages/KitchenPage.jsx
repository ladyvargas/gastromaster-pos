import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { formatMoney } from "../lib/money.js";
import { getSocket } from "../lib/socket.js";

const STATUSES=["SENT_TO_KITCHEN","IN_PREP","READY"];

export default function KitchenPage(){
  const [orders,setOrders]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState(null);

  async function load(){
    setLoading(true); setErr(null);
    try{
      const all=[];
      for(const st of STATUSES){
        const r=await api.getOrders(st);
        all.push(...r.data);
      }
      all.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      setOrders(all);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{
    load();
    const s=getSocket();
    const onUpdate=()=>load();
    s.on("order:new", onUpdate);
    s.on("order:updated", onUpdate);
    return ()=>{ s.off("order:new", onUpdate); s.off("order:updated", onUpdate); };
  },[]);

  async function setStatus(id,status){
    await api.setOrderStatus(id,status);
    await load();
  }

  return (
    <div className="card">
      <div className="row">
        <h2 style={{margin:0}}>Cocina</h2>
        <button className="btn secondary" onClick={load}>Refrescar</button>
      </div>
      <div className="muted" style={{marginTop:8}}>Cola de pedidos en cocina.</div>
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
                <div className="row" style={{gap:8}}>
                  {o.status!=="IN_PREP" && o.status!=="READY" && <button className="btn" onClick={()=>setStatus(o.id,"IN_PREP")}>Iniciar</button>}
                  {o.status!=="READY" && <button className="btn" onClick={()=>setStatus(o.id,"READY")}>Listo</button>}
                </div>
              </div>
              <div className="hr" />
              <div className="muted" style={{fontWeight:900}}>Items</div>
              <div className="muted" style={{marginTop:8}}>
                {o.items?.map(it=>(<div key={it.id}>{it.qty}× {it.product?.name}</div>))}
              </div>
            </div>
          ))}
          {orders.length===0 && <div className="muted">Sin pedidos por ahora.</div>}
        </div>
      )}
    </div>
  );
}
