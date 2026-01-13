import { getToken } from "./auth.js";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
async function request(path, options){
  const token = getToken();
  const res = await fetch(API_URL+path, {
    headers: {"Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}) , ...(options?.headers||{})},
    ...options
  });
  if(!res.ok){
    let body=null; try{body=await res.json();}catch{}
    const msg=body?.error?.message || `HTTP ${res.status}`;
    const err=new Error(msg); err.status=res.status; err.body=body; throw err;
  }
  return res.json();
}
export const api={
  login:(p)=>request("/api/auth/login",{method:"POST",body:JSON.stringify(p)}),
  getTables:()=>request("/api/tables"),
  openOrderForTable:(id)=>request(`/api/tables/${id}/open-order`,{method:"POST"}),
  getProducts:()=>request("/api/products"),
  getOrders:(status="")=>request(`/api/orders${status?`?status=${encodeURIComponent(status)}`:""}`),
  getOrder:(id)=>request(`/api/orders/${id}`),
  addItems:(orderId,p)=>request(`/api/orders/${orderId}/items`,{method:"POST",body:JSON.stringify(p)}),
  setOrderStatus:(orderId,status)=>request(`/api/orders/${orderId}/status`,{method:"PATCH",body:JSON.stringify({status})}),
  payOrder:(orderId)=>request(`/api/orders/${orderId}/pay`,{method:"PATCH"}),
  closeOrder:(orderId)=>request(`/api/orders/${orderId}/close`,{method:"PATCH"}),
  getAdminOrders:()=>request(`/api/admin/orders`),
};
