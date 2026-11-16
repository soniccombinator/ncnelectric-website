// Email API test with a fake mailer (no Microsoft calls). Run by `npm test`.
const assert=require('node:assert'),http=require('node:http');
const {createApi}=require('../api.cjs');
const {mailConfig,createMailer}=require('../mail.cjs');
const good={company:'Acme Events',contact:'Pat Lee',email:'pat@example.com',phone:'941-555-0100',project:'Fall Fair',billing:'1 Main St',site:'2 Park Ave',onsite:'Sam 941-555-0101',start:'2026-12-01',end:'2026-12-03',notes:'<script>x</script>',kw:30,period:'daily',customer:'event',quantity:3,miles:50,extraHours:0,gallons:0,fuelCost:0,acknowledged:true,website:''};
(async()=>{
  // Config: off when anything is missing, on when complete.
  assert.equal(mailConfig({}).enabled,false);
  const cfg=mailConfig({MS_TENANT_ID:'t',MS_CLIENT_ID:'c',MS_CLIENT_SECRET:'s',MAIL_SENDER:'sonic@ncnelectric.com',MAIL_ADMIN_TO:'a@ncnelectric.com, b@ncnelectric.com'});
  assert.deepEqual(cfg.adminTo,['a@ncnelectric.com','b@ncnelectric.com']);

  // Mailer: token then sendMail to the sender's mailbox, 202 = accepted.
  const calls=[];const fakeFetch=async(url,opts)=>{calls.push({url,opts});return url.includes('/token')?{ok:true,status:200,json:async()=>({access_token:'tok',expires_in:3600})}:{ok:true,status:202,json:async()=>({})}};
  const m=createMailer(cfg,fakeFetch);await m.send({to:['x@example.com'],subject:'s',html:'h',replyTo:'r@example.com'});await m.send({to:['y@example.com'],subject:'s',html:'h'});
  assert.equal(calls.filter(c=>c.url.includes('/token')).length,1,'token cached');
  assert.ok(calls[1].url.endsWith('/users/sonic%40ncnelectric.com/sendMail'));

  // API with fake mailer.
  const sent=[];let fail=false;
  const mailer={adminTo:['a@ncnelectric.com','b@ncnelectric.com'],send:async msg=>{if(fail)throw new Error('down');sent.push(msg)}};
  const api=createApi({mailer,log:{log(){},error(){}}});
  const server=http.createServer(async(q,r)=>{if(!(await api(q,r))){r.writeHead(404);r.end()}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  const post=async(body,ip='1.1.1.1')=>{const r=await fetch(base+'/api/application',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':ip},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}};

  assert.deepEqual(await (await fetch(base+'/api/status')).json(),{applications:true});
  let r=await post(good);assert.equal(r.status,200);assert.ok(/^NCN-[0-9A-F]{6}$/.test(r.body.reference));assert.equal(r.body.confirmationSent,true);
  assert.equal(sent.length,2);
  assert.deepEqual(sent[0].to,['a@ncnelectric.com','b@ncnelectric.com'],'alert goes to fixed NCN recipients');
  assert.equal(sent[0].replyTo,'pat@example.com');assert.ok(sent[0].html.includes('$900.00'),'server-side estimate: 3 x $200 + $250 + 10 mi x $5');
  assert.ok(!sent[0].html.includes('<script>'),'HTML escaped');
  assert.deepEqual(sent[1].to,['pat@example.com'],'confirmation to applicant');

  r=await post(good,'2.2.2.2');assert.equal(r.body.duplicate,true);assert.equal(sent.length,2,'duplicate not re-sent');
  r=await post({...good,website:'spam'},'3.3.3.3');assert.equal(r.status,200);assert.equal(sent.length,2,'honeypot not sent');
  r=await post({...good,email:'bad'},'4.4.4.4');assert.equal(r.status,400);
  r=await post({...good,end:'2026-11-01'},'4.4.4.4');assert.equal(r.status,400);
  r=await post({...good,acknowledged:false},'4.4.4.4');assert.equal(r.status,400);
  r=await post({...good,kw:999},'4.4.4.4');assert.equal(r.status,400);
  r=await post({...good,to:'evil@example.com',company:'Other Co'},'5.5.5.5');assert.deepEqual(sent.at(-2).to,['a@ncnelectric.com','b@ncnelectric.com'],'browser cannot pick recipients');
  fail=true;r=await post({...good,company:'Fail Co'},'6.6.6.6');assert.equal(r.status,502);fail=false;
  for(let i=0;i<5;i++)await post({...good,company:'Rate '+i},'7.7.7.7');
  r=await post({...good,company:'Rate X'},'7.7.7.7');assert.equal(r.status,429,'rate limited');

  // Without a mailer the endpoint is off.
  const off=createApi({mailer:null});const s2=http.createServer(async(q,res)=>{await off(q,res)});await new Promise(x=>s2.listen(0,'127.0.0.1',x));
  const b2=`http://127.0.0.1:${s2.address().port}`;
  assert.deepEqual(await (await fetch(b2+'/api/status')).json(),{applications:false});
  assert.equal((await fetch(b2+'/api/application',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
  server.close();s2.close();console.log('OK: email API (validation, recipients, confirmation, duplicates, honeypot, rate limit, off mode)');
})().catch(e=>{console.error(e);process.exit(1)});
