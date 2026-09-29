
const supabase = window.supabase.createClient(
  window.SABI_CONFIG.SUPABASE_URL,
  window.SABI_CONFIG.SUPABASE_ANON_KEY
);

function $(sel, root=document){ return root.querySelector(sel); }
function $$(sel, root=document){ return [...root.querySelectorAll(sel)]; }

function setActiveNav(){
  const page = location.pathname.split('/').pop() || 'index.html';
  $$('.nav a').forEach(a=>{
    const href=(a.getAttribute('href')||'').split('/').pop();
    if(href===page || (page==='' && href==='index.html')) a.classList.add('active');
  });
}

function initMobile(){
  const btn=$('.mobile-toggle'), side=$('.sidebar');
  if(btn && side) btn.addEventListener('click',()=>side.classList.toggle('open'));
}

function initTheme(){
  const b=$('[data-theme-toggle]');
  if(!b) return;
  b.addEventListener('click',()=>{
    document.body.classList.toggle('light');
    localStorage.setItem('sabi-theme',document.body.classList.contains('light')?'light':'dark');
  });
}

function escapeHtml(v=''){
  return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

async function currentUser(){
  const {data:{user}}=await supabase.auth.getUser();
  return user;
}

async function getAgentProfile(userId){
  const {data,error}=await supabase.from('agents').select('*').eq('user_id',userId).maybeSingle();
  if(error) throw error;
  return data;
}

async function requireAgent(){
  const user=await currentUser();
  if(!user){ location.href='login.html'; return null; }
  const agent=await getAgentProfile(user.id);
  if(!agent || !agent.actif){
    await supabase.auth.signOut();
    location.href='login.html?error=profil';
    return null;
  }
  return {user,agent};
}

async function initLogin(){
  const form=$('#loginForm'), box=$('#loginMessage');
  if(!form) return;
  const params=new URLSearchParams(location.search);
  if(params.get('error')==='profil') box.innerHTML='<div class="notice error">Votre compte est authentifié mais aucun profil agent actif ne lui est associé.</div>';
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=$('#email').value.trim(), password=$('#password').value;
    box.innerHTML='<div class="notice">Vérification des habilitations…</div>';
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error){ box.innerHTML='<div class="notice error">Identifiants incorrects ou compte non autorisé.</div>'; return; }
    const agent=await getAgentProfile(data.user.id);
    if(!agent || !agent.actif){
      await supabase.auth.signOut();
      box.innerHTML='<div class="notice error">Compte valide, mais aucun profil agent SABI actif n’est associé.</div>';
      return;
    }
    location.href='agent-dashboard.html';
  });
}

async function initDashboard(){
  const root=$('#dashboardRoot');
  if(!root) return;
  const ctx=await requireAgent();
  if(!ctx) return;
  const {agent}=ctx;
  $('#agentName').textContent=`${agent.prenom} ${agent.nom}`;
  $('#agentGrade').textContent=agent.grade;
  $('#agentMatricule').textContent=agent.matricule;
  $('#agentSection').textContent=agent.section || '—';

  const [dossiers, rapports, preuves, personnes]=await Promise.all([
    supabase.from('dossiers').select('*',{count:'exact',head:true}),
    supabase.from('rapports').select('*',{count:'exact',head:true}),
    supabase.from('preuves').select('*',{count:'exact',head:true}),
    supabase.from('personnes').select('*',{count:'exact',head:true})
  ]);
  $('#countDossiers').textContent=dossiers.count ?? '0';
  $('#countRapports').textContent=rapports.count ?? '0';
  $('#countPreuves').textContent=preuves.count ?? '0';
  $('#countPersonnes').textContent=personnes.count ?? '0';

  const {data:rows,error}=await supabase.from('dossiers').select('id,numero,titre,statut,niveau,section,created_at').order('created_at',{ascending:false}).limit(12);
  const tbody=$('#dossierRows');
  if(error){ tbody.innerHTML=`<tr><td colspan="6">Impossible de charger les dossiers.</td></tr>`; return; }
  tbody.innerHTML=rows?.length ? rows.map(d=>`
    <tr>
      <td>${escapeHtml(d.numero)}</td><td>${escapeHtml(d.titre)}</td>
      <td><span class="badge ${String(d.statut).toLowerCase().includes('ouvert')?'ok':''}">${escapeHtml(d.statut)}</span></td>
      <td>${escapeHtml(d.niveau)}</td><td>${escapeHtml(d.section||'—')}</td>
      <td>${new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">Aucun dossier enregistré.</td></tr>';

  $('#logoutBtn').addEventListener('click',async()=>{await supabase.auth.signOut();location.href='index.html';});
}

async function initDossiers(){
  const root=$('#dossiersRoot'); if(!root) return;
  const ctx=await requireAgent(); if(!ctx) return;
  const form=$('#dossierForm'), msg=$('#dossierMessage');
  const load=async()=>{
    const {data,error}=await supabase.from('dossiers').select('*').order('created_at',{ascending:false});
    const tbody=$('#dossiersRows');
    if(error){tbody.innerHTML='<tr><td colspan="7">Erreur de chargement.</td></tr>';return;}
    tbody.innerHTML=data?.length ? data.map(d=>`
      <tr><td>${escapeHtml(d.numero)}</td><td>${escapeHtml(d.titre)}</td><td>${escapeHtml(d.statut)}</td><td>${escapeHtml(d.niveau)}</td><td>${escapeHtml(d.section||'—')}</td><td>${new Date(d.created_at).toLocaleDateString('fr-FR')}</td><td><button class="btn ghost view-case" data-id="${d.id}">Ouvrir</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty">Aucun dossier.</td></tr>';
  };
  await load();
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    msg.innerHTML='<div class="notice">Création du dossier…</div>';
    const payload=Object.fromEntries(new FormData(form).entries());
    payload.numero=payload.numero.trim(); payload.titre=payload.titre.trim();
    const {data,error}=await supabase.from('dossiers').insert(payload).select().single();
    if(error){msg.innerHTML='<div class="notice error">Création impossible. Vérifiez les champs et vos habilitations.</div>';return;}
    msg.innerHTML=`<div class="notice success">Dossier ${escapeHtml(data.numero)} créé.</div>`;
    form.reset(); await load();
  });
  $('#refreshCases').addEventListener('click',load);
  document.addEventListener('click',e=>{
    const b=e.target.closest('.view-case'); if(!b)return;
    alert('Dossier sélectionné : '+b.dataset.id+'\nLa page dossier détaillé peut être reliée à ce dossier dans une prochaine étape.');
  });
}

async function initLogout(){
  const b=$('#logoutBtn'); if(b) b.addEventListener('click',async()=>{await supabase.auth.signOut();location.href='index.html';});
}

document.addEventListener('DOMContentLoaded',()=>{
  setActiveNav(); initMobile(); initTheme(); initLogin(); initDashboard(); initDossiers(); initLogout();
});
