/* ═══════════════════════════════════════════════════
   FinConsol - Chart Rendering Module
   Wrapper around Chart.js for consistent styling
   ═══════════════════════════════════════════════════ */

const Charts = (() => {
  const COLORS = {
    blue: '#4f8fff',
    green: '#34d399',
    red: '#f87171',
    yellow: '#fbbf24',
    orange: '#fb923c',
    purple: '#a78bfa',
    cyan: '#22d3ee',
    pink: '#f472b6',
    indigo: '#818cf8',
    teal: '#2dd4bf'
  };

  const PALETTE = [COLORS.blue, COLORS.green, COLORS.red, COLORS.yellow, COLORS.orange,
    COLORS.purple, COLORS.cyan, COLORS.pink, COLORS.indigo, COLORS.teal];

  const chartInstances = {};

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9498ab',
          font: { size: 11 },
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 8
        }
      },
      tooltip: {
        backgroundColor: '#1e2130',
        titleColor: '#e8eaf0',
        bodyColor: '#9498ab',
        borderColor: '#2a2d3e',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const val = context.parsed.y ?? context.parsed;
            return `${context.dataset.label}: ${KPIEngine.fmt(val)}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#6b6f82', font: { size: 10 } },
        grid: { color: 'rgba(42,45,62,0.5)', drawBorder: false }
      },
      y: {
        ticks: {
          color: '#6b6f82',
          font: { size: 10 },
          callback: function(value) { return KPIEngine.fmt(value); }
        },
        grid: { color: 'rgba(42,45,62,0.5)', drawBorder: false }
      }
    }
  };

  function destroyChart(canvasId) {
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
      delete chartInstances[canvasId];
    }
  }

  function getCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    destroyChart(canvasId);
    return canvas.getContext('2d');
  }

  // ── Line Chart ──
  function renderLineChart(canvasId, { labels, datasets, options = {} }) {
    const ctx = getCanvas(canvasId);
    if (!ctx) return;

    const chartDatasets = datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color || PALETTE[i % PALETTE.length],
      backgroundColor: (ds.color || PALETTE[i % PALETTE.length]) + '20',
      fill: ds.fill !== undefined ? ds.fill : false,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2
    }));

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: chartDatasets },
      options: mergeOptions(defaultOptions, options)
    });
  }

  // ── Bar Chart ──
  function renderBarChart(canvasId, { labels, datasets, stacked = false, options = {} }) {
    const ctx = getCanvas(canvasId);
    if (!ctx) return;

    const chartDatasets = datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.colors || (ds.color || PALETTE[i % PALETTE.length]) + 'cc',
      borderColor: ds.colors ? ds.colors.map(c => c) : (ds.color || PALETTE[i % PALETTE.length]),
      borderWidth: 1,
      borderRadius: 4,
      maxBarThickness: 40
    }));

    const mergedOpts = mergeOptions(defaultOptions, options);
    if (stacked) {
      mergedOpts.scales.x.stacked = true;
      mergedOpts.scales.y.stacked = true;
    }

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: chartDatasets },
      options: mergedOpts
    });
  }

  // ── Doughnut/Pie Chart ──
  function renderDoughnutChart(canvasId, { labels, data, options = {} }) {
    const ctx = getCanvas(canvasId);
    if (!ctx) return;

    const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#9498ab', font: { size: 11 }, padding: 8, usePointStyle: true }
          },
          tooltip: {
            ...defaultOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${KPIEngine.fmt(context.parsed)} (${pct}%)`;
              }
            }
          }
        },
        ...options
      }
    });
  }

  // ── Horizontal Bar ──
  function renderHorizontalBar(canvasId, { labels, data, colors, options = {} }) {
    const ctx = getCanvas(canvasId);
    if (!ctx) return;

    const barColors = colors || labels.map((_, i) => PALETTE[i % PALETTE.length] + 'cc');

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: barColors,
          borderRadius: 4,
          maxBarThickness: 24
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: defaultOptions.plugins.tooltip
        },
        scales: {
          x: {
            ticks: { color: '#6b6f82', font: { size: 10 }, callback: v => KPIEngine.fmt(v) },
            grid: { color: 'rgba(42,45,62,0.5)' }
          },
          y: {
            ticks: { color: '#9498ab', font: { size: 11 } },
            grid: { display: false }
          }
        },
        ...options
      }
    });
  }

  // ── Waterfall Chart (simulated with stacked bars) ──
  function renderWaterfallChart(canvasId, { labels, values, options = {} }) {
    const ctx = getCanvas(canvasId);
    if (!ctx) return;

    let cumulative = 0;
    const bases = [];
    const positives = [];
    const negatives = [];

    values.forEach((val, i) => {
      if (i === 0 || i === values.length - 1) {
        bases.push(0);
        positives.push(val >= 0 ? val : 0);
        negatives.push(val < 0 ? Math.abs(val) : 0);
        cumulative = val;
      } else {
        if (val >= 0) {
          bases.push(cumulative);
          positives.push(val);
          negatives.push(0);
        } else {
          bases.push(cumulative + val);
          positives.push(0);
          negatives.push(Math.abs(val));
        }
        cumulative += val;
      }
    });

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Base', data: bases, backgroundColor: 'transparent', borderWidth: 0 },
          { label: 'Increase', data: positives, backgroundColor: COLORS.green + 'cc', borderRadius: 4 },
          { label: 'Decrease', data: negatives, backgroundColor: COLORS.red + 'cc', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, ticks: { color: '#6b6f82' }, grid: { display: false } },
          y: { stacked: true, ticks: { color: '#6b6f82', callback: v => KPIEngine.fmt(v) }, grid: { color: 'rgba(42,45,62,0.5)' } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...defaultOptions.plugins.tooltip,
            filter: (item) => item.dataset.label !== 'Base'
          }
        },
        ...options
      }
    });
  }

  // ── Combo Chart (bar + line) ──
  function renderComboChart(canvasId, { labels, barDatasets, lineDatasets, options = {} }) {
    const ctx = getCanvas(canvasId);
    if (!ctx) return;

    const datasets = [];
    barDatasets.forEach((ds, i) => {
      datasets.push({
        type: 'bar',
        label: ds.label,
        data: ds.data,
        backgroundColor: (ds.color || PALETTE[i]) + 'cc',
        borderRadius: 4,
        order: 2
      });
    });
    lineDatasets.forEach((ds, i) => {
      datasets.push({
        type: 'line',
        label: ds.label,
        data: ds.data,
        borderColor: ds.color || PALETTE[barDatasets.length + i],
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2,
        order: 1
      });
    });

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: mergeOptions(defaultOptions, options)
    });
  }

  function mergeOptions(base, custom) {
    const result = JSON.parse(JSON.stringify(base));
    for (const key of Object.keys(custom)) {
      if (typeof custom[key] === 'object' && !Array.isArray(custom[key]) && custom[key] !== null) {
        result[key] = mergeOptions(result[key] || {}, custom[key]);
      } else {
        result[key] = custom[key];
      }
    }
    return result;
  }

  function destroyAll() {
    Object.keys(chartInstances).forEach(id => destroyChart(id));
  }

  return {
    COLORS, PALETTE,
    renderLineChart, renderBarChart, renderDoughnutChart,
    renderHorizontalBar, renderWaterfallChart, renderComboChart,
    destroyChart, destroyAll
  };
})();
