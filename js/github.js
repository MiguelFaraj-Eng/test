//  GITHUB CONFIG — update this one line after you
//  create the repo: YOUR_USERNAME/YOUR_REPO
// ══════════════════════════════════════════════════
const REPO_BASE = "https://raw.githubusercontent.com/miguelfaraj-eng/alarms_configurator/main/";

// ── GitHub proxy config ─────────────────────────────────────────────────────
// The PAT lives in Vercel environment variables — never in this file.
// Update VERCEL_API after you deploy the vercel-api project.
const VERCEL_API = "https://alarms-configurator.vercel.app/api/github";
const GITHUB_REPO   = "miguelfaraj-eng/alarms_configurator"; // kept for reference only
const GITHUB_BRANCH = "main";

function getGithubPAT(){ return null; } // PAT is on Vercel, not here

// ── Proxy helper — replaces all direct GitHub fetch calls ──────────────────
async function githubRequest(method, path, body){
  const res = await fetch(VERCEL_API, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ method, path, body })
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
  if(!res.ok){
    const msg = data.message || data.error || data.raw || res.statusText || 'unknown';
    throw new Error(`GitHub ${method} failed: ${res.status} — ${msg}`);
  }
  return data;
}

async function githubGetFile(path){
  return await githubRequest('GET', path);
}

async function githubPutFile(path, rawContent, sha, message){
  return await githubRequest('PUT', path, {
    message,
    rawContent,
    ...(sha ? { sha } : {})
  });
}

// ══════════════════════════════════════════════════
