export const CATS = {
  'Atração': {icon:'◈',color:'#4979a5'},
  'Restaurante': {icon:'◉',color:'#d07845'},
  'Café': {icon:'◒',color:'#a0784f'},
  'Hotel': {icon:'⌂',color:'#755eae'},
  'Natureza': {icon:'♣',color:'#49816b'},
  'Compras': {icon:'◇',color:'#be6c80'},
  'Transporte': {icon:'➜',color:'#537b8d'},
  'Outro': {icon:'●',color:'#747e80'}
};
export const EXPENSE_CATS = ['Alojamento','Restaurantes','Transportes','Atrações','Compras','Outros'];
export const CURRENCIES = ['EUR','USD','GBP','CHF','JPY','BRL'];
export function h(value) { return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function shortDate(value) {
  if (!value) return 'Sem data';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'short'}).format(date);
}
export function longDate(value) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-PT',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${value}T12:00:00`));
}
export function money(amount,currency='EUR') {
  try { return new Intl.NumberFormat('pt-PT',{style:'currency',currency}).format(Number(amount)||0); }
  catch {return `${Number(amount)||0} ${currency}`;}
}
export function coordsValid(lat, lng) {return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && String(lat).trim()!=='' && String(lng).trim()!=='' && Number(lat)>=-90 && Number(lat)<=90 && Number(lng)>=-180 && Number(lng)<=180;}
export function isoToday() {const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function datesBetween(start, end) {
  if (!start) return [];
  const a = new Date(`${start}T12:00:00`), b = new Date(`${(end||start)}T12:00:00`), out=[];
  if (Number.isNaN(a.getTime())||Number.isNaN(b.getTime())||b<a) return [];
  for (let d=new Date(a);d<=b && out.length<120;d.setDate(d.getDate()+1))out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  return out;
}
export function appleMaps(place, mode='walking') {
  const dest = coordsValid(place.lat, place.lng) ? `${Number(place.lat)},${Number(place.lng)}` : place.address || place.name;
  return `https://maps.apple.com/?daddr=${encodeURIComponent(dest)}&dirflg=${mode==='transit'?'r':mode==='driving'?'d':'w'}`;
}
export function download(name, content, type='text/plain;charset=utf-8') {
  const blob = new Blob([content],{type});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function toCSV(rows, headers) {
  const quote = v => { const raw=String(v??''); const safe=/^[=+@\-\t\r]/.test(raw)?'\''+raw:raw; return `"${safe.replaceAll('"','""')}"`; };
  return '\uFEFF'+[headers.map(quote).join(';'),...rows.map(row=>headers.map(key=>quote(row[key])).join(';'))].join('\r\n');
}
