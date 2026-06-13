import { useState, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { storageGet, storageSet, saveScrapHistory } from '../../utils/storage';
import { daysAgo } from '../../utils/constants';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const MY_SECTION = 'Fac2_Masslam';

const DEFECT_COLORS = {
  'Dent':    '#378ADD',
  'Wrinkle': '#EF9F27',
  'Scratch': '#E24B4A',
  'Whitish': '#5DCAA5',
  'Void':    '#7F77DD',
  'Others':  '#888780',
};

function mapDefect(reason) {
  if (!reason) return 'Others';
  const upper = reason.toString().toUpperCase().trim();
  if (upper === 'DENT')              return 'Dent';
  if (upper === 'WRINKLE')           return 'Wrinkle';
  if (upper === 'WHITISH')           return 'Whitish';
  if (upper === 'VOID')              return 'Void';
  if (upper.includes('SCRATCH'))     return 'Scratch';
  return 'Others';
}

function isOthers(reason) {
  if (!reason) return false;
  const upper = reason.toString().toUpperCase().trim();
  return upper !== 'DENT' && upper !== 'WRINKLE' && upper !== 'WHITISH' && upper !== 'VOID' && !upper.includes('SCRATCH');
}
export default function ScrapPage({ darkMode, toast }) {
  const [data, setData]         = useState(null);
  const [fileName, setFileName] = useState('');
  const [outputM2, setOutputM2] = useState('');
  const [pushing, setPushing]         = useState(false);
  const [pushed, setPushed]           = useState(false);
  const [customPushDate, setCustomPushDate] = useState(false);
  const [pushDate, setPushDate]       = useState('');
  const [pushingMain, setPushingMain] = useState(false);
  const [pushedMain, setPushedMain]   = useState(false);
  const [fileDate, setFileDate]     = useState('');
  const [manualDate, setManualDate]   = useState(daysAgo(1));
  const [mainPushDate, setMainPushDate] = useState(daysAgo(1));
  const [dragging, setDragging] = useState(false);
  const [sortCol, setSortCol]   = useState('scrapArea');
  const [sortDir, setSortDir]   = useState('desc');
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666';

  function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];

      const range = XLSX.utils.decode_range(ws['!ref']);
      const allRows = [];
      for (var R = range.s.r; R <= range.e.r; R++) {
        var row = [];
        for (var C = range.s.c; C <= range.e.c; C++) {
          var addr = XLSX.utils.encode_cell({ r: R, c: C });
          var cell = ws[addr];
          row.push(cell ? (cell.v !== undefined ? cell.v : '') : '');
        }
        allRows.push(row);
      }



      var headerRow = allRows.findIndex(function(r) {
        return r.some(function(c) { return String(c).includes('Station Name'); });
      });
      if (headerRow < 0) { toast('Cannot find header row — check file format'); return; }

      var dataRows = allRows.slice(headerRow + 1);

      var grandTotalScrapArea = 0;
      var masslamTotalScrapArea = 0;

      var myRows = [];
      var sectionTotals = {};

      dataRows.forEach(function(r) {
        var station = String(r[0] || '').trim();
        if (!station) return;

        var scrapArea = parseFloat(r[7]) || 0;

        if (station === 'Grand Total:') {
          grandTotalScrapArea = scrapArea;
        } else if (station.includes('Total:')) {
          var secName = station.replace(' Total:', '').trim();
          sectionTotals[secName] = { scrapArea: scrapArea };
        } else if (station === MY_SECTION) {
          var reason = String(r[5] || '').trim();
          var scrapQty = parseFloat(r[6]) || 0;
          myRows.push({
            station:     station,
            scrapNo:     String(r[1] || '').trim(),
            inPlantItem: String(r[2] || '').trim(),
            offSitePart: String(r[3] || '').trim(),
            lotsNo:      String(r[4] || '').trim(),
            reason:      reason,
            scrapQty:    scrapQty,
            scrapArea:   scrapArea,
          });
        }
      });

      var myDefects = {};
      var othersBreakdown = {};
      myRows.forEach(function(r) {
        var cat = mapDefect(r.reason);
        if (!myDefects[cat]) myDefects[cat] = 0;
        myDefects[cat] += r.scrapArea;
        if (isOthers(r.reason) && r.reason && r.scrapArea > 0) {
          var reason = r.reason.trim();
          if (!othersBreakdown[reason]) othersBreakdown[reason] = 0;
          othersBreakdown[reason] += r.scrapArea;
        }
      });

      var myTotalScrapArea = myRows.reduce(function(s,r){return s+r.scrapArea;},0);



      var dateMatch = file.name.match(/BeginDate(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) setFileDate(dateMatch[1]);

      setData({
        myRows,
        myDefects,
        myTotalScrapArea,
        grandTotalScrapArea,
        sectionTotals,
        othersBreakdown,
      });
      setFileName(file.name);
      setPushed(false);
      toast('Loaded — ' + myRows.length + ' Masslam records · Grand total: ' + grandTotalScrapArea.toFixed(4) + ' m²');
    };
    reader.readAsBinaryString(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    var file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  }

  function onFileChange(e) {
    var file = e.target.files[0];
    if (file) parseExcel(file);
  }

  var outputNum = parseFloat(outputM2) || 0;
  var denom = outputNum + (data ? data.grandTotalScrapArea : 0);

  function calcPct(scrapArea) {
    if (denom <= 0) return 0;
    return parseFloat((scrapArea / denom * 100).toFixed(4));
  }

  var totalScrapPct = useMemo(function() {
    return data ? calcPct(data.myTotalScrapArea) : 0;
  }, [outputNum, data]);

  var defectChartData = useMemo(function() {
    if (!data) return { labels: [], datasets: [] };
    var labels = Object.keys(data.myDefects);
    return {
      labels: labels,
      datasets: [{
        data: labels.map(function(k) { return parseFloat(calcPct(data.myDefects[k]).toFixed(4)); }),
        backgroundColor: labels.map(function(k) { return DEFECT_COLORS[k] || '#888780'; }),
        borderWidth: 0,
        hoverOffset: 4,
      }]
    };
  }, [outputNum, data]);

  async function exportPDF() {
    if (!data) return;
    setExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const margin = 12;
      const contentW = pageW - margin * 2;
      var yPos = 15;

      pdf.setFillColor(24, 95, 165);
      pdf.rect(0, 0, pageW, 32, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Masslam Daily Scrap Report', margin, 11);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Report date: ' + (fileDate || new Date().toISOString().slice(0,10)), margin, 18);
      pdf.text('Generated: ' + new Date().toLocaleString('en-MY'), margin, 23);
      pdf.text('Output: ' + (outputM2||'—') + ' m²', margin, 28);
      pdf.text('Grand total scrap: ' + data.grandTotalScrapArea.toFixed(4) + ' m²', margin+40, 28);
      pdf.text('Masslam scrap: ' + (outputM2?totalScrapPct.toFixed(4)+'%':'—'), margin+105, 28);
      yPos = 40;

      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Masslam Summary', margin, yPos);
      yPos += 6;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      var summaryData = [
        ['Masslam scrap area', data.myTotalScrapArea.toFixed(4) + ' m²'],
        ['Grand total scrap area', data.grandTotalScrapArea.toFixed(4) + ' m²'],
        ['Masslam scrap %', outputM2 ? totalScrapPct.toFixed(4) + '%' : 'Key in output'],
        ['Total scrap records', data.myRows.length + ' records'],
        ['Defect types', Object.keys(data.myDefects).length + ' types'],
      ];
      summaryData.forEach(function(row) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(row[0] + ':', margin, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(row[1], margin + 60, yPos);
        yPos += 5;
      });
      yPos += 4;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Defect Breakdown — Masslam', margin, yPos);
      yPos += 6;

      var defHeaders = ['Defect', 'Scrap Area (m²)', outputM2 ? 'Scrap %' : ''];
      var defRows = Object.entries(data.myDefects).sort(function(a,b){return b[1]-a[1];}).map(function(e){
        return [e[0], e[1].toFixed(4), outputM2 ? calcPct(e[1]).toFixed(4)+'%' : ''];
      });

      pdf.setFillColor(24, 95, 165);
      pdf.rect(margin, yPos-4, contentW, 6, 'F');
      pdf.setTextColor(255,255,255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica','bold');
      pdf.text('Defect', margin+2, yPos);
      pdf.text('Scrap Area (m²)', margin+70, yPos);
      if (outputM2) pdf.text('Scrap %', margin+120, yPos);
      yPos += 5;

      pdf.setTextColor(30,30,30);
      pdf.setFont('helvetica','normal');
      defRows.forEach(function(row, i) {
        if (i % 2 === 0) { pdf.setFillColor(245,245,243); pdf.rect(margin, yPos-3.5, contentW, 5.5, 'F'); }
        pdf.text(row[0], margin+2, yPos);
        pdf.text(row[1], margin+70, yPos);
        if (outputM2) pdf.text(row[2], margin+120, yPos);
        yPos += 5.5;
      });
      yPos += 6;

      if (reportRef.current) {
        var chartEls = reportRef.current.querySelectorAll('canvas');
        var validCharts = [];
        for (var ci = 0; ci < chartEls.length; ci++) {
          if (chartEls[ci].width > 10 && chartEls[ci].height > 10) validCharts.push(chartEls[ci]);
        }
        if (validCharts.length >= 2) {
          if (yPos > 180) { pdf.addPage(); yPos = 15; }
          pdf.setFontSize(11);
          pdf.setFont('helvetica','bold');
          pdf.setTextColor(30,30,30);
          pdf.text('Charts', margin, yPos);
          yPos += 6;
          var halfW = (contentW - 6) / 2;
          try {
            var img1 = validCharts[0].toDataURL('image/png');
            var h1 = halfW * validCharts[0].height / validCharts[0].width;
            h1 = Math.min(h1, 60);
            pdf.addImage(img1, 'PNG', margin, yPos, halfW, h1);
          } catch(e) {}
          try {
            var img2 = validCharts[1].toDataURL('image/png');
            var h2 = halfW * validCharts[1].height / validCharts[1].width;
            h2 = Math.min(h2, 60);
            pdf.addImage(img2, 'PNG', margin + halfW + 6, yPos, halfW, h2);
          } catch(e) {}
          yPos += 66;
          if (validCharts.length >= 3) {
            try {
              var img3 = validCharts[2].toDataURL('image/png');
              var h3 = contentW * validCharts[2].height / validCharts[2].width;
              h3 = Math.min(h3, 55);
              if (yPos + h3 > 270) { pdf.addPage(); yPos = 15; }
              pdf.addImage(img3, 'PNG', margin, yPos, contentW, h3);
              yPos += h3 + 6;
            } catch(e) {}
          }
        }
      }
      yPos += 4;

      if (yPos > 220) { pdf.addPage(); yPos = 15; }
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30,30,30);
      pdf.text('Top 10 Worst Part Numbers', margin, yPos);
      yPos += 6;

      var pnMap2 = {};
      data.myRows.forEach(function(r) {
        var key = r.offSitePart || r.inPlantItem;
        if (!key) return;
        if (!pnMap2[key]) pnMap2[key] = { pn: key, totalArea: 0, defects: {} };
        pnMap2[key].totalArea += r.scrapArea;
        var cat = mapDefect(r.reason);
        if (!pnMap2[key].defects[cat]) pnMap2[key].defects[cat] = 0;
        pnMap2[key].defects[cat] += r.scrapArea;
      });
      var ranked2 = Object.values(pnMap2).sort(function(a,b){return b.totalArea-a.totalArea;}).slice(0,10);

      pdf.setFillColor(24, 95, 165);
      pdf.rect(margin, yPos-4, contentW, 6, 'F');
      pdf.setTextColor(255,255,255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica','bold');
      pdf.text('#', margin+2, yPos);
      pdf.text('Part Number', margin+10, yPos);
      pdf.text('Scrap Area', margin+80, yPos);
      pdf.text('Top Defect', margin+110, yPos);
      if (outputM2) pdf.text('Scrap %', margin+148, yPos);
      yPos += 5;

      pdf.setTextColor(30,30,30);
      pdf.setFont('helvetica','normal');
      ranked2.forEach(function(item, i) {
        if (yPos > 270) { pdf.addPage(); yPos = 15; }
        if (i % 2 === 0) { pdf.setFillColor(245,245,243); pdf.rect(margin, yPos-3.5, contentW, 5.5, 'F'); }
        var topDef = Object.entries(item.defects).sort(function(a,b){return b[1]-a[1];})[0];
        pdf.text(String(i+1), margin+2, yPos);
        pdf.text(item.pn.slice(0,22), margin+10, yPos);
        pdf.text(item.totalArea.toFixed(4)+' m²', margin+80, yPos);
        pdf.text(topDef ? topDef[0] : '—', margin+110, yPos);
        if (outputM2) pdf.text(calcPct(item.totalArea).toFixed(4)+'%', margin+148, yPos);
        yPos += 5.5;
      });
      yPos += 6;

      if (yPos > 220) { pdf.addPage(); yPos = 15; }
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30,30,30);
      pdf.text('Full Scrap Detail — Masslam', margin, yPos);
      yPos += 6;

      pdf.setFillColor(24, 95, 165);
      pdf.rect(margin, yPos-4, contentW, 6, 'F');
      pdf.setTextColor(255,255,255);
      pdf.setFontSize(7);
      pdf.setFont('helvetica','bold');
      pdf.text('Part No', margin+2, yPos);
      pdf.text('Lot', margin+42, yPos);
      pdf.text('Reason', margin+68, yPos);
      pdf.text('Cat', margin+112, yPos);
      pdf.text('Qty', margin+130, yPos);
      pdf.text('Area m²', margin+142, yPos);
      if (outputM2) pdf.text('%', margin+162, yPos);
      yPos += 5;

      pdf.setTextColor(30,30,30);
      pdf.setFont('helvetica','normal');
      data.myRows.forEach(function(r, i) {
        if (yPos > 280) { pdf.addPage(); yPos = 15; }
        if (i % 2 === 0) { pdf.setFillColor(245,245,243); pdf.rect(margin, yPos-3.5, contentW, 5, 'F'); }
        var cat = mapDefect(r.reason);
        pdf.text((r.offSitePart||r.inPlantItem||'').slice(0,18), margin+2, yPos);
        pdf.text((r.lotsNo||'').slice(0,10), margin+42, yPos);
        pdf.text((r.reason||'').slice(0,20), margin+68, yPos);
        pdf.text(cat.slice(0,8), margin+112, yPos);
        pdf.text(String(r.scrapQty), margin+130, yPos);
        pdf.text(r.scrapArea.toFixed(4), margin+142, yPos);
        if (outputM2) pdf.text(calcPct(r.scrapArea).toFixed(4)+'%', margin+162, yPos);
        yPos += 5;
      });

      var reportName = 'Masslam_Scrap_' + (fileDate || new Date().toISOString().slice(0,10)) + '.pdf';
      pdf.save(reportName);
      toast('PDF exported: ' + reportName);
    } catch(err) {
      toast('PDF error: ' + err.message);
      console.error(err);
    }
    setExporting(false);
  }

  async function pushToMain() {
    if (!outputM2)  { toast('Please key in output m² first'); return; }
    if (!data)      { toast('No data loaded'); return; }
    var pushDate = fileDate || manualDate;
    if (!pushDate)  { toast('Cannot detect date — please select a date manually'); return; }
    setPushingMain(true);

    const pnMap = {};
    data.myRows.forEach(function(r) {
      const key = r.offSitePart || r.inPlantItem;
      if (!key) return;
      if (!pnMap[key]) pnMap[key] = { pn: key, totalArea: 0, defects: {} };
      pnMap[key].totalArea += r.scrapArea;
      const cat = mapDefect(r.reason);
      if (!pnMap[key].defects[cat]) pnMap[key].defects[cat] = 0;
      pnMap[key].defects[cat] += r.scrapArea;
    });

    var pushDate = fileDate || mainPushDate;
    const ok = await saveScrapHistory(pushDate, {
      outputM2:          parseFloat(outputM2),
      grandTotalScrap:   data.grandTotalScrapArea,
      masslamScrapArea:  data.myTotalScrapArea,
      masslamScrapPct:   totalScrapPct,
      defectDent:        calcPct(data.myDefects['Dent']||0),
      defectWrinkle:     calcPct(data.myDefects['Wrinkle']||0),
      defectScratch:     calcPct(data.myDefects['Scratch']||0),
      defectWhitish:     calcPct(data.myDefects['Whitish']||0),
      defectVoid:        calcPct(data.myDefects['Void']||0),
      defectOthers:      calcPct(data.myDefects['Others']||0),
      sectionTotals:     data.sectionTotals,
      pnBreakdown:       pnMap,
      othersBreakdown:   data.othersBreakdown || {},
    });

    setPushingMain(false);
    if (ok) { setPushedMain(true); toast('Saved to scrap history — ' + pushDate); }
    else toast('Error saving to history');
  }

  async function pushToYesterday() {
    if (!outputM2) { toast('Please key in output m² first'); return; }
    if (!data)     { toast('No data loaded'); return; }
    setPushing(true);

    var targetDate = customPushDate && pushDate ? pushDate : daysAgo(1);
    var existing  = await storageGet('day:' + targetDate);

    var defPct = {};
    Object.entries(data.myDefects).forEach(function(entry) {
      defPct[entry[0]] = calcPct(entry[1]);
    });

    var defectsObj = {
      Dent:    parseFloat((defPct['Dent']   ||0).toFixed(2)),
      Wrinkle: parseFloat((defPct['Wrinkle']||0).toFixed(2)),
      Scratch: parseFloat((defPct['Scratch']||0).toFixed(2)),
      Whitish: parseFloat((defPct['Whitish']||0).toFixed(2)),
      Void:    parseFloat((defPct['Void']   ||0).toFixed(2)),
      Others:  parseFloat((defPct['Others'] ||0).toFixed(2)),
    };

    var updated = Object.assign({}, existing || {}, {
      scrap:   parseFloat(totalScrapPct.toFixed(2)),
      defects: defectsObj,
    });

    var ok = await storageSet('day:' + targetDate, updated);
    setPushing(false);
    if (ok) { setPushed(true); toast('Pushed to ' + yesterday + ' daily entry!'); setCustomPushDate(false); setPushDate(''); }
    else toast('Error pushing data');
  }

  var defectLabels  = data ? Object.keys(data.myDefects) : [];
  var defectColors  = defectLabels.map(function(k) { return DEFECT_COLORS[k] || '#888780'; });
  var sectionLabels = data ? Object.keys(data.sectionTotals).map(function(k) { return k.replace('Fac2_','').replace('GP_',''); }) : [];
  var sectionColors = sectionLabels.map(function(l) { return l.toLowerCase().includes('masslam') ? '#E24B4A' : 'rgba(55,138,221,0.5)'; });

  return (
    <div>
      {!data ? (
        <div>
          <div style={{background:'#185FA5',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
            <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Scrap tracker</div>
            <div style={{fontSize:20,fontWeight:500}}>Daily scrap analysis</div>
            <div style={{fontSize:12,opacity:.8,marginTop:4}}>Upload your daily scrap report · Fac2_Masslam prioritized · Push to daily entry</div>
          </div>
          <div
            onDragOver={function(e){e.preventDefault();setDragging(true);}}
            onDragLeave={function(){setDragging(false);}}
            onDrop={onDrop}
            onClick={function(){document.getElementById('scrap-file-input').click();}}
            style={{border:'2px dashed '+(dragging?'#378ADD':'var(--border2)'),borderRadius:12,padding:'60px 20px',textAlign:'center',background:dragging?'rgba(55,138,221,0.05)':'var(--bg3)',transition:'all .2s',cursor:'pointer'}}>
            <div style={{fontSize:40,marginBottom:12}}>📊</div>
            <div style={{fontSize:15,fontWeight:500,color:'var(--text)',marginBottom:8}}>Drop your scrap report Excel here</div>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:16}}>Supports .xlsx · Processed locally · Zero bandwidth</div>
            <button className="btn-primary" style={{pointerEvents:'none'}}>Or click to browse</button>
            <input id="scrap-file-input" type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={onFileChange} />
          </div>
          <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              {icon:'🔒',title:'100% private',desc:'File never leaves your browser'},
              {icon:'🎯',title:'Masslam focused',desc:'Prioritizes your section in all cards'},
              {icon:'🔄',title:'Push to entry',desc:'One click saves to yesterday\'s daily entry'},
            ].map(function(item){
              return (
                <div key={item.title} className="card" style={{textAlign:'center',padding:'16px 12px'}}>
                  <div style={{fontSize:24,marginBottom:8}}>{item.icon}</div>
                  <div style={{fontSize:12,fontWeight:500,color:'var(--text)',marginBottom:4}}>{item.title}</div>
                  <div style={{fontSize:11,color:'var(--text2)'}}>{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div ref={reportRef}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{fileName}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>
                {fileDate && 'Report date: ' + fileDate + ' · '}
                Grand total scrap: {data.grandTotalScrapArea.toFixed(4)} m²
              </div>
            </div>
            <button className="btn-ghost" onClick={function(){setData(null);setFileName('');setPushed(false);}}>Load new file</button>
            <button className="btn-primary" onClick={exportPDF} disabled={exporting}
              style={{background:'#A32D2D'}}>
              {exporting ? 'Generating PDF...' : '📄 Export PDF'}
            </button>
          </div>

          <div className="card" style={{marginBottom:12,border:'1px solid '+(pushed?'#1D9E75':'#378ADD'),background:pushed?'rgba(29,158,117,0.05)':'rgba(55,138,221,0.05)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:'var(--text)',marginBottom:4}}>Push scrap data to daily entry</div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <div style={{fontSize:11,color:'var(--text2)'}}>
                  Push to: <strong>{customPushDate ? (pushDate||'select date') : 'yesterday ('+daysAgo(1)+')'}</strong>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}
                  onClick={function(){setCustomPushDate(function(v){return !v;});setPushed(false);}}>
                  <div style={{width:16,height:16,borderRadius:3,border:'1.5px solid '+(customPushDate?'#378ADD':'var(--border2)'),
                    background:customPushDate?'#378ADD':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {customPushDate && <span style={{color:'#fff',fontSize:11,fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontSize:11,color:customPushDate?'#378ADD':'var(--text2)'}}>Custom date</span>
                </div>
                {customPushDate && (
                  <input type="date" value={pushDate}
                    onChange={function(e){setPushDate(e.target.value);setPushed(false);}}
                    style={{fontSize:11,padding:'4px 8px',border:'1px solid #378ADD',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                )}
              </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <div className="fg" style={{margin:0}}>
                  <label style={{fontSize:11,color:'var(--text2)',display:'block',marginBottom:4}}>Yesterday output (m²)</label>
                  <input type="number" value={outputM2} placeholder="e.g. 3200"
                    onChange={function(e){setOutputM2(e.target.value);setPushed(false);}}
                    style={{width:140,fontSize:12,padding:'6px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                </div>
                {outputM2 && (
                  <div style={{fontSize:11,color:'var(--text2)',textAlign:'right'}}>
                    <div>Denom: {denom.toFixed(2)} m²</div>
                    <div style={{color:'#E24B4A',fontWeight:500}}>Masslam scrap: {totalScrapPct.toFixed(4)}%</div>
                  </div>
                )}
                <div style={{display:'flex',gap:8,flexDirection:'column'}}>
                <button className="btn-primary" onClick={pushToYesterday}
                  disabled={pushing||pushed||!outputM2}
                  style={{background:pushed?'#1D9E75':pushing?'#888':'#185FA5',minWidth:160}}>
                  {pushed?'✓ Pushed!':pushing?'Pushing...':'→ Push to '+(customPushDate&&pushDate?pushDate:daysAgo(1))}
                </button>
                <button className="btn-primary" onClick={pushToMain}
                  disabled={pushingMain||pushedMain||!outputM2}
                  style={{background:pushedMain?'#1D9E75':pushingMain?'#888':'#A32D2D',minWidth:160}}>
                  {pushedMain?'✓ Saved to history!':pushingMain?'Saving...':'→ Push to main history · '+mainPushDate}
                </button>
              </div>
              </div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            <div className="kpi-card" style={{border:'2px solid #E24B4A'}}>
              <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>🏭</div>
              <div className="kpi-label">Masslam scrap %</div>
              <div className="kpi-val" style={{color:'#E24B4A'}}>{outputM2?totalScrapPct.toFixed(4)+'%':'—'}</div>
              <div className="kpi-footer text-muted">{data.myTotalScrapArea.toFixed(4)} m² scrapped</div>
              <div className="kpi-bar" style={{background:'#E24B4A'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}>📋</div>
              <div className="kpi-label">Scrap records</div>
              <div className="kpi-val">{data.myRows.length}</div>
              <div className="kpi-footer text-muted">Masslam section</div>
              <div className="kpi-bar" style={{background:'#EF9F27'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}>📦</div>
              <div className="kpi-label">Grand total scrap</div>
              <div className="kpi-val">{data.grandTotalScrapArea.toFixed(2)}</div>
              <div className="kpi-footer text-muted">m² all sections</div>
              <div className="kpi-bar" style={{background:'#378ADD'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}>🔢</div>
              <div className="kpi-label">Defect types</div>
              <div className="kpi-val">{Object.keys(data.myDefects).length}</div>
              <div className="kpi-footer text-muted">in Masslam</div>
              <div className="kpi-bar" style={{background:'#1D9E75'}} />
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Masslam defect breakdown</div>
                  <div className="card-sub">{outputM2?'% = scrapArea / (output + grandTotal)':'Key in output to see %'}</div>
                </div>
              </div>
              <div style={{maxHeight:280,overflowY:'auto'}}>
                {Object.entries(data.myDefects).sort(function(a,b){return b[1]-a[1];}).map(function(entry){
                  var name=entry[0], area=entry[1];
                  var pct = calcPct(area);
                  var maxArea = Math.max.apply(null, Object.values(data.myDefects));
                  return (
                    <div key={name} style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                        <span style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{width:10,height:10,borderRadius:2,background:DEFECT_COLORS[name]||'#888',flexShrink:0,display:'inline-block'}}></span>
                          {name}
                        </span>
                        <span style={{fontWeight:500,color:DEFECT_COLORS[name]||'#888'}}>
                          {area.toFixed(4)} m² {outputM2?'('+pct.toFixed(4)+'%)':''}
                        </span>
                      </div>
                      <div style={{height:6,background:'var(--bg3)',borderRadius:3}}>
                        <div style={{height:'100%',width:(area/maxArea*100).toFixed(1)+'%',background:DEFECT_COLORS[name]||'#888',borderRadius:3}}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div><div className="card-title">Masslam defect distribution</div><div className="card-sub">By scrap area (m²)</div></div></div>
              <div style={{height:220}}>
                <Doughnut key={'donut-'+outputNum}
                  data={defectChartData}
                  options={{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'right',labels:{font:{size:10},boxWidth:10,color:tickColor}},tooltip:{callbacks:{label:function(ctx){return ctx.label+': '+ctx.parsed.toFixed(4)+'%';}}}}}}
                />
              </div>
            </div>
          </div>

          <div className="card" style={{marginBottom:12}}>
            <div className="card-head">
              <div>
                <div className="card-title">Section comparison — scrap area (m²)</div>
                <div className="card-sub">Red = Masslam · Blue = other sections</div>
              </div>
            </div>
            <div style={{height:220}}>
              <Bar key={'secbar-'+outputNum}
                data={{
                  labels: sectionLabels,
                  datasets:[{
                    label:'Scrap area (m²)',
                    data: data ? Object.values(data.sectionTotals).map(function(s){return parseFloat(s.scrapArea.toFixed(4));}) : [],
                    backgroundColor: sectionColors,
                    borderRadius: 4,
                  }]
                }}
                options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                  x:{ticks:{font:{size:9},autoSkip:false,maxRotation:45,color:tickColor},grid:{display:false}},
                  y:{ticks:{font:{size:9},color:tickColor,callback:function(v){return v+' m²';}},grid:{color:gridColor}}
                }}}
              />
            </div>
          </div>

          {(function(){
            var pnMap = {};
            data.myRows.forEach(function(r) {
              if (!r.inPlantItem) return;
              if (!pnMap[r.offSitePart]) pnMap[r.offSitePart] = { pn: r.offSitePart, totalArea: 0, defects: {} };
              pnMap[r.offSitePart].totalArea += r.scrapArea;
              var cat = mapDefect(r.reason);
              if (!pnMap[r.offSitePart].defects[cat]) pnMap[r.offSitePart].defects[cat] = 0;
              pnMap[r.offSitePart].defects[cat] += r.scrapArea;
            });

            var ranked = Object.values(pnMap).sort(function(a,b){return b.totalArea-a.totalArea;}).slice(0,10);
            if (!ranked.length) return null;

            var maxArea = ranked[0].totalArea;
            var DCOLORS = {'Dent':'#378ADD','Wrinkle':'#EF9F27','Scratch':'#E24B4A','Whitish':'#5DCAA5','Void':'#7F77DD','Others':'#888780'};

            var barData = {
              labels: ranked.map(function(r){ return r.pn.length>18?r.pn.slice(0,18)+'...':r.pn; }),
              datasets: ['Dent','Wrinkle','Scratch','Whitish','Void','Others'].map(function(def){
                return {
                  label: def,
                  data: ranked.map(function(r){ return parseFloat(calcPct(r.defects[def]||0).toFixed(4)); }),
                  backgroundColor: DCOLORS[def],
                  stack: 's',
                  borderRadius: 2,
                };
              })
            };

            return (
              <div className="card" style={{marginBottom:12}}>
                <div className="card-head">
                  <div>
                    <div className="card-title">Top {ranked.length} worst part numbers</div>
                    <div className="card-sub">Ranked by total scrap area · stacked by defect type</div>
                  </div>
                </div>
                <div className="legend-row">
                  {['Dent','Wrinkle','Scratch','Whitish','Void','Others'].map(function(d){
                    return <span key={d} className="leg"><span className="leg-dot" style={{background:DCOLORS[d]}}></span>{d}</span>;
                  })}
                </div>
                <div style={{height:280}}>
                  <Bar key={'topbar-'+outputNum} data={barData}
                    options={{responsive:true,maintainAspectRatio:false,
                      plugins:{legend:{display:false},tooltip:{callbacks:{
                        label:function(ctx){return ctx.dataset.label+': '+ctx.parsed.y.toFixed(4)+' m²';},
                        footer:function(items){var t=items.reduce(function(s,i){return s+i.parsed.y;},0);return 'Total: '+t.toFixed(4)+' m²'+(outputM2?' ('+calcPct(t).toFixed(4)+'%)':'');}
                      }}},
                      scales:{
                        x:{stacked:true,ticks:{font:{size:9},autoSkip:false,maxRotation:45,color:tickColor},grid:{display:false}},
                        y:{stacked:true,ticks:{font:{size:9},color:tickColor,callback:function(v){return v+' m²';}},grid:{color:gridColor}}
                      }
                    }}
                  />
                </div>
                <div style={{marginTop:14}}>
                  {ranked.map(function(item, i){
                    var topDefect = Object.entries(item.defects).sort(function(a,b){return b[1]-a[1];})[0];
                    var pct = calcPct(item.totalArea);
                    return (
                      <div key={item.pn} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                        <div style={{width:24,height:24,borderRadius:'50%',background:i===0?'#FCEBEB':i===1?'#FAEEDA':'#F1EFE8',color:i===0?'#791F1F':i===1?'#633806':'#444',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{i+1}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.pn}</div>
                          <div style={{fontSize:10,color:'var(--text2)'}}>
                            Top defect: <span style={{color:DCOLORS[topDefect[0]],fontWeight:500}}>{topDefect[0]}</span> ({topDefect[1].toFixed(4)} m²)
                            {' · '}{Object.keys(item.defects).length} defect types
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:13,fontWeight:500,color:'#E24B4A'}}>{item.totalArea.toFixed(4)} m²</div>
                          {outputM2 && <div style={{fontSize:10,color:'var(--text2)'}}>{pct.toFixed(4)}%</div>}
                        </div>
                        <div style={{width:80,flexShrink:0}}>
                          <div style={{height:6,background:'var(--bg3)',borderRadius:3}}>
                            <div style={{height:'100%',width:(item.totalArea/maxArea*100).toFixed(1)+'%',background:'#E24B4A',borderRadius:3}}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {(function(){
            function toggleSort(col) {
              if (sortCol === col) setSortDir(function(d){return d==='asc'?'desc':'asc';});
              else { setSortCol(col); setSortDir('desc'); }
            }
            function sortArrow(col) {
              if (sortCol !== col) return ' ↕';
              return sortDir === 'asc' ? ' ↑' : ' ↓';
            }
            var sortedRows = data.myRows.slice().sort(function(a,b){
              var av, bv;
              if (sortCol==='pn')        { av=a.offSitePart; bv=b.offSitePart; }
              else if (sortCol==='lot')  { av=a.lotsNo; bv=b.lotsNo; }
              else if (sortCol==='reason'){av=a.reason; bv=b.reason; }
              else if (sortCol==='cat')  { av=mapDefect(a.reason); bv=mapDefect(b.reason); }
              else if (sortCol==='qty')  { av=a.scrapQty; bv=b.scrapQty; }
              else                       { av=a.scrapArea; bv=b.scrapArea; }
              if (typeof av==='string') return sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av);
              return sortDir==='asc'?av-bv:bv-av;
            });
            return (
              <div className="card">
                <div className="card-head">
                  <div><div className="card-title">Masslam scrap detail</div><div className="card-sub">{data.myRows.length} records · click column header to sort</div></div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        {[['pn','Part number'],['lot','Lot'],['reason','Defect reason'],['cat','Category'],['qty','Scrap qty'],['scrapArea','Scrap area (m²)']].map(function(col){
                          return (
                            <th key={col[0]} onClick={function(){toggleSort(col[0]);}}
                              style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap',background:sortCol===col[0]?'rgba(55,138,221,0.1)':''}}>
                              {col[1]}{sortArrow(col[0])}
                            </th>
                          );
                        })}
                        {outputM2 && <th onClick={function(){toggleSort('pct');}} style={{cursor:'pointer',userSelect:'none'}}>Scrap %{sortArrow('pct')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map(function(r, i) {
                        var cat = mapDefect(r.reason);
                        return (
                          <tr key={i}>
                            <td style={{fontSize:11,whiteSpace:'nowrap'}}>{r.offSitePart}</td>
                            <td style={{fontSize:11,whiteSpace:'nowrap'}}>{r.lotsNo}</td>
                            <td style={{fontSize:11,color:'var(--text2)'}}>{r.reason}</td>
                            <td>
                              <span style={{padding:'2px 7px',borderRadius:10,fontSize:10,fontWeight:500,background:(DEFECT_COLORS[cat]||'#888')+'22',color:DEFECT_COLORS[cat]||'#888'}}>
                                {cat}
                              </span>
                            </td>
                            <td style={{fontSize:11,textAlign:'right'}}>{r.scrapQty}</td>
                            <td style={{fontSize:11,textAlign:'right',fontWeight:500}}>{r.scrapArea.toFixed(4)}</td>
                            {outputM2 && <td style={{fontSize:11,textAlign:'right',color:'#E24B4A'}}>{calcPct(r.scrapArea).toFixed(4)}%</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
