export const TRADE_TYPES: string[] = [
  'Plumber',
  'Electrician',
  'Painter',
  'Roofer',
  'Carpenter',
  'HVAC Technician',
  'Mason',
  'Landscaper',
  'General Contractor',
  'Tiler',
  'Plasterer',
  'Locksmith',
  'Glazier',
  'Insulation Installer',
  'Solar Panel Installer',
];

export const LEAD_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'interested', label: 'Interested', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'invalid', label: 'Invalid', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

export const COUNTRIES: { value: string; label: string }[] = [
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
];
