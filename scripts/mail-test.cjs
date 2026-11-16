// Sends one clearly labeled setup test email to the NCN recipients (MAIL_ADMIN_TO).
// Run with Railway's variables:  railway run node scripts/mail-test.cjs
const {mailConfig,createMailer}=require('../mail.cjs');
const config=mailConfig();
if(!config.enabled){console.error('Email is not configured. Missing: '+config.missing.join(', '));process.exit(1)}
createMailer(config).send({
  to:config.adminTo,
  subject:'SETUP TEST: NCN website email',
  html:`<p>This is a setup test from the NCN Generator website.</p><p>If you received it, website emails from ${config.sender} are working. No action is needed.</p>`,
}).then(()=>console.log(`Accepted by Microsoft: test sent from ${config.sender} to ${config.adminTo.join(', ')}. Confirm it arrived in each inbox.`))
  .catch(e=>{console.error(e.message);process.exit(1)});
