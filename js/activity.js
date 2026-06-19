//  ACTIVITY LOG
// ══════════════════════════════════════════════════
async function logActivity(type, message){
  if(!AUTH) return;
  try {
    const logPath = 'data/activity.json';
    let entries = [];
    let sha = undefined;
    try {
      const file = await githubGetFile(logPath);
      sha = file.sha;
      entries = JSON.parse(atob(file.content.replace(/\n/g,'')));
    } catch(e){ /* first entry */ }

    entries.unshift({
      timestamp: new Date().toISOString(),
      user: AUTH.username,
      name: AUTH.firstName + ' ' + AUTH.lastName,
      role: AUTH.role,
      type,
      message
    });

    // Keep last 500 entries
    if(entries.length > 500) entries = entries.slice(0, 500);

    await githubPutFile(logPath, JSON.stringify(entries, null, 2), sha, `Activity: ${type} by ${AUTH.username}`);
  } catch(e){
    console.warn('Activity log failed:', e.message);
  }
}

async function loadActivityLog(){
  const container = document.getElementById('activityLogContent');
  if(!container) return;
  container.innerHTML = '<div style="font-size:12px;color:var(--text3)">Loading…</div>';

  try {
    const file = await githubGetFile('data/activity.json');
    const entries = JSON.parse(atob(file.content.replace(/\n/g,'')));

    if(!entries.length){
      container.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:12px 0">No activity recorded yet.</div>';
      return;
    }

    const typeIcon = {
      login:'🔐', logout:'🚪', project_save:'💾', project_delete:'🗑',
      project_open:'📂', password_reset:'🔑', status_change:'🏷',
      profile_update:'✏️', export:'📤'
    };

    container.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:var(--surface2)">
            <th style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);padding:9px 14px;text-align:left;border-bottom:1.5px solid var(--border)">Time</th>
            <th style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);padding:9px 14px;text-align:left;border-bottom:1.5px solid var(--border)">User</th>
            <th style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);padding:9px 14px;text-align:left;border-bottom:1.5px solid var(--border)">Activity</th>
          </tr></thead>
          <tbody>
            ${entries.slice(0,100).map(e=>`<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:8px 14px;font-size:11px;color:var(--text3);white-space:nowrap;font-family:'DM Mono',monospace">${new Date(e.timestamp).toLocaleString()}</td>
              <td style="padding:8px 14px;font-size:12px;white-space:nowrap">
                <div style="font-weight:500">${esc(e.name||e.user)}</div>
                <div style="font-size:10px;color:var(--text3)">${esc(e.role||'')}</div>
              </td>
              <td style="padding:8px 14px;font-size:12px">
                <span style="margin-right:6px">${typeIcon[e.type]||'📌'}</span>${esc(e.message||e.type)}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
        ${entries.length>100?`<div style="padding:10px 14px;font-size:11px;color:var(--text3);background:var(--surface2)">Showing latest 100 of ${entries.length} entries. Full log in <code>data/activity.json</code></div>`:''}
      </div>`;
  } catch(e){
    if(e.message.includes('404') || e.message.includes('500')){
      container.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:12px 0">No activity recorded yet.</div>';
    } else {
      container.innerHTML = `<div style="font-size:12px;color:var(--red)">${esc(e.message)}</div>`;
    }
  }
}

// ══════════════════════════════════════════════════
