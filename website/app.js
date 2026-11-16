const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const el = id => document.getElementById(id);
let estimateText = '';
function update() {
  const selected = document.querySelector('input[name="generator"]:checked');
  const days = Number(el('days').value);
  const valid = el('days').value.trim() !== '' && Number.isInteger(days) && days >= 1 && days <= 1000000;
  const rate = Number(selected.value);
  el('chosen').textContent = `${selected.dataset.kw} kW Diesel`;
  el('rate').textContent = money.format(rate);
  el('days').setAttribute('aria-invalid', String(!valid));
  el('error').textContent = valid ? '' : 'Enter a whole number of days from 1 to 1,000,000.';
  el('duration').textContent = valid ? `${days.toLocaleString('en-US')} ${days === 1 ? 'day' : 'days'}` : '—';
  el('math').textContent = valid ? `${money.format(rate)} × ${days.toLocaleString('en-US')}` : '—';
  el('total').textContent = valid ? money.format(rate * days) : '—';
  el('copy').disabled = !valid;
  el('print').disabled = !valid;
  el('status').textContent = '';
  estimateText = valid ? `Power Generational Service\nGenerator rental estimate\n${el('chosen').textContent}\n${money.format(rate)} per day × ${days} ${days === 1 ? 'day' : 'days'}\nEstimated rental total: ${money.format(rate * days)} USD\nRental charges only. Delivery, pickup, fuel, taxes, and any other applicable charges are not included. No weekly or monthly discounts are applied. Availability is not confirmed; this is not a reservation.` : '';
}
document.querySelectorAll('input').forEach(input => input.addEventListener('input', update));
el('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(estimateText); el('status').textContent = 'Estimate copied. Ready to paste into a message.'; }
  catch { el('status').textContent = 'Copy is unavailable in this browser. Use Print / Save PDF to keep your estimate.'; }
});
el('print').addEventListener('click', () => window.print());
update();
