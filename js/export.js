//  EXPORT PAGE
// ══════════════════════════════════════════════════
function renderExport(){
  const p = projInfo();
  const entities = Object.entries(S.entityAlarms);
  const totalAlarms = entities.reduce((s,[,e])=>s+(e.alarmGroups||[]).reduce((ss,g)=>ss+g.alarms.filter(a=>!a.deleted).length,0),0);
  const totalUnits = entities.length;
  const eqTypes = [...new Set(entities.map(([,e])=>e.eqName))].length;
  const cats = [...new Set(entities.flatMap(([,e])=>(e.alarmGroups||[]).map(g=>g.category).filter(Boolean)))].length;
  renderExportStatus();

  const commonActiveCount = (S.commonAlarms||[]).filter(a=>!a.deleted).length;
  const customActiveCount = (S.customProjectAlarms||[]).filter(a=>!a.deleted).length;
  document.getElementById('sumStats').innerHTML=`
    <div class="sum-stat"><div class="sum-stat-l">Project</div><div class="sum-stat-v" style="font-size:13px;font-weight:600">${esc(p.name)}</div></div>
    <div class="sum-stat"><div class="sum-stat-l">Reference</div><div class="sum-stat-v" style="font-size:13px">${esc(p.ref)}</div></div>
    <div class="sum-stat"><div class="sum-stat-l">Client</div><div class="sum-stat-v" style="font-size:13px">${esc(p.client)}</div></div>
    <div class="sum-stat"><div class="sum-stat-l">Site</div><div class="sum-stat-v" style="font-size:13px">${esc(p.site)}</div></div>
    <div class="sum-stat"><div class="sum-stat-l">Engineer</div><div class="sum-stat-v" style="font-size:13px">${esc(p.engineer)} <span style="color:var(--text3);font-size:11px">${esc(p.id)}</span></div></div>
    <div class="sum-stat"><div class="sum-stat-l">Date</div><div class="sum-stat-v" style="font-size:13px">${esc(p.date)}</div></div>
    <div class="sum-stat"><div class="sum-stat-l">Equipment Types</div><div class="sum-stat-v" style="color:var(--accent)">${eqTypes}</div></div>
    <div class="sum-stat"><div class="sum-stat-l">Total Units</div><div class="sum-stat-v" style="color:var(--purple)">${totalUnits}</div></div>
    <div class="sum-stat"><div class="sum-stat-l">Equipment Alarms</div><div class="sum-stat-v" style="color:var(--green)">${totalAlarms.toLocaleString()}</div></div>
    <div class="sum-stat"><div class="sum-stat-l">Common Alarms</div><div class="sum-stat-v" style="color:var(--yellow)">${commonActiveCount.toLocaleString()}</div></div>
    <div class="sum-stat"><div class="sum-stat-l">Custom Alarms</div><div class="sum-stat-v" style="color:var(--purple)">${customActiveCount.toLocaleString()}</div></div>
  `;

  // Equipment table
  const grouped = {};
  entities.forEach(([ek,ev])=>{ if(!grouped[ev.eqName]) grouped[ev.eqName]={cat:ev.eqCat,entities:[]}; grouped[ev.eqName].entities.push({ek,ev}); });
  document.getElementById('sumEquipTable').innerHTML=`<div class="card"><div style="font-size:13px;font-weight:600;margin-bottom:12px">Equipment Summary</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1.5px solid var(--border)">
        <th style="text-align:left;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);padding:6px 10px">Equipment</th>
        <th style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);padding:6px 10px;text-align:center">Units</th>
        <th style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);padding:6px 10px;text-align:right">Active Alarms</th>
        <th style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);padding:6px 10px;text-align:right">Total Alarms</th>
      </tr></thead>
      <tbody>${Object.entries(grouped).map(([name,{cat,entities:ents}])=>{
        const totalA = ents.reduce((s,{ev})=>s+(ev.alarmGroups||[]).reduce((ss,g)=>ss+g.alarms.filter(a=>!a.deleted).length,0),0);
        const allA = ents.reduce((s,{ev})=>s+(ev.alarmGroups||[]).reduce((ss,g)=>ss+g.alarms.length,0),0);
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px 10px;font-size:12px;font-weight:500">${esc(name)}<span style="font-size:10px;color:var(--text3);margin-left:6px">${cat}</span></td>
          <td style="padding:8px 10px;text-align:center;font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:var(--accent)">${ents.length}</td>
          <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace;font-size:12px;color:var(--green)">${totalA.toLocaleString()}</td>
          <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace;font-size:12px;color:var(--text3)">${allA.toLocaleString()}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function doExport(type){
  const p = projInfo();
  const safeName = (p.name||'Project').replace(/[^a-z0-9\s]/gi,'').trim().replace(/\s+/g,'_');
  const pn = safeName || 'Project';
  const entities = Object.entries(S.entityAlarms);

  if(type==='csv'){
    // CSV with project info header then alarm list
    const csvLines = [];
    csvLines.push('INSIGHTECH ALARMS CONFIGURATOR - ALARM LIST EXPORT');
    csvLines.push('');
    csvLines.push('PROJECT INFORMATION');
    csvLines.push(`Project Name,${p.name}`);
    csvLines.push(`Project Reference,${p.ref}`);
    csvLines.push(`Client,${p.client}`);
    csvLines.push(`Site,${p.site}`);
    csvLines.push(`Engineer,${p.engineer}`);
    csvLines.push(`Engineer ID,${p.id}`);
    csvLines.push(`Date,${p.date}`);
    if(p.notes) csvLines.push(`Notes,${p.notes}`);
    csvLines.push('');
    csvLines.push('ALARM LIST');
    let csv = csvLines.join('\n') + '\n';
    csv += 'Entity,Equipment,Alarm Type,Alarm Name,Description,Category,Value,Priority\n';
    entities.forEach(([ek,ev])=>{
      (ev.alarmGroups||[]).forEach(g=>{
        g.alarms.filter(a=>!a.deleted).forEach(a=>{
          csv += `"${ek}","${ev.eqName}","${g.alarmType}","${a.name}","${a.desc}","${g.category}","${a.value}","${a.priority??''}"
`;
        });
      });
    });
    // Add common alarms
    (S.commonAlarms||[]).filter(a=>!a.deleted).forEach(a=>{
      csv += `"COMMON","Common","${a.group}","${a.name}","${a.desc}","${a.category}","${a.value}","${a.priority??''}"
`;
    });
    // Add custom project alarms
    (S.customProjectAlarms||[]).filter(a=>!a.deleted).forEach(a=>{
      csv += `"CUSTOM","Custom","${a.group}","${a.name}","${a.desc}","${a.category}","${a.value}","${a.priority??''}"
`;
    });
    dl(pn+' Alarm List.csv', csv, 'text/csv');
  }
  else if(type==='scl-siemens'){
    const lines = [];
    lines.push(`// ================================================`);
    lines.push(`// PROJECT: ${p.name}`);
    lines.push(`// REFERENCE: ${p.ref}`);
    lines.push(`// CLIENT: ${p.client}`);
    lines.push(`// SITE: ${p.site}`);
    lines.push(`// ENGINEER: ${p.engineer}  |  ID: ${p.id}`);
    lines.push(`// DATE: ${p.date}`);
    lines.push(`// Generated by Insightech Alarms Configurator`);
    lines.push(`// ================================================`,'');
    lines.push(`TYPE "AlarmDef"  STRUCT`);
    lines.push(`    AlarmID  : DINT;`);
    lines.push(`    Priority : INT;`);
    lines.push(`    Tag      : STRING[64];`);
    lines.push(`    Message  : STRING[128];`);
    lines.push(`END_STRUCT END_TYPE`,'');
        entities.forEach(([ek,ev])=>{
      const active = (ev.alarmGroups||[]).flatMap(g=>g.alarms.filter(a=>!a.deleted).map(a=>({...a,alarmType:g.alarmType,category:g.category})));
      const sn = ek+'_'+ev.eqName.replace(/[^a-zA-Z0-9]/g,'_');
      lines.push(`// ── ${ek}: ${ev.eqName} (${ev.eqCat}) ──`);
      lines.push(`DATA_BLOCK "DB_${sn}"`);
      lines.push(`    { S7_Optimized_Access := 'FALSE' }`);
      lines.push(`    VAR Alarms : ARRAY[0..${Math.max(0,active.length-1)}] OF "AlarmDef"; END_VAR`);
      lines.push(`BEGIN`);
      active.forEach((a,i)=>{
        lines.push(`    Alarms[${i}].AlarmID  := ${parseInt(a.value)||0};`);
        lines.push(`    Alarms[${i}].Priority := ${a.priority??-1};`);
        lines.push(`    Alarms[${i}].Tag      := '${a.name}';`);
        lines.push(`    Alarms[${i}].Message  := '${(a.desc||'').substring(0,128).replace(/'/g,"\'")}';`);
      });
      lines.push(`END_DATA_BLOCK`,'');
        });
    // Common alarms block in SCL
    const commonActive = (S.commonAlarms||[]).filter(a=>!a.deleted);
    if(commonActive.length){
      lines.push(`// ── COMMON — Project-level Alarms ──`);
      lines.push(`DATA_BLOCK "DB_COMMON_Alarms"`);
      lines.push(`    { S7_Optimized_Access := 'FALSE' }`);
      lines.push(`    VAR Alarms : ARRAY[0..${commonActive.length-1}] OF "AlarmDef"; END_VAR`);
      lines.push(`BEGIN`);
      commonActive.forEach((a,i)=>{
        lines.push(`    Alarms[${i}].AlarmID  := ${parseInt(a.value)||0};`);
        lines.push(`    Alarms[${i}].Priority := ${a.priority??-1};`);
        lines.push(`    Alarms[${i}].Tag      := '${a.name}';`);
        lines.push(`    Alarms[${i}].Message  := '${(a.desc||'').substring(0,128).replace(/'/g,"\'")}';`);
      });
      lines.push(`END_DATA_BLOCK`,'');
    }
    dl(pn+' Alarm List Siemens.scl', lines.join('\n'), 'text/plain');
  }
  else if(type==='scl-rockwell'){
    const lines = [];
    lines.push(`// ================================================`);
    lines.push(`// PROJECT: ${p.name}`);
    lines.push(`// ENGINEER: ${p.engineer}  ID: ${p.id}`);
    lines.push(`// Studio 5000 / RSLogix 5000 — Structured Text`);
    lines.push(`// ================================================`,'');
        entities.forEach(([ek,ev])=>{
      const active = (ev.alarmGroups||[]).flatMap(g=>g.alarms.filter(a=>!a.deleted).map(a=>({...a,alarmType:g.alarmType,category:g.category})));
      const sn = ek+'_'+ev.eqName.replace(/[^a-zA-Z0-9]/g,'_');
      lines.push(`// ── ${ek}: ${ev.eqName} ──`);
      lines.push(`TYPE ${sn}_AlarmType:`);
      lines.push(`    STRUCT AlarmID:DINT; Priority:INT; Tag:STRING[64]; Message:STRING[128]; END_STRUCT`);
      lines.push(`END_TYPE`,'');
      lines.push(`VAR_GLOBAL`);
      lines.push(`    ${sn}_Alarms : ARRAY[0..${Math.max(0,active.length-1)}] OF ${sn}_AlarmType;`);
      lines.push(`END_VAR`,'');
      active.forEach((a,i)=>{
        lines.push(`${sn}_Alarms[${i}].AlarmID  := ${parseInt(a.value)||0};`);
        lines.push(`${sn}_Alarms[${i}].Priority := ${a.priority??-1};`);
        lines.push(`${sn}_Alarms[${i}].Tag      := '${a.name}';`);
        lines.push(`${sn}_Alarms[${i}].Message  := '${(a.desc||'').substring(0,128).replace(/'/g,"\'")}';`);
      });
      lines.push('');
        });
    // Common alarms block in Rockwell
    const rCommonActive = (S.commonAlarms||[]).filter(a=>!a.deleted);
    if(rCommonActive.length){
      lines.push(`// ── COMMON — Project-level Alarms ──`);
      lines.push(`TYPE COMMON_AlarmType:`);
      lines.push(`    STRUCT AlarmID:DINT; Priority:INT; Tag:STRING[64]; Message:STRING[128]; END_STRUCT`);
      lines.push(`END_TYPE`,'');
      lines.push(`VAR_GLOBAL`);
      lines.push(`    COMMON_Alarms : ARRAY[0..${rCommonActive.length-1}] OF COMMON_AlarmType;`);
      lines.push(`END_VAR`,'');
      rCommonActive.forEach((a,i)=>{
        lines.push(`COMMON_Alarms[${i}].AlarmID  := ${parseInt(a.value)||0};`);
        lines.push(`COMMON_Alarms[${i}].Priority := ${a.priority??-1};`);
        lines.push(`COMMON_Alarms[${i}].Tag      := '${a.name}';`);
        lines.push(`COMMON_Alarms[${i}].Message  := '${(a.desc||'').substring(0,128).replace(/'/g,"\'")}';`);
      });
      lines.push('');
    }
    dl(pn+' Alarm List Rockwell.L5X', lines.join('\n'), 'text/plain');
  }
  else if(type==='pdf'){
    exportPDF();
    return;
  }
  else if(type==='excel'){
    exportExcelClient();
    return;
  }
  toast('Export ready — check your downloads ✓');
  logActivity('export', `Exported project "${projInfo().ref}" as ${type.toUpperCase()}`);
}

// ── PDF Export ───────────────────────────────────────────
function exportPDF(){
  const p = projInfo();
  const entities = Object.entries(S.entityAlarms);
  const totalAlarms = entities.reduce((s,[,e])=>s+(e.alarmGroups||[]).reduce((ss,g)=>ss+g.alarms.filter(a=>!a.deleted).length,0),0);
  const statusLabel = {draft:'Draft',inprogress:'In Progress',completed:'Completed',delivered:'Delivered'}[S.projectStatus||'draft']||'Draft';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${esc(p.name)} - Alarm List</title>
  <style>
    body{font-family:Arial,sans-serif;color:#1a1a2e;margin:0;padding:0;font-size:11px}
    .cover{background:linear-gradient(135deg,#1a1a2e,#2d2d5e);color:#fff;padding:60px 50px;min-height:260px;page-break-after:always}
    .cover h1{font-size:28px;margin:0 0 8px;font-weight:700}
    .cover .ref{font-size:14px;opacity:.7;margin-bottom:30px;font-family:monospace}
    .cover table{border-collapse:collapse;width:100%}
    .cover td{padding:6px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,.15);opacity:.9}
    .cover td:first-child{opacity:.6;width:140px}
    .section{padding:30px 40px}
    .section h2{font-size:16px;border-bottom:2px solid #2d2d5e;padding-bottom:8px;margin-bottom:16px;color:#1a1a2e}
    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
    .stat-box{background:#f5f5f5;border-radius:6px;padding:12px;text-align:center}
    .stat-val{font-size:22px;font-weight:700;color:#2d2d5e}
    .stat-lbl{font-size:10px;color:#666;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#2d2d5e;color:#fff;padding:7px 10px;text-align:left;font-size:10px;letter-spacing:.5px}
    td{padding:6px 10px;border-bottom:1px solid #eee;font-size:10px}
    tr:nth-child(even) td{background:#fafafa}
    .entity-header{background:#e8e8f0;font-weight:700;font-size:11px;color:#1a1a2e;padding:10px}
    .badge{padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase}
    .p0{background:#ffcccc;color:#cc0000}.p5{background:#fff3cc;color:#cc7700}.pn{background:#eee;color:#666}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="cover">
    <h1>${esc(p.name)}</h1>
    <div class="ref">${esc(p.ref)}</div>
    <table><tr><td>Client</td><td>${esc(p.client)}</td></tr>
    <tr><td>Site / Location</td><td>${esc(p.site)}</td></tr>
    <tr><td>Engineer</td><td>${esc(p.engineer)}</td></tr>
    <tr><td>Date</td><td>${esc(p.date)}</td></tr>
    <tr><td>Status</td><td>${statusLabel}</td></tr>
    ${p.notes?`<tr><td>Notes</td><td>${esc(p.notes)}</td></tr>`:''}
    </table>
    <div style="margin-top:20px;opacity:.5;font-size:10px">Generated by Insightech Alarms Configurator</div>
  </div>
  <div class="section">
    <h2>Project Summary</h2>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-val">${entities.length}</div><div class="stat-lbl">Equipment Units</div></div>
      <div class="stat-box"><div class="stat-val">${[...new Set(entities.map(([,e])=>e.eqName))].length}</div><div class="stat-lbl">Equipment Types</div></div>
      <div class="stat-box"><div class="stat-val">${totalAlarms.toLocaleString()}</div><div class="stat-lbl">Active Alarms</div></div>
      <div class="stat-box"><div class="stat-val">${(S.commonAlarms||[]).filter(a=>!a.deleted).length}</div><div class="stat-lbl">Common Alarms</div></div>
    </div>
    <h2>Equipment List</h2>
    <table><thead><tr><th>Equipment</th><th>Category</th><th>Units</th><th>Active Alarms</th></tr></thead><tbody>
    ${(() => {
      const grouped = {};
      entities.forEach(([,ev])=>{ if(!grouped[ev.eqName]) grouped[ev.eqName]={cat:ev.eqCat,count:0,alarms:0}; grouped[ev.eqName].count++; grouped[ev.eqName].alarms+=(ev.alarmGroups||[]).reduce((s,g)=>s+g.alarms.filter(a=>!a.deleted).length,0); });
      return Object.entries(grouped).map(([name,{cat,count,alarms}])=>`<tr><td>${esc(name)}</td><td>${esc(cat)}</td><td style="text-align:center;font-weight:700">${count}</td><td style="text-align:center;color:#2d2d5e;font-weight:700">${alarms}</td></tr>`).join('');
    })()}
    </tbody></table>
    <h2>Alarm List</h2>
    <table><thead><tr><th>Entity</th><th>Equipment</th><th>Alarm Type</th><th>Tag</th><th>Description</th><th>Category</th><th>Priority</th></tr></thead><tbody>
    ${entities.map(([ek,ev])=>`
      <tr><td colspan="7" class="entity-header">📦 ${esc(ek)} — ${esc(ev.eqName)}</td></tr>
      ${(ev.alarmGroups||[]).flatMap(g=>g.alarms.filter(a=>!a.deleted).map(a=>`<tr>
        <td>${esc(ek)}</td><td>${esc(ev.eqName)}</td><td>${esc(g.alarmType)}</td>
        <td style="font-family:monospace">${esc(a.name)}</td><td>${esc(a.desc)}</td><td>${esc(g.category)}</td>
        <td style="text-align:center"><span class="badge ${a.priority===0?'p0':a.priority===5?'p5':'pn'}">${a.priority??'—'}</span></td>
      </tr>`)).join('')}
    `).join('')}
    ${(S.commonAlarms||[]).filter(a=>!a.deleted).length?`
      <tr><td colspan="7" class="entity-header">🌐 COMMON — Project-level Alarms</td></tr>
      ${(S.commonAlarms||[]).filter(a=>!a.deleted).map(a=>`<tr>
        <td>COMMON</td><td>Common</td><td>${esc(a.group)}</td>
        <td style="font-family:monospace">${esc(a.name)}</td><td>${esc(a.desc)}</td><td>${esc(a.category)}</td>
        <td style="text-align:center"><span class="badge ${a.priority===0?'p0':a.priority===5?'p5':'pn'}">${a.priority??'—'}</span></td>
      </tr>`).join('')}`:''}
    </tbody></table>
  </div>
  </body></html>`;

  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const win = window.open(url,'_blank');
  setTimeout(()=>{ if(win) win.print(); URL.revokeObjectURL(url); }, 800);
  toast('PDF report opened — use Print → Save as PDF ✓');
}

// ── Excel Client Export ──────────────────────────────────
function exportExcelClient(){
  if(typeof XLSX === 'undefined'){ toast('Excel library not loaded.','err'); return; }
  const p = projInfo();
  const entities = Object.entries(S.entityAlarms);
  const wb = XLSX.utils.book_new();

  // Cover sheet
  const coverData = [
    ['INSIGHTECH ALARMS CONFIGURATOR'],[''],
    ['Project Name', p.name],
    ['Project Reference', p.ref],
    ['Client', p.client],
    ['Site', p.site],
    ['Engineer', p.engineer],
    ['Date', p.date],
    ['Status', {draft:'Draft',inprogress:'In Progress',completed:'Completed',delivered:'Delivered'}[S.projectStatus||'draft']||'Draft'],
  ];
  if(p.notes) coverData.push(['Notes', p.notes]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(coverData), 'Project Info');

  // Summary sheet
  const sumData = [['Equipment','Category','Units','Active Alarms']];
  const grouped = {};
  entities.forEach(([,ev])=>{ if(!grouped[ev.eqName]) grouped[ev.eqName]={cat:ev.eqCat,count:0,alarms:0}; grouped[ev.eqName].count++; grouped[ev.eqName].alarms+=(ev.alarmGroups||[]).reduce((s,g)=>s+g.alarms.filter(a=>!a.deleted).length,0); });
  Object.entries(grouped).forEach(([name,{cat,count,alarms}])=>sumData.push([name,cat,count,alarms]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumData), 'Equipment Summary');

  // Full alarm list sheet
  const alarmData = [['Entity','Equipment','Category','Alarm Type','Tag','Description','Priority']];
  entities.forEach(([ek,ev])=>{
    (ev.alarmGroups||[]).forEach(g=>{
      g.alarms.filter(a=>!a.deleted).forEach(a=>{
        alarmData.push([ek, ev.eqName, g.category, g.alarmType, a.name, a.desc, a.priority??'']);
      });
    });
  });
  (S.commonAlarms||[]).filter(a=>!a.deleted).forEach(a=>{
    alarmData.push(['COMMON','Common',a.category,a.group,a.name,a.desc,a.priority??'']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(alarmData), 'Alarm List');

  // Per-equipment sheets (grouped by equipment type)
  Object.entries(grouped).forEach(([name])=>{
    const rows = [['Entity','Alarm Type','Tag','Description','Category','Priority']];
    entities.filter(([,ev])=>ev.eqName===name).forEach(([ek,ev])=>{
      (ev.alarmGroups||[]).forEach(g=>{
        g.alarms.filter(a=>!a.deleted).forEach(a=>{
          rows.push([ek, g.alarmType, a.name, a.desc, g.category, a.priority??'']);
        });
      });
    });
    const sheetName = name.substring(0,31).replace(/[\\\/\?\*\[\]]/g,'');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
  });

  XLSX.writeFile(wb, (p.ref||'Project')+' Alarm List Client.xlsx');
  toast('Excel workbook exported ✓');
}

// ── Project Status ───────────────────────────────────────
function setProjectStatus(status){
  const prev = S.projectStatus;
  S.projectStatus = status;
  const labels = {draft:'📝 Draft',inprogress:'⚙️ In Progress',completed:'✅ Completed',delivered:'📦 Delivered'};
  document.getElementById('currentStatusLabel').textContent = labels[status]||status;
  document.querySelectorAll('.status-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.status===status);
  });
  if(prev && prev !== status){
    const ref = projInfo().ref || '(unsaved)';
    logActivity('status_change', `Project "${ref}" status changed from ${prev} to ${status}`);
  }
}

function renderExportStatus(){
  const status = S.projectStatus||'draft';
  setProjectStatus(status);
}

function projInfo(){
  const g=id=>document.getElementById(id)?.value||'';
  return {name:g('projectName'),engineer:g('engineerName'),id:g('engineerId'),client:g('clientName'),ref:g('projectRef'),date:g('projectDate'),site:g('projectSite'),notes:g('projectNotes')};
}

function dl(filename,content,mime){
  const blob=new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════
