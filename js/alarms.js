// ══════════════════════════════════════════════════
//  ALARMS — DB loader + parser
//  S.importedSheets stores: { "Motors/Servo Motor.xlsx": [...alarms] }
//  Column structure (0-indexed):
//  0: Main Category  1: Sub Category  2: Sub-Sub Category
//  3: Alarm Tag      4: Alarm Name    5: Description
//  6: Severity Level 7: ID
// ══════════════════════════════════════════════════

let DB_LOADED = false;
let _dbLoadPromise = null;

function waitForDB() {
  if (DB_LOADED) return Promise.resolve();
  if (!_dbLoadPromise) _dbLoadPromise = loadAlarmDBFromGitHub();
  return _dbLoadPromise;
}

function rebuildTemplates(sheets) {
  // No-op — kept for compatibility, S.importedSheets is used directly
}

function parseSheet(rows, sheetName) {
  const alarms = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some(c => c !== null && c !== '')) continue;
    const mainCategory   = String(row[0] || '').trim();
    const subCategory    = String(row[1] || '').trim();
    const subSubCategory = String(row[2] || '').trim();
    const alarmTag       = String(row[3] || '').trim();
    const alarmName      = String(row[4] || '').trim();
    const description    = String(row[5] || '').trim();
    const severity       = String(row[6] || '').trim();
    const alarmId        = row[7] !== undefined && row[7] !== null && row[7] !== '' ? String(row[7]).trim() : '';
    if (!alarmName && !alarmTag) continue;
    alarms.push({ mainCategory, subCategory, subSubCategory, tag: alarmTag, alarmName, description, severity, alarmId, sheet: sheetName });
  }
  return alarms;
}

async function loadAlarmDBFromGitHub() {
  if (DB_LOADED) return;
  const REPO = 'MiguelFaraj-Eng/test';
  const FOLDERS = ['General', 'Motors', 'Pneumatics', 'Sensors', 'Equipments'];
  const BASE_RAW = `https://raw.githubusercontent.com/${REPO}/main/Data/Alarms`;
  const BASE_API = `https://api.github.com/repos/${REPO}/contents/Data/Alarms`;

  try {
    let totalAlarms = 0;
    let totalFiles  = 0;

    for (const folder of FOLDERS) {
      // List files in this folder
      let files = [];
      try {
        const res = await fetch(`${BASE_API}/${folder}`);
        if (!res.ok) { console.warn(`Folder ${folder} not found`); continue; }
        const data = await res.json();
        files = data.filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.xlsx'));
      } catch (e) {
        console.warn(`Could not list ${folder}:`, e);
        continue;
      }

      for (const file of files) {
        try {
          const url = `${BASE_RAW}/${folder}/${encodeURIComponent(file.name)}`;
          const res = await fetch(url);
          if (!res.ok) { console.warn(`Could not fetch ${file.name}`); continue; }
          const buf = await res.arrayBuffer();
          const wb  = XLSX.read(buf, { type: 'array' });
          const key = `${folder}/${file.name}`;
          const allAlarms = [];

          wb.SheetNames.forEach(sheetName => {
            const ws  = wb.Sheets[sheetName];
            const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const alarms = parseSheet(raw, sheetName);
            // Deduplicate: skip alarms with same name+sheet already seen
            const seen = new Set(allAlarms.map(a => a.alarmName + '|' + a.sheet));
            alarms.forEach(a => {
              const key = a.alarmName + '|' + a.sheet;
              if (!seen.has(key)) { seen.add(key); allAlarms.push(a); }
            });
          });

          S.importedSheets[key] = allAlarms;
          totalAlarms += allAlarms.length;
          totalFiles++;
          console.log(`Loaded: ${key} — ${allAlarms.length} alarms`);
        } catch (e) {
          console.warn(`Error loading ${file.name}:`, e);
        }
      }
    }

    DB_LOADED = true;
    const el = document.getElementById('importStatusLine');
    if (el) el.textContent = `✓ ${totalFiles} files loaded — ${totalAlarms.toLocaleString()} alarms`;
    updateStats();
    toast(`Alarm database ready — ${totalAlarms.toLocaleString()} alarms ✓`, 'info');
    console.log(`DB loaded: ${totalFiles} files, ${totalAlarms} alarms`);

  } catch (e) {
    _dbLoadPromise = null;
    console.warn('DB load failed:', e);
  }
}

function getAllAlarms() {
  return Object.values(S.importedSheets).flat();
}

// Manual import (Settings page drop zone)
function handleFile(evt) {
  const file = evt.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const dropTitle = document.getElementById('dropTitle');
  const dropSub   = document.getElementById('dropSub');
  if (dropTitle) dropTitle.textContent = '⟳ Reading ' + file.name + '...';
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const allAlarms = [];
      wb.SheetNames.forEach(name => {
        const ws  = wb.Sheets[name];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        allAlarms.push(...parseSheet(raw, name));
      });
      const key = 'Manual/' + file.name;
      S.importedSheets[key] = allAlarms;
      if (dropTitle) dropTitle.textContent = '✓ ' + file.name;
      if (dropSub)   dropSub.textContent   = `${allAlarms.length.toLocaleString()} alarms imported`;
      updateStats();
      toast(`${allAlarms.length.toLocaleString()} alarms imported ✓`);
    } catch (err) {
      toast('Error reading file: ' + err.message, 'err');
      if (dropTitle) dropTitle.textContent = 'Drop your Excel file here';
    }
  };
  reader.readAsBinaryString(file);
}

function clearSavedDB() {
  if (!confirm('Clear the alarm database?')) return;
  S.importedSheets = {};
  DB_LOADED = false;
  _dbLoadPromise = null;
  const el = document.getElementById('importStatusLine');
  if (el) el.textContent = 'No file imported yet';
  const cnt = document.getElementById('settingsTotalCount');
  if (cnt) cnt.textContent = '0';
  toast('Alarm database cleared.');
}
