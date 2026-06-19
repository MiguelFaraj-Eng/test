//  CONFIGURE PAGE
// ══════════════════════════════════════════════════
function renderQtyPanel(){
  const cont = document.getElementById('qtyList');
  const grouped = {};
  EQ_CATS.forEach(c=>c.items.forEach(item=>{
    const key=c.cat+'|'+item;
    if(!S.selectedEq.has(key)) return;
    if(!grouped[c.cat]) grouped[c.cat]=[];
    grouped[c.cat].push({key,name:item});
  }));

  cont.innerHTML = Object.entries(grouped).map(([cat,items])=>`
    <div style="margin-bottom:14px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);padding:5px 0 6px;border-bottom:1px solid var(--border);margin-bottom:6px">${cat}</div>
      ${items.map(({key,name})=>{
        const qty = S.quantities[key]||1;
        const entities = Object.entries(S.entityAlarms).filter(([k,v])=>v.eqName===name);
        return `<div style="margin-bottom:6px">
          <div style="font-size:12px;font-weight:500;margin-bottom:4px">${name}</div>
          <div style="display:flex;align-items:center;gap:0;margin-bottom:5px">
            <button class="qty-minus" onclick="changeQty('${esc2(key)}',-1)">−</button>
            <input class="qty-num" type="number" min="1" max="99" value="${qty}" oninput="changeQtyDirect('${esc2(key)}',this.value)">
            <button class="qty-plus" onclick="changeQty('${esc2(key)}',1)">+</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:3px">
            ${entities.map(([ek,ev])=>{
              const active = S.activeEntity===ek;
              const totalA = (ev.alarmGroups||[]).reduce((s,g)=>s+g.alarms.length,0);
              const activeA = (ev.alarmGroups||[]).reduce((s,g)=>s+g.alarms.filter(a=>!a.deleted).length,0);
              return `<div class="chip ${active?'active':''}" onclick="selectEntity('${ek}')" title="${ev.eqName} unit ${ev.idx}">${ek} <span style="opacity:.7;font-size:9px">${activeA}/${totalA}</span></div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

function changeQty(key, delta){
  const current = S.quantities[key]||1;
  const newQty = Math.max(1, current+delta);
  S.quantities[key] = newQty;
  buildEntityAlarms();
  renderQtyPanel();
  renderSidebarConfig();
  if(S.activeEntity && !S.entityAlarms[S.activeEntity]) S.activeEntity=null;
  if(S.activeEntity) renderAlarmTable(S.activeEntity);
}

function changeQtyDirect(key, val){
  S.quantities[key] = Math.max(1, parseInt(val)||1);
  buildEntityAlarms();
  renderQtyPanel();
  renderSidebarConfig();
}

function renderSidebarConfig(){
  // Entity counters
  const totalE = Object.keys(S.entityAlarms).length;
  const totalA = Object.values(S.entityAlarms).reduce((s,e)=>s+(e.alarmGroups||[]).reduce((ss,g)=>ss+g.alarms.filter(a=>!a.deleted).length,0),0);
  document.getElementById('stat-entities').textContent = totalE;
  document.getElementById('stat-alarmtypes').textContent = Object.keys(getCatCounts()).length;
  document.getElementById('stat-alarms').textContent = totalA.toLocaleString();

  // Entity chips
  const chips = document.getElementById('entityChips');
  chips.innerHTML = Object.entries(S.entityAlarms).map(([k,v])=>`
    <div class="chip e-chip ${S.activeEntity===k?'active':''}" onclick="selectEntity('${k}')">${k}</div>
  `).join('');
}

function getCatCounts(){
  if(!S.activeEntity || !S.entityAlarms[S.activeEntity]) return {};
  const search = ((document.getElementById('alarmSearch')||{}).value||'').toLowerCase();
  const counts = {};
  S.entityAlarms[S.activeEntity].alarmGroups.forEach(g=>{
    g.alarms.forEach(a=>{
      if(!S.showDeleted && a.deleted) return;
      if(search && !a.name.toLowerCase().includes(search) && !a.desc.toLowerCase().includes(search)) return;
      const cat = (g.category||'Unknown').replace('Operational Failure','Operational Failures'); if(!counts[cat]) counts[cat]=0; counts[cat]++;
    });
  });
  return counts;
}

let activeCatFilter = '';
function renderCatList(){
  const counts = getCatCounts();
  const el = document.getElementById('catList');
  el.innerHTML = `<div class="cat-item ${activeCatFilter===''?'active':''}" onclick="setCatFilter('')">
    <div class="cat-dot" style="background:var(--text3)"></div>
    <div class="cat-name">All</div>
    <div class="cat-count">${Object.values(counts).reduce((a,b)=>a+b,0)}</div>
  </div>` + Object.entries(counts).map(([cat,cnt])=>{
    // Count active in this category
    const entity = S.activeEntity && S.activeEntity!=='COMMON' ? S.entityAlarms[S.activeEntity] : null;
    const catActive = entity ? (entity.alarmGroups||[]).filter(g=>{
      const nc=(g.category||'').replace('Operational Failure','Operational Failures');
      return nc===cat;
    }).reduce((s,g)=>s+g.alarms.filter(a=>!a.deleted).length,0) : cnt;
    const catTotal = entity ? (entity.alarmGroups||[]).filter(g=>{
      const nc=(g.category||'').replace('Operational Failure','Operational Failures');
      return nc===cat;
    }).reduce((s,g)=>s+g.alarms.length,0) : cnt;
    const allOff = catActive === 0;
    return `
    <div class="cat-item ${activeCatFilter===cat?'active':''}" onclick="setCatFilter('${esc2(cat)}')">
      <div class="cat-dot" style="background:${allOff?'var(--border)':catColor(cat)};cursor:pointer;width:10px;height:10px;border-radius:50%;border:${allOff?'2px solid var(--text3)':'none'};transition:all .2s"
           onclick="event.stopPropagation();toggleFullCategory('${esc2(cat)}')"
           title="${allOff?'Restore all '+cat+' alarms':'Disable all '+cat+' alarms'}"></div>
      <div class="cat-name">${cat.replace(' Failures','')}</div>
      <div class="cat-count" style="color:${catActive<catTotal?'var(--red)':'inherit'}">${catActive}/${catTotal}</div>
    </div>`;
  }).join('');
}

function setCatFilter(cat){ activeCatFilter=cat; renderAlarmTable(S.activeEntity); renderCatList(); renderAlarmTypes(S.activeEntity); }

function selectEntity(key){
  S.activeEntity = key;
  activeCatFilter = '';
  S.activeAlarmTypeFilter = '';
  document.getElementById('alarmSearch').value='';
  renderAlarmTable(key);
  renderQtyPanel();
  renderSidebarConfig();
  renderCatList();
  renderAlarmTypes(key);
  renderCommonAlarmsChip();
}

function renderAlarmTable(entityKey){
  const entity = S.entityAlarms[entityKey];
  if(!entity){ document.getElementById('alarmTableContainer').innerHTML='<div class="empty-state"><div class="empty-icon">👈</div><div>Select an entity chip to view its alarms</div></div>'; return; }

  const search = ((document.getElementById('alarmSearch')||{}).value||'').toLowerCase();

  // Count totals across groups
  let totalAll=0, totalActive=0;
  entity.alarmGroups.forEach(g=>{ g.alarms.forEach(a=>{ totalAll++; if(!a.deleted) totalActive++; }); });

  document.getElementById('alarmHdrTitle').textContent = `${entityKey} — ${entity.eqName}${entity.total>1?' (Unit '+entity.idx+'/'+entity.total+')':''}`;
  document.getElementById('alarmHdrBadge').style.display='inline-block';
  document.getElementById('alarmHdrBadge').textContent = entity.eqCat;
  document.getElementById('alarmHdrCount').textContent = `${totalActive.toLocaleString()} / ${totalAll.toLocaleString()} alarms`;
  document.getElementById('alarmHdrActions').style.display='flex';

  if(!entity.alarmGroups.length){
    document.getElementById('alarmTableContainer').innerHTML='<div class="empty-state"><div class="empty-icon">⚠</div><div>No alarms found — import an Excel file in Settings first</div></div>';
    return;
  }

  // Render grouped by alarm type
  let html = '<table class="alarm-table"><thead><tr><th>Alarm Name</th><th>Description</th><th>Alarm Type</th><th>Category</th><th>Value</th><th>Pri</th><th></th></tr></thead><tbody>';
  entity.alarmGroups.forEach((g,gi)=>{
    if(activeCatFilter && g.category!==activeCatFilter && g.category!==activeCatFilter.replace(' Failures','')+'s') return;
    if(S.activeAlarmTypeFilter && g.alarmType !== S.activeAlarmTypeFilter) return;
    const visible = g.alarms.filter(a=>{
      if(!S.showDeleted && a.deleted) return false;
      if(search && !a.name.toLowerCase().includes(search) && !a.desc.toLowerCase().includes(search)) return false;
      return true;
    });
    if(!visible.length) return;
    visible.forEach((a)=>{
      const realIdx = entity.alarmGroups[gi].alarms.indexOf(a);
      const bc=badgeClass(g.category);
      const pc=a.priority===0?'p0':a.priority===5?'p5':'pn';
      html+=`<tr class="${a.deleted?'deleted':''}">
        <td class="tag" style="white-space:nowrap">${esc(a.name)}</td>
        <td class="desc" style="max-width:380px">${esc(a.desc)}</td>
        <td class="group-cell" title="${esc(g.alarmType)}">${esc(g.alarmType.length>28?g.alarmType.substring(0,28)+'…':g.alarmType)}</td>
        <td><span class="badge ${bc}">${(g.category||'').replace(' Failures','')}</span></td>
        <td class="val-cell">${a.value||'—'}</td>
        <td><span class="pdot ${pc}"></span>${a.priority??'—'}</td>
        <td style="white-space:nowrap">
          <button class="row-del ${a.deleted?'row-restore':''}" onclick="toggleAlarmDel('${entityKey}',${gi},${realIdx})" title="${a.deleted?'Restore':'Delete'}">${a.deleted?'↺':'×'}</button>
        </td>
      </tr>`;
    });
  });
  html+='</tbody></table>';

  document.getElementById('alarmTableContainer').innerHTML=html;
  renderCatList();
}

function toggleAlarmDel(entityKey, groupIdx, alarmIdx){
  const entity = S.entityAlarms[entityKey];
  if(entity && entity.alarmGroups[groupIdx]){
    entity.alarmGroups[groupIdx].alarms[alarmIdx].deleted = !entity.alarmGroups[groupIdx].alarms[alarmIdx].deleted;
    renderAlarmTable(entityKey);
    renderQtyPanel();
    renderSidebarConfig();
  }
}

function toggleDeletedView(){ S.showDeleted=!S.showDeleted; renderAlarmTable(S.activeEntity); }
function restoreAll(){
  if(S.activeEntity && S.entityAlarms[S.activeEntity]){
    S.entityAlarms[S.activeEntity].alarmGroups.forEach(g=>g.alarms.forEach(a=>a.deleted=false));
    renderAlarmTable(S.activeEntity);
    renderQtyPanel();
    renderSidebarConfig();
    toast('All alarms restored.');
  }
}

// ── Bulk enable/disable ──────────────────────────────────
function bulkEnableAll(){
  if(!S.activeEntity || !S.entityAlarms[S.activeEntity]) return;
  S.entityAlarms[S.activeEntity].alarmGroups.forEach(g=>g.alarms.forEach(a=>a.deleted=false));
  renderAlarmTable(S.activeEntity);
  renderQtyPanel();
  renderSidebarConfig();
  toast('All alarms enabled ✓');
}

function bulkDisableAll(){
  if(!S.activeEntity || !S.entityAlarms[S.activeEntity]) return;
  S.entityAlarms[S.activeEntity].alarmGroups.forEach(g=>g.alarms.forEach(a=>a.deleted=true));
  renderAlarmTable(S.activeEntity);
  renderQtyPanel();
  renderSidebarConfig();
  toast('All alarms disabled ✓');
}

// ── Priority Editor ──────────────────────────────────────
function filterAlarms(){ renderAlarmTable(S.activeEntity); renderCatList(); }

function renderAlarmTypes(entityKey){
  const el = document.getElementById('alarmTypeList');
  if(!entityKey || (entityKey !== 'COMMON' && !S.entityAlarms[entityKey])){
    el.innerHTML = '<div style="padding:8px 0;font-size:11px;color:var(--text3)">Select an entity to see alarm types</div>';
    return;
  }

  let groups = [];
  if(entityKey === 'COMMON'){
    const byGroup = {};
    (S.commonAlarms||[]).forEach(a=>{
      if(!byGroup[a.group]) byGroup[a.group] = {category:a.category, alarms:[]};
      byGroup[a.group].alarms.push(a);
    });
    groups = Object.entries(byGroup).map(([alarmType,d])=>({alarmType, category:d.category, alarms:d.alarms}));
  } else {
    const entity = S.entityAlarms[entityKey];
    if(!entity){ el.innerHTML=''; return; }
    groups = entity.alarmGroups;
  }

  if(!groups.length){
    // If we have sheets loaded but no groups, the entity was built before templates were ready — rebuild
    if(entityKey !== 'COMMON' && Object.keys(SHEET_TEMPLATES).length > 0){
      buildEntityAlarms();
      const entity2 = S.entityAlarms[entityKey];
      if(entity2 && entity2.alarmGroups.length){
        groups = entity2.alarmGroups;
      }
    }
    if(!groups.length){
      el.innerHTML='<div style="padding:8px 0;font-size:11px;color:var(--text3)">No alarm types — import Excel in Settings first</div>';
      return;
    }
  }

  // Meta definitions: what each alarm type count represents
  const META = {"Electrical Alarm - Battery Failure": {"label": "Batteries in panel", "suffix": "BATT", "max": 5, "icon": "🔋"}, "Electrical Alarm - UPS Fault": {"label": "UPS units (incl. buffers)", "suffix": "UPS", "max": 10, "icon": "⚡"}, "Electrical Alarm - Main Circuit Breaker": {"label": "Main circuit breakers", "suffix": "CB", "max": 1, "icon": "🔌", "fixed": true}, "Electrical Alarm - Servo Motor Breaker Off": {"label": "Servo motor breakers", "suffix": "SMB", "max": 1, "icon": "🔌", "fixed": true}, "Electrical Alarm - VFD Fault": {"label": "VFD (AC) motors", "suffix": "M", "max": 60, "icon": "M", "linked": ["Operational Alarm - Motor Off", "Communication Alarm - Motor Communication Lost", "Operational Alarm - Products Stuck"]}, "Electrical Alarm - Servo Motor Fault": {"label": "Servo motors", "suffix": "SM", "max": 60, "icon": "🔧", "linked": ["Operational Alarm - Servo Motor Off", "Communication Alarm - Servo Motor Communication Lost", "Mechanical Alarm - Servo Out of Range", "Mechanical Alarm - Homing Error"]}, "Electrical Alarm - MDR Fault": {"label": "MDR zones (Covelinx)", "suffix": "CL", "max": 60, "icon": "📦"}, "Operational Alarm - Temperature Sensor Failure": {"label": "Temperature sensors (TS)", "suffix": "TS", "max": 10, "icon": "🌡"}, "Operational Alarm - Motor Off": {"label": "VFD motors (auto from VFD)", "suffix": "M", "max": 60, "icon": "M", "auto": "Electrical Alarm - VFD Fault"}, "Operational Alarm - Servo Motor Off": {"label": "Servo motors (auto from SM)", "suffix": "SM", "max": 60, "icon": "🔧", "auto": "Electrical Alarm - Servo Motor Fault"}, "Operational Alarm - Products Stuck": {"label": "VFD motors (auto from VFD)", "suffix": "M", "max": 60, "icon": "M", "auto": "Electrical Alarm - VFD Fault"}, "Mechanical Alarm - Pneumatic Error": {"label": "Pressure sensors (PS)", "suffix": "PS", "max": 10, "icon": "💨"}, "Mechanical Alarm - Gate Open Position Not Reached": {"label": "Gates on equipment", "suffix": "GATE", "max": 10, "icon": "🚪"}, "Mechanical Alarm - Gate Close Position Not Reached": {"label": "Gates on equipment", "suffix": "GATE", "max": 10, "icon": "🚪", "auto": "Mechanical Alarm - Gate Open Position Not Reached"}, "Mechanical Alarm - Lift Open Position Not Reached": {"label": "Lifts on equipment", "suffix": "LIFT", "max": 10, "icon": "↕"}, "Mechanical Alarm - Lift Close Position Not Reached": {"label": "Lifts on equipment", "suffix": "LIFT", "max": 10, "icon": "↕", "auto": "Mechanical Alarm - Lift Open Position Not Reached"}, "Mechanical Alarm - Servo Out of Range": {"label": "Servo motors (auto from SM)", "suffix": "SM", "max": 10, "icon": "🔧", "auto": "Electrical Alarm - Servo Motor Fault"}, "Mechanical Alarm - Homing Error": {"label": "Servo motors (auto from SM)", "suffix": "SM", "max": 10, "icon": "🔧", "auto": "Electrical Alarm - Servo Motor Fault"}, "Safety Alarm - Emergency Stop Activated": {"label": "E-stop push buttons", "suffix": "ES", "max": 5, "icon": "🛑"}, "Safety Alarm - Guard Switch": {"label": "Safety doors / guards", "suffix": "GS", "max": 10, "icon": "🚪"}, "Safety Alarm - Light Barrier": {"label": "Light barriers (infeed+outfeed)", "suffix": "LB", "max": 20, "icon": "💡"}, "Safety Alarm - Safety Valve": {"label": "Safety valves (EV)", "suffix": "EV", "max": 1, "icon": "🔒", "fixed": true}, "Communication Alarm - Zone Feedback": {"label": "Zone feedback", "suffix": "ZONE", "max": 1, "icon": "📡", "fixed": true}, "Communication Alarm - Servo Motor Communication Lost": {"label": "Servo motors (auto from SM)", "suffix": "SM", "max": 10, "icon": "🔧", "auto": "Electrical Alarm - Servo Motor Fault"}, "Communication Alarm - Motor Communication Lost": {"label": "VFD motors (auto from VFD)", "suffix": "M", "max": 60, "icon": "M", "auto": "Electrical Alarm - VFD Fault"}, "Communication Alarm - Equipment Not in EXT": {"label": "Not-in-EXT (robot only)", "suffix": "EXT", "max": 1, "icon": "🤖", "fixed": true}, "Communication Alarm - Gateway Communication Lost": {"label": "Gateways in panel", "suffix": "GW", "max": 20, "icon": "🌐"}};

  el.innerHTML = groups.map(g=>{
    const total = g.alarms.length;
    const active = g.alarms.filter(a=>!a.deleted).length;
    const isActive = S.activeAlarmTypeFilter === g.alarmType;
    const meta = META[g.alarmType] || {};
    const shortName = g.alarmType.replace(/^(Electrical|Operational|Mechanical|Safety|Communication|Automation) Alarm - /,'');
    const isAuto = !!meta.auto;
    const isFixed = !!meta.fixed;

    // Cross-highlight: fade if category filter active and this type doesn't match
    const normCat = (g.category||'').replace('Operational Failure','Operational Failures');
    const catMatch = !activeCatFilter || normCat === activeCatFilter;
    const allDeleted = active === 0 && total > 0;
    const opacity = catMatch ? '1' : '0.25';
    const rowStyle = `cursor:pointer;opacity:${opacity};transition:opacity .2s;${allDeleted?'text-decoration:line-through;':''}`; 

    return `<div class="at-row ${isActive?'at-row-active':''}" onclick="setAlarmTypeFilter('${esc2(g.alarmType)}')" style="${rowStyle}">
      <div class="at-dot" 
           style="background:${active===0?'var(--border)':catColor(normCat)};cursor:pointer;transition:all .2s;flex-shrink:0;width:10px;height:10px;border-radius:50%;border:${active===0?'2px solid var(--text3)':'none'}"
           onclick="event.stopPropagation();toggleFullAlarmType('${esc2(entityKey)}','${esc2(g.alarmType)}')"
           title="${active===0?'Restore all '+esc(shortName)+' alarms':'Disable all '+esc(shortName)+' alarms'}"></div>
      <div style="flex:1;min-width:0">
        <div class="at-name" title="${esc(g.alarmType)}" style="${isActive?'color:var(--accent);font-weight:600':''}">
          ${esc(shortName)}
        </div>
        <div style="font-size:9px;color:var(--text3);margin-top:1px">${esc(meta.label||'')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
        ${isFixed || isAuto ? '' : `<button class="at-adj" onclick="event.stopPropagation();adjAlarmType('${esc2(entityKey)}','${esc2(g.alarmType)}',-1)">−</button>`}
        <span style="font-family:'DM Mono',monospace;font-size:10px;background:var(--surface2);border:1px solid var(--border);padding:1px 5px;border-radius:4px;color:${active<total?'var(--red)':'var(--text3)'}">${active}/${total}</span>
        ${isFixed || isAuto ? '' : `<button class="at-adj" onclick="event.stopPropagation();adjAlarmType('${esc2(entityKey)}','${esc2(g.alarmType)}',1)">+</button>`}
      </div>
    </div>`;
  }).join('');
}

// Adjust how many alarms are active for a given alarm type
// − marks extras as deleted, + restores previously deleted ones
// Toggle ALL alarms in a type on/off — clicking the colored dot
// Toggle all alarms in a full category (clicking the colored dot in Categories)
function toggleFullCategory(cat){
  const entityKey = S.activeEntity;
  if(!entityKey || entityKey==='COMMON') return;
  const entity = S.entityAlarms[entityKey];
  if(!entity) return;
  const groups = (entity.alarmGroups||[]).filter(g=>{
    const nc=(g.category||'').replace('Operational Failure','Operational Failures');
    return nc===cat;
  });
  const anyActive = groups.some(g=>g.alarms.some(a=>!a.deleted));
  groups.forEach(g=>{ g.alarms.forEach(a=>{ a.deleted = anyActive; }); });
  renderAlarmTable(entityKey);
  renderAlarmTypes(entityKey);
  renderCatList();
  renderQtyPanel();
  renderSidebarConfig();
}

function toggleFullAlarmType(entityKey, alarmType){
  let alarmsList;
  if(entityKey === 'COMMON'){
    alarmsList = (S.commonAlarms||[]).filter(a=>a.group===alarmType);
  } else {
    const entity = S.entityAlarms[entityKey];
    if(!entity) return;
    const group = entity.alarmGroups.find(g=>g.alarmType===alarmType);
    if(!group) return;
    alarmsList = group.alarms;
  }
  // If any are active → delete all. If all deleted → restore all.
  const anyActive = alarmsList.some(a=>!a.deleted);
  alarmsList.forEach(a=>{ a.deleted = anyActive; });
  // Also sync linked types
  if(entityKey !== 'COMMON') syncLinkedAlarmTypes(entityKey, alarmType, anyActive ? 0 : alarmsList.length);
  renderAlarmTable(entityKey);
  renderAlarmTypes(entityKey);
  renderQtyPanel();
  renderSidebarConfig();
}

function adjAlarmType(entityKey, alarmType, delta){
  let alarmsList;
  if(entityKey === 'COMMON'){
    alarmsList = (S.commonAlarms||[]).filter(a=>a.group===alarmType);
  } else {
    const entity = S.entityAlarms[entityKey];
    if(!entity) return;
    const group = entity.alarmGroups.find(g=>g.alarmType===alarmType);
    if(!group) return;
    alarmsList = group.alarms;
  }

  const currentActive = alarmsList.filter(a=>!a.deleted).length;
  const newCount = Math.max(0, Math.min(alarmsList.length, currentActive + delta));

  if(delta < 0){
    // Mark last active alarm as deleted
    const last = [...alarmsList].reverse().find(a=>!a.deleted);
    if(last) last.deleted = true;
  } else {
    // Restore first deleted alarm
    const first = alarmsList.find(a=>a.deleted);
    if(first) first.deleted = false;
  }

  // Sync linked alarm types (e.g. Motor Off, Products Stuck follow VFD count)
  syncLinkedAlarmTypes(entityKey, alarmType, newCount);

  renderAlarmTable(entityKey);
  renderAlarmTypes(entityKey);
  renderQtyPanel();
  renderSidebarConfig();
}

// Sync alarm types that auto-follow another type's count
function syncLinkedAlarmTypes(entityKey, sourceType, newCount){
  if(entityKey === 'COMMON') return;
  const entity = S.entityAlarms[entityKey];
  if(!entity) return;

  // Find all groups that have 'auto' = sourceType
  const META_AUTO_MAP = {
    'Electrical Alarm - VFD Fault': ['Operational Alarm - Motor Off','Communication Alarm - Motor Communication Lost','Operational Alarm - Products Stuck'],
    'Electrical Alarm - Servo Motor Fault': ['Operational Alarm - Servo Motor Off','Communication Alarm - Servo Motor Communication Lost','Mechanical Alarm - Servo Out of Range','Mechanical Alarm - Homing Error'],
    'Mechanical Alarm - Gate Open Position Not Reached': ['Mechanical Alarm - Gate Close Position Not Reached'],
    'Mechanical Alarm - Lift Open Position Not Reached': ['Mechanical Alarm - Lift Close Position Not Reached'],
  };

  const linked = META_AUTO_MAP[sourceType] || [];
  linked.forEach(linkedType=>{
    const linkedGroup = entity.alarmGroups.find(g=>g.alarmType===linkedType);
    if(!linkedGroup) return;
    // Set same active count as source, respecting max
    const targetCount = Math.min(newCount, linkedGroup.alarms.length);
    linkedGroup.alarms.forEach((a,i)=>{ a.deleted = i >= targetCount; });
  });
}

function setAlarmTypeFilter(alarmType){
  S.activeAlarmTypeFilter = S.activeAlarmTypeFilter === alarmType ? '' : alarmType;
  if(S.activeEntity === 'COMMON') renderCommonAlarmTable();
  else renderAlarmTable(S.activeEntity);
  renderAlarmTypes(S.activeEntity);
}


// ══════════════════════════════════════════════════
