import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { formatMoney } from "../lib/money.js";
import { getSocket } from "../lib/socket.js";

function Pill({ status }) {
  const cls = status === "FREE" ? "free" : status === "OCCUPIED" ? "occupied" : "reserved";
  return <span className={`pill ${cls}`}>{status}</span>;
}

export default function TablesPage(){
  const [tables,setTables]=useState([]);
  const [products,setProducts]=useState([]);
  const [activeTable,setActiveTable]=useState(null);
  const [activeOrder,setActiveOrder]=useState(null);
  const [cart,setCart]=useState({});
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState(null);
  const [err,setErr]=useState(null);

  const cartItems = useMemo(()=>Object.values(cart),[cart]);
  const total = useMemo(()=>cartItems.reduce((a,it)=>a+it.qty*it.priceCents,0),[cartItems]);

  async function load(){
    setLoading(true); setErr(null);
    try{
      const [t,p]=await Promise.all([api.getTables(), api.getProducts()]);
      setTables(t.data); setProducts(p.data);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{
    load();
    const s=getSocket();
    const onUpdate=()=>load();
    s.on("table:updated", onUpdate);
    s.on("order:new", onUpdate);
    s.on("order:updated", onUpdate);
    return ()=>{
      s.off("table:updated", onUpdate);
      s.off("order:new", onUpdate);
      s.off("order:updated", onUpdate);
    };
  },[]);

  async function openTable(t){
    setMsg(null); setErr(null);
    setActiveTable(t);
    try{
      const res=await api.openOrderForTable(t.id);
      setActiveOrder(res.data);
      setCart({});
    }catch(e){ setErr(e.message); }
  }

  function add(p){
    setCart(prev=>{
      const ex=prev[p.id]; const qty=(ex?.qty||0)+1;
      return {...prev, [p.id]: {...p, qty}};
    });
  }
  const inc=(id)=>setCart(prev=>({...prev,[id]:{...prev[id],qty:prev[id].qty+1}}));
  const dec=(id)=>setCart(prev=>{
    const q=prev[id].qty-1;
    if(q<=0){ const {[id]:_,...rest}=prev; return rest; }
    return {...prev,[id]:{...prev[id],qty:q}};
  });

  async function sendToKitchen(){
    if(!activeOrder) return;
    setMsg(null); setErr(null);
    try{
      if(cartItems.length){
        await api.addItems(activeOrder.id,{items:cartItems.map(it=>({productId:it.id, qty:it.qty}))});
      }
      await api.setOrderStatus(activeOrder.id,"SENT_TO_KITCHEN");
      setMsg("Enviado a cocina ✅");
      setCart({});
      const o=await api.getOrder(activeOrder.id);
      setActiveOrder(o.data);
    }catch(e){ setErr(e.message); }
  }

  return (
    <div className="grid2">
      <section className="card">
        <div className="row">
          <h2 style={{margin:0}}>Mesas</h2>
          <button className="btn secondary" onClick={load}>Refrescar</button>
        </div>
        {loading ? <div className="muted">Cargando…</div> : (
          <div className="grid3" style={{marginTop:12}}>
            {tables.map(t=>(
              <div className="tableBox" key={t.id}>
                <div className="row">
                  <div className="kpi">{t.label}</div>
                  <Pill status={t.status} />
                </div>
                <div className="muted">Pedido: {t.currentOrderId?`#${t.currentOrderId}`:"—"}</div>
                <button className="btn" onClick={()=>openTable(t)}>{t.currentOrderId?"Abrir pedido":"Abrir mesa"}</button>
              </div>
            ))}
          </div>
        )}
        {err && <div style={{marginTop:12, background:"#fee2e2", border:"1px solid #fecaca", padding:10, borderRadius:12}}><b>Error:</b> {err}</div>}
      </section>

      <aside className="card">
        <div className="row">
          <h2 style={{margin:0}}>Pedido</h2>
          <span className="muted">{activeTable?`Mesa ${activeTable.label}`:"Selecciona una mesa"}</span>
        </div>
        {msg && <div style={{marginTop:12, background:"#dcfce7", border:"1px solid #bbf7d0", padding:10, borderRadius:12}}>{msg}</div>}
        {err && <div style={{marginTop:12, background:"#fee2e2", border:"1px solid #fecaca", padding:10, borderRadius:12}}><b>Error:</b> {err}</div>}

        {!activeOrder ? <div className="muted" style={{marginTop:12}}>Abre una mesa para empezar.</div> : (
          <div style={{marginTop:12}}>
            <div className="muted">Pedido #{activeOrder.id} — Estado: <b>{activeOrder.status}</b></div>
            <div className="hr" />
            <div className="muted" style={{fontWeight:900}}>Productos</div>
            <div className="grid3" style={{marginTop:10}}>
              {products.map(p=>(
                <div className="item" key={p.id}>
                  <div style={{fontWeight:900}}>{p.name}</div>
                  <div className="muted">{p.sku}</div>
                  <div className="row" style={{marginTop:8}}>
                    <div style={{fontWeight:900}}>{formatMoney(p.priceCents)}</div>
                    <span className="pill">Stock: {p.stock}</span>
                  </div>
                  <div style={{marginTop:10}}>
                    <button className="btn" onClick={()=>add(p)} disabled={p.stock<=0}>Agregar</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hr" />
            <div className="row">
              <div style={{fontWeight:900}}>Carrito</div>
              <div style={{fontWeight:900}}>{formatMoney(total)}</div>
            </div>

            {cartItems.length===0 ? <div className="muted" style={{marginTop:10}}>Sin items.</div> : (
              <div className="list" style={{marginTop:10}}>
                {cartItems.map(it=>(
                  <div className="item" key={it.id}>
                    <div className="row">
                      <div>
                        <div style={{fontWeight:900}}>{it.name}</div>
                        <div className="muted">{formatMoney(it.priceCents)} c/u</div>
                      </div>
                      <div className="row" style={{gap:6}}>
                        <button className="btn secondary" onClick={()=>dec(it.id)}>-</button>
                        <span className="pill">{it.qty}</span>
                        <button className="btn secondary" onClick={()=>inc(it.id)}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="hr" />
            <button className="btn" onClick={sendToKitchen}>Enviar a cocina</button>
          </div>
        )}
      </aside>
    </div>
  );
}
