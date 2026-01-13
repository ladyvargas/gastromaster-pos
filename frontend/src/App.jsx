import React, { useState } from "react";
import { NavLink, Routes, Route, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import TablesPage from "./pages/TablesPage.jsx";
import KitchenPage from "./pages/KitchenPage.jsx";
import CashierPage from "./pages/CashierPage.jsx";
import AdminOrdersPage from "./pages/AdminOrdersPage.jsx";
import Guard from "./components/Guard.jsx";
import { clearSession, getUser } from "./lib/auth.js";

export default function App(){
  const nav=useNavigate();
  const [user,setUser]=useState(getUser());

  function logout(){ clearSession(); setUser(null); nav("/login"); }

  return (
    <div>
      <header className="header">
        <div className="header-inner container">
          <div className="brand">
            <div>GastroMaster</div>
            <span className="badge">POS v2</span>
            {user && <span className="pill">{user.role}</span>}
          </div>
          {user ? (
            <nav className="nav">
              {(user.role==="ADMIN"||user.role==="WAITER") && <NavLink to="/tables" className={({isActive})=>isActive?"active":""}>Mesas</NavLink>}
              {(user.role==="ADMIN"||user.role==="KITCHEN") && <NavLink to="/kitchen" className={({isActive})=>isActive?"active":""}>Cocina</NavLink>}
              {(user.role==="ADMIN"||user.role==="CASHIER") && <NavLink to="/cashier" className={({isActive})=>isActive?"active":""}>Caja</NavLink>}
              {user.role==="ADMIN" && <NavLink to="/admin/orders" className={({isActive})=>isActive?"active":""}>Admin</NavLink>}
              <button className="btn secondary" onClick={logout}>Salir</button>
            </nav>
          ) : <div className="muted">Inicia sesión</div>}
        </div>
      </header>

      <main className="container" style={{paddingTop:16}}>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={(u)=>setUser(u)} />} />
          <Route path="/tables" element={<Guard roles={["ADMIN","WAITER"]}><TablesPage/></Guard>} />
          <Route path="/kitchen" element={<Guard roles={["ADMIN","KITCHEN"]}><KitchenPage/></Guard>} />
          <Route path="/cashier" element={<Guard roles={["ADMIN","CASHIER"]}><CashierPage/></Guard>} />
          <Route path="/admin/orders" element={<Guard roles={["ADMIN"]}><AdminOrdersPage/></Guard>} />
          <Route path="*" element={<LoginPage onLogin={(u)=>setUser(u)} />} />
        </Routes>
      </main>
    </div>
  );
}
