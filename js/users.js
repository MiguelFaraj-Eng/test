//  USER MANAGEMENT PAGE
// ══════════════════════════════════════════════════
let ALL_USERS_CACHE = [];

async function renderUsersPage(){
  const tbody = document.getElementById('userTableBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">Loading users…</td></tr>';
  try {
    const res = await fetch(REPO_BASE + 'data/users.json?' + Date.now());
    if(res.ok) ALL_USERS_CACHE = await res.json();
    else throw new Error('not found');
  } catch(e) {
    ALL_USERS_CACHE = EMBEDDED_USERS || [];
  }
  renderUsersTable(ALL_USERS_CACHE);
}

function filterUsersTable(){
  const q = (document.getElementById('umSearch').value||'').toLowerCase();
  const filtered = ALL_USERS_CACHE.filter(u =>
    (u.firstName||'').toLowerCase().includes(q) ||
    (u.lastName||'').toLowerCase().includes(q) ||
    (u.username||'').toLowerCase().includes(q) ||
    (u.email||'').toLowerCase().includes(q)
  );
  renderUsersTable(filtered);
}

function renderUsersTable(users){
  const tbody = document.getElementById('userTableBody');
  if(!tbody) return;
  if(!users.length){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">No users found.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  users.forEach(u => {
    const initials = ((u.firstName||'')[0]||'') + ((u.lastName||'')[0]||'');
    const imgSrc = u.picture ? (REPO_BASE + 'assets/avatars/' + u.picture) : '';
    const isSelf = AUTH && AUTH.username === u.username;
    const roleCls = u.role === 'admin' ? 'role-admin' : 'role-engineer';

    const tr = document.createElement('tr');

    // Avatar + Name cell
    const tdUser = document.createElement('td');
    tdUser.style.cssText = 'white-space:nowrap';
    const nameWrap = document.createElement('div');
    nameWrap.style.cssText = 'display:flex;align-items:center;gap:8px';

    const avWrap = document.createElement('div');
    if(imgSrc){
      const img = document.createElement('img');
      img.className = 'u-avatar-sm';
      img.src = imgSrc;
      img.alt = u.firstName||'';
      img.onerror = function(){
        const ph = document.createElement('div');
        ph.className = 'u-avatar-sm-ph';
        ph.textContent = initials;
        avWrap.replaceChild(ph, img);
      };
      avWrap.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'u-avatar-sm-ph';
      ph.textContent = initials;
      avWrap.appendChild(ph);
    }
    nameWrap.appendChild(avWrap);

    const nameText = document.createElement('div');
    nameText.innerHTML = `<div style="font-weight:500">${esc(u.firstName)} ${esc(u.lastName)}${isSelf?' <span style="font-size:9px;color:var(--accent)">(you)</span>':''}</div><div style="font-size:10px;color:var(--text3);font-family:\'DM Mono\',monospace">@${esc(u.username)}</div>`;
    nameWrap.appendChild(nameText);
    tdUser.appendChild(nameWrap);
    tr.appendChild(tdUser);

    // Role
    const tdRole = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'role-badge ' + roleCls;
    badge.textContent = u.role||'';
    tdRole.appendChild(badge);
    tr.appendChild(tdRole);

    // Email
    const tdEmail = document.createElement('td');
    tdEmail.style.cssText = 'font-size:11px;color:var(--text2)';
    tdEmail.textContent = u.email || '—';
    tr.appendChild(tdEmail);

    // Phone
    const tdPhone = document.createElement('td');
    tdPhone.style.cssText = 'font-size:11px;color:var(--text2)';
    tdPhone.textContent = u.phone || '—';
    tr.appendChild(tdPhone);

    // Actions
    const tdActions = document.createElement('td');
    const btnWrap = document.createElement('div');
    btnWrap.className = 'action-btns';

    if(u.email && u.password){
      const btnEmail = document.createElement('button');
      btnEmail.className = 'btn-icon email';
      btnEmail.title = 'Email credentials';
      btnEmail.textContent = '📧';
      btnEmail.onclick = () => sendCredentialsEmail(u);
      btnWrap.appendChild(btnEmail);
    }

    if(u.phone && u.password){
      const btnWA = document.createElement('button');
      btnWA.className = 'btn-icon whatsapp';
      btnWA.title = 'Send via WhatsApp';
      btnWA.textContent = '💬';
      btnWA.onclick = () => sendCredentialsWhatsApp(u);
      btnWrap.appendChild(btnWA);
    }

    // Admin reset password button
    if(AUTH && AUTH.username !== u.username){
      const btnReset = document.createElement('button');
      btnReset.className = 'btn-icon forgot';
      btnReset.title = 'Reset password';
      btnReset.textContent = '🔑';
      btnReset.onclick = () => openResetPassword(u);
      btnWrap.appendChild(btnReset);
    }

    tdActions.appendChild(btnWrap);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

function sendCredentialsEmail(u){
  const subject = encodeURIComponent('Insightech Alarms Configurator — Your Login Credentials');
  const body = encodeURIComponent(
`Dear ${u.firstName},

Your access credentials for the Insightech Alarms Configurator have been set up.

🔗 App URL: https://miguelfaraj-eng.github.io/alarms_configurator/
👤 Username: ${u.username}
🔑 Password: ${u.password}

Please log in and change your password from Edit Profile after your first login.

Best regards,
Miguel Faraj
Insightech`
  );
  window.open(`mailto:${u.email}?subject=${subject}&body=${body}`);
}

function sendCredentialsWhatsApp(u){
  const phone = (u.phone||'').replace(/[^0-9]/g,'');
  const msg = encodeURIComponent(
`Hi ${u.firstName}! 👋

Here are your login credentials for the *Insightech Alarms Configurator*:

🔗 App: https://miguelfaraj-eng.github.io/alarms_configurator/
👤 Username: *${u.username}*
🔑 Password: *${u.password}*

Please change your password after first login.`
  );
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

function sendAdminResetEmail(u){
  const adminEmail = (ALL_USERS_CACHE.find(x=>x.role==='admin')||{}).email || 'miguel.faraj@insightech.com';
  const subject = encodeURIComponent(`Password Reset Request — ${u.username}`);
  const body = encodeURIComponent(
`Hi Miguel,

${u.firstName} ${u.lastName} (${u.email}) has requested a password reset for their account.

Username: ${u.username}

Please update their password in data/users.json and share the new credentials.

Regards,
Insightech Configurator`
  );
  window.open(`mailto:${adminEmail}?subject=${subject}&body=${body}`);
  toast(`Reset request email opened for ${u.firstName} ✓`);
}

function sendAllCredentials(){
  const engineers = ALL_USERS_CACHE.filter(u => u.role !== 'admin' && u.email && u.password);
  if(!engineers.length){ toast('No engineers with email found.','err'); return; }
  const to = engineers.map(u=>u.email).join(',');
  const subject = encodeURIComponent('Insightech Alarms Configurator — Your Login Credentials');
  const body = encodeURIComponent(
`Dear Team,

Your individual login credentials for the Insightech Alarms Configurator have been set up.

🔗 App URL: https://miguelfaraj-eng.github.io/alarms_configurator/

Each person will receive their username and password separately. If you haven't received yours, please contact Miguel Faraj.

Please change your password after your first login via Edit Profile.

Best regards,
Miguel Faraj
Insightech`
  );
  window.open(`mailto:${to}?subject=${subject}&body=${body}`);
}

// ══════════════════════════════════════════════════
//  ADMIN PASSWORD RESET
// ══════════════════════════════════════════════════
let _resetTarget = null;

function openResetPassword(u){
  _resetTarget = u;
  document.getElementById('resetPwdSubtitle').textContent = `Reset password for ${u.firstName} ${u.lastName} (@${u.username})`;
  document.getElementById('resetPwdInput').value = '';
  document.getElementById('resetPwdNotify').checked = true;
  document.getElementById('resetPwdWhatsapp').checked = false;
  document.getElementById('resetPwdMsg').style.display = 'none';
  generateResetPassword();
  openOverlay('resetPasswordOverlay');
}

function generateResetPassword(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pwd = '';
  while(true){
    pwd = Array.from({length:10}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
    if(/[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%]/.test(pwd)) break;
  }
  document.getElementById('resetPwdInput').value = pwd;
}

async function saveResetPassword(){
  const u = _resetTarget;
  if(!u) return;
  const newPass = document.getElementById('resetPwdInput').value.trim();
  const msgEl = document.getElementById('resetPwdMsg');
  msgEl.style.display = 'none';

  if(newPass.length < 8){
    msgEl.style.cssText = 'display:block;color:var(--red);background:var(--red-light);border-radius:6px;padding:8px 10px;font-size:11px';
    msgEl.textContent = 'Password must be at least 8 characters.';
    return;
  }

  const btn = document.querySelector('#resetPasswordOverlay .btn-primary');
  if(btn){ btn.textContent = '⏳ Saving…'; btn.disabled = true; }

  try {
    // Hash the new password
    const newHash = await sha256(newPass);

    // Fetch latest users.json
    const fileData = await githubGetFile('data/users.json');
    const users = JSON.parse(atob(fileData.content.replace(/\n/g,'')));
    const idx = users.findIndex(x => x.username === u.username);
    if(idx === -1) throw new Error('User not found in users.json');

    users[idx].passwordHash = newHash;
    users[idx].password = newPass;

    // Save back
    await githubPutFile('data/users.json', JSON.stringify(users, null, 2), fileData.sha, `Reset password for ${u.username}`);

    // Update cache
    ALL_USERS_CACHE = users;
    const embIdx = EMBEDDED_USERS.findIndex(x => x.username === u.username);
    if(embIdx !== -1){ EMBEDDED_USERS[embIdx].passwordHash = newHash; EMBEDDED_USERS[embIdx].password = newPass; }

    // Log activity
    await logActivity('password_reset', `Admin reset password for ${u.firstName} ${u.lastName} (@${u.username})`);

    // Send notifications
    const updatedUser = {...u, password: newPass};
    if(document.getElementById('resetPwdNotify').checked && u.email){
      sendCredentialsEmail(updatedUser);
    }
    if(document.getElementById('resetPwdWhatsapp').checked && u.phone){
      sendCredentialsWhatsApp(updatedUser);
    }

    closeOverlay('resetPasswordOverlay');
    toast(`Password reset for ${u.firstName} ✓`);
    renderUsersPage();

  } catch(e){
    msgEl.style.cssText = 'display:block;color:var(--red);background:var(--red-light);border-radius:6px;padding:8px 10px;font-size:11px';
    msgEl.textContent = '❌ ' + e.message;
  } finally {
    if(btn){ btn.textContent = '💾 Save & Notify'; btn.disabled = false; }
  }
}

// ══════════════════════════════════════════════════
