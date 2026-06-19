//  AUTH — session stored in sessionStorage
// ══════════════════════════════════════════════════
let AUTH = null; // { username, role, firstName, lastName, picture }

async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function doAppLogin(){
  const u = document.getElementById('ls-user').value.trim();
  const p = document.getElementById('ls-pass').value;
  const btn = document.getElementById('ls-btn');
  const err = document.getElementById('ls-err');
  if(!u || !p){ err.style.display='block'; err.textContent='Please enter your username and password.'; return; }
  btn.textContent = 'Signing in…'; btn.disabled = true; err.style.display='none';
  try {
    // Fetch users.json from GitHub (or use embedded fallback)
    let users = [];
    try {
      const res = await fetch(REPO_BASE + 'data/users.json');
      if(res.ok) users = await res.json();
      else throw new Error('fetch failed');
    } catch(e) {
      // Fallback: use embedded users (for local dev / before GitHub setup)
      users = EMBEDDED_USERS || [];
    }
    const hash = await sha256(p);
    const match = users.find(usr => usr.username.toLowerCase() === u.toLowerCase() && usr.passwordHash === hash);
    if(match){
      AUTH = { 
        username: match.username, role: match.role, 
        firstName: match.firstName, lastName: match.lastName, 
        picture: match.picture||'', email: match.email||'', 
        phone: match.phone||'', password: match.password||'',
        passwordHash: match.passwordHash
      };
      sessionStorage.setItem('ic_auth', JSON.stringify(AUTH));
      document.getElementById('loginScreen').style.display = 'none';
      onLoginSuccess();
    } else {
      err.style.display='block'; err.textContent='Invalid username or password.';
    }
  } catch(e) {
    err.style.display='block'; err.textContent='Could not reach authentication server. Check your connection.';
  }
  btn.textContent = 'Sign In'; btn.disabled = false;
}

function doAppLogout(){
  if(AUTH) logActivity('logout', AUTH.firstName + ' ' + AUTH.lastName + ' logged out');
  sessionStorage.removeItem('ic_auth');
  AUTH = null;
  // Reset app state
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('ls-user').value='';
  document.getElementById('ls-pass').value='';
  document.getElementById('ls-err').style.display='none';
  closeUserMenu();
}

function populateEngineerBanner(){
  if(!AUTH) return;
  // Fill hidden inputs for export
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('engineerName').value = AUTH.firstName + ' ' + AUTH.lastName;
  document.getElementById('engineerId').value = AUTH.username;
  document.getElementById('projectDate').value = today;

  // Banner display
  document.getElementById('projEngineerName').textContent = AUTH.firstName + ' ' + AUTH.lastName;
  document.getElementById('projEngineerRole').textContent = AUTH.role;
  document.getElementById('projDateDisplay').textContent = today;

  // Mini avatar in banner
  const wrap = document.getElementById('projAvatarWrap');
  const initials = ((AUTH.firstName||'')[0]||'') + ((AUTH.lastName||'')[0]||'');
  const imgSrc = AUTH.picture ? (REPO_BASE + 'assets/avatars/' + AUTH.picture) : '';
  if(imgSrc){
    const img = document.createElement('img');
    img.style.cssText = 'width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--border)';
    img.src = imgSrc;
    img.alt = AUTH.firstName || '';
    img.onerror = function(){
      const ph = document.createElement('div');
      ph.style.cssText = 'width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff';
      ph.textContent = initials;
      wrap.replaceChild(ph, img);
    };
    wrap.innerHTML = ''; wrap.appendChild(img);
  } else {
    wrap.innerHTML = '';
    const ph = document.createElement('div');
    ph.style.cssText = 'width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff';
    ph.textContent = initials;
    wrap.appendChild(ph);
  }
}

function onLoginSuccess(){
  // Populate engineer info on project page
  populateEngineerBanner();
  document.getElementById('userMenuWrap').style.display = 'flex';
  renderHeaderAvatar();

  // Show/hide tabs and menu items based on role
  const isAdmin = AUTH.role === 'admin';
  document.getElementById('tab-users').style.display = isAdmin ? 'flex' : 'none';
  document.getElementById('ddUsersItem').style.display = isAdmin ? 'flex' : 'none';

  // Auto-load alarm DB from GitHub on login
  loadAlarmDBFromGitHub();

  // Go to dashboard on login
  setTimeout(()=>{ goDashboard(); logActivity('login', `${AUTH.firstName} ${AUTH.lastName} logged in`); }, 100);
}

function renderHeaderAvatar(){
  const wrap = document.getElementById('headerAvatar');
  const ddWrap = document.getElementById('ddAvatar');
  const initials = ((AUTH.firstName||'')[0]||'') + ((AUTH.lastName||'')[0]||'');

  const imgSrc = AUTH.picture ? (REPO_BASE + 'assets/avatars/' + AUTH.picture) : '';

  function makeAvatar(cls, phCls, src, init, fallbackEl){
    if(src){
      const img = document.createElement('img');
      img.className = cls;
      img.src = src;
      img.alt = AUTH.firstName || '';
      img.onerror = function(){ 
        const ph = document.createElement('div');
        ph.className = phCls;
        ph.textContent = init;
        this.parentElement.replaceChild(ph, this);
      };
      fallbackEl.innerHTML = '';
      fallbackEl.appendChild(img);
    } else {
      fallbackEl.innerHTML = '';
      const ph = document.createElement('div');
      ph.className = phCls;
      ph.textContent = init;
      fallbackEl.appendChild(ph);
    }
  }

  makeAvatar('user-avatar', 'user-avatar-placeholder', imgSrc, initials, wrap);
  makeAvatar('user-dd-avatar', 'user-dd-avatar-ph', imgSrc, initials, ddWrap);
  document.getElementById('ddName').textContent = AUTH.firstName + ' ' + AUTH.lastName;
  document.getElementById('ddRole').textContent = AUTH.role;
}

function toggleUserMenu(){ document.getElementById('userDropdown').classList.toggle('open'); }
function closeUserMenu(){ document.getElementById('userDropdown').classList.remove('open'); }
document.addEventListener('click', e => {
  const wrap = document.getElementById('userMenuWrap');
  if(wrap && !wrap.contains(e.target)) closeUserMenu();
});


    if(!fileNames.length) throw new Error('No files could be loaded from data/Alarms/');

    // 3. Store merged database
    S.importedSheets = merged;
    S.importedFile = fileNames.join(', ');
    rebuildTemplates(S.importedSheets);

    const total = Object.values(merged).reduce((a,b) => a+b.length, 0);

    const el = document.getElementById('importStatusLine');
    if(el) el.textContent = `✓ ${fileNames.length} file${fileNames.length>1?'s':''} from data/Alarms/ — ${total.toLocaleString()} alarms loaded`;

    const sf = document.getElementById('settingsSheetFilter');
    if(sf) sf.innerHTML = '<option value="">All Sheets</option>' + Object.keys(merged).map(n=>`<option>${esc(n)}</option>`).join('');

    updateStats();
    renderSettingsTable();
    toast(`Alarm database ready — ${total.toLocaleString()} alarms from ${fileNames.length} file${fileNames.length>1?'s':''} ✓`, 'info');
    console.log('data/Alarms/ loaded:', fileNames, '| total alarms:', total);

  } catch(e) {
    console.warn('Could not load alarm DB from data/Alarms/:', e);
  }
}

// ── Render User Management page ──
// ══════════════════════════════════════════════════
