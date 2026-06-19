//  NAVIGATION
// ══════════════════════════════════════════════════
const TABS = ['dashboard','project','configure','export','settings','users'];
const LOCK_MSG = {
  configure:'Complete project info first.',
  export:'Complete project info first.'
};

function tryNav(id){
  if(id==='settings'){ trySettings(); return; }
  if(id==='users'){ tryUsers(); return; }
  if(id==='dashboard'){ goDashboard(); return; }
  if(!S.unlocked.has(id)){ toast(LOCK_MSG[id]||'Complete previous steps first.','err'); return; }
  goPage(id);
}

function updateTabs(){
  TABS.forEach(id=>{
    const t = document.getElementById('tab-'+id);
    if(!t) return;
    t.classList.remove('active','locked','done');
    if(!S.unlocked.has(id) && !['settings','users','dashboard'].includes(id)) t.classList.add('locked');
  });
  const settingsTab = document.getElementById('tab-settings');
  if(settingsTab && AUTH && AUTH.role !== 'admin') settingsTab.style.display = 'none';
}

function goPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  TABS.forEach(t=>{ const el=document.getElementById('tab-'+t); if(el) el.classList.remove('active'); });
  const tab = document.getElementById('tab-'+id);
  if(tab){ tab.classList.add('active'); tab.classList.remove('locked'); }
  // Hide old sidebar — configure now has its own built-in left panel
  document.getElementById('sidebar').style.display = 'none';
  // Render configure page when navigating to it
  if(id === 'configure') renderConfigurePage();
  window.scrollTo(0,0);
}

// ══════════════════════════════════════════════════
//  PROJECT VALIDATION
// ══════════════════════════════════════════════════
function clearErr(el){
  el.classList.remove('err');
  const e=document.getElementById('err-'+el.id);
  if(e) e.classList.remove('show');
}
function showFieldErr(id){
  const el=document.getElementById(id);
  el.classList.add('err');
  const e=document.getElementById('err-'+id);
  if(e) e.classList.add('show');
}
function goProject(){
  const req=['projectName','clientName','projectRef','projectSite'];
  let ok=true;
  req.forEach(id=>{ if(!document.getElementById(id).value.trim()){ showFieldErr(id); ok=false; }});
  if(!ok){ toast('Fill in all required fields.','err'); document.querySelector('.err')?.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  S.unlocked.add('configure');
  S.unlocked.add('export');
  updateTabs();
  goPage('configure');
}

// ══════════════════════════════════════════════════
//  EQUIPMENT
// ══════════════════════════════════════════════════
function renderEquipment(){
  const grid = document.getElementById('equipmentGrid');
  grid.innerHTML = EQ_CATS.map(c=>`
    <div class="eq-cat">
      <div class="eq-cat-title">${c.cat}</div>
      <div class="eq-grid">${c.items.map(item=>{
        const key=c.cat+'|'+item, sel=S.selectedEq.has(key);
        return `<div class="eq-item ${sel?'selected':''}" onclick="toggleEq('${esc2(key)}')" data-key="${esc2(key)}">
          <div class="eq-cb">${sel?'✓':''}</div>
          <div class="eq-name">${item}</div>
        </div>`;
      }).join('')}</div>
    </div>`).join('');
}

function toggleEq(key){
  if(S.selectedEq.has(key)){ S.selectedEq.delete(key); delete S.quantities[key]; }
  else { S.selectedEq.add(key); if(!S.quantities[key]) S.quantities[key]=1; }
  const el=document.querySelector(`[data-key="${CSS.escape(key)}"]`);
  if(el){ el.classList.toggle('selected',S.selectedEq.has(key)); el.querySelector('.eq-cb').textContent=S.selectedEq.has(key)?'✓':''; }
}

function updateSidebarStats(){
  const total = Object.values(S.importedSheets).reduce((a,b)=>a+b.length,0);
  const cats = [...new Set(Object.values(S.importedSheets).flatMap(arr=>arr.map(a=>a.group)).filter(Boolean))].length;
  document.getElementById('stat-entities').textContent = S.selectedEq.size;
  document.getElementById('stat-alarmtypes').textContent = cats;
  document.getElementById('stat-alarms').textContent = total > 0 ? total.toLocaleString() : '0';
}

function goEquipment(){
  // Equipment step removed — go directly to configure
  S.unlocked.add('configure');
  S.unlocked.add('export');
  updateTabs();
  goPage('configure');
}

// ══════════════════════════════════════════════════
//  ALARM BUILDING
// ══════════════════════════════════════════════════
function getAlarmsForEquipment(eqName){
  // Try specific sheet first
  const sheetName = EQ_SHEET_MAP[eqName];
  let alarms = [];
  if(sheetName && S.importedSheets[sheetName] && S.importedSheets[sheetName].length>0){
    alarms = S.importedSheets[sheetName];
  } else {
    // fallback: use Common + VFD
    alarms = [...(S.importedSheets['Common']||[]), ...(S.importedSheets['VFD']||[])];
  }
  return alarms;
}

function buildEntityAlarms(){
  // Uses TEMPLATES (E/L) to build per-entity alarm lists
  // Each equipment unit gets entity key E01, E02...
  // Alarms are fetched from TEMPLATES['E'] with tag substitution
  S.entityAlarms = {};
  let eIdx = 1;

  EQ_CATS.forEach(c=>c.items.forEach(item=>{
    const key = c.cat+'|'+item;
    if(!S.selectedEq.has(key)) return;
    const qty = S.quantities[key]||1;

    for(let i=1; i<=qty; i++){
      const entityKey = `E${String(eIdx).padStart(2,'0')}`;
      // Get alarm groups for this entity from the correct sheet template
      const alarmGroups = getAlarmsForEntity(item, eIdx);
      S.entityAlarms[entityKey] = {
        eqName: item,
        eqCat: c.cat,
        idx: i,
        total: qty,
        alarmGroups  // [{alarmType, category, alarms:[{name,desc,value,priority,deleted}]}]
      };
      eIdx++;
    }
  }));
}

// ══════════════════════════════════════════════════
//  STATS + SIDEBAR
// ══════════════════════════════════════════════════
function updateStats(){
  const all = getAllAlarms();
  const sheets = Object.keys(S.importedSheets).length;
  const el1 = document.getElementById('stat-entities');
  const el2 = document.getElementById('stat-alarmtypes');
  const el3 = document.getElementById('stat-alarms');
  if(el1) el1.textContent = sheets;
  if(el2) el2.textContent = [...new Set(all.map(a=>a.sheet).filter(Boolean))].length;
  if(el3) el3.textContent = all.length.toLocaleString();
}

// ══════════════════════════════════════════════════
//  THEME
// ══════════════════════════════════════════════════
function toggleTheme(){
  const isLight=document.documentElement.classList.toggle('light');
  // isLight=true means we just switched TO light mode
  // label shows what clicking again will do: going to dark = "DARK"
  document.getElementById('themeLabel').textContent = isLight ? 'DARK' : 'LIGHT';
  localStorage.setItem('ic_theme', isLight ? 'light' : 'dark');
}
function initTheme(){
  const saved=localStorage.getItem('ic_theme');
  const useLight = saved==='light';
  if(useLight){
    document.documentElement.classList.add('light');
    document.getElementById('themeLabel').textContent='DARK';   // in light → click goes DARK
  } else {
    document.documentElement.classList.remove('light');
    document.getElementById('themeLabel').textContent='LIGHT';  // in dark → click goes LIGHT
  }
}

// ══════════════════════════════════════════════════
//  OVERLAY / TOAST
// ══════════════════════════════════════════════════
function openOverlay(id){ document.getElementById(id).classList.add('open'); }
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => {
  if(e.target.classList.contains('overlay')) e.target.classList.remove('open');
});

function toast(msg,type=''){
  const old=document.querySelector('.toast'); if(old) old.remove();
  const t=document.createElement('div'); t.className='toast '+(type==='err'?'err':type==='info'?'info':'');
  t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3200);
}

// ══════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function esc2(s){ return String(s||'').replace(/'/g,"\\'"); }
function badgeClass(c){ c=(c||'').replace('Operational Failure','Operational Failures').toLowerCase(); if(c.includes('electrical'))return'b-e'; if(c.includes('safety'))return'b-s'; if(c.includes('operational'))return'b-o'; if(c.includes('mechanical'))return'b-m'; if(c.includes('automation'))return'b-a'; return'b-c'; }
function catColor(c){ c=(c||'').replace('Operational Failure','Operational Failures').toLowerCase(); if(c.includes('operational'))return'var(--yellow)'; if(c.includes('safety'))return'var(--red)'; if(c.includes('electrical'))return'var(--orange)'; if(c.includes('mechanical'))return'var(--green)'; if(c.includes('automation'))return'var(--accent)'; return'var(--purple)'; }


// ══════════════════════════════════════════════════
//  COMMON ALARMS WIZARD
// ══════════════════════════════════════════════════
const WIZARD_DEFAULTS = {
  insightechBatt:6, insightechUps:6, insightechUpsBuffer:6,
  robotPanels:0, robotBattPerPanel:6,
  eBattPerUnit:6, eUpsPerUnit:6, eUpsBufferPerUnit:6,
  eTempSensors:10, eGuardSwitches:10, eLightBarriers:20, eValves:1,
  lBattPerUnit:6, lUpsPerUnit:6,
  lTempSensors:10, lPneumatic:10, lEStop:5, lERope:20, lLightBarriers:20,
  zoneLines:10
};
const WIZARD_MAX = {
  insightechBatt:6, insightechUps:6, insightechUpsBuffer:6,
  robotPanels:10, robotBattPerPanel:6,
  eBattPerUnit:6, eUpsPerUnit:6, eUpsBufferPerUnit:6,
  eTempSensors:10, eGuardSwitches:10, eLightBarriers:20, eValves:5,
  lBattPerUnit:6, lUpsPerUnit:6,
  lTempSensors:10, lPneumatic:10, lEStop:5, lERope:20, lLightBarriers:20,
  zoneLines:10
};
let wizardVals = {...WIZARD_DEFAULTS};

function openCommonWizard(){
  // Common alarms are project-level: they apply regardless of which/how many equipment is selected
  Object.keys(wizardVals).forEach(k=>{
    const el = document.getElementById('w-'+k);
    if(el) el.textContent = wizardVals[k];
  });
  openOverlay('commonWizardOverlay');
}

function wAdj(key, delta){
  wizardVals[key] = Math.max(0, Math.min(WIZARD_MAX[key]||99, (wizardVals[key]||0)+delta));
  const el = document.getElementById('w-'+key);
  if(el) el.textContent = wizardVals[key];
}

function applyCommonWizard(){
  // Read all values from the UI
  Object.keys(wizardVals).forEach(k=>{
    const el = document.getElementById('w-'+k);
    if(el) wizardVals[k] = parseInt(el.textContent)||0;
  });

  // Build common alarm list from Excel data
  const commonAlarms = buildCommonAlarms(wizardVals);
  S.commonAlarms = commonAlarms;

  closeOverlay('commonWizardOverlay');
  toast(`Generated ${commonAlarms.length} common alarms ✓`);

  // If on configure page, refresh the common entity display
  renderCommonAlarmsChip();
}

function buildCommonAlarms(v){
  const alarms = [];
  const sheets = S.importedSheets;
  const common = sheets['Common'] || [];

  // Parse common sheet into groups (by tag pattern)
  const byGroup = {};
  common.forEach(a => {
    if(!byGroup[a.group]) byGroup[a.group] = [];
    byGroup[a.group].push(a);
  });

  // Helper: get N alarms matching a prefix from a group
  function take(group, prefix, count){
    const src = (byGroup[group]||[]).filter(a=>a.tag.startsWith(prefix));
    return src.slice(0, count).map(a=>({
      name:a.tag, desc:a.description, value:String(a.id||''), priority:a.priority,
      group:a.group, category:a.category, deleted:false
    }));
  }

  // INSIGHTECH batteries
  if(v.insightechBatt > 0)
    alarms.push(...take('Electrical Alarm - Battery Failure','INSIGHTECH_BATT', v.insightechBatt));

  // INSIGHTECH UPS (regular)
  if(v.insightechUps > 0){
    const ups = (byGroup['Electrical Alarm - UPS Fault']||[]).filter(a=>a.tag.startsWith('INSIGHTECH_UPS') && !a.tag.includes('BUFFER'));
    alarms.push(...ups.slice(0,v.insightechUps).map(a=>({name:a.tag,desc:a.description,value:String(a.id||''),priority:a.priority,group:a.group,category:a.category,deleted:false})));
  }

  // INSIGHTECH UPS Buffer
  if(v.insightechUpsBuffer > 0){
    const buf = (byGroup['Electrical Alarm - UPS Fault']||[]).filter(a=>a.tag.includes('UPSBUFFER'));
    alarms.push(...buf.slice(0,v.insightechUpsBuffer).map(a=>({name:a.tag,desc:a.description,value:String(a.id||''),priority:a.priority,group:a.group,category:a.category,deleted:false})));
  }

  // ROBOT panels
  for(let r=1; r<=v.robotPanels; r++){
    const pad = String(r).padStart(2,'0');
    const prefix = 'ROBOT_'+pad+'_BATT';
    alarms.push(...take('Electrical Alarm - Battery Failure', prefix, v.robotBattPerPanel));
  }

  // Per-equipment alarms (for each selected entity)
  const entities = Object.entries(S.entityAlarms);
  entities.forEach(([ek])=>{
    const pad = ek.substring(1); // e.g. "01"

    if(v.eBattPerUnit > 0) alarms.push(...take('Electrical Alarm - Battery Failure', ek+'_BATT', v.eBattPerUnit));
    if(v.eUpsPerUnit > 0){
      const ups = (byGroup['Electrical Alarm - UPS Fault']||[]).filter(a=>a.tag.startsWith(ek+'_UPS') && !a.tag.includes('BUFFER'));
      alarms.push(...ups.slice(0,v.eUpsPerUnit).map(a=>({name:a.tag,desc:a.description,value:String(a.id||''),priority:a.priority,group:a.group,category:a.category,deleted:false})));
    }
    if(v.eUpsBufferPerUnit > 0){
      const buf = (byGroup['Electrical Alarm - UPS Fault']||[]).filter(a=>a.tag.startsWith(ek+'_UPSBUFFER'));
      alarms.push(...buf.slice(0,v.eUpsBufferPerUnit).map(a=>({name:a.tag,desc:a.description,value:String(a.id||''),priority:a.priority,group:a.group,category:a.category,deleted:false})));
    }
    if(v.eTempSensors > 0) alarms.push(...take('Operational Alarm - Temperature Sensor Failure', ek+'-TS', v.eTempSensors));
    if(v.eGuardSwitches > 0) alarms.push(...take('Safety Alarm - Guard Switch', ek+'-GS', v.eGuardSwitches));
    if(v.eLightBarriers > 0) alarms.push(...take('Safety Alarm - Light Barrier', ek+'-LB', v.eLightBarriers));

    // EV safety valves (one EV per equipment)
    if(v.eValves > 0){
      for(let ev=0; ev<v.eValves; ev++){
        const evPad = String(ev).padStart(2,'0');
        alarms.push(...take('Safety Alarm - Safety Valve', 'SAFETY_FEEDBACK_EV'+evPad+'_'+ek, 1));
      }
    }
  });

  // Per-line alarms — lines are project-level infrastructure (not per-equipment)
  // Use the zone line count as proxy for how many lines the project has
  const lineCount = Math.max(1, v.zoneLines || 1);
  for(let l=1; l<=lineCount; l++){
    const lk = 'L'+String(l).padStart(2,'0');

    if(v.lBattPerUnit > 0) alarms.push(...take('Electrical Alarm - Battery Failure', lk+'_BATT', v.lBattPerUnit));
    if(v.lUpsPerUnit > 0){
      const ups = (byGroup['Electrical Alarm - UPS Fault']||[]).filter(a=>a.tag.startsWith(lk+'_UPS') && !a.tag.includes('BUFFER'));
      alarms.push(...ups.slice(0,v.lUpsPerUnit).map(a=>({name:a.tag,desc:a.description,value:String(a.id||''),priority:a.priority,group:a.group,category:a.category,deleted:false})));
    }
    if(v.lTempSensors > 0) alarms.push(...take('Operational Alarm - Temperature Sensor Failure', lk+'-TS', v.lTempSensors));
    if(v.lPneumatic > 0) alarms.push(...take('Mechanical Alarm - Pneumatic Error', lk+'-PS', v.lPneumatic));
    if(v.lEStop > 0) alarms.push(...take('Safety Alarm - Emergency Stop Activated', lk+'-ES', v.lEStop));
    if(v.lERope > 0) alarms.push(...take('Safety Alarm - Emergency Rope', lk+'-ER', v.lERope));
    if(v.lLightBarriers > 0) alarms.push(...take('Safety Alarm - Light Barrier', lk+'-LB', v.lLightBarriers));
  }

  // Zone feedback
  if(v.zoneLines > 0){
    const zones = (byGroup['Communication Alarm - Zone Feedback']||[]);
    alarms.push(...zones.slice(0,v.zoneLines).map(a=>({name:a.tag,desc:a.description,value:String(a.id||''),priority:a.priority,group:a.group,category:a.category,deleted:false})));
  }

  return alarms;
}

// Show common alarms as a special "COMMON" entity chip
function renderCommonAlarmsChip(){
  const chips = document.getElementById('entityChips');
  if(!chips) return;
  // Re-render all chips including the COMMON chip
  let html = Object.entries(S.entityAlarms).map(([k,v])=>
    `<div class="chip e-chip ${S.activeEntity===k?'active':''}" onclick="selectEntity('${k}')">${k}</div>`
  ).join('');

  if(S.commonAlarms && S.commonAlarms.length > 0){
    const active = S.commonAlarms.filter(a=>!a.deleted).length;
    html += `<div class="chip ${S.activeEntity==='COMMON'?'active':''}" style="${S.activeEntity==='COMMON'?'':'border-color:var(--green);color:var(--green)'}" onclick="selectCommonAlarms()">COMMON <span style="opacity:.7;font-size:9px">${active}/${S.commonAlarms.length}</span></div>`;
  }
  chips.innerHTML = html;
}

function selectCommonAlarms(){
  S.activeEntity = 'COMMON';
  activeCatFilter = '';
  S.activeAlarmTypeFilter = '';
  renderCommonAlarmTable();
  renderCommonAlarmsChip();
}

function renderCommonAlarmTable(){
  const alarms = S.commonAlarms || [];
  const search = ((document.getElementById('alarmSearch')||{}).value||'').toLowerCase();

  document.getElementById('alarmHdrTitle').textContent = 'COMMON — Project-level Alarms';
  document.getElementById('alarmHdrBadge').style.display='inline-block';
  document.getElementById('alarmHdrBadge').textContent = 'Common';
  const active = alarms.filter(a=>!a.deleted).length;
  document.getElementById('alarmHdrCount').textContent = `${active} / ${alarms.length} alarms`;
  document.getElementById('alarmHdrActions').style.display='flex';

  if(!alarms.length){
    document.getElementById('alarmTableContainer').innerHTML = '<div class="empty-state"><div class="empty-icon">⚙</div><div>No common alarms configured yet — click ⚙ Common Alarms to configure</div></div>';
    return;
  }

  const visible = alarms.filter(a=>{
    if(!S.showDeleted && a.deleted) return false;
    if(search && !a.name.toLowerCase().includes(search) && !a.desc.toLowerCase().includes(search)) return false;
    if(S.activeAlarmTypeFilter && a.group !== S.activeAlarmTypeFilter) return false;
    return true;
  });

  // Group by alarm group for display
  const byGroup = {};
  visible.forEach(a=>{ if(!byGroup[a.group]) byGroup[a.group]=[]; byGroup[a.group].push(a); });

  let html = '<table class="alarm-table"><thead><tr><th>Alarm Name</th><th>Description</th><th>Alarm Type</th><th>Category</th><th>Value</th><th>Pri</th><th></th></tr></thead><tbody>';
  Object.entries(byGroup).forEach(([grp,arr])=>{
    arr.forEach(a=>{
      const bc=badgeClass(a.category);
      const pc=a.priority===0?'p0':a.priority===5?'p5':'pn';
      const ai = alarms.indexOf(a);
      html+=`<tr class="${a.deleted?'deleted':''}">
        <td class="tag">${esc(a.name)}</td>
        <td class="desc" style="max-width:320px">${esc(a.desc)}</td>
        <td class="group-cell">${esc(grp.length>28?grp.substring(0,28)+'…':grp)}</td>
        <td><span class="badge ${bc}">${(a.category||'').replace(' Failures','')}</span></td>
        <td class="val-cell">${a.value||'—'}</td>
        <td><span class="pdot ${pc}"></span>${a.priority??'—'}</td>
        <td><button class="row-del ${a.deleted?'row-restore':''}" onclick="toggleCommonAlarmDel(${ai})" title="${a.deleted?'Restore':'Delete'}">${a.deleted?'↺':'×'}</button></td>
      </tr>`;
    });
  });
  html += '</tbody></table>';
  document.getElementById('alarmTableContainer').innerHTML = html;
}

function toggleCommonAlarmDel(idx){
  if(S.commonAlarms && S.commonAlarms[idx]){
    S.commonAlarms[idx].deleted = !S.commonAlarms[idx].deleted;
    renderCommonAlarmTable();
    renderCommonAlarmsChip();
  }
}
// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
function loadSavedDB(){
  try {
    // Priority 1: Use embedded database (baked into the HTML file by admin)
    if(EMBEDDED_DB && EMBEDDED_DB.sheets && Object.keys(EMBEDDED_DB.sheets).length){
      S.importedSheets = EMBEDDED_DB.sheets;
      S.importedFile = EMBEDDED_DB.file || 'Embedded Database';
      rebuildTemplates(S.importedSheets);
      const total = Object.values(S.importedSheets).reduce((a,b)=>a+b.length,0);
      const el = document.getElementById('importStatusLine');
      if(el) el.textContent = `✓ ${S.importedFile} — ${total.toLocaleString()} alarms (embedded in file)`;
      const sf = document.getElementById('settingsSheetFilter');
      if(sf) sf.innerHTML = '<option value="">All Sheets</option>' + Object.keys(S.importedSheets).map(n=>`<option>${n}</option>`).join('');
      updateStats();
      console.log('Loaded EMBEDDED_DB:', total, 'alarms');
      return true;
    }
    // Priority 2: localStorage (saved in browser)
    const saved = localStorage.getItem('ic_alarm_db');
    if(!saved) return false;
    const parsed = JSON.parse(saved);
    if(!parsed.sheets || !Object.keys(parsed.sheets).length) return false;
    S.importedSheets = parsed.sheets;
    S.importedFile = parsed.file || 'Saved Database';
    rebuildTemplates(S.importedSheets);
    // Update UI to show loaded state
    const total = Object.values(S.importedSheets).reduce((a,b)=>a+b.length,0);
    const el = document.getElementById('importStatusLine');
    if(el) el.textContent = `✓ ${S.importedFile} — ${total.toLocaleString()} alarms loaded (saved ${new Date(parsed.savedAt).toLocaleDateString()})`;
    const dropTitle = document.getElementById('dropTitle');
    const dropSub = document.getElementById('dropSub');
    if(dropTitle) dropTitle.textContent = `✓ ${S.importedFile}`;
    if(dropSub) dropSub.textContent = `${Object.keys(parsed.sheets).length} sheets · ${total.toLocaleString()} alarms — loaded from saved database`;
    // Populate sheet filter in settings
    const sf = document.getElementById('settingsSheetFilter');
    if(sf) {
      sf.innerHTML = '<option value="">All Sheets</option>' + Object.keys(parsed.sheets).map(n=>`<option>${esc(n)}</option>`).join('');
    }
    updateStats();
    console.log('Alarm DB loaded from localStorage:', total, 'alarms');
    return true;
  } catch(e) {
    console.warn('Could not load from localStorage:', e);
    return false;
  }
}

function clearSavedDB(){
  if(!confirm('Clear the saved alarm database? You will need to re-import the Excel file.')) return;
  localStorage.removeItem('ic_alarm_db');
  S.importedSheets = {};
  S.importedFile = null;
  SHEET_TEMPLATES = {};
  const el = document.getElementById('importStatusLine');
  if(el) el.textContent = 'No file imported yet — alarms will be sourced from this file as the database';
  document.getElementById('dropTitle').textContent = 'Drop your Excel alarm file here';
  document.getElementById('dropSub').textContent = 'or click to browse — .xlsx format · each sheet = equipment type';
  document.getElementById('settingsTotalCount').textContent = '0';
  renderSettingsTable();
  toast('Alarm database cleared.');
}

// ── EMBEDDED USERS — fallback before GitHub is set up ──────────────────
// Replace these with your real hashed passwords before deploying.
// SHA-256 of "admin123" = a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
// SHA-256 of "engineer1" = ...generate your own with: echo -n "yourpassword" | sha256sum
const EMBEDDED_USERS = [
  {
    "username": "Miguel",
    "passwordHash": "8418227effc5604af0f8cf8a7c4d814186189df9fc19098dd85fbc520bbe95ad",
    "role": "admin",
    "firstName": "Miguel",
    "lastName": "Faraj",
    "picture": "miguel.jpg"
  },
  {
    "username": "engineer_test",
    "passwordHash": "80ca306ac6e68366dd0a26125c9647e0c61fac6668cec6016f5fe30fb12e99bd",
    "role": "engineer",
    "firstName": "Test",
    "lastName": "Engineer",
    "picture": ""
  }
];

function init(){
  initTheme();

  // Check for existing session
  try {
    const saved = sessionStorage.getItem('ic_auth');
    if(saved){
      AUTH = JSON.parse(saved);
      document.getElementById('loginScreen').style.display = 'none';
      onLoginSuccess();
    }
  } catch(e) {}

  updateTabs();
  renderEquipment();
  // Restore custom equipment
  loadCustomEqFromStorage();
  renderCustomEqList();
  // Auto-load saved database from previous session
  const loaded = loadSavedDB();
  if(loaded) {
    toast('Alarm database restored from last session ✓', 'info');
    renderSettingsTable();
  }
  // Sidebar stats start hidden (overview panel closed)
  document.getElementById('stat-entities').textContent='0';
  document.getElementById('stat-alarmtypes').textContent='0';
  document.getElementById('stat-alarms').textContent='0';
  // Setup drop zone drag events
  const dz = document.getElementById('dropZone');
  if(dz){
    dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', ()=>dz.classList.remove('dragover'));
    dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('dragover'); const f=e.dataTransfer.files[0]; if(f) processFile(f); });
  }
}
