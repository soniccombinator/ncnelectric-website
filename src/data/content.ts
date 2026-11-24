// Project gallery, testimonials, client logos, badges and FAQ. Add or edit entries here.

// Project gallery on /projects. "sector" must match a slug in sectors.ts (used for the filter buttons).
export const gallery = [
  { name: 'Suncoast Orthopaedic Surgery & Sports Medicine', location: 'Venice, FL', sector: 'healthcare', status: 'Completed 2023', partner: 'Willis A. Smith Construction',
    details: '20,800 sq ft clinic with three X-ray rooms, MRI, exam rooms, gym and rehabilitation areas.',
    images: ['projects/suncoast-1.jpg', 'projects/suncoast-2.jpg', 'projects/suncoast-3.jpg', 'projects/suncoast-4.jpg'] },
  { name: 'Market Walk', location: 'Parrish, FL', sector: 'retail', status: 'Completed',
    details: 'Shell work on four buildings (33,545 sq ft total) including site lighting.',
    images: ['projects/market-walk-1.jpg', 'projects/market-walk-2.jpg', 'projects/market-walk-3.jpg'] },
  { name: 'Trevesta Commercial', location: 'Palmetto, FL', sector: 'industrial-commercial', status: 'Completed', partner: 'J.E. Charlotte Construction',
    details: 'Three ground-up commercial shell buildings (38,683 sq ft) plus fit-up of ten tenant spaces and an anchor store.',
    images: ['hero/construction-1.jpg', 'projects/trevesta-1.jpg', 'hero/construction-2.jpg'] },
  { name: 'U-Haul Storage', location: 'Bradenton, FL', sector: 'industrial-commercial', status: 'Completed', partner: 'Formella Construction',
    details: 'Three-story, 111,000 sq ft tilt-wall storage facility on a 10-acre site.',
    images: ['projects/uhaul-1.jpg', 'projects/uhaul-2.jpg'] },
  { name: 'Outparcel Tenant Build-Outs', location: 'Southwest Florida', sector: 'retail', status: 'Completed',
    details: 'Tenant fit-outs including a dermatology office and a martial arts studio.',
    images: ['projects/op5-dermatology.jpg', 'projects/op6-dojo.jpg'] },
  { name: 'SRQ Air Traffic Control Tower', location: 'Sarasota, FL', sector: 'airports', status: 'Completed',
    details: '$80 million, 128-foot tower. All electrical from the ground up.', images: ['hero/srq-tower.jpg', 'sectors/airports.jpg'] },
  { name: 'Sarasota County Emergency Operations Center', location: 'Sarasota, FL', sector: 'municipalities', status: 'Completed', partner: 'Ajax Building Corporation',
    details: '40,000 sq ft, Category 5 rated, FEMA 361.', images: ['sectors/municipalities.jpg'] },
  { name: 'University Town Center', location: 'Sarasota, FL', sector: 'retail', status: 'Completed', details: '880,000 sq ft, $315 million.', images: ['sectors/retail.webp'] },
  { name: 'Riverview High School', location: 'Sarasota, FL', sector: 'education', status: 'Completed', details: '421,659 sq ft, $135 million.', images: ['sectors/education.jpg'] },
  { name: 'Heartis of Venice', location: 'Venice, FL', sector: 'healthcare', status: 'Completed', details: '191,000 sq ft senior living community.', images: ['sectors/healthcare-heartis.jpg'] },
];

// Current projects (work in progress), listed on /projects above the photo gallery.
// When one is finished, delete it here (or move it into the gallery above with photos).
export const currentProjects = [
  { name: 'Fleet Facility', location: 'Nokomis, FL', partner: 'Willis A. Smith Construction' },
  { name: 'Pine Echo', location: 'North Fort Myers, FL', partner: 'PIKE Construction' },
  { name: 'City Park', location: 'Bradenton, FL', partner: 'Tandem Construction' },
  { name: 'Tunnel to Towers', location: 'Bradenton, FL', partner: 'ME&S' },
  { name: 'Happy Frog', location: 'Bradenton, FL' },
  { name: 'Grease Monkey', location: 'Palmetto, FL', partner: 'J.E. Charlotte Construction' },
  { name: 'OP-7', location: 'Palmetto, FL', partner: 'J.E. Charlotte Construction' },
  { name: 'Sara Bay', location: 'Sarasota, FL', partner: 'J.E. Charlotte Construction' },
  { name: 'Ed Smith Stadium HVAC Renovation', location: 'Sarasota, FL', partner: 'Tandem Construction' },
  { name: 'Mote SEA', location: 'Sarasota, FL', partner: 'Willis A. Smith Construction' },
];

export const testimonials = [
  { quote: 'The NCN team takes a professional approach to every project. They understand deadlines and go above and beyond to get the job done. They are fair in pricing of change orders, a difficulty with many electricians. I invite them to bid all of my projects.',
    name: 'Dave Sessions', company: 'Willis A. Smith Construction', project: 'Venice Elementary School' },
  { quote: 'When it comes to healthcare facilities, NCN Electric is our electrical contractor of choice due to their experience and vast knowledge.',
    name: 'Keith Coulter', company: 'Dooley Mack Constructors', project: 'VA Nursing Home, Port Charlotte' },
  { quote: 'NCN is proud of its work, likes what it does, and puts their name on every project. That\'s a guarantee of quality for us.',
    name: 'Matt Craig', company: 'Pinkerton & Laws', project: 'Walmart Supercenter, Bradenton' },
  { quote: 'One of the better electrical subcontractors in this market. A great precon team with design and value-engineering expertise, work completed on time with high quality, and strong vendor relationships that help with procurement.',
    name: 'J.E. Charlotte Construction', company: 'J.E. Charlotte Construction', project: 'Bird Key Yacht Club' },
];

export const clients = [
  { name: 'W.G. Mills', logo: 'clients/wg-mills.png' }, { name: 'Willis A. Smith', logo: 'clients/willis-smith.jpg' },
  { name: 'Dooley Mack', logo: 'clients/logo-dooleymack.png' }, { name: 'Archer Western', logo: 'clients/archer-western.png' },
  { name: 'Pinkerton & Laws', logo: 'clients/pinkerton-and-laws.png' }, { name: 'Stellar', logo: 'clients/stellar.png' },
  { name: 'Halfacre Construction', logo: 'clients/halfacre.png' }, { name: '3 Point Construction', logo: 'clients/3-point-con.png' },
  { name: 'J.E. Charlotte', logo: 'clients/je-charlotte.png' }, { name: 'Jon Swift', logo: 'clients/jon-swift-construct.jpg' },
];

export const badges = [
  { name: 'Service-Disabled Veteran-Owned Small Business', logo: 'badges/sdvosb.png' },
  { name: 'Venice award', logo: 'badges/award-venice.png' },
  { name: 'Associated Builders and Contractors', logo: 'badges/abc.png' },
  { name: 'Gulf Coast Builders Exchange', logo: 'badges/gcbx.png' },
  { name: 'Sarasota Chamber member', logo: 'badges/spacc.png' },
];

// Generator rental FAQ.
export const generatorFaq = [
  { q: 'What size generator do I need?', a: 'Use the Power Planner above for a quick estimate. As a rule of thumb, 10 kW runs lights, a DJ and a few vendors; 30 kW handles food trucks and several A/C units; 60 kW powers a stage production or multiple tents. NCN confirms the final size with a quick load review before your event.' },
  { q: 'What does the $350 event package include?', a: 'A 10 kW diesel generator for one rental day ($100) plus delivery, licensed connection, startup, testing and pickup within 40 driving miles of our Venice headquarters ($250). Fuel and sales tax are additional.' },
  { q: 'How is fuel handled?', a: 'Return the generator full, or NCN can supply diesel. NCN-supplied fuel is billed at our actual diesel cost plus $3 per gallon.' },
  { q: 'How many hours can the generator run?', a: 'Each rental day includes up to 10 operating hours. Additional hours are 10% of the daily rate per hour.' },
  { q: 'Do you deliver outside the Venice area?', a: 'Yes. Delivery and setup are included within 40 driving miles. From 40 to 85 miles we add $5 per mile. Beyond 85 miles we prepare a custom quote.' },
  { q: 'Who connects the generator?', a: 'NCN is a licensed electrical contractor (FL EC13010379). Our electricians handle the connection, grounding, startup and testing. A standard connection includes up to 3 combined electrician labor hours.' },
  { q: 'Do I need a permit?', a: 'Some venues and municipalities require permits for temporary power. Tell us your location and we will let you know what applies. Permit fees are additional.' },
  { q: 'Is my quote a reservation?', a: 'No. The online estimate and application are a request. Your reservation is confirmed when NCN approves availability and you accept the final quote.' },
];
