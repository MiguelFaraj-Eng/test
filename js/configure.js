// ══════════════════════════════════════════════════
//  CONFIGURE PAGE
//  Each file has its own line + device range
//  Alarms with no name are imported regardless
// ══════════════════════════════════════════════════

const CATEGORY_TREE = {
  General: {
    color: 'var(--purple)', colorLight: 'var(--purple-light)', icon: '⚡',
    files: ['General.xlsx']
  },
  Motors: {
    color: 'var(--accent)', colorLight: 'var(--accent-light)', icon: 'M',
    files: ['Asynchronous Motor.xlsx', 'MDR, DDR, PGD.xlsx', 'Servo Motor.xlsx']
  },
  Pneumatics: {
    color: 'var(--orange)', colorLight: 'var(--orange-light)', icon: '💨',
    files: [
      'Accumulation Table.xlsx','Ambaflex Spiral Conveyor.xlsx','Backstop.xlsx',
      'Carton Holders.xlsx','Destacker.xlsx','Devider.xlsx','Drop-Type Packer.xlsx',
      'Gate.xlsx','Guide.xlsx','Merge.xlsx','Orientor.xlsx','Pressing Device.xlsx',
      'Pusher.xlsx','Rotating Device.xlsx','Sliding Plate.xlsx','Squaring System.xlsx',
      'Squezer.xlsx','Transfer Unit.xlsx'
    ]
  },
  Sensors: {
    color: 'var(--green)', colorLight: 'var(--green-light)', icon: '📡',
    files: [
      'Inductive Proximity.xlsx','Magnetic Cylinder.xlsx','Photocell.xlsx',
      'Ultrasonic Sensor.xlsx','Vaccum Sensor.xlsx'
    ]
  },
  Equipments: {
    color: 'var(--yellow)', colorLight: 'var(--yellow-light)', icon: '🤖',
    files: [
      'Infeeder.xlsx','Interlayer Magazine.xlsx','Pallet Magazine.xlsx',
      'Robot Head.xlsx','Robot.xlsx','System.xlsx'
    ]
  }
};

// Configure state
// selectedFiles: Map of key -> { lineFrom, lineTo, devFrom, devTo }
const CS = {
  selectedFiles: new Map(),
  expandedCats: new Set(['General','Motors','Pneumatics','Sensors','Equipments']),
  generatedAlarms: [],
  activeFilter: { file: null, sheet: null, severity: null },
  searchQuery: '',
  sortField: 'alarmName',
  sortDir: 1,
};

// ── Render configure page ─────────────────────────────────
function renderConfigurePage() {
  const main = document.getElementById('page-configure');
  main.innerHTML = `
    <div style="display:flex;height:100%;overflow:hidden">

      <!-- LEFT PANEL -->
      <div style="width:340px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--surface);display:flex;flex-direction:column">

        <!-- Tree -->
        <div style="padding:12px 14px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text3)">Select Alarm Files</div>
            <button onclick="clearAllSelections()" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--text3);padding:2px 6px;border-radius:4px" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'">Clear all</button>
          </div>
          <div id="categoryTree"></div>
        </div>

        <!-- Selected files with per-file ranges -->
        <div style="padding:12px 14px;border-bottom:1px solid var(--border);flex:1;overflow-y:auto" id="rangesSection" style="display:none">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text3);margin-bottom:10px">Configure Ranges</div>
          <div id="fileRangesList"></div>
        </div>

        <!-- Buttons -->
        <div style="padding:12px 14px">
          <div style="font-size:10px;color:var(--text3);margin-bottom:6px;text-align:center" id="selectionCount">0 files selected</div>
          <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:6px" onclick="generateAlarms()" id="generateBtn">
            ⚡ Add to Alarm List
          </button>
          <button class="btn btn-outline" style="width:100%;justify-content:center;font-size:11px" onclick="clearGeneratedAlarms()">
            🗑 Clear Alarm List
          </button>
          <div style="font-size:10px;color:var(--text3);margin-top:6px;text-align:center" id="generateStatus"></div>
        </div>
      </div>

      <!-- RIGHT PANEL -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:12px 20px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:600" id="alarmHdrTitle">Select alarm files and configure ranges</span>
          <span style="margin-left:auto;font-family:'DM Mono',monospace;font-size:11px;color:var(--text2)" id="alarmHdrCount"></span>
          <div style="display:none;gap:6px" id="alarmHdrActions">
            <button class="btn btn-sm btn-outline" onclick="exportConfiguredAlarms('csv')">📊 CSV</button>
            <button class="btn btn-sm btn-outline" onclick="exportConfiguredAlarms('excel')">📗 Excel</button>
          </div>
        </div>

        <!-- Filters -->
        <div style="padding:8px 16px;background:var(--surface2);border-bottom:1px solid var(--border);display:none;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0" id="filtersRow">
          <div style="position:relative">
            <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:12px">⌕</span>
            <input type="text" placeholder="Search alarms…"
              style="padding:5px 8px 5px 24px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none;width:180px"
              oninput="CS.searchQuery=this.value;renderAlarmTable()">
          </div>
          <select id="filterFile" onchange="CS.activeFilter.file=this.value||null;renderAlarmTable()"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none">
            <option value="">All Files</option>
          </select>
          <select id="filterSheet" onchange="CS.activeFilter.sheet=this.value||null;renderAlarmTable()"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none">
            <option value="">All Types</option>
          </select>
          <select id="filterSeverity" onchange="CS.activeFilter.severity=this.value||null;renderAlarmTable()"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none">
            <option value="">All Severities</option>
            <option>Critical</option><option>Fault</option><option>Warning</option><option>Information</option>
          </select>
          <button class="btn btn-sm btn-outline" onclick="bulkDeleteVisible()" style="margin-left:auto">✕ Delete Visible</button>
          <button class="btn btn-sm btn-outline" onclick="restoreAll()">↺ Restore All</button>
        </div>

        <div style="flex:1;overflow-y:auto" id="alarmTableContainer">
          <div class="empty-state"><div class="empty-icon">⚡</div><div>Select alarm files, configure ranges, click Add to Alarm List</div></div>
        </div>
      </div>
    </div>`;

  renderCategoryTree();
  renderFileRanges();
}

// ── Category Tree ─────────────────────────────────────────
function renderCategoryTree() {
  const el = document.getElementById('categoryTree');
  if (!el) return;

  el.innerHTML = Object.entries(CATEGORY_TREE).map(([catName, cat]) => {
    const expanded  = CS.expandedCats.has(catName);
    const selCount  = cat.files.filter(f => CS.selectedFiles.has(`${catName}/${f}`)).length;
    const allSel    = selCount === cat.files.length;
    const anySel    = selCount > 0;

    const fileRows = cat.files.map(file => {
      const key = `${catName}/${file}`;
      const sel = CS.selectedFiles.has(key);
      const name = file.replace('.xlsx','');
      return `<div onclick="toggleFile('${key.replace(/'/g,"\\'")}')"
        style="display:flex;align-items:center;gap:8px;padding:5px 10px 5px 30px;cursor:pointer;border-radius:6px;transition:background .1s"
        onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
        <div style="width:14px;height:14px;border-radius:3px;flex-shrink:0;border:1.5px solid ${sel?cat.color:'var(--border)'};background:${sel?cat.color:'transparent'};display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;transition:all .15s">${sel?'✓':''}</div>
        <span style="font-size:11px;color:${sel?cat.color:'var(--text2)'}">${name}</span>
      </div>`;
    }).join('');

    return `<div style="margin-bottom:2px">
      <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:7px"
        onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
        <div onclick="toggleCatExpand('${catName}')" style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer">
          <span style="font-size:11px;display:inline-block;transform:rotate(${expanded?90:0}deg);transition:transform .2s;color:var(--text3)">›</span>
          <span style="font-size:15px">${cat.icon}</span>
          <span style="font-size:12px;font-weight:600;color:${anySel?cat.color:'var(--text)'}">${catName}</span>
          ${anySel?`<span style="font-size:9px;background:${cat.colorLight};color:${cat.color};padding:1px 6px;border-radius:10px;font-family:'DM Mono',monospace">${selCount}/${cat.files.length}</span>`:''}
        </div>
        <div onclick="toggleAllInCat('${catName}')" title="${allSel?'Deselect all':'Select all'}" style="cursor:pointer;width:14px;height:14px;border-radius:3px;flex-shrink:0;border:1.5px solid ${anySel?cat.color:'var(--border)'};background:${allSel?cat.color:anySel?cat.colorLight:'transparent'};display:flex;align-items:center;justify-content:center;font-size:9px;color:${allSel?'#fff':cat.color};transition:all .15s">${allSel?'✓':anySel?'–':''}</div>
      </div>
      ${expanded?`<div>${fileRows}</div>`:''}
    </div>`;
  }).join('');

  const cnt = document.getElementById('selectionCount');
  if (cnt) cnt.textContent = `${CS.selectedFiles.size} file${CS.selectedFiles.size!==1?'s':''} selected`;
}

function toggleCatExpand(name) {
  CS.expandedCats.has(name) ? CS.expandedCats.delete(name) : CS.expandedCats.add(name);
  renderCategoryTree();
}

function toggleFile(key) {
  if (CS.selectedFiles.has(key)) {
    CS.selectedFiles.delete(key);
  } else {
    CS.selectedFiles.set(key, { lineFrom: 1, lineTo: 1, devFrom: 1, devTo: 1 });
  }
  renderCategoryTree();
  renderFileRanges();
}

function toggleAllInCat(catName) {
  const cat    = CATEGORY_TREE[catName];
  const allSel = cat.files.every(f => CS.selectedFiles.has(`${catName}/${f}`));
  cat.files.forEach(f => {
    const key = `${catName}/${f}`;
    if (allSel) CS.selectedFiles.delete(key);
    else if (!CS.selectedFiles.has(key)) CS.selectedFiles.set(key, { lineFrom: 1, lineTo: 1, devFrom: 1, devTo: 1 });
  });
  renderCategoryTree();
  renderFileRanges();
}

function clearAllSelections() {
  CS.selectedFiles.clear();
  renderCategoryTree();
  renderFileRanges();
}

// ── Per-file Range Inputs ─────────────────────────────────
function renderFileRanges() {
  const section = document.getElementById('rangesSection');
  const el      = document.getElementById('fileRangesList');
  if (!section || !el) return;

  if (!CS.selectedFiles.size) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  el.innerHTML = [...CS.selectedFiles.entries()].map(([key, range]) => {
    const parts    = key.split('/');
    const catName  = parts[0];
    const fileName = parts[1]?.replace('.xlsx','') || key;
    const cat      = CATEGORY_TREE[catName] || {};

    return `<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ${cat.color||'var(--accent)'};border-radius:8px;padding:10px 12px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:${cat.color||'var(--accent)'};margin-bottom:8px">${fileName}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div>
          <div style="font-size:9px;color:var(--text3);font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">Line From</div>
          <input type="number" min="0" max="20" value="${range.lineFrom}"
            style="width:100%;padding:5px 8px;border-radius:5px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-family:'DM Mono',monospace;font-weight:600;outline:none;text-align:center"
            onchange="updateRange('${key.replace(/'/g,"\\'")}','lineFrom',this.value)">
        </div>
        <div>
          <div style="font-size:9px;color:var(--text3);font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">Line To</div>
          <input type="number" min="0" max="20" value="${range.lineTo}"
            style="width:100%;padding:5px 8px;border-radius:5px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-family:'DM Mono',monospace;font-weight:600;outline:none;text-align:center"
            onchange="updateRange('${key.replace(/'/g,"\\'")}','lineTo',this.value)">
        </div>
        <div>
          <div style="font-size:9px;color:var(--text3);font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">Device From</div>
          <input type="number" min="0" max="99" value="${range.devFrom}"
            style="width:100%;padding:5px 8px;border-radius:5px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-family:'DM Mono',monospace;font-weight:600;outline:none;text-align:center"
            onchange="updateRange('${key.replace(/'/g,"\\'")}','devFrom',this.value)">
        </div>
        <div>
          <div style="font-size:9px;color:var(--text3);font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">Device To</div>
          <input type="number" min="0" max="99" value="${range.devTo}"
            style="width:100%;padding:5px 8px;border-radius:5px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-family:'DM Mono',monospace;font-weight:600;outline:none;text-align:center"
            onchange="updateRange('${key.replace(/'/g,"\\'")}','devTo',this.value)">
        </div>
      </div>
    </div>`;
  }).join('');
}

function updateRange(key, field, val) {
  if (!CS.selectedFiles.has(key)) return;
  CS.selectedFiles.get(key)[field] = Math.max(0, parseInt(val) || 0);
}

// ── Generate ──────────────────────────────────────────────
async function generateAlarms() {
  if (!CS.selectedFiles.size) { toast('Select at least one file.', 'err'); return; }

  const btn = document.getElementById('generateBtn');
  if (btn) { btn.textContent = '⏳ Loading…'; btn.disabled = true; }

  try {
    if (typeof waitForDB === 'function') await waitForDB();
    if (btn) btn.textContent = '⏳ Generating…';

    // Remove previously generated alarms for the same files (no duplicates)
    const keysBeingGenerated = [...CS.selectedFiles.keys()];
    CS.generatedAlarms = CS.generatedAlarms.filter(a => !keysBeingGenerated.includes(a.fileKey));

    let newCount = 0;

    for (const [key, range] of CS.selectedFiles.entries()) {
      const fileAlarms = S.importedSheets[key];
      if (!fileAlarms || !fileAlarms.length) {
        console.warn(`No alarms for ${key}`);
        continue;
      }

      const lineFrom = Math.min(range.lineFrom, range.lineTo);
      const lineTo   = Math.max(range.lineFrom, range.lineTo);
      const devFrom  = Math.min(range.devFrom,  range.devTo);
      const devTo    = Math.max(range.devFrom,  range.devTo);

      const validLines = new Set();
      for (let l = lineFrom; l <= lineTo; l++) validLines.add(`L${String(l).padStart(2,'0')}`);
      const validDevs = new Set();
      for (let d = devFrom; d <= devTo; d++) validDevs.add(d);

      const parts    = key.split('/');
      const catName  = parts[0];
      const fileName = parts[1]?.replace('.xlsx','') || key;

      fileAlarms.forEach(alarm => {
        const name = alarm.alarmName || alarm.tag || '';

        // If alarm has no name/tag — include it regardless (note 2)
        if (!name) {
          CS.generatedAlarms.push({ ...alarm, alarmName: alarm.description || '(no name)', fileKey: key, fileName, catName, deleted: false });
          newCount++;
          return;
        }

        // If alarm has a name — filter by line and device range
        if (matchesAlarm(name, validLines, validDevs)) {
          CS.generatedAlarms.push({ ...alarm, fileKey: key, fileName, catName, deleted: false });
          newCount++;
        }
      });
    }

    // Sort by line number then alarm name
    CS.generatedAlarms.sort((a, b) => {
      const la = (a.alarmName||'').match(/^L(\d+)/);
      const lb = (b.alarmName||'').match(/^L(\d+)/);
      const na = la ? parseInt(la[1]) : 999;
      const nb = lb ? parseInt(lb[1]) : 999;
      if (na !== nb) return na - nb;
      return (a.alarmName||'').localeCompare(b.alarmName||'');
    });

    const total = CS.generatedAlarms.length;
    const status = document.getElementById('generateStatus');
    if (status) status.textContent = `${newCount} added · ${total} total`;

    if (!newCount) {
      toast('No alarms matched the selected ranges.', 'err');
    } else {
      toast(`${newCount} alarms added ✓`);
      updateFilterDropdowns();
      renderAlarmTable();
      document.getElementById('alarmHdrActions').style.display = 'flex';
      document.getElementById('filtersRow').style.display = 'flex';
      document.getElementById('alarmHdrTitle').textContent = `${total.toLocaleString()} alarms in list`;
    }

  } catch (e) {
    toast('Error: ' + e.message, 'err');
    console.error(e);
  } finally {
    if (btn) { btn.textContent = '⚡ Add to Alarm List'; btn.disabled = false; }
  }
}

// Match alarm name against valid lines + device numbers
function matchesAlarm(name, validLines, validDevs) {
  const lm = name.match(/^(L\d+)/);
  if (!lm) return false;
  const paddedLine = 'L' + String(parseInt(lm[1].slice(1))).padStart(2,'0');
  if (!validLines.has(paddedLine)) return false;
  const rest = name.slice(lm[1].length);
  const dm   = rest.match(/^[_\-][A-Za-z]*(\d+)/);
  if (!dm) return false;
  return validDevs.has(parseInt(dm[1]));
}

// ── Clear ─────────────────────────────────────────────────
function clearGeneratedAlarms() {
  if (CS.generatedAlarms.length && !confirm('Clear all generated alarms?')) return;
  CS.generatedAlarms = [];
  const container = document.getElementById('alarmTableContainer');
  if (container) container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚡</div><div>Select alarm files, configure ranges, click Add to Alarm List</div></div>';
  const title = document.getElementById('alarmHdrTitle');
  if (title) title.textContent = 'Select alarm files and configure ranges';
  const count = document.getElementById('alarmHdrCount');
  if (count) count.textContent = '';
  const actions = document.getElementById('alarmHdrActions');
  if (actions) actions.style.display = 'none';
  const filters = document.getElementById('filtersRow');
  if (filters) filters.style.display = 'none';
  const status = document.getElementById('generateStatus');
  if (status) status.textContent = '';
}

// ── Alarm Table ───────────────────────────────────────────
function renderAlarmTable() {
  const container = document.getElementById('alarmTableContainer');
  if (!container) return;

  let alarms = [...CS.generatedAlarms];
  if (CS.activeFilter.file)     alarms = alarms.filter(a => a.fileName === CS.activeFilter.file);
  if (CS.activeFilter.sheet)    alarms = alarms.filter(a => a.sheet    === CS.activeFilter.sheet);
  if (CS.activeFilter.severity) alarms = alarms.filter(a => a.severity === CS.activeFilter.severity);
  if (CS.searchQuery) {
    const q = CS.searchQuery.toLowerCase();
    alarms = alarms.filter(a => (a.alarmName||'').toLowerCase().includes(q)||(a.description||'').toLowerCase().includes(q));
  }

  const active = CS.generatedAlarms.filter(a => !a.deleted).length;
  const hdrCount = document.getElementById('alarmHdrCount');
  if (hdrCount) hdrCount.textContent = `${alarms.filter(a=>!a.deleted).length.toLocaleString()} shown · ${active.toLocaleString()} active · ${CS.generatedAlarms.length.toLocaleString()} total`;

  const sevColor = {'Critical':'var(--red)','Cricital':'var(--red)','Fault':'var(--orange)','Warning':'var(--yellow)','Information':'var(--accent)'};

  let html = `<table class="alarm-table"><thead><tr>
    <th onclick="sortAlarmTable('alarmName')" style="cursor:pointer">Alarm Name ↕</th>
    <th onclick="sortAlarmTable('description')" style="cursor:pointer">Description ↕</th>
    <th onclick="sortAlarmTable('fileName')" style="cursor:pointer">File ↕</th>
    <th onclick="sortAlarmTable('sheet')" style="cursor:pointer">Type ↕</th>
    <th onclick="sortAlarmTable('mainCategory')" style="cursor:pointer">Category ↕</th>
    <th onclick="sortAlarmTable('severity')" style="cursor:pointer">Severity ↕</th>
    <th></th>
  </tr></thead><tbody>`;

  alarms.forEach(alarm => {
    const realIdx = CS.generatedAlarms.indexOf(alarm);
    const sev = alarm.severity || '';
    const sc  = sevColor[sev] || 'var(--text3)';
    html += `<tr class="${alarm.deleted?'deleted':''}">
      <td class="tag">${esc(alarm.alarmName||'')}</td>
      <td class="desc" style="max-width:260px">${esc(alarm.description||'')}</td>
      <td style="font-size:11px;font-weight:500;color:var(--accent);white-space:nowrap">${esc(alarm.fileName||'')}</td>
      <td class="group-cell" style="max-width:130px" title="${esc(alarm.sheet||'')}">${esc((alarm.sheet||'').length>17?(alarm.sheet||'').slice(0,17)+'…':(alarm.sheet||''))}</td>
      <td><span class="badge ${badgeClass(alarm.mainCategory||'')}">${esc((alarm.mainCategory||'').replace(' Failures','').replace(' Interlocks',''))}</span></td>
      <td><span style="font-size:10px;font-weight:700;color:${sc}">${esc(sev)}</span></td>
      <td><button class="row-del ${alarm.deleted?'row-restore':''}" onclick="toggleAlarmDeleted(${realIdx})" title="${alarm.deleted?'Restore':'Delete'}">${alarm.deleted?'↺':'×'}</button></td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function sortAlarmTable(field) {
  CS.sortField===field ? CS.sortDir*=-1 : (CS.sortField=field, CS.sortDir=1);
  CS.generatedAlarms.sort((a,b)=>{ const av=a[field]||'',bv=b[field]||''; return av<bv?-CS.sortDir:av>bv?CS.sortDir:0; });
  renderAlarmTable();
}

function toggleAlarmDeleted(idx) {
  if (CS.generatedAlarms[idx]) { CS.generatedAlarms[idx].deleted=!CS.generatedAlarms[idx].deleted; renderAlarmTable(); }
}

function bulkDeleteVisible() {
  let alarms = [...CS.generatedAlarms];
  if (CS.activeFilter.file)     alarms=alarms.filter(a=>a.fileName===CS.activeFilter.file);
  if (CS.activeFilter.sheet)    alarms=alarms.filter(a=>a.sheet===CS.activeFilter.sheet);
  if (CS.activeFilter.severity) alarms=alarms.filter(a=>a.severity===CS.activeFilter.severity);
  if (CS.searchQuery) { const q=CS.searchQuery.toLowerCase(); alarms=alarms.filter(a=>(a.alarmName||'').toLowerCase().includes(q)||(a.description||'').toLowerCase().includes(q)); }
  alarms.forEach(a=>a.deleted=true);
  renderAlarmTable();
  toast('Visible alarms deleted ✓');
}

function restoreAll() {
  CS.generatedAlarms.forEach(a=>a.deleted=false);
  renderAlarmTable();
  toast('All alarms restored ✓');
}

function updateFilterDropdowns() {
  const files   = [...new Set(CS.generatedAlarms.map(a=>a.fileName).filter(Boolean))].sort();
  const sheets  = [...new Set(CS.generatedAlarms.map(a=>a.sheet).filter(Boolean))].sort();
  const fileEl  = document.getElementById('filterFile');
  const sheetEl = document.getElementById('filterSheet');
  if (fileEl)  fileEl.innerHTML  = '<option value="">All Files</option>'  + files.map(f=>`<option>${esc(f)}</option>`).join('');
  if (sheetEl) sheetEl.innerHTML = '<option value="">All Types</option>'  + sheets.map(s=>`<option>${esc(s)}</option>`).join('');
}

// ── Export ────────────────────────────────────────────────
function exportConfiguredAlarms(type) {
  const active = CS.generatedAlarms.filter(a=>!a.deleted);
  if (!active.length) { toast('No active alarms to export.','err'); return; }
  const p  = projInfo();
  const pn = (p.ref||'Project').replace(/[^a-z0-9]/gi,'_');
  if (type==='csv') {
    let csv = 'Alarm Name,Description,File,Type,Main Category,Sub Category,Severity,ID\n';
    active.forEach(a=>{ csv+=`"${a.alarmName}","${a.description}","${a.fileName}","${a.sheet}","${a.mainCategory}","${a.subCategory}","${a.severity}","${a.alarmId}"\n`; });
    dl(pn+'_alarms.csv', csv, 'text/csv');
    toast('CSV exported ✓');
  } else if (type==='excel') {
    if (typeof XLSX==='undefined') { toast('Excel library not loaded.','err'); return; }
    const wb=XLSX.utils.book_new();
    const data=[['Alarm Name','Description','File','Type','Main Category','Sub Category','Severity','ID']];
    active.forEach(a=>data.push([a.alarmName,a.description,a.fileName,a.sheet,a.mainCategory,a.subCategory,a.severity,a.alarmId]));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),'Alarms');
    XLSX.writeFile(wb,pn+'_alarms.xlsx');
    toast('Excel exported ✓');
  }
}

// ── Snapshot ──────────────────────────────────────────────
function getConfigureSnapshot() {
  return {
    selectedFiles: [...CS.selectedFiles.entries()],
    generatedAlarms: JSON.parse(JSON.stringify(CS.generatedAlarms))
  };
}

function restoreConfigureSnapshot(snap) {
  if (!snap) return;
  CS.selectedFiles = new Map(snap.selectedFiles || []);
  CS.generatedAlarms = snap.generatedAlarms || [];
}
