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

  // Signed-in (delegated) mode: refresh-token grant, send as /me, rotated token saved to DATA_DIR and reused.
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ncnmail-'));
  const denv={MS_REFRESH_TOKEN:'rt-1',MAIL_SENDER:'agent@ncnelectric.com',MAIL_ADMIN_TO:'a@ncnelectric.com',DATA_DIR:dir};
  const dcfg=mailConfig(denv);assert.equal(dcfg.enabled,true);assert.equal(dcfg.mode,'delegated');assert.equal(dcfg.tenant,'ncnelectric.com');
  assert.deepEqual(mailConfig({MAIL_SENDER:'agent@ncnelectric.com',MAIL_ADMIN_TO:'a@x.com'}).missing,['MS_REFRESH_TOKEN']);
  let rtn=1;const dcalls=[];const dfetch=async(url,opts)=>{dcalls.push({url,body:String(opts.body||'')});return url.includes('/token')?{ok:true,status:200,json:async()=>({access_token:'tok',expires_in:3600,refresh_token:'rt-'+(++rtn)})}:{ok:true,status:202,json:async()=>({})}};
  const dm=createMailer(dcfg,dfetch);await dm.send({to:['x@example.com'],subject:'s',html:'h'});
  assert.ok(dcalls[0].body.includes('grant_type=refresh_token')&&dcalls[0].body.includes('refresh_token=rt-1'));
  assert.ok(dcalls[1].url.endsWith('/v1.0/me/sendMail'),'delegated sends as /me');
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'ms_refresh_token.json'),'utf8'));assert.equal(saved.rt,'rt-2','rotated token saved');
  const dm2=createMailer(mailConfig(denv),dfetch);await dm2.getToken();assert.ok(dcalls.at(-1).body.includes('refresh_token=rt-2'),'restart reuses saved token');
  const dm3=createMailer(mailConfig({...denv,MS_REFRESH_TOKEN:'rt-new'}),dfetch);await dm3.getToken();assert.ok(dcalls.at(-1).body.includes('refresh_token=rt-new'),'reconnected variable wins over saved file');
  fs.rmSync(dir,{recursive:true,force:true});

  // Resend mode wins when RESEND_API_KEY is set: from "NCN Electric <agent@>", reply_to, attachments, 200 = accepted.
  const rcfg=mailConfig({RESEND_API_KEY:'re_test',MAIL_SENDER:'agent@ncnelectric.com',MAIL_ADMIN_TO:'a@ncnelectric.com',MS_REFRESH_TOKEN:'x'});
  assert.equal(rcfg.mode,'resend');
  const rcalls=[];const rfetch=async(url,opts)=>{rcalls.push({url,opts});return {ok:true,status:200,json:async()=>({id:'1'})}};
  await createMailer(rcfg,rfetch).send({to:['x@example.com'],subject:'s',html:'h',replyTo:'r@example.com',attachments:[{name:'cv.pdf',type:'application/pdf',content:'QUJD'}]});
  const rb=JSON.parse(rcalls[0].opts.body);
  assert.equal(rcalls[0].url,'https://api.resend.com/emails');assert.equal(rb.from,'NCN Electric <agent@ncnelectric.com>');assert.equal(rb.reply_to,'r@example.com');assert.equal(rb.attachments[0].filename,'cv.pdf');
  await assert.rejects(createMailer(rcfg,async()=>({ok:false,status:403,json:async()=>({name:'validation_error'})})).send({to:['x@example.com'],subject:'s',html:'h'}));

  // API with fake mailer.
  const sent=[];let fail=false;
  const mailer={adminTo:['a@ncnelectric.com','b@ncnelectric.com'],send:async msg=>{if(fail)throw new Error('down');sent.push(msg)}};
  const api=createApi({mailer,log:{log(){},error(){}}});
  const server=http.createServer(async(q,r)=>{if(!(await api(q,r))){r.writeHead(404);r.end()}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  const post=async(body,ip='1.1.1.1')=>{const r=await fetch(base+'/api/application',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':ip},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}};

  assert.deepEqual(await (await fetch(base+'/api/status')).json(),{applications:true,forms:true});
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
  // Lead endpoint: generator quote -> Blythe/Jose; contact -> general list; careers with attachment.
  const lead=async(body,ip)=>{const r=await fetch(base+'/api/lead',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':ip},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}};
  const L={kind:'generator',name:'Sam Ray',email:'sam@example.com',phone:'941-555-0102',location:'Venice, FL',message:'2 food trucks',consent:true};
  let n=sent.length;r=await lead(L,'8.8.8.1');assert.equal(r.status,200);assert.equal(sent.length,n+2);assert.deepEqual(sent[n].to,['a@ncnelectric.com','b@ncnelectric.com']);assert.equal(sent[n].replyTo,'sam@example.com');assert.deepEqual(sent[n+1].to,['sam@example.com']);
  r=await lead({...L,location:''},'8.8.8.2');assert.equal(r.status,400,'generator needs location');
  r=await lead({...L,consent:false},'8.8.8.2');assert.equal(r.status,400,'consent required');
  r=await lead({...L,kind:'bogus'},'8.8.8.2');assert.equal(r.status,400);
  mailer.generalTo=['bd@ncnelectric.com'];n=sent.length;r=await lead({...L,kind:'contact',message:'Bid on a school'},'8.8.8.3');assert.equal(r.status,200);assert.deepEqual(sent[n].to,['bd@ncnelectric.com'],'contact goes to general list');
  n=sent.length;r=await lead({...L,kind:'careers',message:'10 yrs',attachment:{name:'resume.pdf',type:'application/pdf',content:Buffer.from('%PDF-1.4 test').toString('base64')}},'8.8.8.4');assert.equal(r.status,200);assert.equal(sent[n].attachments[0].name,'resume.pdf');
  r=await lead({...L,kind:'careers',attachment:{name:'x.exe',content:'AAAA'}},'8.8.8.5');assert.equal(r.status,400,'only pdf/doc');
  r=await lead({...L,kind:'contact',attachment:{name:'a.pdf',content:'AAAA'}},'8.8.8.5');assert.equal(r.status,400,'attachments only on careers');
  for(let i=0;i<5;i++)await post({...good,company:'Rate '+i},'7.7.7.7');
  r=await post({...good,company:'Rate X'},'7.7.7.7');assert.equal(r.status,429,'rate limited');

  // Without a mailer the endpoint is off.
  const off=createApi({mailer:null});const s2=http.createServer(async(q,res)=>{await off(q,res)});await new Promise(x=>s2.listen(0,'127.0.0.1',x));
  const b2=`http://127.0.0.1:${s2.address().port}`;
  assert.deepEqual(await (await fetch(b2+'/api/status')).json(),{applications:false,forms:false});
  assert.equal((await fetch(b2+'/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
  assert.equal((await fetch(b2+'/api/application',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
  server.close();s2.close();console.log('OK: email API (application + lead forms: validation, recipients, confirmation, attachments, duplicates, honeypot, rate limit, off mode)');
})().catch(e=>{console.error(e);process.exit(1)});
