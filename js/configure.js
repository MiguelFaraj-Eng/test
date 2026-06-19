// ══════════════════════════════════════════════════
//  CONFIGURE PAGE — New alarm selection system
//  Categories → Lines → Device ranges → Generate
// ══════════════════════════════════════════════════

// Category definitions mapping to Excel files
const ALARM_CATEGORIES = [
  {
    id: 'general',
    label: 'General',
    file: 'General.xlsx',
    color: 'var(--purple)',
    colorLight: 'var(--purple-light)',
    icon: '⚡',
    devices: [
      { id: 'ESP', label: 'Emergency Stop Button Panel', tag: 'ESP' },
      { id: 'ES',  label: 'Emergency Stop Button',       tag: 'ES'  },
      { id: 'ESR', label: 'Emergency Stop Rope',         tag: 'ESR' },
      { id: 'SR',  label: 'Safety Relay',                tag: 'SR'  },
      { id: 'LB',  label: 'Light Barrier',               tag: 'LB'  },
      { id: 'GS',  label: 'Guard Switch',                tag: 'GS'  },
      { id: 'RC',  label: 'Radar Controller',            tag: 'RC'  },
      { id: 'LS',  label: 'Safety Limit Switch',         tag: 'LS'  },
      { id: 'EV',  label: 'Safety Valve Feedback',       tag: 'EV'  },
      { id: 'K',   label: 'Safety Contactor Feedback',   tag: 'K'   },
      { id: 'TS',  label: 'Temperature Sensor',          tag: 'TS'  },
      { id: 'UPS', label: 'UPS',                         tag: 'UPS' },
      { id: 'BAT', label: 'Battery',                     tag: 'BAT' },
      { id: 'Q',   label: 'Circuit Breaker',             tag: 'Q'   },
      { id: 'DS',  label: 'Disconnect Switch',           tag: 'DS'  },
      { id: 'DCC', label: 'Decentralized I/O Module',    tag: 'DCC' },
      { id: 'DFE', label: 'Gateway For Drives',          tag: 'DFE' },
      { id: 'VT',  label: 'Valves Output Terminal',      tag: 'VT'  },
      { id: 'PS',  label: 'Pressure Sensor',             tag: 'PS'  },
    ]
  },
  {
    id: 'async_motor',
    label: 'Asynchronous Motor',
    file: 'Asynchronous_Motor.xlsx',
    color: 'var(--accent)',
    colorLight: 'var(--accent-light)',
    icon: 'M',
    devices: [
      { id: 'M', label: 'Motor', tag: 'M' }
    ]
  },
  {
    id: 'servo_motor',
    label: 'Servo Motor',
    file: 'Servo_Motor.xlsx',
    color: 'var(--orange)',
    colorLight: 'var(--orange-light)',
    icon: 'SM',
    devices: [
      { id: 'SM', label: 'Servo Motor', tag: 'SM' }
    ]
  },
  {
    id: 'mdr',
    label: 'MDR / DDR / PGD',
    file: 'MDR__DDR__PGD.xlsx',
    color: 'var(--green)',
    colorLight: 'var(--green-light)',
    icon: 'CL',
    devices: [
      { id: 'CL', label: 'Conveylinx Module', tag: 'CL' }
    ]
  }
];

// Configure state
const CS = {
  selectedCategories: new Set(),  // category ids
  lines: [],                       // [{lineNum, devices: {catId: {devId: {from, to}}}}]
  generatedAlarms: [],             // final alarm list [{line, category, sheet, alarmName, description, mainCat, subCat, subSubCat, severity, id, deleted}]
  activeFilter: { line: null, category: null, sheet: null },
  searchQuery: '',
  sortField: 'line',
  sortDir: 1,
};

// ── Render configure page ──────────────────────────────────
function renderConfigurePage() {
  const main = document.getElementById('page-configure');
  main.innerHTML = `
    <div style="display:flex;height:100%;overflow:hidden">

      <!-- LEFT PANEL: Category + Line config -->
      <div style="width:340px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--surface);display:flex;flex-direction:column">

        <!-- Categories -->
        <div style="padding:16px;border-bottom:1px solid var(--border)">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text3);margin-bottom:10px">Alarm Categories</div>
          <div style="display:flex;flex-direction:column;gap:6px" id="categoryList"></div>
        </div>

        <!-- Lines -->
        <div style="padding:16px;border-bottom:1px solid var(--border);flex:1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text3)">Lines</div>
            <button class="btn btn-primary btn-sm" onclick="addLine()" style="font-size:10px;padding:4px 10px">+ Add Line</button>
          </div>
          <div id="linesList" style="display:flex;flex-direction:column;gap:8px">
            <div style="font-size:11px;color:var(--text3);font-style:italic;padding:8px 0">No lines added yet</div>
          </div>
        </div>

        <!-- Generate button -->
        <div style="padding:16px;border-top:1px solid var(--border)">
          <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="generateAlarms()">
            ⚡ Generate Alarm List
          </button>
          <div style="font-size:10px;color:var(--text3);margin-top:6px;text-align:center" id="generateStatus"></div>
        </div>
      </div>

      <!-- RIGHT PANEL: Alarm table -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">

        <!-- Alarm header -->
        <div style="padding:12px 20px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap;gap:8px">
          <span style="font-size:13px;font-weight:600" id="alarmHdrTitle">Configure your alarm selection</span>
          <span style="margin-left:auto;font-family:'DM Mono',monospace;font-size:11px;color:var(--text2)" id="alarmHdrCount"></span>
          <div style="display:flex;gap:6px;flex-wrap:wrap" id="alarmHdrActions" style="display:none">
            <button class="btn btn-sm btn-outline" onclick="exportConfiguredAlarms('csv')">📊 CSV</button>
            <button class="btn btn-sm btn-outline" onclick="exportConfiguredAlarms('excel')">📗 Excel</button>
          </div>
        </div>

        <!-- Filters row -->
        <div style="padding:8px 16px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0" id="filtersRow" style="display:none">
          <div style="position:relative">
            <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:12px">⌕</span>
            <input type="text" id="alarmSearchInput" placeholder="Search alarms…" 
              style="padding:5px 8px 5px 24px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none;width:180px"
              oninput="CS.searchQuery=this.value;renderAlarmTable()">
          </div>
          <select id="filterLine" onchange="CS.activeFilter.line=this.value||null;renderAlarmTable()"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none">
            <option value="">All Lines</option>
          </select>
          <select id="filterCategory" onchange="CS.activeFilter.category=this.value||null;renderAlarmTable()"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none">
            <option value="">All Categories</option>
          </select>
          <select id="filterSheet" onchange="CS.activeFilter.sheet=this.value||null;renderAlarmTable()"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;outline:none">
            <option value="">All Sheets</option>
          </select>
          <button class="btn btn-sm btn-outline" onclick="bulkDeleteVisible()" style="margin-left:auto">✕ Delete Visible</button>
          <button class="btn btn-sm btn-outline" onclick="restoreAll()">↺ Restore All</button>
        </div>

        <!-- Alarm table -->
        <div style="flex:1;overflow-y:auto" id="alarmTableContainer">
          <div class="empty-state">
            <div class="empty-icon">⚡</div>
            <div>Select categories and lines, then click Generate</div>
          </div>
        </div>

      </div>
    </div>
  `;

  renderCategories();
  renderLinesList();
}

// ── Categories ──────────────────────────────────────────────
function renderCategories() {
  const el = document.getElementById('categoryList');
  if (!el) return;
  el.innerHTML = ALARM_CATEGORIES.map(cat => {
    const selected = CS.selectedCategories.has(cat.id);
    return `
      <div class="eq-item ${selected ? 'selected' : ''}" onclick="toggleCategory('${cat.id}')" 
           style="padding:10px 12px;border-radius:8px;border:1.5px solid ${selected ? cat.color : 'var(--border)'};background:${selected ? cat.colorLight : 'var(--surface2)'}">
        <div class="eq-cb" style="${selected ? `background:${cat.color};border-color:${cat.color};color:#fff` : ''}">${selected ? '✓' : ''}</div>
        <div>
          <div style="font-size:12px;font-weight:600">${cat.label}</div>
          <div style="font-size:10px;color:var(--text3)">${cat.file}</div>
        </div>
      </div>`;
  }).join('');
}

function toggleCategory(id) {
  if (CS.selectedCategories.has(id)) CS.selectedCategories.delete(id);
  else CS.selectedCategories.add(id);
  renderCategories();
  renderLinesList(); // refresh device inputs
}

// ── Lines ───────────────────────────────────────────────────
function addLine() {
  if (!CS.selectedCategories.size) {
    toast('Select at least one category first.', 'err'); return;
  }
  // Default line number = next available
  const used = CS.lines.map(l => l.lineNum);
  let next = 1;
  while (used.includes(next)) next++;

  const devices = {};
  CS.selectedCategories.forEach(catId => {
    const cat = ALARM_CATEGORIES.find(c => c.id === catId);
    if (!cat) return;
    devices[catId] = {};
    cat.devices.forEach(dev => {
      devices[catId][dev.id] = { from: 1, to: 1 };
    });
  });

  CS.lines.push({ lineNum: next, devices });
  renderLinesList();
}

function removeLine(idx) {
  CS.lines.splice(idx, 1);
  renderLinesList();
}

function renderLinesList() {
  const el = document.getElementById('linesList');
  if (!el) return;

  if (!CS.lines.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text3);font-style:italic;padding:8px 0">No lines added yet</div>';
    return;
  }

  el.innerHTML = CS.lines.map((line, idx) => {
    const cats = [...CS.selectedCategories].map(catId => {
      const cat = ALARM_CATEGORIES.find(c => c.id === catId);
      if (!cat) return '';
      const devInputs = cat.devices.map(dev => {
        const range = (line.devices[catId] && line.devices[catId][dev.id]) || { from: 1, to: 1 };
        return `
          <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:11px;font-weight:500;flex:1;color:var(--text2)">${dev.label}</div>
            <span style="font-size:10px;color:var(--text3)">${dev.tag}</span>
            <input type="number" min="1" max="20" value="${range.from}" 
              style="width:40px;padding:2px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:11px;text-align:center"
              onchange="updateDeviceRange(${idx},'${catId}','${dev.id}','from',this.value)">
            <span style="font-size:10px;color:var(--text3)">→</span>
            <input type="number" min="1" max="20" value="${range.to}"
              style="width:40px;padding:2px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:11px;text-align:center"
              onchange="updateDeviceRange(${idx},'${catId}','${dev.id}','to',this.value)">
          </div>`;
      }).join('');

      return `
        <div style="margin-top:6px">
          <div style="font-size:9px;font-family:'DM Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;color:${cat.color};margin-bottom:4px">${cat.label}</div>
          ${devInputs}
        </div>`;
    }).join('');

    return `
      <div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:10px;padding:12px;position:relative">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:var(--accent)">L${String(line.lineNum).padStart(2,'0')}</div>
          <input type="number" min="0" max="20" value="${line.lineNum}"
            style="width:50px;padding:3px 6px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-family:'DM Mono',monospace;font-weight:600"
            onchange="updateLineNum(${idx},this.value)">
          <button onclick="removeLine(${idx})" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text3);font-size:16px;padding:2px 6px;border-radius:4px" 
            onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'">×</button>
        </div>
        ${cats}
      </div>`;
  }).join('');
}

function updateLineNum(idx, val) {
  CS.lines[idx].lineNum = parseInt(val) || 1;
  renderLinesList();
}

function updateDeviceRange(lineIdx, catId, devId, field, val) {
  if (!CS.lines[lineIdx].devices[catId]) CS.lines[lineIdx].devices[catId] = {};
  if (!CS.lines[lineIdx].devices[catId][devId]) CS.lines[lineIdx].devices[catId][devId] = { from: 1, to: 1 };
  CS.lines[lineIdx].devices[catId][devId][field] = Math.max(0, Math.min(20, parseInt(val) || 1));
}

// ── Generate Alarms ─────────────────────────────────────────
async function generateAlarms() {
  if (!CS.selectedCategories.size) { toast('Select at least one category.', 'err'); return; }
  if (!CS.lines.length) { toast('Add at least one line.', 'err'); return; }

  const btn = document.querySelector('#page-configure .btn-primary[onclick="generateAlarms()"]');
  if (btn) { btn.textContent = '⏳ Generating…'; btn.disabled = true; }

  try {
    CS.generatedAlarms = [];

    for (const catId of CS.selectedCategories) {
      const cat = ALARM_CATEGORIES.find(c => c.id === catId);
      if (!cat) continue;

      // Get sheets for this category from the loaded database
      const sheets = S.importedSheets;
      // Find sheets that belong to this category's file
      // They're stored under their sheet name directly
      const catSheets = Object.entries(sheets);

      for (const line of CS.lines) {
        if (!line.devices[catId]) continue;
        const lineStr = `L${String(line.lineNum).padStart(2, '0')}`;

        for (const dev of cat.devices) {
          const range = line.devices[catId][dev.id];
          if (!range) continue;

          const fromNum = Math.min(range.from, range.to);
          const toNum = Math.max(range.from, range.to);

          // Build set of valid device numbers
          const validNums = new Set();
          for (let n = fromNum; n <= toNum; n++) validNums.add(n);

          // Filter alarms from all sheets matching this line + device + number range
          for (const [sheetName, alarms] of catSheets) {
            // Only process sheets from this category's file
            if (!isCategorySheet(sheetName, catId)) continue;

            const matched = alarms.filter(alarm => {
              const name = alarm.alarmName || alarm.tag || '';
              return matchesAlarm(name, lineStr, dev.tag, validNums);
            });

            matched.forEach(alarm => {
              CS.generatedAlarms.push({
                line: lineStr,
                lineNum: line.lineNum,
                category: cat.label,
                categoryId: catId,
                sheet: sheetName,
                alarmName: alarm.alarmName || alarm.tag || '',
                description: alarm.description || '',
                mainCategory: alarm.mainCategory || '',
                subCategory: alarm.subCategory || '',
                subSubCategory: alarm.subSubCategory || '',
                severity: alarm.severity || '',
                alarmId: alarm.alarmId || '',
                deleted: false
              });
            });
          }
        }
      }
    }

    // Sort by line then alarm name
    CS.generatedAlarms.sort((a, b) => {
      if (a.lineNum !== b.lineNum) return a.lineNum - b.lineNum;
      return a.alarmName.localeCompare(b.alarmName);
    });

    const total = CS.generatedAlarms.length;
    document.getElementById('generateStatus').textContent = `${total.toLocaleString()} alarms generated`;

    if (!total) {
      toast('No alarms matched your selection. Check line numbers and device ranges.', 'err');
    } else {
      toast(`${total.toLocaleString()} alarms generated ✓`);
      updateFilterDropdowns();
      renderAlarmTable();
      document.getElementById('alarmHdrActions').style.display = 'flex';
      document.getElementById('filtersRow').style.display = 'flex';
    }

  } catch (e) {
    toast('Error generating alarms: ' + e.message, 'err');
    console.error(e);
  } finally {
    if (btn) { btn.textContent = '⚡ Generate Alarm List'; btn.disabled = false; }
  }
}

// Check if a sheet belongs to a category
function isCategorySheet(sheetName, catId) {
  // When files are merged, all sheets from all files coexist
  // We identify by matching sheet names to known sheets per category
  const catSheets = {
    general: ['Emergency Stop Button Panel','Emergency Stop Button','Emergency Stop Rope','Safety Relay','Light Barrier','Light Barrier Muting Error','Lockable Guard Switch','Non-Lockable Guard Switch','Radar Controller','Radar Controller Bypass','Safety Limit Switch','Safety Valve Feedback','Safety Contactor Feedback','Temperature Sensor','Unintirruptible Power Supply','Battery','Circuit Breaker','Disconnect Switch on PDB','Disconnect Switch on Electrical','Decentralized I O Module Fault','Gateway For Drives','Valves Output Terminal','Decentralized I O Module Comm L','Pressure Sensor'],
    async_motor: ['Motor Maintenance Switch','Inverter Faulted','Inverter Comm Lost','Conveyor_Product Stuck','Conveyor_Pallet Transfer Timeou','Conveyor_No Products','Conveyor_Pallet Transfer Acknow'],
    servo_motor: ['Servodrive Disconnect Switch ','Servodrive Breaker Off','Servodrive Faulted','Servodrive Reference Lost','Servodrive Comm Lost','Servomotor Homing Error','Servomotor Not In Position','Servomotor Out Of Range'],
    mdr: ['Conveylinx Module Faulted','Conveylinx Upstream Motor Fault','Conveylinx Downstream Motor Fau','Conveylinx Module Comm Lost','Conveylinx_Upstream Product Stu','Conveylinx_Downtream Product St','Conveylinx_Upstream Motor No Pr','Conveylinx_Downstre Motor No Pr']
  };
  return (catSheets[catId] || []).some(s => sheetName.trim() === s.trim());
}

// Match an alarm name to a line + device tag + number range
function matchesAlarm(name, lineStr, devTag, validNums) {
  // name examples: 'L04-M10 FAULT', 'L04-SM03 DS', 'L04-CL05 FAULTED', 'L04_ESP03'
  // Must start with the line string
  if (!name.startsWith(lineStr)) return false;

  // Extract device number after the tag
  // Patterns: L04-M10, L04-SM03, L04-CL05, L04_ESP03, L04-TS05, L04-UPS02
  const rest = name.slice(lineStr.length); // e.g. '-M10 FAULT' or '_ESP03'
  const regex = new RegExp(`^[_-]${escapeRegex(devTag)}(\\d+)`, 'i');
  const m = rest.match(regex);
  if (!m) return false;

  const devNum = parseInt(m[1]);
  return validNums.has(devNum);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Alarm Table ─────────────────────────────────────────────
function renderAlarmTable() {
  const container = document.getElementById('alarmTableContainer');
  if (!container) return;

  let alarms = CS.generatedAlarms;

  if (!alarms.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚡</div><div>Select categories and lines, then click Generate</div></div>';
    document.getElementById('alarmHdrTitle').textContent = 'Configure your alarm selection';
    document.getElementById('alarmHdrCount').textContent = '';
    return;
  }

  // Apply filters
  if (CS.activeFilter.line) alarms = alarms.filter(a => a.line === CS.activeFilter.line);
  if (CS.activeFilter.category) alarms = alarms.filter(a => a.category === CS.activeFilter.category);
  if (CS.activeFilter.sheet) alarms = alarms.filter(a => a.sheet === CS.activeFilter.sheet);
  if (CS.searchQuery) {
    const q = CS.searchQuery.toLowerCase();
    alarms = alarms.filter(a => a.alarmName.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }

  const active = alarms.filter(a => !a.deleted).length;
  const total = CS.generatedAlarms.filter(a => !a.deleted).length;

  document.getElementById('alarmHdrTitle').textContent = 'Generated Alarms';
  document.getElementById('alarmHdrCount').textContent = `${active.toLocaleString()} shown · ${total.toLocaleString()} total active`;

  const sevColor = { 'Critical': 'var(--red)', 'Fault': 'var(--orange)', 'Warning': 'var(--yellow)', 'Information': 'var(--accent)', 'Cricital': 'var(--red)' };

  let html = `<table class="alarm-table">
    <thead><tr>
      <th onclick="sortAlarmTable('line')" style="cursor:pointer">Line ↕</th>
      <th onclick="sortAlarmTable('sheet')" style="cursor:pointer">Type ↕</th>
      <th onclick="sortAlarmTable('alarmName')" style="cursor:pointer">Alarm Name ↕</th>
      <th onclick="sortAlarmTable('description')" style="cursor:pointer">Description ↕</th>
      <th onclick="sortAlarmTable('mainCategory')" style="cursor:pointer">Category ↕</th>
      <th onclick="sortAlarmTable('severity')" style="cursor:pointer">Severity ↕</th>
      <th></th>
    </tr></thead><tbody>`;

  alarms.forEach((alarm, visIdx) => {
    const realIdx = CS.generatedAlarms.indexOf(alarm);
    const sev = alarm.severity || '';
    const sc = sevColor[sev] || 'var(--text3)';
    html += `<tr class="${alarm.deleted ? 'deleted' : ''}">
      <td><span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:var(--accent)">${esc(alarm.line)}</span></td>
      <td class="group-cell" style="max-width:160px" title="${esc(alarm.sheet)}">${esc(alarm.sheet.length > 22 ? alarm.sheet.slice(0,22)+'…' : alarm.sheet)}</td>
      <td class="tag">${esc(alarm.alarmName)}</td>
      <td class="desc" style="max-width:340px">${esc(alarm.description)}</td>
      <td><span class="badge ${badgeClass(alarm.mainCategory)}">${esc((alarm.mainCategory||'').replace(' Failures',''))}</span></td>
      <td><span style="font-size:10px;font-weight:700;color:${sc}">${esc(sev)}</span></td>
      <td>
        <button class="row-del ${alarm.deleted ? 'row-restore' : ''}" 
          onclick="toggleAlarmDeleted(${realIdx})" 
          title="${alarm.deleted ? 'Restore' : 'Delete'}">${alarm.deleted ? '↺' : '×'}</button>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function sortAlarmTable(field) {
  if (CS.sortField === field) CS.sortDir *= -1;
  else { CS.sortField = field; CS.sortDir = 1; }
  CS.generatedAlarms.sort((a, b) => {
    const av = a[field] ?? '', bv = b[field] ?? '';
    return av < bv ? -CS.sortDir : av > bv ? CS.sortDir : 0;
  });
  renderAlarmTable();
}

function toggleAlarmDeleted(idx) {
  CS.generatedAlarms[idx].deleted = !CS.generatedAlarms[idx].deleted;
  renderAlarmTable();
}

function bulkDeleteVisible() {
  let alarms = CS.generatedAlarms;
  if (CS.activeFilter.line) alarms = alarms.filter(a => a.line === CS.activeFilter.line);
  if (CS.activeFilter.category) alarms = alarms.filter(a => a.category === CS.activeFilter.category);
  if (CS.activeFilter.sheet) alarms = alarms.filter(a => a.sheet === CS.activeFilter.sheet);
  if (CS.searchQuery) {
    const q = CS.searchQuery.toLowerCase();
    alarms = alarms.filter(a => a.alarmName.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
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

// ── Filter dropdowns ────────────────────────────────────────
function updateFilterDropdowns() {
  const lines = [...new Set(CS.generatedAlarms.map(a => a.line))].sort();
  const cats  = [...new Set(CS.generatedAlarms.map(a => a.category))].sort();
  const sheets = [...new Set(CS.generatedAlarms.map(a => a.sheet))].sort();

  const lineEl = document.getElementById('filterLine');
  const catEl  = document.getElementById('filterCategory');
  const sheetEl = document.getElementById('filterSheet');

  if (lineEl) lineEl.innerHTML = '<option value="">All Lines</option>' + lines.map(l => `<option>${esc(l)}</option>`).join('');
  if (catEl)  catEl.innerHTML  = '<option value="">All Categories</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
  if (sheetEl) sheetEl.innerHTML = '<option value="">All Sheets</option>' + sheets.map(s => `<option>${esc(s)}</option>`).join('');
}

// ── Export configured alarms ─────────────────────────────────
function exportConfiguredAlarms(type) {
  const active = CS.generatedAlarms.filter(a => !a.deleted);
  if (!active.length) { toast('No active alarms to export.', 'err'); return; }
  const p = projInfo();
  const pn = (p.ref || 'Project').replace(/[^a-z0-9]/gi, '_');

  if (type === 'csv') {
    let csv = 'Line,Category,Sheet,Alarm Name,Description,Main Category,Sub Category,Sub-Sub Category,Severity,ID\n';
    active.forEach(a => {
      csv += `"${a.line}","${a.category}","${a.sheet}","${a.alarmName}","${a.description}","${a.mainCategory}","${a.subCategory}","${a.subSubCategory}","${a.severity}","${a.alarmId}"\n`;
    });
    dl(pn + '_alarms.csv', csv, 'text/csv');
    toast('CSV exported ✓');
  } else if (type === 'excel') {
    if (typeof XLSX === 'undefined') { toast('Excel library not loaded.', 'err'); return; }
    const wb = XLSX.utils.book_new();
    const data = [['Line','Category','Sheet','Alarm Name','Description','Main Category','Sub Category','Sub-Sub Category','Severity','ID']];
    active.forEach(a => data.push([a.line, a.category, a.sheet, a.alarmName, a.description, a.mainCategory, a.subCategory, a.subSubCategory, a.severity, a.alarmId]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Alarms');
    XLSX.writeFile(wb, pn + '_alarms.xlsx');
    toast('Excel exported ✓');
  }
}

// ── Save/load configure state in project snapshot ────────────
function getConfigureSnapshot() {
  return {
    selectedCategories: [...CS.selectedCategories],
    lines: CS.lines,
    generatedAlarms: CS.generatedAlarms
  };
}

function restoreConfigureSnapshot(snap) {
  if (!snap) return;
  CS.selectedCategories = new Set(snap.selectedCategories || []);
  CS.lines = snap.lines || [];
  CS.generatedAlarms = snap.generatedAlarms || [];
}
