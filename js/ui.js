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




// ══════════════════════════════════════════════════
//  ALARM BUILDING
// ══════════════════════════════════════════════════


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





// Show common alarms as a special "COMMON" entity chip



// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════

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

  // Setup drop zone drag events (Settings page manual import)
  const dz = document.getElementById('dropZone');
  if(dz){
    dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', ()=>dz.classList.remove('dragover'));
    dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('dragover'); const f=e.dataTransfer.files[0]; if(f) processFile(f); });
  }
}

function goEquipment(){ S.unlocked.add("configure"); S.unlocked.add("export"); updateTabs(); goPage("configure"); }
