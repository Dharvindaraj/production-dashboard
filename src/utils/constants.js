export const DEFECTS = ['Dent', 'Wrinkle', 'Scratch', 'Whitish', 'Void', 'Others'];
export const DEF_COLORS = ['#378ADD', '#EF9F27', '#E24B4A', '#5DCAA5', '#7F77DD', '#888780'];

export const STATION_NAMES = [
  'Oxide', 'Glicap', 'Baking', 'Rivet', 'Setup',
  'Preparation', 'Pulse bonding', 'CCD Welding', 'Layup 1', 'Layup 2',
  'Vigor press', 'Buckle press', 'Routing 1', 'Routing 2',
  'Xray 1', 'Xray 2', 'TTST'
];

export const OPERATORS = [
  'Geetha', 'Ye Min Tun', 'Mohan', 'Suraj', 'Kantrin',
  'Indra Kumar', 'Febrina', 'Azim', 'MD Lukman Hossein', 'Ratan Barai',
  'Ram Pukar', 'Yojana', 'Durga', 'Kanchan', 'MD Mamun Ali',
  'Jueel Islam', 'Ridan', 'MD Rejaul Karim', 'MD Omar Ali', 'Eyamin',
  'Tanbir', 'Ilyas Bin Noorizan', 'Ratan Limbu', 'Tin Lin Aung', 'Chit Min Ko',
  'Kyaw Kyaw Lin', 'Gajindra Kumar', 'Dharmendra', 'Shankar', 'Roshan Kumar Sah',
  'Raj Kishor', 'Roshan Kumar Das', 'Prakash Chhetri', 'Ajay Mandal',
  'Ashyam Kishor Mahato', 'Siti Zahra', 'Ririn', 'Laila', 'Yuva'
];

export const SHIFT_OPTIONS = [
  { value: 'day',      label: 'Day (7am-7pm)',   hours: 12, short: '7am-7pm',  color: '#EAF3DE', tc: '#27500A' },
  { value: 'night',    label: 'Night (7pm-7am)', hours: 12, short: '7pm-7am',  color: '#EAF3DE', tc: '#27500A' },
  { value: 'cut_self', label: 'Cut OT (self)',    hours: 9,  short: 'Self cut', color: '#FCEBEB', tc: '#791F1F' },
  { value: 'cut_mgmt', label: 'Cut OT (mgmt)',    hours: 9,  short: 'Mgmt cut', color: '#E6F1FB', tc: '#0C447C' },
  { value: 'absent',   label: 'Absent',           hours: 0,  short: 'Absent',   color: '#F1EFE8', tc: '#5F5E5A' },
];

export const N_STN = 17;

export const ETCH_TARGET = 1.6;
export const ETCH_UCL = 1.75;
export const ETCH_LCL = 1.45;
export const ETCH_USL = 1.8;
export const ETCH_LSL = 1.4;

export const PAGE_TITLES = {
  overview:   'Overview',
  entry:      'Daily entry',
  stations:   'Stations',
  downtime:   'Downtime',
  capacity:   'Machine capacity',
  trends:     'Trends',
  materials:  'Materials',
  etchrate:   'Etch rate SPC',
  personalot: 'Personal OT',
  history:    'History log',
};

export function tod(d) {
  if (!d) d = new Date();
  return d.toISOString().slice(0, 10);
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return tod(d);
}

export function filterDays(days, from, to) {
  return days.filter(function(x) {
    return (!from || x.date >= from) && (!to || x.date <= to);
  });
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function isWeekend(dateStr) {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

export function calcOT(scanIn, scanOut, dateStr) {
  if (!scanIn || !scanOut) return 0;
  const weekend = isWeekend(dateStr);
  const inParts = scanIn.split(':');
  const outParts = scanOut.split(':');
  const inH = parseInt(inParts[0]);
  const inM = parseInt(inParts[1]);
  const outH = parseInt(outParts[0]);
  const outM = parseInt(outParts[1]);
  const inMins = inH * 60 + inM;
  let outMins = outH * 60 + outM;
  if (outMins < inMins) outMins += 24 * 60;
  const totalMins = outMins - inMins;
  if (weekend) return parseFloat((totalMins / 60).toFixed(2));
  const otStart = 18 * 60 + 30;
  if (outMins <= otStart) return 0;
  const otMins = outMins - Math.max(inMins, otStart);
  return parseFloat((otMins / 60).toFixed(2));
}
