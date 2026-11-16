export function configureDelivery(form){
 document.getElementById('delivery-note').textContent='Online submission is currently unavailable. You can print or save your completed application and send it to bsameit@ncnelectric.com and jalvarenga@ncnelectric.com.';
 const button=document.getElementById('send-application');
 button.disabled=true;
 button.textContent='Direct Email Submission — Setup Required';
}
export function deliverApplication(event){
 event.preventDefault();
 document.getElementById('delivery-status').textContent='Your application has not been sent. Direct email submission is not connected yet.';
}
