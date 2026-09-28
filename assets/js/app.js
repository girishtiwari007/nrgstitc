'use strict';

const {
  master: DATA,
  procurementFaq: PROCUREMENT_FAQ,
  circulars: CIRCULARS,
  construction: CONST_DATA,
  circularDetails: CIRC_MODAL_DATA
} = window.RAILWAY_GST_DATA;

// ══ MASTER DATA ══
// flag: single definitive Railway ITC flag
// gstbasis: the GST law provision that determines it
// enduse: AC / NonAC / Mixed / All
// fund: C / R / C/R








// ── POPULATE CATEGORIES ──
const cats=[...new Set(DATA.map(d=>d.cat))].sort();
const catSel=document.getElementById('catSel');
cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;catSel.appendChild(o);});

// ── HSN LIST ──
const ALL_HSN=[...new Set(DATA.map(d=>d.hsn).filter(h=>h&&h!=='—').concat(CONST_DATA.map(d=>d.hsn.split(' ')[0])))].sort();
const MASTER_TAB_BUTTON = document.querySelector('.tab[onclick*="master"]');

// ── HELPERS ──
function badgeClass(f){return f==='EX'?'badge-EX':'badge-'+f;}
function flagBadge(f){return `<span class="badge ${badgeClass(f)}">${f}</span>`;}
function fundBadge(f){
  if(f==='C') return '<span class="fund-C">C</span>';
  if(f==='R') return '<span class="fund-R">R</span>';
  return '<span class="fund-B">C/R</span>';
}
function euPill(e){
  const map={AC:'eu-AC',NonAC:'eu-NonAC',Mixed:'eu-Mixed',All:'eu-All'};
  return `<span class="eu-pill ${map[e]||'eu-All'}">${e}</span>`;
}
function hl(txt,term){
  if(!term||!txt) return txt||'';
  const e=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return String(txt).replace(new RegExp('('+e+')','gi'),'<mark>$1</mark>');
}
function normalizedSearchText(d){
  return `${d.sr||''} ${d.hsn||''} ${d.desc||''} ${d.sub||''} ${d.use||''} ${d.cat||''} ${d.flag||''} ${d.note||''} ${d.ref||''} ${d.basis||''} ${d.gstbasis||''} ${d.notif||''}`.toLowerCase();
}
function isCodeLike(v){return /[0-9]/.test(v);}

function renderSearchInfo(term){
  const box=document.getElementById('hsnSearchInfo');
  if(!box)return;
  const t=(term||'').trim().toLowerCase();
  if(!t){box.classList.remove('show');box.innerHTML='';return;}
  const masterHits=DATA.filter(d=>normalizedSearchText(d).includes(t)).slice(0,6);
  const constHits=CONST_DATA.filter(d=>normalizedSearchText(d).includes(t)).slice(0,6);
  const hits=[
    ...masterHits.map(d=>`<div class="search-hit"><b>${hl(d.hsn,t)}</b> ${flagBadge(d.flag)}<br>${hl(d.desc,t)}<br><span style="color:var(--muted)">${hl(d.note||d.gstbasis||'',t)}</span></div>`),
    ...constHits.map(d=>`<div class="search-hit"><b>${hl(d.hsn,t)}</b> ${flagBadge(d.flag.split(' ')[0])}<br>${hl(d.desc,t)}<br><span style="color:var(--muted)">${hl(d.use||d.note||'',t)}</span></div>`)
  ];
  if(!hits.length){box.classList.remove('show');box.innerHTML='';return;}
  box.innerHTML=`<h4>Matching HSN/SAC details for "${term}"</h4><div class="search-info-grid">${hits.join('')}</div>`;
  box.classList.add('show');
}

function runGlobalHsnSearch(){
  const val=(document.getElementById('globalHsnSearch').value||'').trim();
  if(!val)return;
  switchTab('master',MASTER_TAB_BUTTON);
  document.getElementById('hsnSrch').value=isCodeLike(val)?val:'';
  document.getElementById('srch').value=isCodeLike(val)?'':val;
  document.getElementById('hsnX').style.display=isCodeLike(val)?'block':'none';
  hideSug();
  renderTable();
  document.getElementById('tab-master').scrollIntoView({behavior:'smooth',block:'start'});
}

// ── HSN SUGGESTIONS ──
function showSug(){
  const val=(document.getElementById('hsnSrch').value||'').trim();
  document.getElementById('hsnX').style.display=val?'block':'none';
  const sug=document.getElementById('hsnSug');
  if(!val){sug.style.display='none';return;}
  const vl=val.toLowerCase();
  const matches=ALL_HSN.filter(h=>h.toLowerCase().startsWith(vl)||h.toLowerCase().includes(vl)).slice(0,10);
  if(!matches.length){sug.style.display='none';return;}
  sug.innerHTML=matches.map(h=>{
    const rows=DATA.filter(d=>d.hsn&&(d.hsn===h||d.hsn.startsWith(h)||h.startsWith(d.hsn.split('/')[0])));
    const flags=[...new Set(rows.map(r=>r.flag))];
    const fhtml=flags.map(f=>flagBadge(f)).join(' ');
    const desc=rows.length?rows[0].desc.substring(0,42)+(rows[0].desc.length>42?'…':''):'';
    return `<div class="sug-item" onclick="selHsn('${h}')">
      <span style="font-family:var(--mono);font-weight:700;color:var(--navy2);min-width:80px;font-size:12px">${hl(h,val)}</span>
      <span style="color:var(--muted);flex:1;font-size:11px">${desc}</span>
      <span style="white-space:nowrap">${fhtml}</span>
    </div>`;
  }).join('');
  sug.style.display='block';
}
function selHsn(c){document.getElementById('hsnSrch').value=c;document.getElementById('hsnX').style.display='block';document.getElementById('hsnSug').style.display='none';renderTable();}
function clearHsn(){document.getElementById('hsnSrch').value='';document.getElementById('hsnX').style.display='none';document.getElementById('hsnSug').style.display='none';renderTable();}
function hideSug(){document.getElementById('hsnSug').style.display='none';}

function resetAll(){
  ['srch','hsnSrch'].forEach(id=>document.getElementById(id).value='');
  const global=document.getElementById('globalHsnSearch');
  if(global)global.value='';
  ['flagSel','catSel','fundSel','euSel','rcSel'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('hsnX').style.display='none';
  hideSug();
  renderTable();
}

function renderTable(){
  const q=(document.getElementById('srch').value||'').toLowerCase();
  const hq=(document.getElementById('hsnSrch').value||'').trim().toLowerCase();
  const ff=document.getElementById('flagSel').value;
  const cf=document.getElementById('catSel').value;
  const fnd=document.getElementById('fundSel').value;
  const eu=document.getElementById('euSel').value;
  const rc=(document.getElementById('rcSel')||{value:''}).value;

  const rows=DATA.filter(d=>{
    if(ff && d.flag!==ff && !d.flag.includes(ff)) return false;
    if(cf && d.cat!==cf) return false;
    if(fnd && !d.fund.includes(fnd)) return false;
    if(eu && d.eu!==eu && d.enduse!==eu) return false;
    const _rc=(document.getElementById('rcSel')||{value:''}).value;
    if(_rc==='1' && !d.rc) return false;
    if(hq){const h=(d.hsn||'').toLowerCase();if(!h.startsWith(hq)&&!h.includes(hq))return false;}
    if(q && !`${d.sr} ${d.desc} ${d.sub} ${d.hsn} ${d.cat} ${d.flag} ${d.note} ${d.ref} ${d.gstbasis} ${d.notif||''}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const tb=document.getElementById('tBody');
  tb.innerHTML='';
  document.getElementById('noData').style.display=rows.length?'none':'block';
  renderSearchInfo(hq || q);

  rows.forEach(d=>{
    const tr=document.createElement('tr');
    if(d.rc)tr.style.background='#fffde7';
    const hsnDisp=hq?hl(d.hsn,hq):d.hsn;
    const descDisp=q?hl(d.desc,q):d.desc;
    const subDisp=q?hl(d.sub||'',q):(d.sub||'');
    tr.innerHTML=`
      <td class="td-sr">${d.sr}</td>
      <td class="td-desc">${descDisp}<small>${subDisp}</small></td>
      <td class="td-hsn">${hsnDisp}</td>
      <td class="td-cat">${d.cat}</td>
      <td>${flagBadge(d.flag)}</td>
      <td style="font-size:10px;color:var(--navy3);max-width:160px;line-height:1.4">${d.gstbasis}</td>
      <td>${euPill(d.enduse||d.eu)}</td>
      <td>${fundBadge(d.fund)}</td>
      <td><span class="ipas">${d.ipas}</span></td>
      <td style="font-size:10px;color:var(--muted);max-width:120px">${d.notif||''}</td><td class="td-gst">${d.gst}</td>
      <td class="td-note">${d.note}</td>
      <td class="td-ref">${d.ref}</td>`;
    tb.appendChild(tr);
  });

  
}

// ── CONSTRUCTION TABLE ──
const cb=document.getElementById('constBody');
CONST_DATA.forEach(d=>{
  const tr=document.createElement('tr');
  const flag=d.flag.split(' ')[0];
  const fcls=badgeClass(flag);
  tr.innerHTML=`
    <td class="td-hsn">${d.hsn}</td>
    <td style="font-weight:600;font-size:12px;max-width:180px">${d.desc}</td>
    <td style="font-size:11px;max-width:160px">${d.use}</td>
    <td><span class="badge ${fcls}">${d.flag}</span></td>
    <td style="font-size:10px;color:var(--navy3)">${d.basis}</td>
    <td>${fundBadge(d.fund)}</td>
    <td style="font-size:12px;font-weight:600;max-width:100px">${d.itc}</td>
    <td style="font-size:11px;color:var(--muted);max-width:180px">${d.note}</td>`;
  cb.appendChild(tr);
});

// ── PROCUREMENT FAQ ──
const procFaqCategory=document.getElementById('procFaqCategory');
[...new Set(PROCUREMENT_FAQ.map(item=>item.c))].forEach(category=>{
  const option=document.createElement('option');
  option.value=category;
  option.textContent=category;
  procFaqCategory.appendChild(option);
});

function renderProcurementFaq(){
  const query=(document.getElementById('procFaqSearch').value||'').trim().toLowerCase();
  const category=procFaqCategory.value;
  const matches=PROCUREMENT_FAQ.filter(item=>{
    if(category&&item.c!==category)return false;
    return !query||`${item.n} ${item.c} ${item.q} ${item.a}`.toLowerCase().includes(query);
  });
  document.getElementById('procFaqCount').textContent=`${matches.length} of ${PROCUREMENT_FAQ.length} questions`;
  document.getElementById('procFaqList').innerHTML=matches.length?matches.map(item=>`
    <details class="proc-faq">
      <summary><span class="faq-no">Q${item.n}</span><span class="faq-cat">${item.c}</span><span>${item.q}</span></summary>
      <div class="faq-answer"><strong>Answer:</strong> ${item.a}</div>
    </details>`).join(''):'<div class="faq-empty">No procurement questions match this search.</div>';
}

// ── CIRCULARS ──
const cl=document.getElementById('circularList');
CIRCULARS.forEach(c=>{
  const d=document.createElement('div');
  d.className='circ-card';
  const sourceLink=c.url&&c.url!=='#'?`<a class="source-link" href="${c.url}" target="_blank" rel="noopener">Open source PDF</a>`:'';
  d.innerHTML=`<div class="circ-id">${c.id}</div><div class="circ-body"><h4>${c.title}</h4><p>${c.body}</p>${sourceLink}</div>`;
  cl.appendChild(d);
});

// ── TABS ──
function switchTab(id,btn){
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  if(btn)btn.classList.add('active');
}

function hideTopAlert(){
  document.getElementById('topAlert').classList.add('is-hidden');
  document.getElementById('alertReopen').classList.add('show');
}
function showTopAlert(){
  document.getElementById('topAlert').classList.remove('is-hidden');
  document.getElementById('alertReopen').classList.remove('show');
}
window.addEventListener('load',()=>setTimeout(hideTopAlert,10000));



function openCircModal(slug){
  const d = CIRC_MODAL_DATA[slug];
  if(!d) return;
  document.getElementById('circModalTag').textContent = d.tag;
  document.getElementById('circModalTag').className = 'circ-modal-tag' + (slug.includes('2025-gst-2-0') || slug.includes('13-2026') ? ' new' : '');
  document.getElementById('circModalTitle').textContent = d.title;
  document.getElementById('circModalBody').innerHTML = d.body;
  document.getElementById('circModalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeCircModal(){
  document.getElementById('circModalOverlay').classList.remove('show');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape') closeCircModal();
});

renderProcurementFaq();
renderTable();
