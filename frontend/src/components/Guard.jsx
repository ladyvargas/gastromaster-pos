import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../lib/auth.js";
export default function Guard({ roles, children }){
  const t=getToken(); const u=getUser();
  if(!t||!u) return <Navigate to="/login" replace />;
  if(roles?.length && !roles.includes(u.role)) return <Navigate to="/login" replace />;
  return children;
}
