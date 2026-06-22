// ══════════════════════════════════════════════════
//  CONFIGURE PAGE
//  Main Category → Sub Category (Excel file) →
//  Line range + Device range → Generate alarms
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
const CS = {
  // Selection state
  selectedMain: null,       // e.g. 'Motors'
  selectedFile: null,       // e.g. 'Servo Motor.xlsx'
  lineFrom: 1,
  lineTo: 1,
  devFrom: 1,
  devTo: 1,

  // Generated alarms
  generatedAlarms: [],

  // Filters
  activeFilter: { sheet: null, severity: null },
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
      <div style="width:320px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--surface);display:flex;flex-direction:column">

        <!-- Step 1: Main Category -->
        <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text3);margin-bottom:10px">1 — Main Category</div>
          <div style="display:flex;flex-direction:column;gap:5px" id="mainCatList"></div>
        </div>

        <!-- Step 2: Sub Category (file) -->
        <div style="padding:14px 16px;border-bottom:1px solid var(--border)" id="subCatSection" style="display:none">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text3);margin-bottom:10px">2 — Sub Category</div>
          <div style="display:flex;flex-direction:column;gap:5px" id="subCatList"></div>
        </div>

        <!-- Step 3: Range -->
        <div style="padding:14px 16px;border-bottom:1px solid var(--border)" id="rangeSection" style="display:none">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text3);margin-bottom:12px">3 — Line & Device Range</div>

          <div style="margin-bottom:14px">
            <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:8px">Line Numbers</div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1">
                <div style="font-size:10px;color:var(--text3);margin-bottom:4px">From</div>
                <input type="number" id="lineFrom" min="0" max="20" value="1"
                  style="width:100%;padding:7px 10px;border-radius:7px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font-size:13px;font-family:'DM Mono',monospace;font-weight:600;outline:none"
                  oninput="CS.lineFrom=Math.max(0,parseInt(this.value)||0)">
              </div>
              <div style="color:var(--text3);font-size:16px;margin-top:16px">→</div>
              <div style="flex:1">
                <div style="font-size:10px;color:var(--text3);margin-bottom:4px">To</div>
                <input type="number" id="lineTo" min="0" max="20" value="1"
                  style="width:100%;padding:7px 10px;border-radius:7px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font-size:13px;font-family:'DM Mono',monospace;font-weight:600;outline:none"
                  oninput="CS.lineTo=Math.max(0,parseInt(this.value)||0)">
              </div>
            </div>
          </div>

          <div>
            <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:8px">Device Numbers</div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1">
                <div style="font-size:10px;color:var(--text3);margin-bottom:4px">From</div>
                <input type="number" id="devFrom" min="0" max="99" value="1"
                  style="width:100%;padding:7px 10px;border-radius:7px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font-size:13px;font-family:'DM Mono',monospace;font-weight:600;outline:none"
                  oninput="CS.devFrom=Math.max(0,parseInt(this.value)||0)">
              </div>
              <div style="color:var(--text3);font-size:16px;margin-top:16px">→</div>
              <div style="flex:1">
                <div style="font-size:10px;color:var(--text3);margin-bottom:4px">To</div>
                <input type="number" id="devTo" min="0" max="99" value="1"
                  style="width:100%;padding:7px 10px;border-radius:7px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font-size:13px;font-family:'DM Mono',monospace;font-weight:600;outline:none"
                  oninput="CS.devTo=Math.max(0,parseInt(this.value)||0)">
              </div>
            </div>
          </div>
        </div>

        <!-- Generate button -->
        <div style="padding:14px 16px;margin-top:auto">
          <button class="btn btn-primary" style="width:100%;justify-content:center;padding:10px" onclick="generateAlarms()" id="generateBtn">
            ⚡ Generate Alarm List
          </button>
          <div style="font-size:10px;color:var(--text3);margin-top:8px;text-align:center" id="generateStatus"></div>
        </div>
      </div>

      <!-- RIGHT PANEL -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">

        <!-- Header -->
        <div style="padding:12px 20px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:600" id="alarmHdrTitle">Select a category and file to begin</span>
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
          <select id="filterSheet" onchange="CS.activeFilter.sheet=this.value||null;renderAlarmTable()"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none">
            <option value="">All Types</option>
          </select>
          <select id="filterSeverity" onchange="CS.activeFilter.severity=this.value||null;renderAlarmTable()"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none">
            <option value="">All Severities</option>
            <option>Critical</option>
            <option>Fault</option>
            <option>Warning</option>
            <option>Information</option>
          </select>
          <button class="btn btn-sm btn-outline" onclick="bulkDeleteVisible()" style="margin-left:auto">✕ Delete Visible</button>
          <button class="btn btn-sm btn-outline" onclick="restoreAll()">↺ Restore All</button>
        </div>

        <!-- Table -->
        <div style="flex:1;overflow-y:auto" id="alarmTableContainer">
          <div class="empty-state">
            <div class="empty-icon">⚡</div>
            <div>Select a main category, then a sub category, set ranges and click Generate</div>
          </div>
        </div>
      </div>
    </div>`;

  renderMainCategories();
}

// ── Step 1: Main Categories ───────────────────────────────
function renderMainCategories() {
  const el = document.getElementById('mainCatList');
  if (!el) return;
  el.innerHTML = Object.entries(CATEGORY_TREE).map(([name, cat]) => `
    <div onclick="selectMainCategory('${name}')"
      style="padding:9px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;
             border:1.5px solid ${CS.selectedMain===name ? cat.color : 'var(--border)'};
             background:${CS.selectedMain===name ? cat.colorLight : 'var(--surface2)'};
             transition:all .15s">
      <span style="font-size:16px;width:24px;text-align:center">${cat.icon}</span>
      <span style="font-size:12px;font-weight:600;color:${CS.selectedMain===name ? cat.color : 'var(--text)'}">${name}</span>
      <span style="margin-left:auto;font-size:10px;color:var(--text3)">${cat.files.length} file${cat.files.length>1?'s':''}</span>
    </div>`).join('');
}

function selectMainCategory(name) {
  CS.selectedMain = name;
  CS.selectedFile = null;
  renderMainCategories();
  renderSubCategories();
  document.getElementById('subCatSection').style.display = 'block';
  document.getElementById('rangeSection').style.display = 'none';
}

// ── Step 2: Sub Categories (files) ───────────────────────
function renderSubCategories() {
  const el = document.getElementById('subCatList');
  if (!el || !CS.selectedMain) return;
  const cat = CATEGORY_TREE[CS.selectedMain];
  el.innerHTML = cat.files.map(file => {
    const name = file.replace('.xlsx','');
    const sel = CS.selectedFile === file;
    return `
    <div onclick="selectSubCategory('${file.replace(/'/g,"\\'")}')"
      style="padding:8px 12px;border-radius:7px;cursor:pointer;display:flex;align-items:center;gap:8px;
             border:1.5px solid ${sel ? cat.color : 'var(--border)'};
             background:${sel ? cat.colorLight : 'var(--surface2)'};
             transition:all .15s">
      <div style="width:6px;height:6px;border-radius:50%;background:${sel ? cat.color : 'var(--border)'}"></div>
      <span style="font-size:12px;font-weight:${sel?'600':'400'};color:${sel ? cat.color : 'var(--text)'}">${name}</span>
    </div>`;
  }).join('');
}

function selectSubCategory(file) {
  CS.selectedFile = file;
  renderSubCategories();
  document.getElementById('rangeSection').style.display = 'block';

  // Update header title
  const cat = CATEGORY_TREE[CS.selectedMain];
  document.getElementById('alarmHdrTitle').textContent =
    `${CS.selectedMain} → ${file.replace('.xlsx','')}`;

  // Check if file is loaded, show sheet count
  const key = `${CS.selectedMain}/${file}`;
  const sheets = S.importedSheets[key];
  if (sheets) {
    const sheetNames = Object.keys(sheets);
    document.getElementById('generateStatus').textContent =
      `${sheetNames.length} alarm types ready`;
  }
}

// ── Step 3: Generate ──────────────────────────────────────
async function generateAlarms() {
  if (!CS.selectedMain || !CS.selectedFile) {
    toast('Select a main category and sub category first.', 'err'); return;
  }

  const btn = document.getElementById('generateBtn');
  if (btn) { btn.textContent = '⏳ Loading…'; btn.disabled = true; }

  try {
    // Wait for DB
    if (typeof waitForDB === 'function') await waitForDB();

    const key = `${CS.selectedMain}/${CS.selectedFile}`;
    const fileAlarms = S.importedSheets[key];

    if (!fileAlarms || !fileAlarms.length) {
      toast(`No alarms loaded for ${CS.selectedFile}. Check that the file exists in Data/Alarms/${CS.selectedMain}/`, 'err');
      return;
    }

    if (btn) btn.textContent = '⏳ Generating…';

    const lineFrom = Math.min(CS.lineFrom, CS.lineTo);
    const lineTo   = Math.max(CS.lineFrom, CS.lineTo);
    const devFrom  = Math.min(CS.devFrom,  CS.devTo);
    const devTo    = Math.max(CS.devFrom,  CS.devTo);

    // Build valid line strings and device numbers
    const validLines = new Set();
    for (let l = lineFrom; l <= lineTo; l++) validLines.add(`L${String(l).padStart(2,'0')}`);

    const validDevs = new Set();
    for (let d = devFrom; d <= devTo; d++) validDevs.add(d);

    // Filter alarms
    CS.generatedAlarms = fileAlarms
      .filter(alarm => {
        const name = alarm.alarmName || alarm.tag || '';
        return matchesAlarm(name, validLines, validDevs);
      })
      .map(alarm => ({ ...alarm, deleted: false }));

    // Sort by alarm name
    CS.generatedAlarms.sort((a, b) => (a.alarmName||'').localeCompare(b.alarmName||''));

    const total = CS.generatedAlarms.length;
    document.getElementById('generateStatus').textContent =
      total ? `${total.toLocaleString()} alarms generated` : 'No alarms matched';

    if (!total) {
      toast(`No alarms matched L${String(lineFrom).padStart(2,'0')}–L${String(lineTo).padStart(2,'0')}, devices ${devFrom}–${devTo}`, 'err');
    } else {
      toast(`${total.toLocaleString()} alarms generated ✓`);
      updateFilterDropdowns();
      renderAlarmTable();
      document.getElementById('alarmHdrActions').style.display = 'flex';
      document.getElementById('filtersRow').style.display = 'flex';
    }

  } catch (e) {
    toast('Error: ' + e.message, 'err');
    console.error(e);
  } finally {
    if (btn) { btn.textContent = '⚡ Generate Alarm List'; btn.disabled = false; }
  }
}

// Match alarm name against valid lines and device numbers
// Handles: L05-M01, L05_ESP03, L05-SM01 DS, L05-CL01-M01, L05-EV00-FDBK
function matchesAlarm(name, validLines, validDevs) {
  // Extract line prefix
  const lineMatch = name.match(/^(L\d+)/);
  if (!lineMatch) return false;
  const lineStr = lineMatch[1].padStart(3, ''); // e.g. L05
  // Pad to L + 2 digits
  const paddedLine = 'L' + String(parseInt(lineStr.slice(1))).padStart(2,'0');
  if (!validLines.has(paddedLine)) return false;

  // Extract first device number after line prefix
  const rest = name.slice(lineStr.length);
  // Match separator + optional tag letters + number
  const devMatch = rest.match(/^[_\-][A-Za-z]*(\d+)/);
  if (!devMatch) return false;

  return validDevs.has(parseInt(devMatch[1]));
}

// ── Alarm Table ───────────────────────────────────────────
function renderAlarmTable() {
  const container = document.getElementById('alarmTableContainer');
  if (!container) return;

  let alarms = [...CS.generatedAlarms];

  if (CS.activeFilter.sheet)    alarms = alarms.filter(a => a.sheet === CS.activeFilter.sheet);
  if (CS.activeFilter.severity) alarms = alarms.filter(a => a.severity === CS.activeFilter.severity);
  if (CS.searchQuery) {
    const q = CS.searchQuery.toLowerCase();
    alarms = alarms.filter(a =>
      (a.alarmName||'').toLowerCase().includes(q) ||
      (a.description||'').toLowerCase().includes(q)
    );
  }

  if (!CS.generatedAlarms.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚡</div><div>Select a category, set ranges and click Generate</div></div>';
    return;
  }

  const active = CS.generatedAlarms.filter(a => !a.deleted).length;
  document.getElementById('alarmHdrCount').textContent =
    `${alarms.filter(a=>!a.deleted).length.toLocaleString()} shown · ${active.toLocaleString()} active`;

  const sevColor = {
    'Critical':'var(--red)','Cricital':'var(--red)',
    'Fault':'var(--orange)','Warning':'var(--yellow)','Information':'var(--accent)'
  };

  let html = `<table class="alarm-table">
    <thead><tr>
      <th onclick="sortAlarmTable('alarmName')" style="cursor:pointer">Alarm Name ↕</th>
      <th onclick="sortAlarmTable('description')" style="cursor:pointer">Description ↕</th>
      <th onclick="sortAlarmTable('sheet')" style="cursor:pointer">Type ↕</th>
      <th onclick="sortAlarmTable('mainCategory')" style="cursor:pointer">Category ↕</th>
      <th onclick="sortAlarmTable('subCategory')" style="cursor:pointer">Sub Category ↕</th>
      <th onclick="sortAlarmTable('severity')" style="cursor:pointer">Severity ↕</th>
      <th></th>
    </tr></thead><tbody>`;

  alarms.forEach(alarm => {
    const realIdx = CS.generatedAlarms.indexOf(alarm);
    const sev = alarm.severity || '';
    const sc = sevColor[sev] || 'var(--text3)';
    html += `<tr class="${alarm.deleted ? 'deleted' : ''}">
      <td class="tag">${esc(alarm.alarmName||'')}</td>
      <td class="desc" style="max-width:320px">${esc(alarm.description||'')}</td>
      <td class="group-cell" style="max-width:150px" title="${esc(alarm.sheet||'')}">${esc((alarm.sheet||'').length>20?(alarm.sheet||'').slice(0,20)+'…':(alarm.sheet||''))}</td>
      <td><span class="badge ${badgeClass(alarm.mainCategory||'')}">${esc((alarm.mainCategory||'').replace(' Failures','').replace(' Interlocks',''))}</span></td>
      <td style="font-size:11px;color:var(--text3);max-width:150px">${esc(alarm.subCategory||'')}</td>
      <td><span style="font-size:10px;font-weight:700;color:${sc}">${esc(sev)}</span></td>
      <td><button class="row-del ${alarm.deleted?'row-restore':''}"
        onclick="toggleAlarmDeleted(${realIdx})"
        title="${alarm.deleted?'Restore':'Delete'}">${alarm.deleted?'↺':'×'}</button></td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function sortAlarmTable(field) {
  CS.sortField === field ? CS.sortDir *= -1 : (CS.sortField = field, CS.sortDir = 1);
  CS.generatedAlarms.sort((a, b) => {
    const av = a[field]||'', bv = b[field]||'';
    return av < bv ? -CS.sortDir : av > bv ? CS.sortDir : 0;
  });
  renderAlarmTable();
}

function toggleAlarmDeleted(idx) {
  if (CS.generatedAlarms[idx]) {
    CS.generatedAlarms[idx].deleted = !CS.generatedAlarms[idx].deleted;
    renderAlarmTable();
  }
}

function bulkDeleteVisible() {
  let alarms = [...CS.generatedAlarms];
  if (CS.activeFilter.sheet)    alarms = alarms.filter(a => a.sheet === CS.activeFilter.sheet);
  if (CS.activeFilter.severity) alarms = alarms.filter(a => a.severity === CS.activeFilter.severity);
  if (CS.searchQuery) {
    const q = CS.searchQuery.toLowerCase();
    alarms = alarms.filter(a => (a.alarmName||'').toLowerCase().includes(q)||(a.description||'').toLowerCase().includes(q));
  }
  alarms.forEach(a => a.deleted = true);
  renderAlarmTable();
  toast('Visible alarms deleted ✓');
}

function restoreAll() {
  CS.generatedAlarms.forEach(a => a.deleted = false);
  renderAlarmTable();
  toast('All alarms restored ✓');
}

function updateFilterDropdowns() {
  const sheets   = [...new Set(CS.generatedAlarms.map(a => a.sheet).filter(Boolean))].sort();
  const sheetEl  = document.getElementById('filterSheet');
  if (sheetEl) sheetEl.innerHTML = '<option value="">All Types</option>' + sheets.map(s => `<option>${esc(s)}</option>`).join('');
}

// ── Export ────────────────────────────────────────────────
function exportConfiguredAlarms(type) {
  const active = CS.generatedAlarms.filter(a => !a.deleted);
  if (!active.length) { toast('No active alarms to export.', 'err'); return; }
  const p = projInfo();
  const pn = (p.ref || 'Project').replace(/[^a-z0-9]/gi, '_');

  if (type === 'csv') {
    let csv = 'Alarm Name,Description,Type,Main Category,Sub Category,Sub-Sub Category,Severity,ID\n';
    active.forEach(a => {
      csv += `"${a.alarmName}","${a.description}","${a.sheet}","${a.mainCategory}","${a.subCategory}","${a.subSubCategory}","${a.severity}","${a.alarmId}"\n`;
    });
    dl(pn + '_alarms.csv', csv, 'text/csv');
    toast('CSV exported ✓');
  } else if (type === 'excel') {
    if (typeof XLSX === 'undefined') { toast('Excel library not loaded.', 'err'); return; }
    const wb = XLSX.utils.book_new();
    const data = [['Alarm Name','Description','Type','Main Category','Sub Category','Sub-Sub Category','Severity','ID']];
    active.forEach(a => data.push([a.alarmName, a.description, a.sheet, a.mainCategory, a.subCategory, a.subSubCategory, a.severity, a.alarmId]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Alarms');
    XLSX.writeFile(wb, pn + '_alarms.xlsx');
    toast('Excel exported ✓');
  }
}

// ── Snapshot ──────────────────────────────────────────────
function getConfigureSnapshot() {
  return {
    selectedMain: CS.selectedMain,
    selectedFile: CS.selectedFile,
    lineFrom: CS.lineFrom, lineTo: CS.lineTo,
    devFrom: CS.devFrom, devTo: CS.devTo,
    generatedAlarms: JSON.parse(JSON.stringify(CS.generatedAlarms))
  };
}

function restoreConfigureSnapshot(snap) {
  if (!snap) return;
  CS.selectedMain = snap.selectedMain || null;
  CS.selectedFile = snap.selectedFile || null;
  CS.lineFrom = snap.lineFrom || 1;
  CS.lineTo   = snap.lineTo   || 1;
  CS.devFrom  = snap.devFrom  || 1;
  CS.devTo    = snap.devTo    || 1;
  CS.generatedAlarms = snap.generatedAlarms || [];
}
