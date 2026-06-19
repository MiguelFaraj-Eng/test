// ══════════════════════════════════════════════════
//  ALARMS — Parser + DB loader
//  Column structure (0-indexed):
//  0: Main Category  1: Sub Category  2: Sub-Sub Category
//  3: Alarm Tag      4: Alarm Name    5: Description
//  6: Severity Level 7: ID
// ══════════════════════════════════════════════════

let SHEET_TEMPLATES = {}; // kept for compatibility

function rebuildTemplates(sheets) {
  SHEET_TEMPLATES = sheets; // direct passthrough — new system uses S.importedSheets directly
  console.log('Database ready. Sheets:', Object.keys(sheets));
}

// ── Parse one sheet from raw XLSX rows ─────────────────────
function parseSheet(raw, sheetName) {
  const alarms = [];
  // Skip header row (row 0)
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || !row.some(c => c !== null && c !== '')) continue;

    const mainCategory  = String(row[0] || '').trim();
    const subCategory   = String(row[1] || '').trim();
    const subSubCategory = String(row[2] || '').trim();
    const alarmTag      = String(row[3] || '').trim();
    const alarmName     = String(row[4] || '').trim();
    const description   = String(row[5] || '').trim();
    const severity      = String(row[6] || '').trim();
    const alarmId       = row[7] !== undefined && row[7] !== null && row[7] !== '' ? String(row[7]).trim() : '';

    if (!alarmName && !alarmTag) continue; // skip empty rows

    alarms.push({
      mainCategory,
      subCategory,
      subSubCategory,
      tag: alarmTag,
      alarmName,
      description,
      severity,
      alarmId,
      sheet: sheetName
    });
  }
  return alarms;
}

// ── Load all Excel files from data/Alarms/ on GitHub ────────
let DB_LOADING = false;
let DB_LOADED = false;

async function loadAlarmDBFromGitHub() {
  if (Object.keys(S.importedSheets).length > 0) return;
  try {
    // 1. List all .xlsx files in data/Alarms/
    const listRes = await fetch('https://api.github.com/repos/MiguelFaraj-Eng/alarms_configurator/contents/data/Alarms');
    if (!listRes.ok) throw new Error('Could not list data/Alarms folder: ' + listRes.status);
    const files = await listRes.json();
    const xlsxFiles = files.filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.xlsx'));
    if (!xlsxFiles.length) throw new Error('No Excel files found in data/Alarms/');

    // 2. Fetch and parse each file — merge all sheets
    const merged = {};
    const fileNames = [];

    for (const file of xlsxFiles) {
      try {
        const res = await fetch(file.download_url);
        if (!res.ok) { console.warn('Could not fetch', file.name, res.status); continue; }
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          const alarms = parseSheet(raw, sheetName);

          if (merged[sheetName]) {
            merged[sheetName].push(...alarms);
          } else {
            merged[sheetName] = alarms;
          }
        });

        fileNames.push(file.name);
        console.log('Loaded:', file.name);
      } catch (fileErr) {
        console.warn('Error loading', file.name, fileErr);
      }
    }

    if (!fileNames.length) throw new Error('No files could be loaded from data/Alarms/');

    // 3. Store merged database
    S.importedSheets = merged;
    S.importedFile = fileNames.join(', ');
    rebuildTemplates(merged);

    const total = Object.values(merged).reduce((a, b) => a + b.length, 0);

    const el = document.getElementById('importStatusLine');
    if (el) el.textContent = `✓ ${fileNames.length} file${fileNames.length > 1 ? 's' : ''} from data/Alarms/ — ${total.toLocaleString()} alarms loaded`;

    updateStats();
    toast(`Alarm database ready — ${total.toLocaleString()} alarms from ${fileNames.length} file${fileNames.length > 1 ? 's' : ''} ✓`, 'info');
    DB_LOADED = true;
    console.log('data/Alarms/ loaded:', fileNames, '| total:', total);
    // Re-enable generate button if on configure page
    const genBtn2 = document.querySelector('#page-configure .btn-primary[onclick="generateAlarms()"]');
    if (genBtn2) { genBtn2.textContent = '⚡ Generate Alarm List'; genBtn2.disabled = false; }

  } catch (e) {
    DB_LOADING = false;
    console.warn('Could not load alarm DB from data/Alarms/:', e);
  }
}

// ── Manual import (drag & drop in Settings) ──────────────────
function handleFile(evt) {
  const file = evt.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  S.importedFile = file.name;
  document.getElementById('dropTitle').textContent = '⟳ Reading ' + file.name + '...';
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const sheets = {};
      wb.SheetNames.forEach(name => {
        const ws = wb.Sheets[name];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        sheets[name] = parseSheet(raw, name);
      });
      S.importedSheets = sheets;
      showSheetPreview(wb.SheetNames, sheets);
      document.getElementById('dropTitle').textContent = '✓ ' + file.name;
      const total = Object.values(sheets).reduce((a, b) => a + b.length, 0);
      document.getElementById('dropSub').textContent = `${Object.keys(sheets).length} sheets · ${total.toLocaleString()} alarms`;
    } catch (err) {
      toast('Error reading file: ' + err.message, 'err');
      document.getElementById('dropTitle').textContent = 'Drop your Excel file here';
    }
  };
  reader.readAsBinaryString(file);
}

function showSheetPreview(names, sheets) {
  const el = document.getElementById('sheetList');
  if (!el) return;
  el.innerHTML = names.map(n => {
    const cnt = (sheets[n] || []).length;
    return `<div class="sheet-card ${cnt === 0 ? 'empty' : ''}">${esc(n)}<div class="sheet-count">${cnt.toLocaleString()} alarms</div></div>`;
  }).join('');
  document.getElementById('sheetPreview').style.display = 'block';
  document.getElementById('importActions').style.display = 'flex';
}

function confirmImport() {
  if (!Object.keys(S.importedSheets).length) { toast('No file loaded yet.', 'err'); return; }
  rebuildTemplates(S.importedSheets);
  const total = Object.values(S.importedSheets).reduce((a, b) => a + b.length, 0);
  document.getElementById('importStatusLine').textContent = `✓ ${S.importedFile || 'File'} — ${total.toLocaleString()} alarms loaded`;
  updateStats();
  toast(`Database updated: ${total.toLocaleString()} alarms ✓`);
}

function resetImport() {
  S.importedSheets = {};
  S.importedFile = null;
  document.getElementById('dropTitle').textContent = 'Drop your Excel file here';
  document.getElementById('dropSub').textContent = 'or click to browse — .xlsx format';
  document.getElementById('sheetPreview').style.display = 'none';
  document.getElementById('importActions').style.display = 'none';
  document.getElementById('fileInput').value = '';
}

function clearSavedDB() {
  if (!confirm('Clear the alarm database?')) return;
  S.importedSheets = {};
  S.importedFile = null;
  SHEET_TEMPLATES = {};
  const el = document.getElementById('importStatusLine');
  if (el) el.textContent = 'No file imported yet';
  document.getElementById('settingsTotalCount').textContent = '0';
  toast('Alarm database cleared.');
}

function getAllAlarms() {
  return Object.values(S.importedSheets).flat();
}
