// ══════════════════════════════════════════════════
//  CUSTOM ALARMS (project-specific)
// ══════════════════════════════════════════════════

function openCustomAlarmModal(){
  document.getElementById('ca-name').value = '';
  document.getElementById('ca-desc').value = '';
  document.getElementById('ca-group').value = 'Custom Alarms';
  document.getElementById('ca-category').value = 'Custom';
  document.getElementById('ca-value').value = '';
  document.getElementById('ca-err').style.display = 'none';
  openOverlay('customAlarmOverlay');
  setTimeout(()=>document.getElementById('ca-name').focus(), 50);
}

function saveCustomAlarm(){
  const name     = document.getElementById('ca-name').value.trim();
  const desc     = document.getElementById('ca-desc').value.trim();
  const group    = document.getElementById('ca-group').value.trim() || 'Custom Alarms';
  const category = document.getElementById('ca-category').value.trim() || 'Custom';
  const value    = document.getElementById('ca-value').value.trim();
  const errEl    = document.getElementById('ca-err');
  if(!name){ errEl.textContent='Alarm name is required.'; errEl.style.display='block'; return; }
  if(!desc){ errEl.textContent='Description is required.'; errEl.style.display='block'; return; }
  if(!S.customProjectAlarms) S.customProjectAlarms = [];
  S.customProjectAlarms.push({
    id: Date.now(), name, desc, group, category,
    value: value||'', priority:null, deleted:false,
    createdBy: AUTH.username, createdAt: new Date().toISOString()
  });
  closeOverlay('customAlarmOverlay');
  updateStats();
  toast(`Custom alarm "${name}" added ✓`);
}

function deleteCustomAlarm(id){
  if(!S.customProjectAlarms) return;
  const alarm = S.customProjectAlarms.find(a=>a.id===id);
  if(alarm) alarm.deleted = true;
  updateStats();
}

// ── Settings alarm table ────────────────────────────────────
function renderSettingsAlarmTable(){
  if(typeof renderSettingsTable === 'function') renderSettingsTable();
}

// ── Add alarm to DB (admin) ─────────────────────────────────
let editingAlarmRef = null;
function openAddAlarm(){
  editingAlarmRef = null;
  document.getElementById('addAlarmTitle').textContent = 'Add Alarm';
  ['aTag','aDesc','aGroup','aId'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const aCat = document.getElementById('aCat'); if(aCat) aCat.value='Electrical Failures';
  openOverlay('addAlarmOverlay');
}

function saveAlarm(){
  const tag  = (document.getElementById('aTag')||{}).value||'';
  const desc = (document.getElementById('aDesc')||{}).value||'';
  if(!tag.trim()||!desc.trim()){ toast('Tag and Description are required.','err'); return; }
  // Add to a custom sheet in S.importedSheets
  if(!S.importedSheets['Custom']) S.importedSheets['Custom'] = [];
  S.importedSheets['Custom'].push({
    mainCategory: (document.getElementById('aCat')||{}).value||'',
    subCategory: '', subSubCategory: '',
    tag: tag.trim(), alarmName: tag.trim(),
    description: desc.trim(), severity: '',
    alarmId: (document.getElementById('aId')||{}).value||'',
    sheet: 'Custom'
  });
  closeOverlay('addAlarmOverlay');
  renderSettingsTable();
  toast('Alarm added ✓');
}
