//  ALARM TEMPLATES
//  Structure: SHEET_TEMPLATES[sheetName] = {group → {category, alarms:[{n,d,v,p}]}}
//  All alarms in a sheet are stored for E01..E20.
//  getAlarmsForEntity(eqName, entityNum) looks up the right sheet,
//  filters to only the correct E{nn} alarms, and returns them grouped.
// ══════════════════════════════════════════════════
// ── EMBEDDED DATABASE ──────────────────────────────────────────────────────
// This variable is populated when an admin saves the Excel to the HTML.
// It persists across all sessions without needing localStorage.
const EMBEDDED_DB = null; // <<<EMBEDDED_DB_PLACEHOLDER>>>

let SHEET_TEMPLATES = {};  // populated by rebuildTemplates()

// Map equipment UI name → Excel sheet name (exact match)
const EQ_TO_SHEET = {
  'Drop type Packer':                     'Drop Type Packer',
  '2-Axis Delta Robot Packer':            'Packers',
  'Pick & Place Gantry Packer':           'Packers',
  '3-Axis Delta Robot Packer':            'Packers',
  'Tray & Crate Packer (2 in 1)':        'Packers',
  'Top Loading RSC Packer (3 in 1)':     'Packers',
  'Semi Automatic Palletizer':            'Palletizer',
  'Robotic Crate Palletizer':             'Palletizer',
  'Pantograph Palletizer':                'Palletizer',
  'Hybrid Palletizer':                    'Palletizer',
  'Robotic Palletizer':                   'Palletizer',
  'Robotic Crate Depalletizer':           'Depalletizers',
  'Pantograph Depalletizer':              'Depalletizers',
  'Sweep Type Depalletizer':              'Depalletizers',
  'Robotic Depalletizer':                 'Depalletizers',
  'Crate Inspection':                     'Inspection Systems',
  'Wooden Pallet Inspection':             'Inspection Systems',
  'Plastic Pallet Inspection':            'Inspection Systems',
  'Full Bottle Inspection':               'Inspection Systems',
  'Empty Bottle Inspection':              'Inspection Systems',
  'Accumulation Turntable':               'Accumulation',
  'FIFO Accumulation Table':              'Accumulation',
  'Mass Flow Accumulation Table':         'Accumulation',
  'Row Accumulation Table':               'Accumulation',
  'Loop Accumulation':                    'Accumulation',
  'Continuous Turning Device':            'Motor',
  'Starwheel Divider':                    'Motor',
  'Continuous Pusher':                    'Motor',
  'Segregation Unit For Cartons':         'Motor',
  'Step Divider - Merge For Primary':     'Motor',
  'Debagger for square-oval Bottles':     'Empty Bottle Handling',
  'Invert Cleaner':                       'Empty Bottle Handling',
  'Debagger for round bottles':           'Empty Bottle Handling',
  'MDR Conveying':                        'MDR',
  'Motorized Crate Chute':               'Crate Handling',
  'Crate Merging Table':                  'Crate Handling',
  'Crate Diverter':                       'Crate Handling',
  'Crate Orientor':                       'Crate Handling',
  'Side grip crate elevator - lowerator': 'Crate Handling',
  'Pallet Elevator - lowerator':          'Pallet Handling',
  'Pallet turntable':                     'Pallet Handling',
  'Transfer Car':                         'Pallet Handling',
  'Pallet 90 Degrees Transfer Unit':      'Pallet Handling',
  'Robotic Rack Unloader':               'Plastic & Steel Rack Handling',
  'Rack Washer':                          'Plastic & Steel Rack Handling',
  'Robotic Rack Loader':                  'Plastic & Steel Rack Handling',
  'Modular Plastic Belt Conveyor':        'Conveying Systems',
  'Belt Conveyor':                        'Conveying Systems',
  'Modular Chain Conveyors':             'Conveying Systems',
  'Plastic Chain Conveyor for crate':    'Conveying Systems',
  'Roller Conveyor':                      'Conveying Systems',
  'Roller - Chain Conveyor for Pallet':  'Conveying Systems',
  'Roller Conveyor for Pallet':           'Conveying Systems',
  'Modular Chain Conveyor for Pallet':   'Conveying Systems',
};

// Fallback sheet when the mapped sheet has no data
const FALLBACK_SHEET = 'Drop Type Packer';

// Called after Excel import — stores ALL alarms per sheet grouped by alarm-type name
function rebuildTemplates(sheets) {
  SHEET_TEMPLATES = {};
  for (const [sheetName, alarms] of Object.entries(sheets)) {
    if (!alarms.length) continue;
    const byGroup = {};
    alarms.forEach(a => {
      const g = a.group || 'Unknown';
      const gCat = (a.category||'')=='Operational Failure'?'Operational Failures':(a.category||'');
      if (!byGroup[g]) byGroup[g] = { category: gCat, alarms: [] };
      byGroup[g].category = gCat; // ensure always normalised
      const normCat = (a.category||'')=='Operational Failure'?'Operational Failures':(a.category||'');
      byGroup[g].alarms.push({ n: a.tag, d: a.description, v: String(a.id || ''), p: a.priority, cat: normCat });
    });
    SHEET_TEMPLATES[sheetName] = byGroup;
  }
  console.log('Templates rebuilt for sheets:', Object.keys(SHEET_TEMPLATES));
}

// Get all alarms for entity E{nn} from the correct sheet.
// Returns: [{alarmType, category, alarms:[{name,desc,value,priority,deleted}]}]
function getAlarmsForEntity(eqName, entityNum) {
  const pad = String(entityNum).padStart(2, '0');
  const eKey = 'E' + pad;  // e.g. "E01", "E03"

  // Determine which sheet to use
  const sheetName = EQ_TO_SHEET[eqName] || FALLBACK_SHEET;
  let groups = SHEET_TEMPLATES[sheetName];

  // Fallback: if mapped sheet is empty, try Drop Type Packer as master template
  if (!groups || !Object.keys(groups).length) {
    groups = SHEET_TEMPLATES[FALLBACK_SHEET] || {};
  }

  const result = [];
  for (const [alarmType, data] of Object.entries(groups)) {
    let entityAlarms;

    // Check if this sheet uses E{nn} prefix (equipment-indexed sheets)
    const hasEPrefix = data.alarms.some(a => /^E\d{2}[_-]/.test(a.n));

    if (hasEPrefix) {
      // Standard equipment sheet: filter to this entity's E{pad} alarms
      entityAlarms = data.alarms.filter(a =>
        a.n.startsWith(eKey + '_') ||
        a.n.startsWith(eKey + '-') ||
        a.n.endsWith('_' + eKey) ||
        a.n.endsWith('-' + eKey)
      );
    } else {
      // Non-indexed sheet (e.g. Insightech, Common global): use ALL alarms
      entityAlarms = data.alarms;
    }

    if (!entityAlarms.length) continue;

    result.push({
      alarmType,
      category: data.category,
      alarms: entityAlarms.map(a => ({
        name: a.n,
        desc: a.d,
        value: a.v,
        priority: a.p,
        deleted: false,
        category: a.cat || data.category
      }))
    });
  }
  return result;
}

// ══════════════════════════════════════════════════
//  EXCEL IMPORT
// ══════════════════════════════════════════════════
function handleFile(evt){
  const file = evt.target.files[0];
  if(!file) return;
  processFile(file);
}

function processFile(file){
  S.importedFile = file.name;
  document.getElementById('dropTitle').textContent = '⟳ Reading ' + file.name + '...';
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb = XLSX.read(e.target.result, {type:'binary'});
      const sheets = {};
      wb.SheetNames.forEach(name=>{
        const ws = wb.Sheets[name];
        const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
        const alarms = [];
        let group = '';
        raw.forEach(row=>{
          const tag = String(row[0]||'').trim();
          const desc = String(row[1]||'').trim();
          if(!tag) return;
          if(!desc){ group = tag; return; }
          const cat = String(row[2]||'').trim();
          const id = row[3] ? parseInt(row[3]) : null;
          const prio = row[4] !== '' && row[4] !== null && row[4] !== undefined ? parseInt(row[4]) : null;
          alarms.push({group, tag, description:desc, category:cat, id, priority:prio, sheet:name});
        });
        sheets[name] = alarms;
      });
      S.importedSheets = sheets;
      showSheetPreview(wb.SheetNames, sheets);
      document.getElementById('dropTitle').textContent = '✓ ' + file.name;
      document.getElementById('dropSub').textContent = `${Object.keys(sheets).length} sheets · ${Object.values(sheets).reduce((a,b)=>a+b.length,0).toLocaleString()} alarms`;
    } catch(err){
      toast('Error reading file: ' + err.message, 'err');
      document.getElementById('dropTitle').textContent = 'Drop your Excel file here';
    }
  };
  reader.readAsBinaryString(file);
}

function showSheetPreview(names, sheets){
  const el = document.getElementById('sheetList');
  el.innerHTML = names.map(n=>{
    const cnt = (sheets[n]||[]).length;
    return `<div class="sheet-card ${cnt===0?'empty':''}">${esc(n)}<div class="sheet-count">${cnt.toLocaleString()} alarms</div></div>`;
  }).join('');
  document.getElementById('sheetPreview').style.display='block';
  document.getElementById('importActions').style.display='flex';
  // Populate settings sheet filter
  const sf = document.getElementById('settingsSheetFilter');
  sf.innerHTML = '<option value="">All Sheets</option>' + names.map(n=>`<option>${esc(n)}</option>`).join('');
}

function confirmImport(){
  if(!Object.keys(S.importedSheets).length){ toast('No file loaded yet.','err'); return; }
  updateTabs();
  renderEquipment();
  updateStats();
  rebuildTemplates(S.importedSheets);
  const total = Object.values(S.importedSheets).reduce((a,b)=>a+b.length,0);
  document.getElementById('importStatusLine').textContent = `✓ ${S.importedFile||'File'} — ${total.toLocaleString()} alarms loaded`;
  // Persist to localStorage so it survives page refresh
  try {
    localStorage.setItem('ic_alarm_db', JSON.stringify({
      file: S.importedFile,
      sheets: S.importedSheets,
      savedAt: new Date().toISOString()
    }));
    console.log('Alarm DB saved to localStorage');
  } catch(e) { console.warn('Could not save to localStorage:', e); }
  renderSettingsTable();
  toast(`Database updated: ${total.toLocaleString()} alarms ✓`);
  // Offer to save a new HTML with the database permanently embedded
  setTimeout(()=>{
    if(confirm(`Database imported successfully (${total.toLocaleString()} alarms).\n\nDo you want to save an updated HTML file with this database permanently embedded?\n\nThis way engineers don't need Settings access — the alarms are always available.`)){
      saveEmbeddedHTML();
    }
  }, 400);
}

function resetImport(){
  S.importedSheets = {};
  S.importedFile = null;
  document.getElementById('dropTitle').textContent = 'Drop your Excel file here';
  document.getElementById('dropSub').textContent = 'or click to browse — .xlsx format';
  document.getElementById('sheetPreview').style.display='none';
  document.getElementById('importActions').style.display='none';
  document.getElementById('fileInput').value='';
}

function getAllAlarms(){
  const all = [];
  Object.entries(S.importedSheets).forEach(([sheet, alarms])=>all.push(...alarms));
  all.push(...S.customAlarms);
  return all;
}

// ══════════════════════════════════════════════════
