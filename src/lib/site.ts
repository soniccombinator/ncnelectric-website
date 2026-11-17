// Company-wide details used in the header, footer, contact page and search engine data.
// Edit here and every page updates.
export const site = {
  name: 'NCN Electric',
  legalName: 'NCN Electric, Inc.',
  tagline: 'Powering Southwest Florida since 1982',
  founded: 1982,
  license: 'FL EC13010379',
  phone: '(941) 488-0005',
  phoneHref: 'tel:+19414880005',
  fax: '(941) 484-3872',
  email: 'BD@ncnelectric.com',
  hours: 'Monday to Friday, 7:00 am to 4:30 pm',
  linkedin: 'https://www.linkedin.com/company/ncn-electric-inc/',
  offices: [
    { name: 'Venice (Headquarters)', street: '261 Blue Juniper Blvd', city: 'Venice', state: 'FL', zip: '34292',
      map: 'https://www.google.com/maps/search/?api=1&query=261+Blue+Juniper+Blvd+Venice+FL+34292' },
    { name: 'St. Petersburg', street: '4451 8th Ave S', city: 'St. Petersburg', state: 'FL', zip: '33711',
      map: 'https://www.google.com/maps/search/?api=1&query=4451+8th+Ave+S+St+Petersburg+FL+33711' },
  ],
  serviceArea: ['Venice', 'Sarasota', 'Bradenton', 'North Port', 'Port Charlotte', 'Fort Myers', 'St. Petersburg', 'Tampa'],
  generators: {
    contacts: [
      { name: 'Jose', email: 'jalvarenga@ncnelectric.com', phone: '(941) 661-4249', phoneHref: 'tel:+19416614249' },
      { name: 'Blythe', email: 'bsameit@ncnelectric.com', phone: '(704) 998-1933', phoneHref: 'tel:+17049981933' },
    ],
  },
};

export const nav = [
  { label: 'Services', href: '/services' },
  { label: 'Sectors', href: '/sectors' },
  { label: 'Projects', href: '/projects' },
  { label: 'Generator Rentals', href: '/generators', highlight: true },
  { label: 'About', href: '/about', children: [
    { label: 'Our Story', href: '/about' },
    { label: 'Our Team', href: '/team' },
    { label: 'Careers', href: '/careers' },
  ] },
  { label: 'Contact', href: '/contact' },
];
