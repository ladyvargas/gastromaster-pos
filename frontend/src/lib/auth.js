const KEY="gm_token"; const UKEY="gm_user";
export function setSession(token,user){localStorage.setItem(KEY,token);localStorage.setItem(UKEY,JSON.stringify(user));}
export function clearSession(){localStorage.removeItem(KEY);localStorage.removeItem(UKEY);}
export function getToken(){return localStorage.getItem(KEY);}
export function getUser(){try{return JSON.parse(localStorage.getItem(UKEY)||"null");}catch{return null;}}
