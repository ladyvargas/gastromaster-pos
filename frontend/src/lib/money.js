export const formatMoney=c=>((c||0)/100).toLocaleString('es-EC',{style:'currency',currency:'USD'});
