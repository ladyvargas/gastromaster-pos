import React, { useState } from "react";
import { api } from "../lib/api.js";
import { setSession } from "../lib/auth.js";

export default function LoginPage({ onLogin }){
  const [email,setEmail]=useState("waiter@gastromaster.local");
  const [password,setPassword]=useState("Waiter123!");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);

  async function submit(e){
    e.preventDefault();
    setLoading(true); setError(null);
    try{
      const res = await api.login({ email, password });
      setSession(res.data.token, res.data.user);
      onLogin?.(res.data.user);
      const role=res.data.user.role;
      if(role==="KITCHEN") window.location.href="/kitchen";
      else if(role==="CASHIER") window.location.href="/cashier";
      else window.location.href="/tables";
    }catch(e){ setError(e.message); }
    finally{ setLoading(false); }
  }

  return (
    <div className="card" style={{maxWidth:520, margin:"0 auto"}}>
      <div className="row">
        <h2 style={{margin:0}}>Iniciar sesión</h2>
        <span className="muted">Demo local</span>
      </div>
      {error && <div style={{marginTop:12, background:"#fee2e2", border:"1px solid #fecaca", padding:10, borderRadius:12}}><b>Error:</b> {error}</div>}
      <form onSubmit={submit} style={{marginTop:12, display:"grid", gap:10}}>
        <label>
          <div className="muted">Email</div>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} style={{width:"100%", padding:10, borderRadius:12, border:"1px solid #e5e7eb"}} />
        </label>
        <label>
          <div className="muted">Contraseña</div>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} style={{width:"100%", padding:10, borderRadius:12, border:"1px solid #e5e7eb"}} />
        </label>
        <button className="btn" disabled={loading}>{loading?"Ingresando...":"Entrar"}</button>
      </form>
    </div>
  );
}
