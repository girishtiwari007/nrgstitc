'use strict';

const {
  master: BASE_DATA,
  procurementFaq: PROCUREMENT_FAQ,
  circulars: CIRCULARS,
  construction: BASE_CONST_DATA,
  circularDetails: CIRC_MODAL_DATA
} = window.RAILWAY_GST_DATA;

const CONSULTANT_REVIEW = window.RAILWAY_GST_CONSULTANT_REVIEW || [];
const reviewKey = value => String(value || '').toLowerCase().replace(/[—–]/g,'-').replace(/\s+/g,' ').trim();
const consultantByDescription = new Map(CONSULTANT_REVIEW.map(item=>[reviewKey(item.desc),item]));
const DATA = BASE_DATA.map(item=>{
  const review=consultantByDescription.get(reviewKey(item.desc));
  if(!review)return item;
  return {
    ...item,
    hsn:review.hsn||item.hsn,
    cat:review.category||item.cat,
    portalFlag:review.portalFlag||item.flag,
    flag:review.reviewedFlag||item.flag,
    ipas:review.reviewedFlag||item.ipas,
    consultantRemark:review.consultantRemark,
    consultantReviewed:true,
    consultantRevised:Boolean(review.revised)
  };
});
const CONST_DATA = BASE_CONST_DATA.map(item=>{
  const review=consultantByDescription.get(reviewKey(item.desc));
  return review?{...item,portalFlag:item.flag,flag:review.reviewedFlag||item.flag,consultantRemark:review.consultantRemark,consultantRevised:Boolean(review.revised)}:item;
});

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
const ALL_HSN=[...new Set(DATA.map(d=>d.hsn).filter(h=>h&&h!=='—').concat(CONST_DATA.map(d=>d.hsn.split(' ')[0]),CONSULTANT_REVIEW.map(d=>d.hsn).filter(Boolean)))].sort();
const MASTER_TAB_BUTTON = document.querySelector('.tab[onclick*="master"]');

// ── HELPERS ──
function flagCodes(value){return [...new Set((String(value||'').match(/\b(?:T1|T2|T3|T4|C2|EX)\b/g)||[]))];}
function badgeClass(f){return f==='EX'?'badge-EX':'badge-'+f;}
function flagBadge(f){
  const codes=flagCodes(f);
  return codes.length?codes.map(code=>`<span class="badge ${badgeClass(code)}">${code}</span>`).join(' '):`<span class="badge">${f}</span>`;
}
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
  return `${d.sr||''} ${d.hsn||''} ${d.desc||''} ${d.sub||''} ${d.use||''} ${d.cat||''} ${d.flag||''} ${d.note||''} ${d.ref||''} ${d.basis||''} ${d.gstbasis||''} ${d.notif||''} ${d.consultantRemark||''} ${(d.scope||[]).join(' ')} ${d.supplyType||''} ${d.codeStatus||''}`.toLowerCase();
}
function isCodeLike(v){return /[0-9]/.test(v);}
function codeStatusClass(status){
  if(status.startsWith('Verified 6')||status.startsWith('Verified 8'))return 'status-verified';
  if(status.startsWith('Verified alternatives'))return 'status-conditional';
  if(status.startsWith('Invoice-specific'))return 'status-invoice';
  return 'status-review';
}
function codeStatusPill(status){return `<span class="code-status ${codeStatusClass(status)}">${status}</span>`;}

function renderSearchInfo(term){
  const box=document.getElementById('hsnSearchInfo');
  if(!box)return;
  const t=(term||'').trim().toLowerCase();
  if(!t){box.classList.remove('show');box.innerHTML='';return;}
  const masterHits=DATA.filter(d=>normalizedSearchText(d).includes(t));
  const constHits=CONST_DATA.filter(d=>normalizedSearchText(d).includes(t));
  const allHits=[
    ...masterHits.map(d=>`<div class="search-hit"><div class="search-hit-code"><b>${hl(d.hsn,t)}</b> ${flagBadge(d.flag)}</div><div class="search-hit-desc">${hl(d.desc,t)}</div><div class="search-hit-note">${hl(d.note||d.gstbasis||'',t)}</div></div>`),
    ...constHits.map(d=>`<div class="search-hit"><div class="search-hit-code"><b>${hl(d.hsn,t)}</b> ${flagBadge(d.flag.split(' ')[0])}</div><div class="search-hit-desc">${hl(d.desc,t)}</div><div class="search-hit-note">${hl(d.use||d.note||'',t)}</div></div>`)
  ];
  const hits=allHits.slice(0,5);
  if(!hits.length){box.classList.remove('show');box.innerHTML='';return;}
  box.innerHTML=`<h4>Top ${hits.length} of ${allHits.length} matching HSN/SAC details for "${term}"</h4><div class="search-info-grid">${hits.join('')}</div>`;
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
  ['flagSel','catSel','fundSel','euSel','scopeSel','codeSel','rcSel'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('hsnX').style.display='none';
  hideSug();
  renderTable();
}

function focusMasterSearch(){
  const controls=document.querySelector('#tab-master .controls');
  const search=document.getElementById('hsnSrch');
  if(controls){
    controls.classList.remove('attention-replay');
    void controls.offsetWidth;
    controls.classList.add('attention-replay');
    controls.scrollIntoView({behavior:'smooth',block:'center'});
  }
  if(search)setTimeout(()=>search.focus(),350);
}

function toggleMasterDetail(id,button){
  const detail=document.getElementById(id);
  if(!detail)return;
  const willOpen=detail.hidden;
  detail.hidden=!willOpen;
  button.setAttribute('aria-expanded',String(willOpen));
  button.textContent=willOpen?'Close':'View';
}

function renderTable(){
  const q=(document.getElementById('srch').value||'').toLowerCase();
  const hq=(document.getElementById('hsnSrch').value||'').trim().toLowerCase();
  const ff=document.getElementById('flagSel').value;
  const cf=document.getElementById('catSel').value;
  const fnd=document.getElementById('fundSel').value;
  const eu=document.getElementById('euSel').value;
  const scope=(document.getElementById('scopeSel')||{value:''}).value;
  const codeStatus=(document.getElementById('codeSel')||{value:''}).value;
  const rc=(document.getElementById('rcSel')||{value:''}).value;

  const rows=DATA.filter(d=>{
    if(ff && d.flag!==ff && !d.flag.includes(ff)) return false;
    if(cf && d.cat!==cf) return false;
    if(fnd && !d.fund.includes(fnd)) return false;
    if(eu && d.eu!==eu && d.enduse!==eu) return false;
    if(scope && !(d.scope||[]).includes(scope)) return false;
    if(codeStatus && d.codeStatus!==codeStatus) return false;
    const _rc=(document.getElementById('rcSel')||{value:''}).value;
    if(_rc==='1' && !d.rc) return false;
    if(hq){const h=(d.hsn||'').toLowerCase();if(!h.startsWith(hq)&&!h.includes(hq))return false;}
    if(q && !`${d.sr} ${d.desc} ${d.sub} ${d.hsn} ${d.cat} ${d.flag} ${d.note} ${d.ref} ${d.gstbasis} ${d.notif||''} ${d.consultantRemark||''} ${(d.scope||[]).join(' ')} ${d.supplyType} ${d.codeStatus}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const tb=document.getElementById('tBody');
  tb.innerHTML='';
  document.getElementById('noData').style.display=rows.length?'none':'block';
  renderSearchInfo(hq || q);
  const visibleRows=rows.slice(0,5);
  const hasActiveFilter=Boolean(q||hq||ff||cf||fnd||eu||scope||codeStatus||rc);
  const listingNotice=document.getElementById('listingNotice');
  if(listingNotice){
    listingNotice.innerHTML=rows.length
      ? `<span><strong>Showing ${visibleRows.length} of ${rows.length} ${hasActiveFilter?'matching ':''}references.</strong> Search the full knowledge base for the required HSN/SAC, description, ITC flag or category.</span><button type="button" onclick="focusMasterSearch()"><span aria-hidden="true">&#9757;</span> Use Search &amp; Filter to check more</button>`
      : '<strong>No matching reference.</strong> Change or reset the Search &amp; Filter criteria.';
  }

  visibleRows.forEach((d,index)=>{
    const tr=document.createElement('tr');
    tr.className='master-row';
    if(d.rc)tr.style.background='#fffde7';
    const detailId=`master-detail-${index}`;
    const hsnDisp=hq?hl(d.hsn,hq):d.hsn;
    const descDisp=q?hl(d.desc,q):d.desc;
    tr.innerHTML=`
      <td class="td-sr">${d.sr}</td>
      <td class="td-desc">${descDisp}</td>
      <td class="td-hsn">${hsnDisp}<small class="code-status-compact">${d.codeStatus}</small></td>
      <td class="td-cat">${d.cat}</td>
      <td>${flagBadge(d.flag)}</td>
      <td class="td-gst">${d.gst}</td>
      <td class="td-detail"><button class="detail-btn" type="button" aria-expanded="false" aria-controls="${detailId}" onclick="toggleMasterDetail('${detailId}',this)">View</button></td>`;
    tb.appendChild(tr);

    const detail=document.createElement('tr');
    detail.id=detailId;
    detail.className='master-detail-row';
    detail.hidden=true;
    detail.innerHTML=`<td colspan="7">
      <div class="master-detail-grid">
        <div class="detail-wide"><b>Exact description / scope</b><span>${d.sub||d.desc}</span></div>
        <div><b>GST law basis</b><span>${d.gstbasis}</span></div>
        <div><b>End-use</b><span>${euPill(d.enduse||d.eu)}</span></div>
        <div><b>Fund</b><span>${fundBadge(d.fund)}</span></div>
        <div><b>IPAS code</b><span class="ipas">${d.ipas}</span></div>
        <div><b>Organisation scope</b><span>${(d.scope||[]).join(', ')}</span></div>
        <div><b>Supply type</b><span>${d.supplyType}</span></div>
        <div><b>Code verification</b><span>${codeStatusPill(d.codeStatus)}</span></div>
        <div><b>Notification</b><span>${d.notif||'Confirm applicable notification'}</span></div>
        <div class="detail-wide ${d.consultantRevised?'legacy-note':''}"><b>${d.consultantRevised?'Earlier portal note (superseded by consultant review)':'Compliance note'}</b><span>${d.note}</span></div>
        ${d.consultantRemark?`<div class="detail-wide consultant-detail ${d.consultantRevised?'is-revised':''}"><b>GST Consultant/NR flagging remark</b><span>${d.consultantRemark}</span>${d.consultantRevised?`<small>Previous portal flag: ${d.portalFlag}</small>`:''}</div>`:''}
        <div class="detail-wide"><b>Source / circular reference</b><span>${d.ref}<br><a class="detail-source-link" href="${d.sourceUrl}" target="_blank" rel="noopener">Open mapped official source</a></span></div>
      </div>
    </td>`;
    tb.appendChild(detail);
  });

  
}

// ── GST CONSULTANT REVIEW ──
const consultantCategory=document.getElementById('consultantCategory');
[...new Set(CONSULTANT_REVIEW.map(item=>item.category).filter(Boolean))].sort().forEach(category=>{
  const option=document.createElement('option');
  option.value=category;
  option.textContent=category;
  consultantCategory.appendChild(option);
});

function consultantSearchText(item){
  return `${item.sr} ${item.desc} ${item.hsn} ${item.category} ${item.reviewedFlag} ${item.gst} ${item.remarks} ${item.consultantRemark}`.toLowerCase();
}

function renderConsultantReview(){
  const query=(document.getElementById('consultantSearch').value||'').trim().toLowerCase();
  const flag=document.getElementById('consultantFlag').value;
  const category=document.getElementById('consultantCategory').value;
  const status=document.getElementById('consultantStatus').value;
  const matches=CONSULTANT_REVIEW.filter(item=>{
    if(query&&!consultantSearchText(item).includes(query))return false;
    if(flag&&!flagCodes(item.reviewedFlag).includes(flag))return false;
    if(category&&item.category!==category)return false;
    if(status==='revised'&&!item.revised)return false;
    if(status==='confirmed'&&item.revised)return false;
    return true;
  });
  const visible=matches.slice(0,5);
  document.getElementById('consultantBody').innerHTML=visible.map(item=>`<tr class="${item.revised?'review-revised':''}">
    <td class="td-sr">${item.sr}</td>
    <td class="td-desc">${item.desc}${item.revised?'<span class="review-status">Revised</span>':''}</td>
    <td class="td-hsn">${item.hsn}</td>
    <td class="td-cat">${item.category}</td>
    <td>${flagBadge(item.reviewedFlag)}${item.revised?`<small class="previous-flag">Previous: ${item.portalFlag}</small>`:''}</td>
    <td class="td-gst">${item.gst}</td>
    <td class="consultant-remark">${item.consultantRemark}</td>
  </tr>`).join('');
  const notice=document.getElementById('consultantNotice');
  notice.innerHTML=matches.length
    ? `<span><strong>Showing ${visible.length} of ${matches.length} reviewed references.</strong> Use search and filters to locate the required HSN/SAC or consultant remark.</span>`
    : '<strong>No reviewed reference matches the selected criteria.</strong>';
}

function resetConsultantReview(){
  ['consultantSearch','consultantFlag','consultantCategory','consultantStatus'].forEach(id=>document.getElementById(id).value='');
  renderConsultantReview();
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
    <td style="font-size:11px;color:var(--muted);max-width:180px">${d.note}${d.consultantRemark?`<span class="construction-review ${d.consultantRevised?'is-revised':''}"><b>Consultant/NR:</b> ${d.consultantRemark}</span>`:''}</td>`;
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
function hideLaunchDisclaimer(){
  const notice=document.getElementById('launchDisclaimer');
  if(notice)notice.classList.add('is-hidden');
}
window.addEventListener('load',()=>{
  setTimeout(hideTopAlert,10000);
  setTimeout(hideLaunchDisclaimer,10000);
});



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
renderConsultantReview();
renderTable();
