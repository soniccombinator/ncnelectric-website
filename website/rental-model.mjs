export const rates = [
 {kw:10,daily:100,weekly:300,monthly:750},
 {kw:30,daily:200,weekly:600,monthly:1450},
 {kw:60,daily:300,weekly:950,monthly:2250}
];
export const fees = {eventSetup:250,includedMiles:40,mileage:5,customQuoteMiles:85,includedLaborHours:3,includedOperatingHours:10,excessHourFraction:0.1,fuelMargin:3};
export function estimateRental({kw,period='daily',quantity=1,customer='ncn',miles=0,extraHours=0,gallons=0,fuelCost=0}) {
 const generator=rates.find(g=>g.kw===kw);
 const values=[quantity,miles,extraHours,gallons,fuelCost];
 if(!generator||!['daily','weekly','monthly'].includes(period)||!['ncn','event'].includes(customer)||values.some(v=>!Number.isFinite(v)||v<0)||!Number.isInteger(quantity)||quantity<1||quantity>1000000) return {valid:false};
 const rental=generator[period]*quantity;
 const setup=customer==='event'?fees.eventSetup:0;
 const mileage=customer==='event'?Math.max(0,miles-fees.includedMiles)*fees.mileage:0;
 const excess=generator.daily*fees.excessHourFraction*extraHours;
 const fuel=gallons*(fuelCost+fees.fuelMargin);
 const customQuote=customer==='event'&&miles>fees.customQuoteMiles;
 const round=v=>Math.round((v+Number.EPSILON)*100)/100;
 return {valid:true,rental:round(rental),setup,mileage:round(mileage),excess:round(excess),fuel:round(fuel),total:customQuote?null:round(round(rental)+setup+round(mileage)+round(excess)+round(fuel)),customQuote};
}
