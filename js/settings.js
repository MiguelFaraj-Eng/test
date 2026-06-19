// ══════════════════════════════════════════════════
//  SETTINGS PAGE
// ══════════════════════════════════════════════════

function trySettings(){
  if(!AUTH) return;
  if(AUTH.role !== 'admin'){ toast('Settings access is restricted to Admins.', 'err'); return; }
  goPage('settings');
  renderSettingsTable();
}

function tryUsers(){
  if(!AUTH || AUTH.role !== 'admin'){ toast('User Management is restricted to Admins.', 'err'); return; }
  goPage('users');
  renderUsersPage();
  loadActivityLog();
}

function renderSettingsTable(){
  const q = (document.getElementById('settingsSearch')||{}).value || '';
  const sf = (document.getElementById('settingsSheetFilter')||{}).value || '';

  let all = getAllAlarms();
  document.getElementById('settingsTotalCount').textContent = all.length.toLocaleString();

  if(sf) all = all.filter(a => a.sheet === sf);
  if(q) all = all.filter(a =>
    (a.alarmName||'').toLowerCase().includes(q.toLowerCase()) ||
    (a.description||'').toLowerCase().includes(q.toLowerCase()) ||
    (a.tag||'').toLowerCase().includes(q.toLowerCase())
  );

  const {field, dir} = S.settingsSort;
  all.sort((a,b)=>{ const av=a[field]??'', bv=b[field]??''; return av<bv?-dir:av>bv?dir:0; });

  const total = all.length;
  const pages = Math.ceil(total / S.settingsPageSize);
  const start = (S.settingsPage - 1) * S.settingsPageSize;
  const page = all.slice(start, start + S.settingsPageSize);

  // Update sheet filter options
  const sf_el = document.getElementById('settingsSheetFilter');
  if(sf_el && sf_el.options.length <= 1){
    const sheets = [...new Set(getAllAlarms().map(a=>a.sheet))].sort();
    sf_el.innerHTML = '<option value="">All Sheets</option>' + sheets.map(s=>`<option>${esc(s)}</option>`).join('');
  }

  const tbody = document.getElementById('settingsBody');
  if(!tbody) return;

  tbody.innerHTML = page.map(a => {
    const bc = badgeClass(a.mainCategory||'');
    const sevColor = {Critical:'var(--red)',Fault:'var(--orange)',Warning:'var(--yellow)',Information:'var(--accent)',Cricital:'var(--red)'}[a.severity||''] || 'var(--text3)';
    return `<tr>
      <td class="tag">${esc(a.alarmName||a.tag||'')}</td>
      <td class="desc" style="max-width:300px">${esc(a.description||'')}</td>
      <td style="font-size:11px;color:var(--text3)">${esc(a.sheet||'')}</td>
      <td><span class="badge ${bc}">${esc((a.mainCategory||'').replace(' Failures',''))}</span></td>
      <td style="font-size:10px;color:var(--text3)">${esc(a.subCategory||'')}</td>
      <td><span style="font-size:10px;font-weight:700;color:${sevColor}">${esc(a.severity||'')}</span></td>
    </tr>`;
  }).join('');

  // Pager
  const pager = document.getElementById('settingsPager');
  if(!pager) return;
  if(pages <= 1){ pager.innerHTML = ''; return; }
  let h = `<button style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;font-size:11px" onclick="pgSettings(${S.settingsPage-1})" ${S.settingsPage===1?'disabled':''}>‹</button>`;
  for(let p=1; p<=pages; p++){
    if(p===1||p===pages||(p>=S.settingsPage-2&&p<=S.settingsPage+2))
      h+=`<button style="padding:4px 10px;border-radius:6px;border:1px solid ${p===S.settingsPage?'var(--accent)':'var(--border)'};background:${p===S.settingsPage?'var(--accent-light)':'var(--surface2)'};cursor:pointer;font-size:11px" onclick="pgSettings(${p})">${p}</button>`;
    else if(p===S.settingsPage-3||p===S.settingsPage+3) h+=`<span style="font-size:11px;color:var(--text3)">…</span>`;
  }
  h+=`<button style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;font-size:11px" onclick="pgSettings(${S.settingsPage+1})" ${S.settingsPage===pages?'disabled':''}>›</button>`;
  h+=`<span style="font-size:11px;color:var(--text3)">${start+1}–${Math.min(start+S.settingsPageSize,total)} of ${total.toLocaleString()}</span>`;
  pager.innerHTML = h;
}

function pgSettings(p){
  const pages = Math.ceil(getAllAlarms().length / S.settingsPageSize);
  S.settingsPage = Math.max(1, Math.min(p, pages));
  renderSettingsTable();
}

function sortSettings(f){
  S.settingsSort.field === f ? S.settingsSort.dir *= -1 : (S.settingsSort.field=f, S.settingsSort.dir=1);
  renderSettingsTable();
}
