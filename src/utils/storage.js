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
      delayReason: data.delay_reason,
      noProduction: data.no_production || false,
      defects: data.defects, stations: data.stations,
      stations_morning: data.stations_morning, stations_night: data.stations_night,
      operators: data.operators,
      stationLcmMorning:       data.station_lcm_morning        || {},
      stationLcmMorningBoards: data.station_lcm_morning_boards || {},
      stationLcsMorning:       data.station_lcs_morning        || {},
      stationLcsMorningBoards: data.station_lcs_morning_boards || {},
      stationLcmNight:         data.station_lcm_night          || {},
      stationLcmNightBoards:   data.station_lcm_night_boards   || {},
      stationLcsNight:         data.station_lcs_night          || {},
      stationLcsNightBoards:   data.station_lcs_night_boards   || {},
      lcsOutput: data.lcs_output || 0,
      lcsTarget: data.lcs_target || 0,
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
      delay_reason: value.delayReason,
      no_production: value.noProduction || false,
      defects: value.defects, stations: value.stations,
      stations_morning:            value.stations_morning        || {},
      stations_night:              value.stations_night          || {},
      operators:                   value.operators,
      station_lcm_morning:         value.stationLcmMorning       || {},
      station_lcm_morning_boards:  value.stationLcmMorningBoards || {},
      station_lcs_morning:         value.stationLcsMorning       || {},
      station_lcs_morning_boards:  value.stationLcsMorningBoards || {},
      station_lcm_night:           value.stationLcmNight         || {},
      station_lcm_night_boards:    value.stationLcmNightBoards   || {},
      station_lcs_night:           value.stationLcsNight         || {},
      station_lcs_night_boards:    value.stationLcsNightBoards   || {},
      lcs_output:   value.lcsOutput || 0,
      lcs_target:   value.lcsTarget || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'entry_date' });
    return !error;
  }
  return false;
}

export async function storageDel(key) {
  if (key.startsWith('day:')) {
    const date = key.replace('day:', '');
    const { error } = await supabase.from('daily_entries').delete().eq('entry_date', date);
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
        delayReason: d.delay_reason,
        noProduction: d.no_production || false,
        defects: d.defects, stations: d.stations,
        stations_morning: d.stations_morning, stations_night: d.stations_night,
        operators: d.operators,
        stationLcmMorning:       d.station_lcm_morning        || {},
        stationLcmMorningBoards: d.station_lcm_morning_boards || {},
        stationLcsMorning:       d.station_lcs_morning        || {},
        stationLcsMorningBoards: d.station_lcs_morning_boards || {},
        stationLcmNight:         d.station_lcm_night          || {},
        stationLcmNightBoards:   d.station_lcm_night_boards   || {},
        stationLcsNight:         d.station_lcs_night          || {},
        stationLcsNightBoards:   d.station_lcs_night_boards   || {},
        lcsOutput: d.lcs_output || 0,
        lcsTarget: d.lcs_target || 0,
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
    return { month: d.month_year, actual: d.actual_rm, target: d.target_rm, variance: d.variance, reason: d.reason };
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
    .from('daily_materials').select('*').eq('entry_date', date).maybeSingle();
  if (error || !data) return { copperFoil: 0, prepreg: 0 };
  return { copperFoil: data.copper_foil, prepreg: data.prepreg };
}

export async function saveDayMaterials(date, matData) {
  const { error } = await supabase.from('daily_materials').upsert({
    entry_date: date, copper_foil: matData.copperFoil, prepreg: matData.prepreg,
  }, { onConflict: 'entry_date' });
  return !error;
}

export async function getMonthMaterials(month) {
  const parts = month.split('-');
  const lastDay = new Date(parseInt(parts[0]), parseInt(parts[1]), 0).getDate();
  const { data, error } = await supabase
    .from('daily_materials').select('*')
    .gte('entry_date', month + '-01')
    .lte('entry_date', month + '-' + lastDay)
    .order('entry_date', { ascending: true });
  if (error || !data) return [];
  return data.map(function(d) {
    return { date: d.entry_date, copperFoil: d.copper_foil, prepreg: d.prepreg };
  });
}

export async function getMatTargets(month) {
  const { data, error } = await supabase
    .from('material_targets').select('*').eq('month_year', month).maybeSingle();
  if (error || !data) return { copperFoil: 0, prepreg: 0 };
  return { copperFoil: data.copper_foil_target, prepreg: data.prepreg_target };
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
    .from('personal_ot').select('*').eq('entry_date', date).maybeSingle();
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
    .gte('entry_date', from).lte('entry_date', to)
    .order('entry_date', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function getDowntime(date) {
  const { data, error } = await supabase
    .from('station_downtime').select('*').eq('entry_date', date);
  if (error || !data) return [];
  return data;
}

export async function saveDowntime(date, station, hours, reason) {
  const { error } = await supabase.from('station_downtime').upsert({
    entry_date: date, station_name: station, downtime_hours: hours, reason: reason,
  }, { onConflict: 'entry_date,station_name' });
  return !error;
}

export async function getCapacity() {
  const { data, error } = await supabase
    .from('machine_capacity').select('*').order('station_name');
  if (error || !data) return [];
  return data;
}

export async function saveCapacity(station, capacityPerDay, isLocked) {
  const { error } = await supabase.from('machine_capacity').upsert({
    station_name: station,
    capacity_per_hour: capacityPerDay,
    is_locked: isLocked,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'station_name' });
  return !error;
}

export async function getEtchRate(date) {
  const { data, error } = await supabase
    .from('etch_rate').select('*').eq('entry_date', date)
    .order('entry_time', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function saveEtchRate(date, time, value) {
  const { error } = await supabase.from('etch_rate').upsert({
    entry_date: date, entry_time: time, etch_value: value,
  }, { onConflict: 'entry_date,entry_time' });
  return !error;
}

export async function getEtchRateRange(from, to) {
  const { data, error } = await supabase
    .from('etch_rate').select('*')
    .gte('entry_date', from).lte('entry_date', to)
    .order('entry_date', { ascending: true })
    .order('entry_time', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function deleteEtchRate(date, time) {
  const { error } = await supabase.from('etch_rate').delete()
    .eq('entry_date', date).eq('entry_time', time);
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
  const { error } = await supabase.from('operators_list').insert({ name: name, is_active: true });
  return !error;
}

export async function removeOperator(id) {
  const { error } = await supabase.from('operators_list').update({ is_active: false }).eq('id', id);
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
  const { error } = await supabase.from('stations_list').update({ is_active: false }).eq('id', id);
  return !error;
}

export async function updateStationCapacity(id, capacityPerDay) {
  const { error } = await supabase.from('stations_list').update({ capacity_per_day: capacityPerDay }).eq('id', id);
  return !error;
}

export async function saveScrapHistory(date, entry) {
  const { error } = await supabase.from('scrap_history').upsert({
    report_date:        date,
    output_m2:          entry.outputM2,
    grand_total_scrap:  entry.grandTotalScrap,
    masslam_scrap_area: entry.masslamScrapArea,
    masslam_scrap_pct:  entry.masslamScrapPct,
    defect_dent:        entry.defectDent,
    defect_wrinkle:     entry.defectWrinkle,
    defect_scratch:     entry.defectScratch,
    defect_whitish:     entry.defectWhitish,
    defect_void:        entry.defectVoid,
    defect_others:      entry.defectOthers,
    section_totals:     entry.sectionTotals,
    pn_breakdown:       entry.pnBreakdown,
    others_breakdown:   entry.othersBreakdown || {},
    updated_at:         new Date().toISOString(),
  }, { onConflict: 'report_date' });
  return !error;
}

export async function getScrapHistory(from, to) {
  const { data, error } = await supabase
    .from('scrap_history').select('*')
    .gte('report_date', from).lte('report_date', to)
    .order('report_date', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function saveMaterialHistory(month, entry) {
  const { error } = await supabase.from('material_history').upsert({
    report_month:          month,
    output_m2:             entry.outputM2,
    copper_foil_rm:        entry.copperFoilRm,
    prepreg_rm:            entry.prepregRm,
    copper_foil_rm_per_m2: entry.copperFoilRmPerM2,
    prepreg_rm_per_m2:     entry.prepregRmPerM2,
    total_rm:              entry.totalRm,
    total_rm_per_m2:       entry.totalRmPerM2,
    daily_breakdown:       entry.dailyBreakdown,
    updated_at:            new Date().toISOString(),
  }, { onConflict: 'report_month' });
  return !error;
}

export async function getMaterialHistory(from, to) {
  const { data, error } = await supabase
    .from('material_history').select('*')
    .gte('report_month', from)
    .lte('report_month', to)
    .order('report_month', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function saveMaterialDetail(month, rows) {
  const { error: delError } = await supabase
    .from('material_detail')
    .delete()
    .eq('report_month', month);
  if (delError) return false;
  if (!rows.length) return true;
  const { error } = await supabase.from('material_detail').insert(rows.map(function(r) {
    return {
      report_month:   month,
      material_type:  r.materialType,
      product_no:     r.productNo,
      product_name:   r.productName,
      specs:          r.specs,
      unit:           r.unit,
      qty:            r.qty,
      unit_price_rm:  r.unitPriceRm,
      amount_rm:      r.amountRm,
      issue_date:     r.issueDate,
    };
  }));
  return !error;
}

export async function getMaterialDetail(months) {
  const { data, error } = await supabase
    .from('material_detail')
    .select('*')
    .in('report_month', months)
    .order('issue_date', { ascending: true });
  if (error || !data) return [];
  return data;
}
