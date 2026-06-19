//  CUSTOM EQUIPMENT
// ══════════════════════════════════════════════════
function openAddEquipment(){
  document.getElementById('newEqName').value = '';
  // Populate sheet dropdown from imported sheets
  const sel = document.getElementById('newEqSheet');
  sel.innerHTML = '<option value="">— Use Fallback (Drop Type Packer) —</option>';
  Object.keys(S.importedSheets).forEach(sheet=>{
    if(S.importedSheets[sheet].length > 0){
      const opt = document.createElement('option');
      opt.value = sheet;
      opt.textContent = sheet;
      sel.appendChild(opt);
    }
  });
  openOverlay('addEqOverlay');
  setTimeout(()=>document.getElementById('newEqName').focus(), 80);
}

function saveCustomEquipment(){
  const name = document.getElementById('newEqName').value.trim();
  const cat  = document.getElementById('newEqCat').value;
  const sheet= document.getElementById('newEqSheet').value;
  if(!name){ toast('Equipment name is required.','err'); return; }

  // Check for duplicates
  const allNames = EQ_CATS.flatMap(c=>c.items).concat((S.customEquipment||[]).map(e=>e.name));
  if(allNames.some(n=>n.toLowerCase()===name.toLowerCase())){
    toast('Equipment with this name already exists.','err'); return;
  }

  if(!S.customEquipment) S.customEquipment = [];
  S.customEquipment.push({ name, cat, sheet: sheet||FALLBACK_SHEET });

  // Add to EQ_TO_SHEET mapping
  EQ_TO_SHEET[name] = sheet || FALLBACK_SHEET;

  // Add to EQ_CATS so it appears in equipment selection
  const catEntry = EQ_CATS.find(c=>c.cat===cat);
  if(catEntry){ catEntry.items.push(name); }
  else { EQ_CATS.push({ cat, items: [name] }); }

  // Persist
  saveCustomEqToStorage();
  renderEquipment();
  renderCustomEqList();
  closeOverlay('addEqOverlay');
  toast(`"${name}" added to ${cat} ✓`);
}

function deleteCustomEquipment(idx){
  const eq = S.customEquipment[idx];
  if(!eq) return;
  // Remove from EQ_CATS
  EQ_CATS.forEach(c=>{ c.items = c.items.filter(i=>i!==eq.name); });
  // Remove from EQ_TO_SHEET
  delete EQ_TO_SHEET[eq.name];
  // Remove from selected if selected
  S.selectedEq.delete(eq.cat+'|'+eq.name);
  S.customEquipment.splice(idx,1);
  saveCustomEqToStorage();
  renderEquipment();
  renderCustomEqList();
  toast('Custom equipment removed.');
}

function renderCustomEqList(){
  const el = document.getElementById('customEqList');
  if(!el) return;
  const list = S.customEquipment||[];
  if(!list.length){
    el.innerHTML='<div style="font-size:12px;color:var(--text3);font-style:italic">No custom equipment added yet.</div>';
    return;
  }
  el.innerHTML = list.map((eq,i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${esc(eq.name)}</div>
        <div style="font-size:10px;color:var(--text3)">${esc(eq.cat)} · Sheet: ${esc(eq.sheet)}</div>
      </div>
      <button class="row-del" onclick="deleteCustomEquipment(${i})" title="Remove">×</button>
    </div>`).join('');
}

function saveCustomEqToStorage(){
  try {
    localStorage.setItem('ic_custom_eq', JSON.stringify(S.customEquipment||[]));
  } catch(e){}
}

function saveEmbeddedHTML(){
  // Build a new copy of this HTML file with the DB data baked into EMBEDDED_DB
  const dbData = {
    file: S.importedFile || 'Alarm Database',
    sheets: S.importedSheets,
    savedAt: new Date().toISOString()
  };
  const dbJson = JSON.stringify(dbData);

  // Get the current page source and replace the placeholder
  fetch(window.location.href)
    .then(r => r.text())
    .then(html => {
      // Replace the EMBEDDED_DB placeholder with actual data
      const updated = html.replace(
        /const EMBEDDED_DB = .*?;.*?\/\/ <<<EMBEDDED_DB_PLACEHOLDER>>>/s,
        `const EMBEDDED_DB = ${dbJson}; // <<<EMBEDDED_DB_PLACEHOLDER>>>`
      );
      const blob = new Blob([updated], {type:'text/html'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Insightech_Alarms_Configurator.html';
      a.click();
      URL.revokeObjectURL(url);
      toast('Updated HTML saved — share this file with engineers ✓');
    })
    .catch(()=>{
      // Fallback: build from current document source
      const src = document.documentElement.outerHTML;
      const updated = src.replace(
        /const EMBEDDED_DB = .*?;/,
        `const EMBEDDED_DB = ${dbJson};`
      );
      const blob = new Blob([updated], {type:'text/html'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Insightech_Alarms_Configurator.html';
      a.click();
      URL.revokeObjectURL(url);
      toast('Updated HTML saved — share this file with engineers ✓');
    });
}

function loadCustomEqFromStorage(){
  try {
    const saved = localStorage.getItem('ic_custom_eq');
    if(!saved) return;
    const list = JSON.parse(saved);
    S.customEquipment = list;
    list.forEach(eq=>{
      EQ_TO_SHEET[eq.name] = eq.sheet || FALLBACK_SHEET;
      const catEntry = EQ_CATS.find(c=>c.cat===eq.cat);
      if(catEntry && !catEntry.items.includes(eq.name)) catEntry.items.push(eq.name);
      else if(!catEntry) EQ_CATS.push({ cat: eq.cat, items: [eq.name] });
    });
  } catch(e){}
}

// ══════════════════════════════════════════════════
//  SETTINGS PAGE ACCESS (role-gated)
// ══════════════════════════════════════════════════
function trySettings(){
  if(!AUTH){ return; }
  if(AUTH.role !== 'admin'){
    toast('Settings access is restricted to Admins.', 'err'); return;
  }
  S.settingsOpen = true;
  goPage('settings');
  renderSettingsTable();
  renderCustomEqList();
}

function tryUsers(){
  if(!AUTH || AUTH.role !== 'admin'){ toast('User Management is restricted to Admins.', 'err'); return; }
  goPage('users');
  renderUsersPage();
  loadActivityLog();
}

// ══════════════════════════════════════════════════
