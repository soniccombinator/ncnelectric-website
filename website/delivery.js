import {state} from './rental.js';
const fallback='You can print or save your completed application and send it to bsameit@ncnelectric.com and jalvarenga@ncnelectric.com.';
let enabled=false,sending=false;
export async function configureDelivery(form){
 const button=document.getElementById('send-application'),note=document.getElementById('delivery-note');
 button.disabled=true;button.textContent='Checking online submission...';
 try{const r=await fetch('/api/status',{cache:'no-store'});enabled=r.ok&&(await r.json()).applications===true}catch{enabled=false}
 if(!form.isConnected)return;
 if(enabled){button.disabled=false;button.textContent='Submit rental application';note.textContent='Your application is emailed to NCN, and you will receive a confirmation email.'}
 else{button.textContent='Online submission unavailable';note.textContent='Online submission is currently unavailable. '+fallback}
}
export async function deliverApplication(event,form){
 event.preventDefault();
 const status=document.getElementById('delivery-status'),button=document.getElementById('send-application');
 if(!enabled){status.textContent='Your application has not been sent. Online submission is unavailable. '+fallback;return}
 if(sending)return;
 const val=id=>document.getElementById(id).value;
 const data={company:val('company'),contact:val('contact'),email:val('email'),phone:val('phone'),project:val('project'),billing:val('billing'),site:val('site'),onsite:val('onsite'),start:val('start'),end:val('end'),notes:val('notes'),
  kw:state.kw,period:state.period,customer:state.customer,quantity:state.quantity,miles:state.miles,extraHours:state.extraHours,gallons:state.gallons,fuelCost:state.fuelCost,
  acknowledged:form.querySelector('input[name="Request acknowledgement"]').checked,website:form.querySelector('input[name="website"]')?.value||''};
 sending=true;button.disabled=true;button.textContent='Sending...';status.textContent='';
 try{
  const r=await fetch('/api/application',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const body=await r.json().catch(()=>({}));
  if(!r.ok||!body.ok)throw new Error(body.error||'Your application could not be sent.');
  status.innerHTML='';const box=document.createElement('div');box.className='note';
  box.innerHTML='<strong>Application sent</strong><p></p>';
  box.querySelector('p').textContent=`Reference ${body.reference}. NCN has received your request and will contact you about availability and a final quote. `+(body.confirmationSent===false?'We could not send your confirmation email, so please keep this reference.':`A confirmation email is on its way to ${data.email}.`);
  status.appendChild(box);button.textContent='Application sent';
 }catch(e){
  status.textContent=`${e.message} ${fallback}`;button.disabled=false;button.textContent='Submit rental application';
 }finally{sending=false}
}
