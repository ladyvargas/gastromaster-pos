import { io } from "socket.io-client";
import { getUser } from "./auth.js";
const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:4000";
let socket=null;
export function getSocket(){
  if(socket) return socket;
  socket = io(WS_URL, { transports:["websocket"] });
  const u=getUser(); if(u?.role) socket.emit("join",{role:u.role});
  return socket;
}
