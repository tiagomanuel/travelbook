import { all, put, remove, snapshot, replaceAll, makeId, validateBackup } from './db.js';
import { CATS, EXPENSE_CATS, CURRENCIES, h, shortDate, longDate, money, coordsValid, isoToday, datesBetween, appleMaps, download, toCSV } from './utils.js';
import {isConfigured, isDirty, hasPaired, getSyncSummary, saveSyncConfig, disconnect, syncNow} from './sync.js';

const $=selector=>document.querySelector(selector);
const NAV=[['today','◷','Hoje'],['map','▧','Mapa'],['plan','▤','Roteiro'],['expenses','◈','Despesas'],['more','☰','Mais']];
const state={tab:'today',activeTripId:null,mapDay:'all',planDay:null,map:null,searchResults:[],lastSearch:0,pointsMode:false,data:{trips:[],places:[],visits:[],expenses:[]}};
let toastTimer;

function trip(){return state.data.trips.find(t=>t.id===state.activeTripId)||null;}
function places(){return state.data.places.filter(x=>x.tripId===state.activeTripId);}
function visits(){return state.data.visits.filter(x=>x.tripId===state.activeTripId);}
function expenses(){return state.data.expenses.filter(x=>x.tripId===state.activeTripId);}
function placeById(id){return state.data.places.find(p=>p.id===id);}
function find(table,id){return state.data[table].find(r=>r.id===id);}
function sortVisits(a,b){return (a.time||'99:99').localeCompare(b.time||'99:99')||(a.order||0)-(b.order||0);}
function days(){const t=trip();return t?datesBetween(t.startDate,t.endDate):[];}
function chosenDay(){const list=days();if(state.planDay && list.includes(state.planDay))return state.planDay;const today=isoToday();return list.includes(today)?today:(list[0]||today);}
function statusText(){return navigator.onLine?'Online':'Offline · dados locais';}
function btn(action,label,klass='secondary',extra=''){return `<button type="button" class="btn ${klass}" data-action="${h(action)}" ${extra}>${label}</button>`;}
function msgEmpty(icon,title,description,button=''){return `<div class="empty"><div class="empty-icon">${icon}</div><strong>${title}</strong><p>${description}</p>${button}</div>`;}
function cardList(title,content,right=''){return `<section class="card"><div class="card-head"><h2>${title}</h2>${right}</div>${content}</section>`;}
function smallPlaceIcon(category){const cat=CATS[category]||CATS.Outro;return `<span class="row-icon" style="color:${cat.color};background:${cat.color}15">${cat.icon}</span>`;}
function safeHref(url){return h(url);}

async function refresh({preserve=false}={}){
  state.data=await snapshot();
  state.data.trips.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  if(!preserve){const stored=localStorage.getItem('travelbook.activeTripId');if(stored)state.activeTripId=stored;}
  if(!trip())state.activeTripId=state.data.trips[0]?.id||null;
  if(state.activeTripId)localStorage.setItem('travelbook.activeTripId',state.activeTripId);
  else localStorage.removeItem('travelbook.activeTripId');
  render();
}
function renderNav(){
  const html=NAV.map(([key,emoji,label])=>`<button type="button" data-action="tab" data-tab="${key}" class="nav-item ${state.tab===key?'active':''}" ${state.tab===key?'aria-current="page"':''}><span class="nav-emoji" aria-hidden="true">${emoji}</span><span>${label}</span></button>`).join('');
  $('#desktop-nav').innerHTML=html;$('#mobile-nav').innerHTML=html;
  $('#trip-select').innerHTML=state.data.trips.length?state.data.trips.map(t=>`<option value="${h(t.id)}" ${t.id===state.activeTripId?'selected':''}>${h(t.name)}</option>`).join(''):'<option value="">Sem viagens</option>';
  $('#fab').classList.toggle('hidden',!trip() || state.tab==='more');
  const status=$('#connection-status');status.classList.toggle('offline',!navigator.onLine);status.innerHTML=`<span class="connection-dot"></span>${statusText()}`;
}
function render(){
  if(state.map){state.map.remove();state.map=null;}
  renderNav();
  if(!trip()){$('#view').innerHTML=renderWelcome();return;}
  const html={today:renderToday,map:renderMapPage,plan:renderPlan,expenses:renderExpenses,more:renderMore};
  $('#view').innerHTML=(html[state.tab]||html.today)();
  if(state.tab==='map')setTimeout(initMap,50);
}
function navigate(tab){state.tab=tab;if(tab==='plan')state.planDay=chosenDay();if(tab!=='map'){state.searchResults=[];state.pointsMode=false;}render();window.scrollTo({top:0,behavior:'instant'});}
function renderWelcome(){return `<div class="welcome"><div class="welcome-art" aria-hidden="true"></div><div class="eyebrow">UM LUGAR PARA AS VOSSAS VIAGENS</div><h1>As melhores histórias começam com um destino.</h1><p class="subtitle">Guarda locais, organiza visitas por dia, consulta o mapa e acompanha as despesas — numa aplicação pensada para o telemóvel.</p>${btn('new-trip','＋ Criar a primeira viagem','primary full')}${btn('demo','✦ Experimentar com uma viagem de exemplo','ghost full')}<div class="welcome-links"><button class="btn-inline" data-action="sync-settings">☁ Ligar aos dados partilhados</button> · <button class="btn-inline" data-action="show-backup">Importar cópia de segurança</button></div><p class="tip">Os dados estão sempre guardados neste dispositivo. A sincronização entre aparelhos é opcional e requer configurar a Cloudflare.</p></div>`;}
function renderToday(){
  const t=trip(), ps=places(), vs=visits(), es=expenses(), today=chosenDay(), selected=vs.filter(v=>v.date===today).sort(sortVisits);
  const done=selected.filter(v=>v.done).length;
  const hero=`<section class="hero"><div><div class="eyebrow">As aventuras dos Póneis</div><h1>${h(t.destination||t.name)}</h1><small>${h(t.country||'Destino')} · ${t.startDate?`${shortDate(t.startDate)} — ${shortDate(t.endDate||t.startDate)}`:'Datas por definir'}</small></div><div class="hero-actions">${btn('tab','▧ Ver mapa','primary','data-tab="map"')}${btn('new-place','＋ Guardar local','ghost')}</div></section>`;
  const metrics=`<div class="metrics"><div class="metric"><strong>${ps.length}</strong><span>Locais guardados</span></div><div class="metric"><strong>${vs.length}</strong><span>Visitas planeadas</span></div><div class="metric"><strong>${es.length}</strong><span>Despesas registadas</span></div></div>`;
  const visitItems=selected.length?`<div class="list-rows">${selected.map(v=>{const p=placeById(v.placeId);return `<div class="list-row"><span class="time-label">${h(v.time||'—')}</span>${smallPlaceIcon(p?.category)}<div class="row-main"><strong>${h(p?.name||'Local removido')}</strong><small>${h(v.notes||p?.category||'Visita')}</small></div><div class="row-suffix"><button class="tiny-action" data-action="edit-visit" data-id="${h(v.id)}" title="Editar" aria-label="Editar visita">✎</button>${p?`<a class="tiny-action" href="${safeHref(appleMaps(p,'walking'))}" target="_blank" rel="noopener" title="Direções a pé" aria-label="Direções a pé">↗</a>`:''}</div></div>`;}).join('')}</div>`:msgEmpty('▤','Ainda não há visitas para este dia','Adiciona locais ao roteiro para veres aqui a próxima paragem.',btn('new-visit','＋ Planear visita','secondary'));
  const dayCard=cardList(`Roteiro · ${shortDate(today)}`,`${selected.length?`<div class="status-line"><span class="chip">${done}/${selected.length} concluídas</span><span class="muted" style="font-size:.78rem">${h(longDate(today))}</span></div>`:''}${visitItems}`,`<button class="btn-inline" data-action="tab" data-tab="plan">Ver roteiro →</button>`);
  const quick=`<div class="quick-grid"><button class="quick-item" data-action="tab" data-tab="map"><span class="quick-icon">▧</span><strong>Mapa</strong><small>Todos os locais</small></button><button class="quick-item" data-action="new-place"><span class="quick-icon">＋</span><strong>Novo local</strong><small>Descoberta rápida</small></button><button class="quick-item" data-action="tab" data-tab="plan"><span class="quick-icon">▤</span><strong>Roteiro</strong><small>Organizar visitas</small></button><button class="quick-item" data-action="new-expense"><span class="quick-icon">€</span><strong>Despesa</strong><small>Registar pagamento</small></button></div>`;
  const recent=ps.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,4);
  const placesList=recent.length?`<div class="list-rows">${recent.map(p=>renderPlaceRow(p)).join('')}</div>`:msgEmpty('◈','Sem locais','Guarda o teu primeiro ponto de interesse.',btn('new-place','Adicionar local','secondary'));
  return `${hero}${metrics}<div class="content-grid"><div class="section-stack">${dayCard}${cardList('Acesso rápido',quick)}</div><div class="section-stack">${cardList('Locais recentes',placesList,`<button class="btn-inline" data-action="tab" data-tab="map">Mapa →</button>`)}${cardList('Notas de viagem',`<p class="muted" style="white-space:pre-wrap;font-size:.87rem">${h(t.briefing||'Ainda não escreveste o briefing deste destino. Acrescenta informações úteis, reservas ou recomendações.')}</p>`,btn('edit-trip','Editar','small ghost'))}</div></div>`;
}
function renderPlaceRow(p){const hasCoords=coordsValid(p.lat,p.lng);return `<div class="list-row">${smallPlaceIcon(p.category)}<div class="row-main"><strong>${h(p.name)}</strong><small>${h(p.category||'Outro')}${p.address?' · '+h(p.address):''}</small></div><div class="row-suffix"><button class="tiny-action" data-action="edit-place" data-id="${h(p.id)}" title="Editar local" aria-label="Editar ${h(p.name)}">✎</button>${hasCoords||p.address?`<a class="tiny-action" href="${safeHref(appleMaps(p))}" target="_blank" rel="noopener" title="Direções a pé" aria-label="Direções a pé">↗</a>`:''}</div></div>`;}
function renderMapPage(){
  const t=trip(),d=days(), filter=state.mapDay;
  const chips=[`<button type="button" class="chip ${filter==='all'?'active':''}" data-action="map-day" data-date="all">Todos os locais</button>`,...d.map((date,i)=>`<button type="button" class="chip ${filter===date?'active':''}" data-action="map-day" data-date="${date}">Dia ${i+1} · ${shortDate(date)}</button>`)];
  const selectedPlaces=filteredPlaces();
  const rows=selectedPlaces.length?`<div class="list-rows">${selectedPlaces.map(renderPlaceRow).join('')}</div>`:msgEmpty('⌖','Sem pontos para este filtro','Adiciona um local ou escolhe outro dia.',btn('new-place','＋ Adicionar ponto','secondary'));
  return `<div class="page-head"><div><div class="eyebrow">EXPLORAR ${h(t.destination||t.name)}</div><h1>Mapa de viagem</h1><p class="subtitle">Locais guardados e ligações entre visitas. Toca no mapa para marcar um ponto.</p></div><div class="page-actions">${btn('new-place','＋ Local','primary small')}</div></div><form id="map-search" class="map-search"><label class="sr-only" for="map-query">Procurar local</label><input id="map-query" class="field" name="query" type="search" minlength="3" required placeholder="Procurar cidade, restaurante, atração…"><button class="btn secondary" type="submit">Procurar</button></form><div id="search-results" class="search-results">${renderSearchResults()}</div><div class="scroll-chips" aria-label="Filtro de dia">${chips.join('')}</div><div id="travel-map" class="map-frame" aria-label="Mapa interativo"></div><div class="map-footer"><span>Mapa © OpenStreetMap · Pesquisa Nominatim · ligações a direito, não ruas</span><button class="btn small ghost" data-action="locate-me" type="button">⌾ Minha posição</button></div><div style="margin-top:20px">${cardList(`Locais visíveis · ${selectedPlaces.length}`,rows)}</div><div class="tip">O mapa de fundo necessita de Internet. Os nomes, coordenadas e notas continuam disponíveis offline. Para calcular o percurso real, usa «Direções» no Apple Maps.</div>`;
}
function renderSearchResults(){return state.searchResults.map((r,i)=>`<button class="search-result" type="button" data-action="search-choice" data-index="${i}">⌖ ${h(r.display_name)}<br><small>Tocar para guardar como local</small></button>`).join('');}
function filteredPlaces(){const ps=places(),day=state.mapDay;if(day==='all')return ps;const ids=new Set(visits().filter(v=>v.date===day).map(v=>v.placeId));return ps.filter(p=>ids.has(p.id));}
function initMap(){
  const el=$('#travel-map');if(!el)return;
  if(typeof window.L==='undefined') {el.innerHTML=`<div class="map-fallback"><span style="font-size:3rem">▧</span><strong>Mapa de fundo indisponível</strong><small>Os locais estão guardados abaixo. Para mostrar o mapa, abre a aplicação com Internet. O resto da TravelBook continua a funcionar.</small></div>`;return;}
  const L=window.L,t=trip(),allPoints=filteredPlaces().filter(p=>coordsValid(p.lat,p.lng));
  const center=allPoints.length?[Number(allPoints[0].lat),Number(allPoints[0].lng)]:coordsValid(t.centerLat,t.centerLng)?[Number(t.centerLat),Number(t.centerLng)]:[20,0];
  try {
    const map=L.map(el,{zoomControl:true,preferCanvas:true}).setView(center,allPoints.length?12:2);state.map=map;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);
    const markers=[];
    for(const p of allPoints){
      const cat=CATS[p.category]||CATS.Outro;
      const icon=L.divIcon({className:'',iconSize:[29,29],iconAnchor:[14,27],html:`<div class="map-pin" style="background:${cat.color}"><span>${cat.icon}</span></div>`});
      const marker=L.marker([Number(p.lat),Number(p.lng)],{icon}).addTo(map);
      marker.bindPopup(`<div class="popup-title">${h(p.name)}</div><div class="popup-sub">${h(p.category)} · ${h(p.status||'Guardado')}</div><div class="popup-actions"><button class="btn-inline" type="button" data-action="edit-place" data-id="${h(p.id)}">Editar</button><a target="_blank" rel="noopener" href="${safeHref(appleMaps(p,'walking'))}">A pé ↗</a><a target="_blank" rel="noopener" href="${safeHref(appleMaps(p,'transit'))}">Transportes ↗</a></div>`);
      markers.push(marker);
    }
    if(state.mapDay!=='all'){
      const dayVisits=visits().filter(v=>v.date===state.mapDay).sort(sortVisits);
      const line=dayVisits.map(v=>placeById(v.placeId)).filter(p=>p&&coordsValid(p.lat,p.lng)).map(p=>[Number(p.lat),Number(p.lng)]);
      if(line.length>=2)L.polyline(line,{color:'#ce7e4c',weight:4,dashArray:'8,7',opacity:.88}).addTo(map);
    }
    if(markers.length>1){const group=L.featureGroup(markers);map.fitBounds(group.getBounds().pad(.22),{maxZoom:14});}
    else if(markers.length===1)map.setView(markers[0].getLatLng(),14);
    map.on('click',e=>openPlaceForm(null,{lat:e.latlng.lat.toFixed(6),lng:e.latlng.lng.toFixed(6)}));
    setTimeout(()=>map.invalidateSize(),200);
  }catch(error){console.error(error);el.innerHTML='<div class="map-fallback">Não foi possível carregar o mapa. Podes continuar a usar a lista de locais.</div>';}
}
function renderPlan(){
  const t=trip(),d=days(),dChoice=chosenDay(),v=visits().filter(x=>x.date===dChoice).sort(sortVisits);
  const datePicker=d.length?`<div class="scroll-chips">${d.map((date,i)=>`<button class="chip ${date===dChoice?'active':''}" data-action="plan-day" data-date="${date}">Dia ${i+1} · ${shortDate(date)}</button>`).join('')}</div>`:`<p class="warning">Esta viagem ainda não tem datas. Define as datas para organizar visitas por dia.</p>`;
  const content=v.length?`<div class="visit-list">${v.map((item,i)=>{const p=placeById(item.placeId);return `<div class="visit-item ${item.done?'done':''}"><span class="visit-index">${i+1}</span><div style="min-width:0;flex:1"><div class="visit-title">${h(item.time||'—')} · ${h(p?.name||'Local removido')}</div><div class="visit-desc">${h(item.notes||p?.category||'Visita')}${p?.address?' · '+h(p.address):''}</div></div><div class="visit-actions"><button class="tiny-action" data-action="toggle-visit" data-id="${h(item.id)}" title="${item.done?'Marcar como não visitado':'Marcar como visitado'}">${item.done?'↶':'✓'}</button><button class="tiny-action" data-action="edit-visit" data-id="${h(item.id)}" title="Editar visita">✎</button></div></div>`;}).join('')}</div>`:msgEmpty('▤','Dia ainda sem visitas','Adiciona um local e escolhe quando o vais visitar.',btn('new-visit','＋ Adicionar visita','secondary'));
  return `<div class="page-head"><div><div class="eyebrow">PLANEAMENTO</div><h1>Roteiro diário</h1><p class="subtitle">Organiza os dias da viagem e consulta o que vem a seguir.</p></div><div class="page-actions">${btn('new-visit','＋ Visita','primary small')}</div></div>${datePicker}<div class="content-grid"><section>${cardList(`${dChoice?longDate(dChoice):'Visitas planeadas'}`,content,`<button class="btn-inline" data-action="tab" data-tab="map">Ver no mapa →</button>`)}<p class="tip">As visitas são apresentadas por horário. Para trajetos reais a pé e transportes públicos, abre o Apple Maps a partir do local.</p></section><div class="section-stack">${cardList('Adicionar ao roteiro',`${places().length?`<p class="muted" style="font-size:.85rem">Escolhe entre os ${places().length} locais guardados e define uma hora.</p>`:'<p class="muted">Ainda não há locais. Guarda primeiro um ponto de interesse.</p>'}${btn(places().length?'new-visit':'new-place',places().length?'＋ Planear visita':'＋ Guardar local','secondary full')}`)}${cardList('Datas da viagem',`<p class="muted" style="font-size:.86rem">${t.startDate?`${shortDate(t.startDate)} até ${shortDate(t.endDate||t.startDate)}`:'Datas por definir'}</p>${btn('edit-trip','Editar datas','small ghost')}`)}</div></div>`;
}
function renderExpenses(){
  const es=expenses().slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')), totals={};for(const e of es)totals[e.currency||'EUR']=(totals[e.currency||'EUR']||0)+Number(e.amount||0);
  const summary=Object.keys(totals).length?Object.entries(totals).map(([c,total])=>`<div class="metric"><strong>${h(money(total,c))}</strong><span>Total · ${h(c)}</span></div>`).join(''):`<div class="metric"><strong>0 €</strong><span>Total registado</span></div>`;
  const rows=es.length?`<div class="list-rows">${es.map(e=>`<div class="expense-item"><span class="row-icon">€</span><div class="row-main"><strong>${h(e.title)}</strong><small>${h(e.category)} · ${shortDate(e.date)} · ${h(e.paidBy||'Não indicado')}</small></div><div class="row-suffix"><div class="expense-amount">${h(money(e.amount,e.currency))}</div><button class="tiny-action" data-action="edit-expense" data-id="${h(e.id)}" title="Editar despesa">✎</button></div></div>`).join('')}</div>`:msgEmpty('€','Ainda não há despesas','Regista pagamentos para acompanhares os gastos da viagem.',btn('new-expense','＋ Adicionar despesa','secondary'));
  return `<div class="page-head"><div><div class="eyebrow">ORÇAMENTO</div><h1>Despesas</h1><p class="subtitle">Regista quem pagou, categoriza os gastos e exporta em CSV.</p></div><div class="page-actions">${btn('new-expense','＋ Despesa','primary small')}</div></div><div class="metrics">${summary}<div class="metric"><strong>${es.length}</strong><span>Registos</span></div></div><div class="content-grid"><div>${cardList('Movimentos',rows)}</div><div class="section-stack">${cardList('Por categoria',Object.keys(totals).length?Object.entries(totals).map(([cur])=>EXPENSE_CATS.map(c=>{const val=es.filter(e=>(e.currency||'EUR')===cur&&e.category===c).reduce((sum,e)=>sum+Number(e.amount||0),0);return val?`<div class="overview-list"><span>${h(c)} · ${h(cur)}</span><strong>${h(money(val,cur))}</strong></div>`:'';}).join('')).join(''):'<p class="muted">Ainda sem despesas.</p>')}${cardList('Exportar',`<p class="muted" style="font-size:.85rem">Descarrega um ficheiro CSV que podes abrir no Excel, Numbers ou R.</p>${btn('export-expenses','⇩ Exportar despesas.csv','secondary full')}`)}</div></div><p class="tip">Moedas diferentes são apresentadas separadamente. Esta versão não calcula taxas de câmbio nem saldos de divisão entre pessoas.</p>`;
}
function renderMore(){
  const t=trip(); const sync=getSyncSummary();
  const syncCard=`<section class="card settings-card"><h3>☁ Sincronização privada</h3><p>${sync.configured ? 'Ligação configurada ao Cloudflare Worker.' : 'Lembra-te: por enquanto os dados só existem neste dispositivo. Liga o Worker para partilhar a viagem entre o Mac e os iPhones.'}</p><div class="hint">${sync.configured?`Servidor: ${h(sync.endpoint)}<br>Revisão: ${sync.revision??'por associar'} · ${sync.dirty?'alterações locais por enviar':'sem alterações pendentes'}`:'Sem servidor associado'}</div><div class="button-stack" style="margin-top:12px">${btn('sync-settings',sync.configured?'Alterar ligação Cloudflare':'Configurar Cloudflare','secondary small')}${sync.configured?`${btn('sync-now','↻ Sincronizar agora','primary small')}${btn('sync-receive','↓ Recuperar dados do servidor','ghost small')}${btn('sync-send','↑ Publicar dados locais no servidor','ghost small')}${btn('sync-disconnect','Desligar neste aparelho','danger small')}`:''}</div><p class="tip">Em caso de edição simultânea, a aplicação bloqueia a substituição automática. Faz um backup JSON antes de forçar o envio ou a recuperação.</p></section>`;
  return `<div class="page-head"><div><div class="eyebrow">CONFIGURAÇÕES</div><h1>Viagem e dados</h1><p class="subtitle">O teu briefing, cópias de segurança, exportações e preferências.</p></div></div><div class="settings-grid">${syncCard}<section class="card settings-card"><div class="card-head"><h3>✦ ${h(t.name)}</h3>${btn('edit-trip','Editar','small ghost')}</div><p><strong>Destino:</strong> ${h(t.destination||'Por indicar')}${t.country?' · '+h(t.country):''}</p><p><strong>Datas:</strong> ${t.startDate?shortDate(t.startDate)+' — '+shortDate(t.endDate||t.startDate):'Por definir'}</p><div class="hint" style="white-space:pre-wrap">${h(t.briefing||'Sem briefing. Acrescenta moradas, transportes, reservas e outras informações úteis.')}</div></section><section class="card settings-card"><h3>⇩ Cópia de segurança completa</h3><p>Guarda todas as viagens, locais, horários e despesas num único ficheiro JSON. Podes transferi-lo para outro iPhone.</p><div class="button-stack">${btn('export-json','Descarregar backup JSON','primary small')}${btn('import-json','Importar backup','ghost small')}</div><input type="file" id="backup-file" accept=".json,application/json" class="sr-only"><div class="warning" style="margin-top:13px">A importação substitui todos os dados deste dispositivo. Faz uma cópia antes de importar.</div></section><section class="card settings-card"><h3>▤ Exportar em CSV</h3><p>Ficheiros separados para Excel, Numbers, R ou Python. Exporta a viagem atual.</p><div class="button-stack">${btn('export-trips','Viagens.csv','ghost small')}${btn('export-places','Locais.csv','ghost small')}${btn('export-visits','Roteiro.csv','ghost small')}${btn('export-expenses','Despesas.csv','ghost small')}${btn('export-unified','Tudo.csv','secondary small')}${btn('export-geojson','Mapa.geojson','ghost small')}</div></section><section class="card settings-card"><h3>⌁ Privacidade e modo offline</h3><p>Os teus dados estão guardados localmente neste navegador. O GitHub Pages publica apenas o código da aplicação, não as tuas viagens.</p><p>Esta versão permite consulta e edição offline do conteúdo guardado depois de uma primeira abertura online; o mapa de fundo e a pesquisa exigem Internet.</p><div class="button-stack">${btn('about-storage','Como funciona?','ghost small')}${btn('delete-trip','Eliminar esta viagem','danger small')}</div></section></div>`;
}

function field(name,label,value='',type='text',attrs=''){return `<div class="form-field"><label for="fld-${name}">${label}</label><input class="field" id="fld-${name}" type="${type}" name="${name}" value="${h(value)}" ${attrs}></div>`;}
function selectField(name,label,opts,value=''){return `<div class="form-field"><label for="fld-${name}">${label}</label><select id="fld-${name}" class="field" name="${name}">${opts.map(([key,text])=>`<option value="${h(key)}" ${String(key)===String(value)?'selected':''}>${h(text)}</option>`).join('')}</select></div>`;}
function textArea(name,label,value='',attrs=''){return `<div class="form-field"><label for="fld-${name}">${label}</label><textarea id="fld-${name}" class="field" name="${name}" ${attrs}>${h(value)}</textarea></div>`;}
function showModal(title,content,kind,id='',deleteAction=''){
  const modal=$('#modal');
  $('#modal-content').innerHTML=`<form id="editor-form" data-kind="${h(kind)}" data-id="${h(id)}"><div class="modal-body"><div class="modal-header"><h2>${h(title)}</h2><button class="icon-btn" data-action="close-modal" type="button" aria-label="Fechar">×</button></div><div class="form-grid">${content}</div></div><div class="modal-footer">${deleteAction?`<button class="btn danger small" type="button" data-action="${h(deleteAction)}" data-id="${h(id)}">Eliminar</button>`:''}<button class="btn ghost" type="button" data-action="close-modal">${kind==='about'?'Fechar':'Cancelar'}</button>${kind==='about'?'':'<button class="btn primary" type="submit">Guardar</button>'}</div></form>`;
  if(modal.open)modal.close();modal.showModal();
  setTimeout(()=>$('#modal input:not([type=hidden]), #modal select, #modal textarea')?.focus({preventScroll:true}),40);
}
function closeModal(){const modal=$('#modal');if(modal.open)modal.close();}
function openTripForm(item=null){
  const t=item||{};
  showModal(item?'Editar viagem':'Criar viagem',`${field('name','Nome da viagem *',t.name||'','text','required maxlength="90" placeholder="Ex.: Férias em Roma"')} ${field('destination','Destino principal *',t.destination||'','text','required maxlength="100" placeholder="Roma"')} ${field('country','País',t.country||'','text','maxlength="80" placeholder="Itália"')}<div class="field-row span-2">${field('startDate','Início',t.startDate||'','date')}${field('endDate','Fim',t.endDate||'','date')}</div><div class="span-2">${textArea('briefing','Briefing e notas',t.briefing||'','placeholder="Transportes, reservas, informações práticas…" maxlength="5000"')}</div>`, 'trips',t.id||'',item?'delete-trip':'');
}
function openPlaceForm(item=null,coords={}){
  if(!trip())return toast('Cria primeiro uma viagem.');
  const p=item||{};const dateOpts=[['','Não incluir já no roteiro'],...days().map((d,i)=>[d,`Dia ${i+1} · ${shortDate(d)}`])];
  showModal(item?'Editar local':'Adicionar local',`${field('name','Nome do local *',p.name||coords.name||'','text','required maxlength="130" placeholder="Ex.: Restaurante da esquina"')}${selectField('category','Categoria',Object.keys(CATS).map(c=>[c,c]),p.category||'Atração')}${field('address','Morada / referência',p.address||coords.address||'','text','maxlength="250" placeholder="Rua, bairro, cidade"')}${selectField('status','Estado',[['Quero visitar','Quero visitar'],['Guardado','Guardado'],['Visitado','Visitado']],p.status||'Quero visitar')}<div class="field-row span-2">${field('lat','Latitude',p.lat??coords.lat??'','number','step="any" min="-90" max="90" placeholder="38.72"')}${field('lng','Longitude',p.lng??coords.lng??'','number','step="any" min="-180" max="180" placeholder="-9.14"')}</div><div class="span-2"><div class="hint">Dica: no separador <strong>Mapa</strong>, toca numa posição ou pesquisa um local para preencher automaticamente as coordenadas.</div></div><div class="span-2">${textArea('notes','Notas e recomendações',p.notes||'','placeholder="O que recomendaram? Especialidade, preço, horários…" maxlength="2500"')}</div>${item&&(coordsValid(p.lat,p.lng)||p.address)?`<div class="span-2"><div class="button-stack"><a class="btn small secondary" target="_blank" rel="noopener" href="${safeHref(appleMaps(p,'walking'))}">↗ Direções a pé</a><a class="btn small secondary" target="_blank" rel="noopener" href="${safeHref(appleMaps(p,'transit'))}">🚇 Transportes públicos</a></div></div>`:''}${item?'':`<div class="span-2">${selectField('visitDate','Adicionar já ao roteiro?',dateOpts,'')}</div>`}`, 'places',p.id||'',item?'delete-place':'');
}
function openVisitForm(item=null){
  const ps=places();if(!ps.length)return toast('Guarda primeiro um local antes de planeares uma visita.');
  const dates=days();if(!dates.length)return toast('Define as datas da viagem nas configurações.');
  const v=item||{},date= v.date||chosenDay();
  showModal(item?'Editar visita':'Adicionar visita',`${selectField('placeId','Local a visitar *',ps.map(p=>[p.id,`${p.name} · ${p.category}`]),v.placeId||ps[0].id)}${selectField('date','Dia da visita *',dates.map((d,i)=>[d,`Dia ${i+1} · ${shortDate(d)}`]),date)}${field('time','Hora prevista',v.time||'','time')}${textArea('notes','Notas da visita',v.notes||'','placeholder="Bilhetes, reservas, duração prevista…" maxlength="1500"')}<div class="span-2"><label class="form-checkbox"><input type="checkbox" name="done" ${v.done?'checked':''}> Já visitado</label></div>`, 'visits',v.id||'',item?'delete-visit':'');
}
function openExpenseForm(item=null){
  const e=item||{};
  showModal(item?'Editar despesa':'Nova despesa',`${field('title','Descrição *',e.title||'','text','required maxlength="130" placeholder="Ex.: Jantar no centro"')}${selectField('category','Categoria',EXPENSE_CATS.map(c=>[c,c]),e.category||'Restaurantes')}<div class="field-row span-2">${field('amount','Valor *',e.amount??'','number','required min="0.01" step="0.01" inputmode="decimal" placeholder="25.50"')}${selectField('currency','Moeda',CURRENCIES.map(c=>[c,c]),e.currency||'EUR')}</div>${field('date','Data',e.date||isoToday(),'date')}${selectField('paidBy','Quem pagou?', [['Eu','Eu'],['A minha mulher','A minha mulher'],['Outro','Outro']],e.paidBy||'Eu')}<div class="span-2">${textArea('notes','Notas',e.notes||'','maxlength="1200" placeholder="Partilhado, recibo, observações…"')}</div>`, 'expenses',e.id||'',item?'delete-expense':'');
}
async function saveEntity(form){
  const kind=form.dataset.kind,id=form.dataset.id;const values=Object.fromEntries(new FormData(form).entries());
  if(!['trips','places','visits','expenses'].includes(kind))throw new Error('Tipo de registo desconhecido.');
  const original=id?find(kind,id):null;const record={...(original||{}),...values,id:id||makeId(),createdAt:original?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(kind==='trips'){
    if(record.startDate && record.endDate && record.endDate<record.startDate)throw new Error('A data de fim deve ser posterior à de início.');
    if(record.startDate&&!record.endDate)record.endDate=record.startDate;
    if(record.endDate&&!record.startDate)throw new Error('Indica a data de início da viagem.');
    const newDays=datesBetween(record.startDate,record.endDate);if(record.startDate && !newDays.length)throw new Error('As datas da viagem não são válidas.');
  }
  if(kind==='places'){
    record.tripId=state.activeTripId;
    if((record.lat!==''||record.lng!=='')&&!coordsValid(record.lat,record.lng))throw new Error('Introduz ambas as coordenadas com valores válidos, ou deixa ambas vazias.');
    if(coordsValid(record.lat,record.lng)){record.lat=Number(record.lat);record.lng=Number(record.lng);}else{record.lat='';record.lng='';}
  }
  if(kind==='visits'){
    record.tripId=state.activeTripId;record.done=values.done==='on';record.order=original?.order??visits().length+1;
    if(!placeById(record.placeId))throw new Error('Local inválido.');
    if(!days().includes(record.date))throw new Error('Escolhe uma data incluída na viagem.');
  }
  if(kind==='expenses'){
    record.tripId=state.activeTripId;record.amount=Number(values.amount);
    if(!Number.isFinite(record.amount)||record.amount<=0)throw new Error('O valor deve ser superior a zero.');
  }
  const visitDate=kind==='places'?values.visitDate:'';delete record.visitDate;
  await put(kind,record);
  if(kind==='places'&&!id&&visitDate&&days().includes(visitDate))await put('visits',{id:makeId(),tripId:state.activeTripId,placeId:record.id,date:visitDate,time:'',notes:'',done:false,order:visits().length+1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  if(kind==='trips'){state.activeTripId=record.id;state.planDay=null;}
  closeModal();await refresh({preserve:true});toast('Guardado com sucesso.');
}
async function destroy(kind,id){
  const label={trips:'esta viagem e todos os seus dados',places:'este local e as visitas associadas',visits:'esta visita',expenses:'esta despesa'}[kind];
  if(!window.confirm(`Eliminar ${label}? Esta ação não pode ser anulada.`))return;
  if(kind==='trips')for(const table of ['places','visits','expenses'])for(const row of state.data[table].filter(x=>x.tripId===id))await remove(table,row.id);
  if(kind==='places')for(const row of state.data.visits.filter(x=>x.placeId===id))await remove('visits',row.id);
  await remove(kind,id);closeModal();if(kind==='trips')state.activeTripId=null;await refresh({preserve:true});toast('Registo eliminado.');
}
async function sampleTrip(){
  const now=new Date().toISOString(),id=makeId(),dates=['2026-12-05','2026-12-06','2026-12-07'];
  await put('trips',{id,name:'Roma · Demonstração',destination:'Roma',country:'Itália',startDate:dates[0],endDate:dates[2],briefing:'VIAGEM DE DEMONSTRAÇÃO\n• Guardar confirmações e bilhetes nesta nota.\n• Selecionar «Direções» para abrir o Apple Maps.\n• Experimentar adicionar um restaurante recomendado por alguém.',centerLat:41.898,centerLng:12.489,createdAt:now,updatedAt:now});
  const data=[['Coliseu','Atração',41.89021,12.49223,'Piazza del Colosseo'],['Fórum Romano','Atração',41.8925,12.4853,'Via della Salara Vecchia'],['Panteão','Atração',41.8986,12.4768,'Piazza della Rotonda'],['Piazza Navona','Atração',41.8992,12.4731,'Piazza Navona'],['Trattoria de exemplo','Restaurante',41.8982,12.479,'Centro histórico']];
  const ids=[];for(const [name,category,lat,lng,address]of data){const pid=makeId();ids.push(pid);await put('places',{id:pid,tripId:id,name,category,lat,lng,address,status:'Quero visitar',notes:category==='Restaurante'?'Restaurante fictício, apenas para testar a aplicação.':'Local de demonstração',createdAt:now,updatedAt:now});}
  const calls=[[0,dates[0],'09:00'],[1,dates[0],'11:30'],[2,dates[1],'10:00'],[3,dates[1],'12:00']];for(let i=0;i<calls.length;i++){const [idx,date,time]=calls[i];await put('visits',{id:makeId(),tripId:id,placeId:ids[idx],date,time,notes:'Visita de demonstração',done:false,order:i+1,createdAt:now,updatedAt:now});}
  await put('expenses',{id:makeId(),tripId:id,title:'Almoço de exemplo',category:'Restaurantes',amount:42.50,currency:'EUR',paidBy:'Eu',date:dates[0],notes:'Despesa fictícia',createdAt:now,updatedAt:now});
  state.activeTripId=id;state.tab='today';state.planDay=null;await refresh({preserve:true});toast('Viagem de demonstração criada.');
}
function exportJSON(){const payload={format:'travelbook-v1',exportedAt:new Date().toISOString(),data:state.data};download(`travelbook-backup-${isoToday()}.json`,JSON.stringify(payload,null,2),'application/json');toast('Cópia JSON descarregada.');}
function currentRows(table){return table==='trips'?[trip()].filter(Boolean):state.data[table].filter(r=>r.tripId===state.activeTripId);}
function exportCSV(table){
  const headers={trips:['id','name','destination','country','startDate','endDate','briefing'],places:['id','tripId','name','category','address','lat','lng','status','notes'],visits:['id','tripId','placeId','date','time','notes','done'],expenses:['id','tripId','title','category','amount','currency','date','paidBy','notes']}[table];
  const filename={trips:'viagens',places:'locais',visits:'roteiro',expenses:'despesas'}[table];
  if(!table||!headers)return;download(`${filename}-${isoToday()}.csv`,toCSV(currentRows(table),headers),'text/csv;charset=utf-8');toast('CSV descarregado.');
}
function exportUnified(){
  const headers=['tipo','viagem','data','nome','categoria','latitude','longitude','valor','moeda','pagoPor','notas'];const t=trip(),rows=[];
  rows.push({tipo:'viagem',viagem:t.name,data:t.startDate,nome:t.destination,notas:t.briefing});
  for(const p of places())rows.push({tipo:'local',viagem:t.name,nome:p.name,categoria:p.category,latitude:p.lat,longitude:p.lng,notas:p.notes});
  for(const v of visits())rows.push({tipo:'visita',viagem:t.name,data:v.date,nome:placeById(v.placeId)?.name||'',notas:`${v.time||''} ${v.notes||''}`.trim()});
  for(const e of expenses())rows.push({tipo:'despesa',viagem:t.name,data:e.date,nome:e.title,categoria:e.category,valor:e.amount,moeda:e.currency,pagoPor:e.paidBy,notas:e.notes});
  download(`tudo-${isoToday()}.csv`,toCSV(rows,headers),'text/csv;charset=utf-8');toast('CSV consolidado descarregado.');
}
function exportGeoJSON(){const t=trip();const data={type:'FeatureCollection',name:t.name,features:places().filter(p=>coordsValid(p.lat,p.lng)).map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[Number(p.lng),Number(p.lat)]},properties:{name:p.name,category:p.category,address:p.address,notes:p.notes,status:p.status}}))};download(`mapa-${isoToday()}.geojson`,JSON.stringify(data,null,2),'application/geo+json');toast('Mapa GeoJSON descarregado.');}
async function handleImport(event){const input=event.target, file=input.files?.[0];if(!file)return;try{const text=await file.text();const parsed=JSON.parse(text);const data=validateBackup(parsed);if(!window.confirm(`Importar ${data.trips.length} viagem(ns)? Isto SUBSTITUI todas as viagens neste dispositivo${isConfigured()?' e poderá sincronizar esta substituição com o servidor':''}. Faz primeiro um backup.`))return;await replaceAll(data);state.activeTripId=null;state.tab='today';await refresh({preserve:true});toast('Backup importado com sucesso.');}catch(err){toast(`Falha na importação: ${err.message}`);}finally{input.value='';}}
async function searchPlaces(query){
  if(!navigator.onLine)throw new Error('A pesquisa necessita de Internet.');
  if(Date.now()-state.lastSearch<1300)throw new Error('Aguarda um momento antes de outra pesquisa.');
  state.lastSearch=Date.now();state.searchResults=[];$('#search-results').innerHTML='<p class="muted">A pesquisar…</p>';
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=pt&q=${encodeURIComponent(query)}`;
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Serviço de pesquisa temporariamente indisponível.');
  const results=await response.json();state.searchResults=results;
  $('#search-results').innerHTML=results.length?renderSearchResults():'<p class="muted">Sem resultados. Experimenta uma morada mais específica ou toca no mapa.</p>';
}
function openSyncSettings(){
  const info=getSyncSummary();
  showModal('Ligação privada à Cloudflare',`${field('endpoint','Endereço do Cloudflare Worker *',info.endpoint,'url','required placeholder="https://travelbook-sync.NOME.workers.dev" autocomplete="url"')}<div class="span-2">${field('key','Chave secreta (nunca partilhar no GitHub)', '', 'password',`autocomplete="off" ${info.configured?'placeholder="Em branco para manter a chave guardada"':'required placeholder="Chave privada de 48 caracteres ou mais"'}`)}</div><div class="span-2"><div class="hint">A chave fica guardada apenas neste navegador. O GitHub Pages não recebe nem armazena esta chave. Usa uma chave longa e privada, definida em Cloudflare → Worker → Variables and Secrets.</div></div>`,'sync');
}
async function handleSync(action='normal'){
  if(!isConfigured())return openSyncSettings();
  if(action==='send' && !window.confirm('ATENÇÃO: substituir os dados online pelos dados DESTE dispositivo? Faz primeiro um backup JSON. Esta operação pode apagar alterações feitas no outro iPhone.'))return;
  if(action==='receive' && !window.confirm('ATENÇÃO: substituir TODOS os dados deste dispositivo pelos dados do servidor? Antes, descarrega um backup JSON dos dados atuais.'))return;
  const outcome=await syncNow(action);
  if(outcome.kind==='need-send'){
    if(window.confirm('A base de dados online está vazia. Queres publicar AGORA as viagens deste aparelho? Confirma que estás no Mac com os dados mais recentes.'))return handleSync('send');
    toast('Dados mantidos apenas neste dispositivo.');return;
  }
  if(outcome.kind==='need-choice'){
    toast('Existem dados neste aparelho e no servidor. Faz um backup JSON e escolhe Enviar ou Recuperar em Mais.');
    return;
  }
  if(outcome.kind==='conflict'){
    toast('Conflito: alterações em dois aparelhos. Nada foi substituído. Faz backup JSON e escolhe como resolver.');
    return;
  }
  if(outcome.kind==='download')await refresh({preserve:true});
  if(outcome.kind==='upload')toast('Dados enviados com sucesso para a Cloudflare.');
  else if(outcome.kind==='download')toast('Dados atualizados a partir da Cloudflare.');
  else toast('Tudo sincronizado.');
  if(state.tab==='more')render();
}
async function configureSync(form){
  const values=new FormData(form);
  saveSyncConfig(String(values.get('endpoint')||'').trim(),String(values.get('key')||'').trim());
  closeModal();toast('Ligação guardada. A verificar os dados…');
  await handleSync('normal');
}
function scheduleSync(){
  if(!isConfigured()||!hasPaired()||!navigator.onLine)return;
  clearTimeout(scheduleSync.timer);
  scheduleSync.timer=setTimeout(async()=>{
    try{const r=await syncNow();if(r.kind==='download')await refresh({preserve:true});if(r.kind==='conflict')toast('Dados divergentes entre aparelhos: abre Mais → Sincronização.');}
    catch(e){console.warn('A sincronização fica pendente:',e.message);}
  },2000);
}
function aboutStorage(){showModal('Privacidade e armazenamento',`<div class="span-2"><div class="hint"><strong>IndexedDB</strong> guarda sempre os dados neste dispositivo. ${isConfigured()?'A sincronização usa uma API Cloudflare Worker com chave privada, alojada separadamente do código público.':'Podes ligar a Cloudflare em Mais para sincronizar automaticamente com outros dispositivos.'}</div><p style="font-size:.87rem;line-height:1.6">Quando não há Internet, continuas a editar localmente. Se houver edições simultâneas em aparelhos diferentes, é necessário resolver um conflito manualmente; a aplicação não apaga os dados locais automaticamente.</p><p style="font-size:.87rem;line-height:1.6">O mapa de fundo e as direções Apple Maps exigem Internet. Faz backups JSON regulares para não dependeres apenas do iPhone ou do serviço externo.</p></div>`,'about');}

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
async function onAction(element){
  const action=element.dataset.action,id=element.dataset.id;
  if(action==='tab'){navigate(element.dataset.tab);return;}
  if(action==='new-trip')return openTripForm();
  if(action==='edit-trip')return openTripForm(trip());
  if(action==='demo')return sampleTrip();
  if(action==='new-place')return openPlaceForm();
  if(action==='edit-place')return openPlaceForm(find('places',id));
  if(action==='new-visit')return openVisitForm();
  if(action==='edit-visit')return openVisitForm(find('visits',id));
  if(action==='new-expense')return openExpenseForm();
  if(action==='edit-expense')return openExpenseForm(find('expenses',id));
  if(action==='close-modal')return closeModal();
  if(action==='delete-trip')return destroy('trips',id||state.activeTripId);
  if(action==='delete-place')return destroy('places',id);
  if(action==='delete-visit')return destroy('visits',id);
  if(action==='delete-expense')return destroy('expenses',id);
  if(action==='toggle-visit'){const v=find('visits',id);await put('visits',{...v,done:!v.done,updatedAt:new Date().toISOString()});return refresh({preserve:true});}
  if(action==='plan-day'){state.planDay=element.dataset.date;return render();}
  if(action==='map-day'){state.mapDay=element.dataset.date;return render();}
  if(action==='search-choice'){
    const item=state.searchResults[Number(element.dataset.index)];if(!item)return;
    return openPlaceForm(null,{name:item.name||item.display_name.split(',')[0],address:item.display_name,lat:item.lat,lng:item.lon});
  }
  if(action==='locate-me'){
    if(!navigator.geolocation)return toast('Geolocalização indisponível.');
    navigator.geolocation.getCurrentPosition(p=>{if(state.map){state.map.setView([p.coords.latitude,p.coords.longitude],15);toast('Localização atual mostrada.');}},()=>toast('Não foi possível obter a localização.'),{enableHighAccuracy:true,timeout:10000});return;
  }
  if(action==='export-json')return exportJSON();
  if(action==='export-unified')return exportUnified();
  if(action==='export-geojson')return exportGeoJSON();
  if(action?.startsWith('export-'))return exportCSV(action.replace('export-',''));
  if(action==='show-backup'){navigate('more');return;}
  if(action==='sync-settings')return openSyncSettings();
  if(action==='sync-now')return handleSync('normal');
  if(action==='sync-send')return handleSync('send');
  if(action==='sync-receive')return handleSync('receive');
  if(action==='sync-disconnect'){if(window.confirm('Desligar a Cloudflare neste aparelho? As viagens locais mantêm-se.')){disconnect();toast('Ligação desligada.');render();}return;}
  if(action==='import-json')return $('#backup-file')?.click();
  if(action==='about-storage')return aboutStorage();
}
async function init(){
  document.addEventListener('click',async event=>{
    const action=event.target.closest('[data-action]');if(!action)return;
    if(action.tagName==='A' && action.getAttribute('href')!=='#')return;
    event.preventDefault();try{await onAction(action);}catch(error){console.error(error);toast(error?.message||'Ocorreu um erro inesperado.');}
  });
  document.addEventListener('submit',async event=>{
    const form=event.target;
    if(form.id==='editor-form'){event.preventDefault();try{if(form.dataset.kind==='sync')await configureSync(form);else await saveEntity(form);}catch(error){console.error(error);toast(error.message||'Não foi possível guardar.');}}
    if(form.id==='map-search'){event.preventDefault();try{await searchPlaces(new FormData(form).get('query')?.trim()||'');}catch(error){toast(error.message);$('#search-results').innerHTML='';}}
  });
  document.addEventListener('change',async event=>{
    if(event.target.id==='trip-select'){state.activeTripId=event.target.value;state.planDay=null;state.mapDay='all';state.searchResults=[];localStorage.setItem('travelbook.activeTripId',state.activeTripId);render();}
    if(event.target.id==='backup-file')await handleImport(event);
  });
  window.addEventListener('online',()=>{renderNav();scheduleSync();});window.addEventListener('offline',renderNav);
  window.addEventListener('travelbook-data-changed',scheduleSync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleSync();});
  setInterval(()=>{if(!document.hidden)scheduleSync();},60000);
  $('#modal').addEventListener('click',event=>{if(event.target===$('#modal'))closeModal();});
  await refresh();
  if(isConfigured()&&hasPaired())scheduleSync();
  if('serviceWorker' in navigator && location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')navigator.serviceWorker?.register('./service-worker.js').catch(err=>console.warn('PWA sem service worker:',err));
}
init().catch(error=>{$('#view').innerHTML=`<div class="empty"><strong>Não foi possível abrir a base local.</strong><p>${h(error.message)}. Experimenta abrir em Safari normal, fora do modo privado.</p></div>`;console.error(error);});
