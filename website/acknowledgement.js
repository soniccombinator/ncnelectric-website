const storageKey='pgs-rental-terms-acknowledgement';
const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statement='I acknowledge that I have read and understand the NCN Electric, Inc. rental terms presented above.';
export function makeAcknowledgement(name,company,consent,version,signedAt=new Date().toISOString()){
 name=String(name||'').trim();company=String(company||'').trim();
 if(!name||name.length>120||!company||company.length>160||consent!==true)throw new Error('Enter your full name and company, and check the acknowledgement box.');
 return {document:'NCN T&C FINAL',signature:name,company,statement,signedAt,termsVersion:version};
}
export async function mountAcknowledgement(paragraphs){
 const host=document.getElementById('terms-acknowledgement');if(!host)return;
 host.innerHTML=`<h2>Acknowledge Rental Terms</h2><p>Enter your name as your signature, then confirm that you have read and acknowledge the rental terms.</p><form id="terms-signature-form"><div class="fields"><div class="field"><label for="signature-name">Full name (typed signature) *</label><input id="signature-name" name="Signature" required maxlength="120" autocomplete="name"></div><div class="field"><label for="signature-company">Company *</label><input id="signature-company" name="Company" required maxlength="160" autocomplete="organization"></div></div><label class="checkline" style="margin-top:20px"><input id="signature-consent" type="checkbox" required><span>${statement}</span></label><div class="application-actions"><button id="acknowledge-terms" class="action" type="submit" disabled>Acknowledge Rental Terms</button></div><p class="muted">Your acknowledgement is saved on this device. Download or print a copy and include it with your rental application. It is not automatically sent to NCN.</p><p id="ack-error" class="error" role="alert"></p></form><div id="ack-receipt" role="status" aria-live="polite"></div>`;
 const bytes=new TextEncoder().encode(JSON.stringify(paragraphs));
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 const version=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 if(!host.isConnected)return;
 let record=null;
 const button=document.getElementById('acknowledge-terms');button.disabled=false;
 function receipt(saved){
  document.getElementById('ack-receipt').innerHTML=`<div class="note"><strong>Rental Terms Acknowledged</strong><p>Signature: ${escapeText(record.signature)}<br>Company: ${escapeText(record.company)}<br>Date: ${escapeText(new Date(record.signedAt).toLocaleString())}</p><p>${saved?'Saved on this device.':'Device storage is unavailable. Download a copy now to keep your acknowledgement.'} This acknowledgement has not been emailed to NCN.</p><div class="application-actions"><button class="print-action" type="button" id="download-ack">Download Acknowledgement</button><button class="print-action" type="button" id="print-ack">Print / Save PDF</button></div></div>`;
  document.getElementById('download-ack').addEventListener('click',()=>{
   const text=`POWER GENERATIONAL SERVICE\nRENTAL TERMS ACKNOWLEDGEMENT\n\nDocument: ${record.document}\nTyped signature: ${record.signature}\nCompany: ${record.company}\nSigned at (UTC): ${record.signedAt}\nTerms version (SHA-256): ${record.termsVersion}\n\n${record.statement}\n\nThis acknowledgement was recorded on the signer's device and has not been automatically sent to NCN.\n\nRENTAL TERMS ACKNOWLEDGED\n\n${paragraphs.join('\n\n')}`;
   const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));link.download='NCN Rental Terms Acknowledgement.txt';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  });
  document.getElementById('print-ack').addEventListener('click',()=>window.print());
 }
 try{const previous=JSON.parse(localStorage.getItem(storageKey)||'null');if(previous&&previous.termsVersion===version&&typeof previous.signature==='string'&&typeof previous.company==='string'&&Number.isFinite(Date.parse(previous.signedAt))){record=previous;receipt(true)}}catch{}
 document.getElementById('terms-signature-form').addEventListener('submit',event=>{
  event.preventDefault();const error=document.getElementById('ack-error');error.textContent='';
  try{record=makeAcknowledgement(document.getElementById('signature-name').value,document.getElementById('signature-company').value,document.getElementById('signature-consent').checked,version);let saved=false;try{localStorage.setItem(storageKey,JSON.stringify(record));saved=true}catch{}receipt(saved)}catch(e){error.textContent=e.message}
 });
}
