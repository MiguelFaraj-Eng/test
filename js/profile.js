//  EMAIL NOTIFICATIONS (mailto)
// ══════════════════════════════════════════════════
function notifyAdminProjectSaved(projectRef, status){
  // Only notify on significant status changes, not every save
  if(!['completed','delivered'].includes(status)) return;
  const adminEmail = (ALL_USERS_CACHE.find(u=>u.role==='admin')||EMBEDDED_USERS.find(u=>u.role==='admin')||{}).email||'miguel.faraj@insightech.com';
  if(AUTH && AUTH.role === 'admin') return; // don't notify yourself
  const statusLabel = {completed:'✅ Completed',delivered:'📦 Delivered'}[status]||status;
  const subject = encodeURIComponent(`[Project Update] ${projectRef} marked as ${statusLabel}`);
  const body = encodeURIComponent(
`Hi Miguel,

${AUTH.firstName} ${AUTH.lastName} has updated project "${projectRef}" to status: ${statusLabel}

👤 Engineer: ${AUTH.firstName} ${AUTH.lastName} (@${AUTH.username})
📅 Date: ${new Date().toLocaleString()}
🔗 App: https://miguelfaraj-eng.github.io/alarms_configurator/

Regards,
Insightech Alarms Configurator`
  );
  window.open(`mailto:${adminEmail}?subject=${subject}&body=${body}`);
}

// ══════════════════════════════════════════════════
//  EDIT PROFILE
// ══════════════════════════════════════════════════
function openEditProfile(){
  if(!AUTH) return;

  // Fill fields
  document.getElementById('ep-firstName').value   = AUTH.firstName  || '';
  document.getElementById('ep-lastName').value    = AUTH.lastName   || '';
  document.getElementById('ep-username').value    = AUTH.username   || '';
  document.getElementById('ep-email').value       = AUTH.email      || '';
  document.getElementById('ep-phone').value       = AUTH.phone      || '';
  document.getElementById('ep-currentPass').value = '';
  document.getElementById('ep-newPass').value     = '';
  document.getElementById('ep-confirmPass').value = '';
  document.getElementById('ep-passMsg').style.display = 'none';

  // Avatar preview — check localStorage first (user-uploaded), then GitHub URL
  const preview = document.getElementById('ep-avatarPreview');
  const displayName = document.getElementById('ep-displayName');
  displayName.textContent = (AUTH.firstName||'') + ' ' + (AUTH.lastName||'');

  const initials = ((AUTH.firstName||'')[0]||'') + ((AUTH.lastName||'')[0]||'');

  if(AUTH.picture){
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = REPO_BASE + 'assets/avatars/' + AUTH.picture;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover';
    img.onerror = function(){
      preview.innerHTML = '';
      preview.textContent = initials;
    };
    preview.appendChild(img);
  } else {
    preview.innerHTML = '';
    preview.textContent = initials;
  }

  openOverlay('editProfileOverlay');
}

function previewAvatar(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 2 * 1024 * 1024){ toast('Image must be under 2MB.', 'err'); return; }
  const reader = new FileReader();
  reader.onload = function(e){
    const base64 = e.target.result;
    const preview = document.getElementById('ep-avatarPreview');
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = base64;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover';
    preview.appendChild(img);
    // Store temporarily on the input element for saving
    document.getElementById('ep-avatarInput').dataset.base64 = base64;
  };
  reader.readAsDataURL(file);
}






function requestMyPasswordReset(){
  if(!AUTH) return;
  const adminEmail = (EMBEDDED_USERS.find(u=>u.role==='admin')||{}).email || 'miguel.faraj@insightech.com';
  const subject = encodeURIComponent(`[Password Reset Request] ${AUTH.username}`);
  const body = encodeURIComponent(
`Hi Miguel,

I would like to reset my password for the Insightech Alarms Configurator.

Username: ${AUTH.username}
Name: ${AUTH.firstName} ${AUTH.lastName}
Email: ${AUTH.email||'(not set)'}

Please update my password and send me the new credentials.

Thank you`
  );
  window.open(`mailto:${adminEmail}?subject=${subject}&body=${body}`);
  toast('Reset request opened in your email client ✓');
}

// ══════════════════════════════════════════════════
//  LOGIN PANEL TOGGLE
// ══════════════════════════════════════════════════
function showForgotPanel(){
  document.getElementById('ls-loginPanel').style.display = 'none';
  document.getElementById('ls-forgotPanel').style.display = 'block';
  document.getElementById('fp-username').value = document.getElementById('ls-user').value || '';
  document.getElementById('fp-email').value = '';
  document.getElementById('fp-msg').style.display = 'none';
  setTimeout(()=>document.getElementById('fp-username').focus(), 50);
}

function showLoginPanel(){
  document.getElementById('ls-forgotPanel').style.display = 'none';
  document.getElementById('ls-loginPanel').style.display = 'block';
}

// ══════════════════════════════════════════════════
//  FORGOT PASSWORD (on login screen)
// ══════════════════════════════════════════════════
function sendForgotPassword(){
  const username = document.getElementById('fp-username').value.trim();
  const email    = document.getElementById('fp-email').value.trim();
  const msgEl    = document.getElementById('fp-msg');

  if(!username){
    msgEl.style.cssText = 'display:block;color:var(--red);background:var(--red-light);border-radius:6px;padding:8px 10px;font-size:11px';
    msgEl.textContent = 'Please enter your username.';
    return;
  }

  const adminEmail = (EMBEDDED_USERS.find(u => u.role === 'admin') || {}).email || 'miguel.faraj@insightech.com';
  const subject = encodeURIComponent(`[Password Reset] ${username} needs access`);
  const body = encodeURIComponent(
`Hi Miguel,

${username} has forgotten their password and is requesting a reset.

${email ? 'Their email: ' + email : 'They did not provide an email.'}

Please update their password in data/users.json and share the new credentials with them.

Thanks`
  );
  window.open(`mailto:${adminEmail}?subject=${subject}&body=${body}`);
  msgEl.style.cssText = 'display:block;color:var(--green);background:var(--green-light);border-radius:6px;padding:8px 10px;font-size:11px';
  msgEl.textContent = 'Reset request opened in your email client ✓ The admin will contact you shortly.';
}

async function saveUsersToGitHub(updatedUsers){
  const jsonStr = JSON.stringify(updatedUsers, null, 2);
  const file = await githubGetFile('data/users.json');
  await githubPutFile('data/users.json', jsonStr, file.sha, `Update profile: ${AUTH.username}`);
}

// ══════════════════════════════════════════════════
//  SAVE PROFILE → GitHub
// ══════════════════════════════════════════════════
async function saveProfile(){
  const btn = document.querySelector('#editProfileOverlay .btn-primary');
  const msgEl = document.getElementById('ep-passMsg');
  msgEl.style.display = 'none';

  const newFirst   = document.getElementById('ep-firstName').value.trim();
  const newLast    = document.getElementById('ep-lastName').value.trim();
  const newEmail   = document.getElementById('ep-email').value.trim();
  const newPhone   = document.getElementById('ep-phone').value.trim();
  const curPass    = document.getElementById('ep-currentPass').value;
  const newPass    = document.getElementById('ep-newPass').value;
  const confPass   = document.getElementById('ep-confirmPass').value;
  const newAvatarB64 = document.getElementById('ep-avatarInput').dataset.base64 || null;

  // Password validation
  let newHash = null;
  if(curPass || newPass || confPass){
    if(!curPass){
      msgEl.textContent = 'Enter your current password to change it.';
      msgEl.style.display = 'block'; return;
    }
    const curHash = await sha256(curPass);
    if(curHash !== AUTH.passwordHash){
      msgEl.textContent = 'Current password is incorrect.';
      msgEl.style.display = 'block'; return;
    }
    if(newPass.length < 8){
      msgEl.textContent = 'New password must be at least 8 characters.';
      msgEl.style.display = 'block'; return;
    }
    if(newPass !== confPass){
      msgEl.textContent = 'New passwords do not match.';
      msgEl.style.display = 'block'; return;
    }
    newHash = await sha256(newPass);
  }

  // Show saving state
  if(btn){ btn.textContent = '⏳ Saving…'; btn.disabled = true; }

  try {
    // Fetch latest users.json from GitHub
    const fileData = await githubGetFile('data/users.json');
    const currentJson = JSON.parse(atob(fileData.content.replace(/\n/g,'')));

    // Update the matching user entry
    const idx = currentJson.findIndex(u => u.username === AUTH.username);
    if(idx === -1) throw new Error('Your user entry was not found in users.json');

    if(newFirst) currentJson[idx].firstName = newFirst;
    if(newLast)  currentJson[idx].lastName  = newLast;
    if(newEmail) currentJson[idx].email     = newEmail;
    if(newPhone !== undefined) currentJson[idx].phone = newPhone;
    if(newHash){
      currentJson[idx].passwordHash = newHash;
      currentJson[idx].password = newPass;
    }

    // Upload avatar if provided
    if(newAvatarB64){
      const avatarFilename = AUTH.username.replace(/\s+/g,'_').toLowerCase() + '.jpg';
      const pureB64 = newAvatarB64.split(',')[1]; // raw base64 image data
      let avatarSha = undefined;
      try {
        const existing = await githubRequest('GET', `assets/avatars/${avatarFilename}`);
        avatarSha = existing.sha;
      } catch(e){ /* new file */ }

      const avatarRes = await githubRequest('PUT', `assets/avatars/${avatarFilename}`, {
        message: `Upload avatar for ${AUTH.username}`,
        content: pureB64, // images stay as base64 — only JSON uses rawContent
        ...(avatarSha ? { sha: avatarSha } : {})
      });
      if(avatarRes) currentJson[idx].picture = avatarFilename;
    }

    // Write updated users.json back using rawContent (Vercel encodes server-side)
    await githubPutFile('data/users.json', JSON.stringify(currentJson, null, 2), fileData.sha, `Update profile: ${AUTH.username}`);

    // Update AUTH session to reflect changes
    const updated = currentJson[idx];
    AUTH.firstName    = updated.firstName;
    AUTH.lastName     = updated.lastName;
    AUTH.email        = updated.email;
    AUTH.phone        = updated.phone;
    if(newHash) AUTH.passwordHash = newHash;
    if(updated.picture) AUTH.picture = updated.picture;
    sessionStorage.setItem('ic_auth', JSON.stringify(AUTH));

    // Also update EMBEDDED_USERS cache so re-login works immediately
    const embIdx = EMBEDDED_USERS.findIndex(u => u.username === AUTH.username);
    if(embIdx !== -1) Object.assign(EMBEDDED_USERS[embIdx], currentJson[idx]);

    renderHeaderAvatar();
    populateEngineerBanner();
    closeOverlay('editProfileOverlay');
    toast('Profile saved to GitHub ✓');

  } catch(err){
    msgEl.textContent = '❌ ' + err.message;
    msgEl.style.cssText = 'display:block;color:var(--red);background:var(--red-light);border-radius:6px;padding:8px 10px;font-size:11px';
  } finally {
    if(btn){ btn.textContent = '💾 Save Changes'; btn.disabled = false; }
  }
}

// ══════════════════════════════════════════════════
