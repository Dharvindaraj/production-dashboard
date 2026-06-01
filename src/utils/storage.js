import { supabase } from './supabase';

export async function storageGet(key) {
  if (key.startsWith('day:')) {
    const date = key.replace('day:', '');
    const { data, error } = await supabase
      .from('daily_entries').select('*')
      .eq('entry_date', date).maybeSingle();
    if (error || !data) return null;
    return {
      output: data.output, target: data.target,
      scrap: data.scrap_rate, aoi: data.aoi_rate,
      dent: data.aoi_dent, scratch: data.aoi_scratch, wrinkle: data.aoi_wrinkle,
      mh: data.manhours, m2hr: data.m2hr, notes: data.notes,
      defects: data.defects, stations: data.stations,
      stations_morning: data.stations_morning, stations_night: data.stations_night,
      operators: data.operators,
    };
  }
  if (key.startsWith('mat:')) {
    const month = key.replace('mat:', '');
    const { data, error } = await supabase
      .from('material_costs').select('*')
      .eq('month_year', month).maybeSingle();
    if (error || !data) return null;
    return {
      actual: data.actual_rm, target: data.target_rm,
      variance: data.variance, reason: data.reason,
    };
  }
  return null;
}

export async function storageSet(key, value) {
  if (key.startsWith('day:')) {
    const date = key.replace('day:', '');
    const { error } = await supabase.from('daily_entries').upsert({
      entry_date: date,
      output: value.output, target: value.target,
      scrap_rate: value.scrap, aoi_rate: value.aoi,
      aoi_dent: value.dent, aoi_scratch: value.scratch, aoi_wrinkle: value.wrinkle,
      manhours: value.mh, m2hr: value.m2hr, notes: value.notes,
      defects: value.defects, stations: value.stations,
      stations_morning: value.stations_morning || {},
      stations_night: value.stations_night || {},
      operators: value.operators,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'entry_date' });
    return !error;
  }
  return false;
}

export async function storageDel(key) {
  if (key.startsWith('day:')) {
    const date = key.replace('day:', '');
    const { error } = await supabase.from('daily_entries')
      .delete().eq('entry_date', date);
    return !error;
  }
  return false;
}

export async function getAllDays() {
  const { data, error } = await supabase
    .from('daily_entries').select('*')
    .order('entry_date', { ascending: true });
  if (error || !data) return [];
  return data.map(function(d) {
    return {
      date: d.entry_date,
      data: {
        output: d.output, target: d.target,
        scrap: d.scrap_rate, aoi: d.aoi_rate,
        dent: d.aoi_dent, scratch: d.aoi_scratch, wrinkle: d.aoi_wrinkle,
        mh: d.manhours, m2hr: d.m2hr, notes: d.notes,
        defects: d.defects, stations: d.stations,
        stations_morning: d.stations_morning, stations_night: d.stations_night,
        operators: d.operators,
      }
    };
  });
}

export async function getAllMats() {
  const { data, error } = await supabase
    .from('material_costs').select('*')
    .order('month_year', { ascending: true });
  if (error || !data) return [];
  return data.map(function(d) {
    return {
      month: d.month_year, actual: d.actual_rm,
      target: d.target_rm, variance: d.variance, reason: d.reason,
    };
  });
}

export async function saveMat(month, actual, target, reason) {
  const { error } = await supabase.from('material_costs').upsert({
    month_year: month, actual_rm: actual, target_rm: target,
    variance: parseFloat((actual - target).toFixed(4)), reason,
  }, { onConflict: 'month_year' });
  return !error;
}

export async function getDayMaterials(date) {
  const { data, error } = await supabase
    .from('daily_materials').select('*')
    .eq('entry_date', date).maybeSingle();
  if (error || !data) return { copperFoil: 0, prepreg: 0 };
  return { copperFoil: data.copper_foil, prepreg: data.prepreg };
}

export async function saveDayMaterials(date, matData) {
  const { error } = await supabase.from('daily_materials').upsert({
    entry_date: date,
    copper_foil: matData.copperFoil,
    prepreg: matData.prepreg,
  }, { onConflict: 'entry_date' });
  return !error;
}

export async function getMonthMaterials(month) {
  const { data, error } = await supabase
    .from('daily_materials').select('*')
    .gte('entry_date', month + '-01')
    .lte('entry_date', month + '-31')
    .order('entry_date', { ascending: true });
  if (error || !data) return [];
  return data.map(function(d) {
    return { date: d.entry_date, copperFoil: d.copper_foil, prepreg: d.prepreg };
  });
}

export async function getMatTargets(month) {
  const { data, error } = await supabase
    .from('material_targets').select('*')
    .eq('month_year', month).maybeSingle();
  if (error || !data) return { copperFoil: 0, prepreg: 0 };
  return {
    copperFoil: data.copper_foil_target,
    prepreg: data.prepreg_target,
  };
}

export async function saveMatTargets(month, targets) {
  const { error } = await supabase.from('material_targets').upsert({
    month_year: month,
    copper_foil_target: targets.copperFoil,
    prepreg_target: targets.prepreg,
  }, { onConflict: 'month_year' });
  return !error;
}

export async function getPersonalOT(date) {
  const { data, error } = await supabase
    .from('personal_ot').select('*')
    .eq('entry_date', date).maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function savePersonalOT(date, entry) {
  const { error } = await supabase.from('personal_ot').upsert({
    entry_date: date,
    scan_in: entry.scanIn,
    scan_out: entry.scanOut,
    ot_hours: entry.otHours,
    ot_amount: entry.otAmount,
    is_weekend: entry.isWeekend,
    is_public_holiday: entry.isPublicHoliday,
    notes: entry.notes,
  }, { onConflict: 'entry_date' });
  return !error;
}

export async function getPersonalOTRange(from, to) {
  const { data, error } = await supabase
    .from('personal_ot').select('*')
    .gte('entry_date', from)
    .lte('entry_date', to)
    .order('entry_date', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function getDowntime(date) {
  const { data, error } = await supabase
    .from('station_downtime').select('*')
    .eq('entry_date', date);
  if (error || !data) return [];
  return data;
}

export async function saveDowntime(date, station, hours, reason) {
  const { error } = await supabase.from('station_downtime').upsert({
    entry_date: date,
    station_name: station,
    downtime_hours: hours,
    reason: reason,
  }, { onConflict: 'entry_date,station_name' });
  return !error;
}

export async function getCapacity() {
  const { data, error } = await supabase
    .from('machine_capacity').select('*')
    .order('station_name');
  if (error || !data) return [];
  return data;
}

export async function saveCapacity(station, capacityPerHour, isLocked) {
  const { error } = await supabase.from('machine_capacity').upsert({
    station_name: station,
    capacity_per_hour: capacityPerHour,
    is_locked: isLocked,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'station_name' });
  return !error;
}

export async function getEtchRate(date) {
  const { data, error } = await supabase
    .from('etch_rate').select('*')
    .eq('entry_date', date)
    .order('entry_time', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function saveEtchRate(date, time, value) {
  const { error } = await supabase.from('etch_rate').upsert({
    entry_date: date,
    entry_time: time,
    etch_value: value,
  }, { onConflict: 'entry_date,entry_time' });
  return !error;
}

export async function getEtchRateRange(from, to) {
  const { data, error } = await supabase
    .from('etch_rate').select('*')
    .gte('entry_date', from)
    .lte('entry_date', to)
    .order('entry_date', { ascending: true })
    .order('entry_time', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function deleteEtchRate(date, time) {
  const { error } = await supabase.from('etch_rate').delete()
    .eq('entry_date', date)
    .eq('entry_time', time);
  return !error;
}

export async function getOperatorsList() {
  const { data, error } = await supabase
    .from('operators_list').select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function addOperator(name) {
  const { error } = await supabase.from('operators_list').insert({
    name: name, is_active: true,
  });
  return !error;
}

export async function removeOperator(id) {
  const { error } = await supabase.from('operators_list')
    .update({ is_active: false }).eq('id', id);
  return !error;
}

export async function getStationsList() {
  const { data, error } = await supabase
    .from('stations_list').select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function addStation(name, capacityPerDay) {
  const { error } = await supabase.from('stations_list').insert({
    name: name, capacity_per_day: capacityPerDay, is_active: true,
  });
  return !error;
}

export async function removeStation(id) {
  const { error } = await supabase.from('stations_list')
    .update({ is_active: false }).eq('id', id);
  return !error;
}

export async function updateStationCapacity(id, capacityPerDay) {
  const { error } = await supabase.from('stations_list')
    .update({ capacity_per_day: capacityPerDay }).eq('id', id);
  return !error;
}
