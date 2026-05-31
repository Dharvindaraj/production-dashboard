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
export const ETCH_UCL    = 1.75;
export const ETCH_LCL    = 1.45;
export const ETCH_USL    = 1.8;
export const ETCH_LSL    = 1.4;

export const OT_BASE_RATE = 19.23;
export const OT_RATE_1_5  = 19.23 * 1.5;
export const OT_RATE_2_0  = 19.23 * 2.0;
export const OT_RATE_3_0  = 19.23 * 3.0;

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
  settings:   'Settings',
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
  const d = new Date(dateStr).getDay();
  return d === 0 || d === 6;
}

export function calcOT(scanIn, scanOut, dateStr, isPublicHoliday) {
  if (!scanIn || !scanOut) return { hours: 0, amount: 0, breakdown: 'No scan data' };

  const toMins = function(t) {
    const p = t.split(':');
    return parseInt(p[0]) * 60 + parseInt(p[1]);
  };

  const day    = new Date(dateStr).getDay();
  const isSat  = day === 6;
  const isSun  = day === 0;

  const inMins  = toMins(scanIn);
  let outMins   = toMins(scanOut);
  if (outMins < inMins) outMins += 24 * 60;

  const rawHours = (outMins - inMins) / 60;
  let otHours = 0;
  let amount  = 0;
  let breakdown = '';

  if (isPublicHoliday) {
    const worked  = Math.max(0, rawHours - 1);
    const first8  = Math.min(worked, 8);
    const after8  = Math.max(0, worked - 8);
    otHours   = worked;
    amount    = (first8 * OT_RATE_2_0) + (after8 * OT_RATE_3_0);
    breakdown = first8.toFixed(2) + 'h x RM' + OT_RATE_2_0.toFixed(3);
    if (after8 > 0) breakdown += ' + ' + after8.toFixed(2) + 'h x RM' + OT_RATE_3_0.toFixed(3);
  } else if (isSun) {
    const worked = Math.max(0, rawHours - 1);
    otHours  = worked;
    amount   = worked * OT_RATE_2_0;
    breakdown = worked.toFixed(2) + 'h x RM' + OT_RATE_2_0.toFixed(3);
  } else if (isSat) {
    const worked = Math.max(0, rawHours - 1);
    otHours  = worked;
    amount   = worked * OT_RATE_1_5;
    breakdown = worked.toFixed(2) + 'h x RM' + OT_RATE_1_5.toFixed(3);
  } else {
    const otStart = toMins('18:30');
    if (outMins <= otStart) {
      otHours = 0; amount = 0; breakdown = 'No OT';
    } else {
      otHours  = (outMins - otStart) / 60;
      amount   = otHours * OT_RATE_1_5;
      breakdown = otHours.toFixed(2) + 'h x RM' + OT_RATE_1_5.toFixed(3);
    }
  }

  return {
    hours:     parseFloat(otHours.toFixed(2)),
    amount:    parseFloat(amount.toFixed(2)),
    breakdown: breakdown
  };
}
