import { Line } from 'react-chartjs-2';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

const gradientPlugin = {
  id: 'gradientPlugin',
  beforeDatasetsUpdate: function(chart) {
    var ctx    = chart.ctx;
    var area   = chart.chartArea;
    if (!area) return;
    var height = area.bottom - area.top;
    chart.data.datasets.forEach(function(ds) {
      if (!ds._wantsGradient) return;
      var color  = ds._baseColor || '#378ADD';
      var rgb    = hexToRgb(color);
      var grad   = ctx.createLinearGradient(0, area.top, 0, area.bottom);
      grad.addColorStop(0,   'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.4)');
      grad.addColorStop(0.5, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.15)');
      grad.addColorStop(1,   'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.0)');
      ds.backgroundColor = grad;
    });
  }
};

export default function GradientLine({ id, data, options, height }) {
  var enhancedData = Object.assign({}, data, {
    datasets: (data.datasets || []).map(function(ds) {
      if (!ds.fill) return ds;
      return Object.assign({}, ds, {
        _wantsGradient: true,
        _baseColor: ds.borderColor || '#378ADD',
        backgroundColor: 'transparent'
      });
    })
  });

  var enhancedOptions = Object.assign({}, options, {
    plugins: Object.assign({}, (options && options.plugins) || {}, {
      gradientPlugin: {}
    })
  });

  return (
    <div style={{ position: 'relative', height: height || 180 }}>
      <Line
        id={id}
        data={enhancedData}
        options={enhancedOptions}
        plugins={[gradientPlugin]}
      />
    </div>
  );
}
