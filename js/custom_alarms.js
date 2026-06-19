//  CUSTOM ALARMS
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
    id: Date.now(),
    name, desc, group, category,
    value: value || '',
    priority: null,
    deleted: false,
    createdBy: AUTH.username,
    createdAt: new Date().toISOString()
  });

  closeOverlay('customAlarmOverlay');
  renderCustomAlarmList();
  updateStats();
  toast(`Custom alarm "${name}" added ✓`);
}

function renderCustomAlarmList(){
  const el = document.getElementById('customAlarmList');
  if(!el) return;
  const alarms = S.customProjectAlarms || [];
  const active = alarms.filter(a=>!a.deleted);

  if(!active.length){
    el.innerHTML = '<div style="font-size:11px;color:var(--text3)">No custom alarms</div>';
    return;
  }

  el.innerHTML = active.map((a,i)=>`
    <div class="custom-alarm-row">
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;font-family:'DM Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</div>
        <div style="font-size:10px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.desc)}</div>
      </div>
      <button class="row-del" onclick="deleteCustomAlarm(${a.id})" title="Remove">×</button>
    </div>`).join('');
}

function deleteCustomAlarm(id){
  if(!S.customProjectAlarms) return;
  const alarm = S.customProjectAlarms.find(a=>a.id===id);
  if(alarm) alarm.deleted = true;
  renderCustomAlarmList();
  updateStats();
}



function resetWizard(){
  // Reset state for a new project without clearing alarm DB
  S.selectedEq    = new Set();
  S.quantities    = {};
  S.entityAlarms  = {};
  S.commonAlarms  = [];
  S.customProjectAlarms = [];
  S.activeEntity  = null;
  S.projectDone   = false;
  S.eqDone        = false;
  S.projectStatus = 'draft';
  S.unlocked      = new Set(['project']);
  updateTabs();
  renderEquipment();
  // Clear project form
  ['projectName','projectRef','clientName','projectSite','projectNotes'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value='';
  });
  populateEngineerBanner();
}


function doLogin(){} // legacy stub



function renderSettingsTable(){
  const q=(document.getElementById('settingsSearch')||{}).value||'';
  const cf=(document.getElementById('settingsCatFilter')||{}).value||'';
  const sf=(document.getElementById('settingsSheetFilter')||{}).value||'';
  let all = getAllAlarms();
  document.getElementById('settingsTotalCount').textContent = all.length.toLocaleString();
  if(sf) all=all.filter(a=>a.sheet===sf);
  if(cf) all=all.filter(a=>a.category===cf);
  if(q) all=all.filter(a=>(a.tag||'').toLowerCase().includes(q.toLowerCase())||(a.description||'').toLowerCase().includes(q.toLowerCase()));
  const {field,dir}=S.settingsSort;
  all.sort((a,b)=>{ const av=a[field]??'', bv=b[field]??''; return av<bv?-dir:av>bv?dir:0; });
  const total=all.length, pages=Math.ceil(total/S.settingsPageSize);
  const start=(S.settingsPage-1)*S.settingsPageSize;
  const page=all.slice(start,start+S.settingsPageSize);
  document.getElementById('settingsBody').innerHTML=page.map((a,i)=>{
    const bc=badgeClass(a.category);
    const pc=a.priority===0?'p0':a.priority===5?'p5':'pn';
    const isCustom=S.customAlarms.includes(a);
    return `<tr>
      <td class="tag">${esc(a.tag)}${isCustom?' <span style="font-size:9px;background:var(--green-light);color:var(--green);padding:1px 4px;border-radius:3px">NEW</span>':''}</td>
      <td class="desc" style="max-width:280px">${esc(a.description)}</td>
      <td class="group-cell">${esc((a.group||'').substring(0,25))}${(a.group||'').length>25?'…':''}</td>
      <td><span class="badge ${bc}">${(a.category||'').replace(' Failures','')}</span></td>
      <td style="font-size:11px;color:var(--text3)">${a.sheet||''}</td>
      <td class="val-cell">${a.id??'—'}</td>
      <td><span class="pdot ${pc}"></span>${a.priority??'—'}</td>
      <td style="white-space:nowrap">
        <button class="row-del" style="width:auto;padding:2px 8px;font-size:10px;border-radius:4px" onclick="editAlarmSettings(${start+i})"${AUTH&&AUTH.role!=='admin'?' disabled title="Admin only"':''}>Edit</button>
        ${isCustom?`<button class="row-del" style="margin-left:4px;width:auto;padding:2px 8px;font-size:10px;border-radius:4px" onclick="delCustomAlarm(${start+i})">×</button>`:''}
      </td>
    </tr>`;
  }).join('');
  // Pager
  const pager=document.getElementById('settingsPager');
  if(pages<=1){pager.innerHTML='';return;}
  let h=`<button style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;font-size:11px" onclick="pgSettings(${S.settingsPage-1})" ${S.settingsPage===1?'disabled':''}>‹</button>`;
  for(let p=1;p<=pages;p++){
    if(p===1||p===pages||(p>=S.settingsPage-2&&p<=S.settingsPage+2))
      h+=`<button style="padding:4px 10px;border-radius:6px;border:1px solid ${p===S.settingsPage?'var(--accent)':'var(--border)'};background:${p===S.settingsPage?'var(--accent-light)':'var(--surface2)'};cursor:pointer;font-size:11px;color:${p===S.settingsPage?'var(--accent)':'inherit'}" onclick="pgSettings(${p})">${p}</button>`;
    else if(p===S.settingsPage-3||p===S.settingsPage+3) h+=`<span style="font-size:11px;color:var(--text3)">…</span>`;
  }
  h+=`<button style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;font-size:11px" onclick="pgSettings(${S.settingsPage+1})" ${S.settingsPage===pages?'disabled':''}>›</button>`;
  h+=`<span style="font-size:11px;color:var(--text3)">${start+1}–${Math.min(start+S.settingsPageSize,total)} of ${total.toLocaleString()}</span>`;
  pager.innerHTML=h;
}
function pgSettings(p){ const pages=Math.ceil(getAllAlarms().length/S.settingsPageSize); S.settingsPage=Math.max(1,Math.min(p,pages)); renderSettingsTable(); }
function sortSettings(f){ S.settingsSort.field===f?S.settingsSort.dir*=-1:(S.settingsSort.field=f,S.settingsSort.dir=1); renderSettingsTable(); }

let editingAlarmRef = null;
function openAddAlarm(){ editingAlarmRef=null; document.getElementById('addAlarmTitle').textContent='Add Alarm'; ['aTag','aDesc','aGroup','aId'].forEach(id=>document.getElementById(id).value=''); document.getElementById('aCat').value='Electrical Failures'; document.getElementById('aSheet').value='Custom'; document.getElementById('aPrio').value='5'; openOverlay('addAlarmOverlay'); }
function editAlarmSettings(idx){ /* edit inline – future */ toast('Edit coming soon','info'); }
function delCustomAlarm(idx){
  const all=getAllAlarms(); const a=all[idx];
  const ci=S.customAlarms.indexOf(a);
  if(ci>=0){ S.customAlarms.splice(ci,1); renderSettingsTable(); toast('Deleted.'); }
}
function saveAlarm(){
  const tag=document.getElementById('aTag').value.trim();
  const desc=document.getElementById('aDesc').value.trim();
  if(!tag||!desc){ toast('Tag and Description are required.','err'); return; }
  const alarm={sheet:document.getElementById('aSheet').value,group:document.getElementById('aGroup').value.trim(),tag,description:desc,category:document.getElementById('aCat').value,id:parseInt(document.getElementById('aId').value)||null,priority:document.getElementById('aPrio').value!==''?parseInt(document.getElementById('aPrio').value):null};
  S.customAlarms.push(alarm);
  closeOverlay('addAlarmOverlay');
  renderSettingsTable();
  toast('Alarm added ✓');
}

// ══════════════════════════════════════════════════
