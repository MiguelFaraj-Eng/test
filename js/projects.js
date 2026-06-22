//  PROJECTS — SAVE / LOAD / DASHBOARD
// ══════════════════════════════════════════════════

function getProjectPath(firstName, lastName, projectRef){
  const userName   = `${firstName} ${lastName}`.trim();
  const safeRef    = (projectRef||'unnamed').trim();
  return {
    apiPath  : `Projects/${userName}/${safeRef}/project.json`,
    userName,
    projectRef: safeRef
  };
}

function buildProjectSnapshot(){
  const info = {
    projectName : (document.getElementById('projectName')||{}).value||'',
    projectRef  : (document.getElementById('projectRef')||{}).value||'',
    clientName  : (document.getElementById('clientName')||{}).value||'',
    projectSite : (document.getElementById('projectSite')||{}).value||'',
    projectNotes: (document.getElementById('projectNotes')||{}).value||'',
    engineerName: AUTH.firstName + ' ' + AUTH.lastName,
    engineerId  : AUTH.username,
    projectDate : new Date().toISOString().split('T')[0]
  };

  const selectedEq = [...S.selectedEq];
  const quantities = {...S.quantities};

  // entityAlarms — deep-clone safely regardless of internal shape
  const entityAlarms = {};
  try {
    Object.entries(S.entityAlarms).forEach(([k, entity]) => {
      if(!entity || typeof entity !== 'object') return;
      const groups = Array.isArray(entity.alarmGroups) ? entity.alarmGroups : [];
      entityAlarms[k] = {
        eqName     : entity.eqName  || '',
        eqCat      : entity.eqCat   || '',
        idx        : entity.idx     ?? 0,
        total      : entity.total   ?? 1,
        alarmGroups: groups.map(g => {
          const alarms = Array.isArray(g.alarms) ? g.alarms : [];
          return {
            alarmType : g.alarmType || '',
            category  : g.category  || '',
            alarms    : alarms.map(a => ({
              name    : a.name     || '',
              desc    : a.desc     || '',
              value   : a.value    || '',
              priority: a.priority ?? null,
              deleted : !!a.deleted
            }))
          };
        })
      };
    });
  } catch(e){ console.error('entityAlarms serialize error:', e); }

  // commonAlarms — each item may itself be an object or array; just JSON-clone safely
  let commonAlarms = [];
  try {
    const raw = S.commonAlarms;
    if(Array.isArray(raw)){
      commonAlarms = JSON.parse(JSON.stringify(raw));
    }
  } catch(e){ console.error('commonAlarms serialize error:', e); }

  // customEquipment
  let customEquipment = [];
  try {
    const raw = S.customEquipment;
    if(Array.isArray(raw)){
      customEquipment = JSON.parse(JSON.stringify(raw));
    }
  } catch(e){ console.error('customEquipment serialize error:', e); }

  let customProjectAlarms = [];
  try {
    const raw = S.customProjectAlarms;
    if(Array.isArray(raw)) customProjectAlarms = JSON.parse(JSON.stringify(raw));
  } catch(e){}

  // Save configure state
  const configureSnap = typeof getConfigureSnapshot === 'function' ? getConfigureSnapshot() : {};

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    savedBy: AUTH.username,
    status: S.projectStatus || 'draft',
    configureState: configureSnap,
    info,
    selectedEq,
    quantities,
    entityAlarms,
    commonAlarms,
    customEquipment,
    customProjectAlarms
  };
}

async function saveProjectToGitHub(){
  const ref = (document.getElementById('projectRef')||{}).value||'';
  if(!ref){ toast('Enter a Project Reference first (Step 1).','err'); return; }

  const btn = document.getElementById('saveProjectBtn');
  const origText = btn ? btn.innerHTML : '';
  if(btn){ btn.innerHTML='⏳ Saving…'; btn.disabled=true; }

  try {
    let snapshot;
    try {
      snapshot = buildProjectSnapshot();
    } catch(snapErr){
      throw new Error('Failed to build snapshot: ' + snapErr.message);
    }

    const pathObj = getProjectPath(AUTH.firstName, AUTH.lastName, ref);
    const userName = AUTH.firstName + ' ' + AUTH.lastName;

    // Get next version number
    const versionNum = await getNextVersionNumber(userName, ref);
    snapshot.versionNum = versionNum;

    const jsonStr = JSON.stringify(snapshot, null, 2);

    // Check if file already exists (need sha for update)
    let sha = undefined;
    try {
      const existing = await githubRequest('GET', pathObj.apiPath);
      sha = existing.sha;
    } catch(e){ /* new project — no sha needed */ }

    // Save latest project.json
    await githubRequest('PUT', pathObj.apiPath, {
      message: `Save project v${versionNum}: ${ref} by ${AUTH.username}`,
      rawContent: jsonStr,
      ...(sha ? { sha } : {})
    });

    // Save version snapshot
    await saveVersion(userName, ref, snapshot, versionNum);

    toast(`Project "${ref}" saved to GitHub ✓`);
    await logActivity('project_save', `Saved project "${ref}" (${snapshot.info?.projectName||''}) v${versionNum} — status: ${S.projectStatus||'draft'}`);
    notifyAdminProjectSaved(ref, S.projectStatus||'draft');
  } catch(e){
    toast('Save failed: ' + e.message,'err');
  } finally {
    if(btn){ btn.innerHTML=origText; btn.disabled=false; }
  }
}

async function goDashboard(){
  goPage('dashboard');
  await loadDashboard();
}

async function loadDashboard(){
  const content = document.getElementById('dashContent');
  const subtitle = document.getElementById('dashSubtitle');
  content.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:20px 0">Loading projects…</div>';

  if(VERCEL_API.includes('YOUR_APP')){
    content.innerHTML = `<div class="dash-empty"><div class="dash-empty-icon">🔑</div><div style="font-size:14px;font-weight:600">Vercel API not configured</div><div style="font-size:12px">Update <code style="font-family:'DM Mono',monospace">VERCEL_API</code> in the HTML with your deployed Vercel URL</div></div>`;
    subtitle.textContent = '';
    return;
  }

  try {
    const isAdmin = AUTH.role === 'admin';
    let userFolders = [];

    try {
      const data = await githubRequest('GET', 'Projects');
      userFolders = Array.isArray(data) ? data.filter(f=>f.type==='dir') : [];
      if(!isAdmin){
        const myFolder = AUTH.firstName + ' ' + AUTH.lastName;
        userFolders = userFolders.filter(f=>f.name === myFolder);
      }
    } catch(e){
      if(e.message && (e.message.includes('404') || e.message.includes('500') || e.message.includes('Not Found'))){
        userFolders = [];
      }
    }

    if(!userFolders.length){
      content.innerHTML = `<div class="dash-empty"><div class="dash-empty-icon">📂</div><div style="font-size:14px;font-weight:600">No projects yet</div><div style="font-size:12px">Complete the wizard and click <strong>Save Project to GitHub</strong> on the Export page</div></div>`;
      subtitle.textContent = 'No projects found';
      return;
    }

    let totalProjects = 0;
    const groups = [];

    for(const userFolder of userFolders){
      let projectFolders = [];
      try {
        const data = await githubRequest('GET', `Projects/${userFolder.name}`);
        projectFolders = Array.isArray(data) ? data.filter(f=>f.type==='dir' && f.name !== 'versions') : [];
      } catch(e){ continue; }

      const projects = [];
      for(const pf of projectFolders){
        try {
          const jData = await githubRequest('GET', `Projects/${userFolder.name}/${pf.name}/project.json`);
          const snap = JSON.parse(atob(jData.content.replace(/\n/g,'')));
          projects.push({ snap, sha: jData.sha, folderName: pf.name, userName: userFolder.name });
        } catch(e){ continue; }
      }
      if(projects.length) groups.push({ userName: userFolder.name, projects });
      totalProjects += projects.length;
    }

    subtitle.textContent = `${totalProjects} project${totalProjects!==1?'s':''} found`;

    if(!groups.length){
      document.getElementById('dashStats').innerHTML = '';
      content.innerHTML = `<div class="dash-empty"><div class="dash-empty-icon">📂</div><div style="font-size:14px;font-weight:600">No projects yet</div><div style="font-size:12px">Complete the wizard and click <strong>Save Project to GitHub</strong> on the Export page</div></div>`;
      return;
    }

    // Compute dashboard stats
    const allProjects = groups.flatMap(g=>g.projects);
    const totalAlarmCount = allProjects.reduce((s,{snap})=>{
      return s + Object.values(snap.entityAlarms||{}).reduce((ss,e)=>ss+(e.alarmGroups||[]).reduce((sss,g)=>sss+g.alarms.filter(a=>!a.deleted).length,0),0);
    },0);
    const statusCounts = {draft:0,inprogress:0,completed:0,delivered:0};
    allProjects.forEach(({snap})=>{ const st=snap.status||'draft'; if(statusCounts[st]!==undefined) statusCounts[st]++; });

    document.getElementById('dashStats').innerHTML = `
      <div class="dash-stat-card"><div class="dash-stat-val">${totalProjects}</div><div class="dash-stat-lbl">Total Projects</div></div>
      <div class="dash-stat-card"><div class="dash-stat-val" style="color:var(--green)">${totalAlarmCount.toLocaleString()}</div><div class="dash-stat-lbl">Total Alarms Configured</div></div>
      <div class="dash-stat-card"><div class="dash-stat-val" style="color:var(--accent)">${statusCounts.inprogress}</div><div class="dash-stat-lbl">In Progress</div></div>
      <div class="dash-stat-card"><div class="dash-stat-val" style="color:var(--purple)">${statusCounts.delivered}</div><div class="dash-stat-lbl">Delivered</div></div>
    `;

    // Store all groups for filtering
    window._dashGroups = groups;
    renderDashCards(groups);

  } catch(e){
    content.innerHTML = `<div class="dash-empty"><div class="dash-empty-icon">⚠️</div><div style="font-size:14px;font-weight:600">Failed to load projects</div><div style="font-size:12px;color:var(--red)">${esc(e.message)}</div></div>`;
    subtitle.textContent = 'Error loading';
  }
}

function filterDashboard(){
  if(!window._dashGroups) return;
  const q = (document.getElementById('dashSearch').value||'').toLowerCase();
  const st = document.getElementById('dashStatusFilter').value;
  const filtered = window._dashGroups.map(group=>({
    ...group,
    projects: group.projects.filter(({snap})=>{
      const info = snap.info||{};
      const matchQ = !q || [info.projectName,info.projectRef,info.clientName,info.projectSite,info.engineerName].some(v=>(v||'').toLowerCase().includes(q));
      const matchSt = !st || (snap.status||'draft')===st;
      return matchQ && matchSt;
    })
  })).filter(g=>g.projects.length);
  renderDashCards(filtered);
}

function renderDashCards(groups){
  const content = document.getElementById('dashContent');
  const isAdmin = AUTH.role === 'admin';
  content.innerHTML = '';

  if(!groups.length){
    content.innerHTML = `<div class="dash-empty"><div class="dash-empty-icon">🔍</div><div style="font-size:14px;font-weight:600">No projects match your search</div></div>`;
    return;
  }

  const statusMap = {draft:{cls:'status-draft',label:'Draft'},inprogress:{cls:'status-inprogress',label:'In Progress'},completed:{cls:'status-completed',label:'Completed'},delivered:{cls:'status-delivered',label:'Delivered'}};

  groups.forEach(group => {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '28px';

    if(isAdmin && groups.length > 1){
      const initials = group.userName.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
      const label = document.createElement('div');
      label.className = 'dash-user-label';
      label.innerHTML = `<div class="dash-user-avatar">${initials}</div><div style="font-size:13px;font-weight:600">${esc(group.userName)}</div><div style="font-size:11px;color:var(--text3);margin-left:4px">${group.projects.length} project${group.projects.length!==1?'s':''}</div>`;
      wrap.appendChild(label);
    }

    const grid = document.createElement('div');
    grid.className = 'proj-grid';

    group.projects.forEach(({snap, folderName, userName}) => {
      const info = snap.info || {};
      const eqCount = (snap.selectedEq||[]).length;
      const savedAt = snap.savedAt ? new Date(snap.savedAt).toLocaleString() : '—';
      const status = snap.status || 'draft';
      const {cls, label} = statusMap[status] || statusMap.draft;

      const card = document.createElement('div');
      card.className = 'proj-card';
      card.dataset.snap = JSON.stringify(snap);
      card.innerHTML = `
        <div class="proj-card-header">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <div class="proj-ref" style="margin-bottom:0">${esc(info.projectRef||folderName)}</div>
              <span class="status-badge ${cls}">${label}</span>
            </div>
            <div class="proj-name">${esc(info.projectName||'Untitled Project')}</div>
            <div class="proj-client">${esc(info.clientName||'—')}</div>
          </div>
        </div>
        <div class="proj-card-body">
          <div class="proj-meta">📍 ${esc(info.projectSite||'—')}</div>
          <div class="proj-meta">👤 ${esc(info.engineerName||userName)}</div>
          <div class="proj-meta">💾 ${esc(savedAt)}</div>
        </div>
        <div class="proj-card-footer">
          <span class="proj-stat">${eqCount} eq. type${eqCount!==1?'s':''}</span>
          <div style="margin-left:auto;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm proj-open-btn">▶ Open</button>
            <button class="btn btn-outline btn-sm proj-hist-btn" title="Version history">🕐</button>
            <button class="btn btn-outline btn-sm proj-dup-btn" title="Duplicate">⧉</button>
            <button class="btn btn-outline btn-sm proj-del-btn" style="color:var(--red);border-color:var(--red)">🗑</button>
          </div>
        </div>`;

      card.querySelector('.proj-open-btn').addEventListener('click', ()=>{ openProject(card.dataset.snap); });
      card.querySelector('.proj-hist-btn').addEventListener('click', (e)=>{ e.stopPropagation(); openVersionHistory(group.userName, folderName); });
      card.querySelector('.proj-dup-btn').addEventListener('click', (e)=>{ e.stopPropagation(); duplicateProject(card.dataset.snap, userName); });
      card.querySelector('.proj-del-btn').addEventListener('click', (e)=>{ e.stopPropagation(); deleteProject(userName, folderName); });
      grid.appendChild(card);
    });

    wrap.appendChild(grid);
    content.appendChild(wrap);
  });
}

function openProject(snapJson){
  try {
    const snap = typeof snapJson === 'string' ? JSON.parse(snapJson) : snapJson;
    const info = snap.info || {};

    // Restore project info fields
    const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||''; };
    set('projectName',  info.projectName);
    set('projectRef',   info.projectRef);
    set('clientName',   info.clientName);
    set('projectSite',  info.projectSite);
    set('projectNotes', info.projectNotes);

    // Restore equipment selections and quantities
    S.selectedEq  = new Set(Array.isArray(snap.selectedEq) ? snap.selectedEq : []);
    S.quantities  = (snap.quantities && typeof snap.quantities==='object') ? snap.quantities : {};

    // Restore entityAlarms — already built with correct structure, do NOT call buildEntityAlarms()
    S.entityAlarms = {};
    if(snap.entityAlarms && typeof snap.entityAlarms==='object'){
      Object.entries(snap.entityAlarms).forEach(([k, entity])=>{
        if(!entity || typeof entity !== 'object') return;
        S.entityAlarms[k] = {
          eqName     : entity.eqName  || '',
          eqCat      : entity.eqCat   || '',
          idx        : entity.idx     ?? 0,
          total      : entity.total   ?? 1,
          alarmGroups: Array.isArray(entity.alarmGroups) ? entity.alarmGroups : []
        };
      });
    }

    S.commonAlarms    = Array.isArray(snap.commonAlarms)    ? snap.commonAlarms    : [];
    S.customEquipment = Array.isArray(snap.customEquipment) ? snap.customEquipment : [];
    S.customProjectAlarms = Array.isArray(snap.customProjectAlarms) ? snap.customProjectAlarms : [];
    S.activeEntity    = null;
    S.projectStatus   = snap.status || 'draft';

    // Restore configure state
    if(typeof restoreConfigureSnapshot === 'function') restoreConfigureSnapshot(snap.configureState);

    // Unlock all steps
    S.unlocked = new Set(['project','equipment','configure','export']);
    updateTabs();

    // Restore configure state and go to configure page
    if(typeof restoreConfigureSnapshot === 'function') restoreConfigureSnapshot(snap.configureState);
    updateStats();

    toast(`Project "${info.projectRef || info.projectName || 'unknown'}" opened ✓`);
    logActivity('project_open', `Opened project "${info.projectRef||''}" (${info.projectName||''}) by ${info.engineerName||''}`);
    goPage('configure');

  } catch(e){
    toast('Failed to open project: ' + e.message, 'err');
    console.error('openProject error:', e);
  }
}

async function deleteProject(userName, folderName){
  if(!confirm(`Delete project "${folderName}" by ${userName}? This cannot be undone.`)) return;
  try {
    const path = `Projects/${userName}/${folderName}/project.json`;
    const fileData = await githubRequest('GET', path);
    await githubRequest('DELETE', path, {
      message: `Delete project: ${folderName}`,
      sha: fileData.sha
    });
    toast(`Project "${folderName}" deleted ✓`);
    await logActivity('project_delete', `Deleted project "${folderName}" (owner: ${userName})`);
    loadDashboard();
  } catch(e){
    toast('Delete failed: ' + e.message, 'err');
  }
}

async function duplicateProject(snapJson, userName){
  try {
    const snap = typeof snapJson === 'string' ? JSON.parse(snapJson) : snapJson;
    const origRef = snap.info?.projectRef || 'Project';
    const newRef = prompt(`Duplicate project — enter a new Project Reference:`, origRef + ' (Copy)');
    if(!newRef || !newRef.trim()) return;

    const newSnap = JSON.parse(JSON.stringify(snap));
    newSnap.info.projectRef = newRef.trim();
    newSnap.info.projectName = (newSnap.info.projectName||'') + ' (Copy)';
    newSnap.savedAt = new Date().toISOString();
    newSnap.savedBy = AUTH.username;
    newSnap.status = 'draft';
    newSnap.version = 1;

    const pathObj = getProjectPath(AUTH.firstName, AUTH.lastName, newRef.trim());
    await githubRequest('PUT', pathObj.apiPath, {
      message: `Duplicate project: ${newRef.trim()} by ${AUTH.username}`,
      rawContent: JSON.stringify(newSnap, null, 2)
    });
    toast(`Project duplicated as "${newRef.trim()}" ✓`);
    loadDashboard();
  } catch(e){
    toast('Duplicate failed: ' + e.message, 'err');
  }
}

// ══════════════════════════════════════════════════
//  PROJECT VERSIONING
// ══════════════════════════════════════════════════
async function getNextVersionNumber(userName, projectRef){
  try {
    const versionsPath = `Projects/${userName}/${projectRef}/versions`;
    const data = await githubRequest('GET', versionsPath);
    if(!Array.isArray(data)) return 1;
    const nums = data
      .filter(f => f.type==='file' && /^v\d+\.json$/.test(f.name))
      .map(f => parseInt(f.name.replace(/[^0-9]/g,'')))
      .filter(n => !isNaN(n));
    return nums.length ? Math.max(...nums) + 1 : 1;
  } catch(e){ return 1; }
}

async function saveVersion(userName, projectRef, snapshot, versionNum){
  const versionPath = `Projects/${userName}/${projectRef}/versions/v${versionNum}.json`;
  const versionSnap = { ...snapshot, versionNum, versionSavedAt: new Date().toISOString() };
  await githubRequest('PUT', versionPath, {
    message: `Save v${versionNum}: ${projectRef} by ${AUTH.username}`,
    rawContent: JSON.stringify(versionSnap, null, 2)
  });
  return versionNum;
}

async function openVersionHistory(userName, projectRef){
  const subtitle = document.getElementById('versionHistorySubtitle');
  const list = document.getElementById('versionHistoryList');
  subtitle.textContent = `${projectRef} — ${userName}`;
  list.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:12px">Loading versions…</div>';
  openOverlay('versionHistoryOverlay');

  try {
    const versionsPath = `Projects/${userName}/${projectRef}/versions`;
    let files = [];
    try {
      const data = await githubRequest('GET', versionsPath);
      files = Array.isArray(data) ? data.filter(f=>f.type==='file' && /^v\d+\.json$/.test(f.name)) : [];
    } catch(e){ /* no versions yet */ }

    // Also get current project.json as "latest"
    let currentSnap = null;
    try {
      const cur = await githubRequest('GET', `Projects/${userName}/${projectRef}/project.json`);
      currentSnap = JSON.parse(atob(cur.content.replace(/\n/g,'')));
    } catch(e){}

    if(!files.length && !currentSnap){
      list.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:12px">No versions saved yet. Save the project to create the first version.</div>';
      return;
    }

    // Sort versions descending
    files.sort((a,b)=>{
      const na = parseInt(a.name.replace(/[^0-9]/g,''));
      const nb = parseInt(b.name.replace(/[^0-9]/g,''));
      return nb - na;
    });

    list.innerHTML = '';

    // Current version row
    if(currentSnap){
      const row = document.createElement('div');
      row.className = 'version-item';
      const vNum = currentSnap.versionNum || '—';
      row.innerHTML = `
        <span class="version-badge version-current">LATEST</span>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600">${esc(currentSnap.info?.projectName||projectRef)}</div>
          <div style="font-size:10px;color:var(--text3)">${currentSnap.savedAt ? new Date(currentSnap.savedAt).toLocaleString() : '—'} · by ${esc(currentSnap.savedBy||userName)}</div>
        </div>
        <span style="font-size:11px;color:var(--text3)">v${vNum}</span>`;
      list.appendChild(row);
    }

    // Version rows
    for(const f of files){
      try {
        const fData = await githubRequest('GET', `Projects/${userName}/${projectRef}/versions/${f.name}`);
        const snap = JSON.parse(atob(fData.content.replace(/\n/g,'')));
        const vNum = snap.versionNum || f.name.replace('.json','');
        const row = document.createElement('div');
        row.className = 'version-item';
        row.innerHTML = `
          <span class="version-badge">v${vNum}</span>
          <div style="flex:1">
            <div style="font-size:12px">${esc(snap.info?.projectName||projectRef)}</div>
            <div style="font-size:10px;color:var(--text3)">${snap.versionSavedAt ? new Date(snap.versionSavedAt).toLocaleString() : '—'} · by ${esc(snap.savedBy||userName)}</div>
          </div>
          <button class="btn btn-outline btn-sm" style="font-size:10px">Restore</button>`;
        row.querySelector('button').addEventListener('click', ()=>{
          if(confirm(`Restore v${vNum}? Your current project will be saved as a new version first.`)){
            restoreVersion(snap, userName, projectRef);
          }
        });
        list.appendChild(row);
      } catch(e){ continue; }
    }

    if(list.children.length === 0){
      list.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:12px">No versions found.</div>';
    }
  } catch(e){
    list.innerHTML = `<div style="padding:16px;color:var(--red);font-size:12px">${esc(e.message)}</div>`;
  }
}

async function restoreVersion(snap, userName, projectRef){
  closeOverlay('versionHistoryOverlay');
  const btn = document.getElementById('saveProjectBtn');
  if(btn){ btn.innerHTML='⏳ Restoring…'; btn.disabled=true; }

  try {
    // Save current state as a new version first
    const currentSnapshot = buildProjectSnapshot();
    const vNum = await getNextVersionNumber(userName, projectRef);
    await saveVersion(userName, projectRef, currentSnapshot, vNum);

    // Write the restored version as the new latest
    const pathObj = getProjectPath(AUTH.firstName, AUTH.lastName, projectRef);
    let sha;
    try { const ex = await githubRequest('GET', pathObj.apiPath); sha = ex.sha; } catch(e){}
    await githubRequest('PUT', pathObj.apiPath, {
      message: `Restore v${snap.versionNum||'?'}: ${projectRef} by ${AUTH.username}`,
      rawContent: JSON.stringify({...snap, savedAt: new Date().toISOString(), savedBy: AUTH.username}, null, 2),
      ...(sha ? { sha } : {})
    });

    // Load the restored version into the wizard
    openProject(snap);
    toast(`Version v${snap.versionNum||'?'} restored ✓`);
    await logActivity('project_restore', `Restored v${snap.versionNum||'?'} of project "${projectRef}"`);
  } catch(e){
    toast('Restore failed: ' + e.message, 'err');
  } finally {
    if(btn){ btn.innerHTML='💾 Save Project to GitHub'; btn.disabled=false; }
  }
}
