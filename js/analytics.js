// =============================================
// FleetFlow - Operational Analytics Logic
// =============================================

let allStats = [];

function renderAnalytics() {
    const vehicles = DB.getAll('vehicles');
    const trips = DB.getAll('trips');
    const drivers = DB.getAll('drivers');

    allStats = vehicles.filter(v => v.status !== 'Retired').map(v => DB.getVehicleStats(v.id)).filter(Boolean);

    // Summary KPIs
    const totalRevenue = allStats.reduce((s, v) => s + v.totalRevenue, 0);
    const totalCost = allStats.reduce((s, v) => s + v.totalCost, 0);
    const netProfit = totalRevenue - totalCost;
    const totalTrips = trips.filter(t => t.status === 'Completed').length;
    const avgSafety = drivers.length ? Math.round(drivers.reduce((s, d) => s + d.safetyScore, 0) / drivers.length) : 0;

    const kpiEl = document.getElementById('an-kpi');
    if (kpiEl) {
        kpiEl.innerHTML = `
      <div class="kpi-card kpi-green"><div class="kpi-header"><span class="kpi-label">Total Revenue</span><div class="kpi-icon">💵</div></div><div class="kpi-value" style="font-size:22px;">${formatCurrency(totalRevenue)}</div></div>
      <div class="kpi-card kpi-red"><div class="kpi-header"><span class="kpi-label">Total Costs</span><div class="kpi-icon">💸</div></div><div class="kpi-value" style="font-size:22px;">${formatCurrency(totalCost)}</div></div>
      <div class="kpi-card ${netProfit >= 0 ? 'kpi-green' : 'kpi-red'}"><div class="kpi-header"><span class="kpi-label">Net Profit</span><div class="kpi-icon">📈</div></div><div class="kpi-value" style="font-size:22px;">${formatCurrency(netProfit)}</div></div>
      <div class="kpi-card kpi-blue"><div class="kpi-header"><span class="kpi-label">Completed Trips</span><div class="kpi-icon">✅</div></div><div class="kpi-value">${totalTrips}</div></div>
      <div class="kpi-card kpi-purple"><div class="kpi-header"><span class="kpi-label">Avg Safety Score</span><div class="kpi-icon">🏆</div></div><div class="kpi-value">${avgSafety}</div></div>
    `;
    }

    // ROI Table
    const roiBody = document.getElementById('roi-body');
    if (roiBody) {
        roiBody.innerHTML = allStats.map(s => {
            const net = s.totalRevenue - s.totalCost;
            const roiCls = parseFloat(s.roi) >= 0 ? 'roi-positive' : 'roi-negative';
            return `<tr>
        <td><span class="text-blue fw-600">${s.vehicle.plate}</span></td>
        <td>${s.vehicle.model}</td>
        <td>${makeTypeTag(s.vehicle.type)}</td>
        <td>${s.trips}</td>
        <td class="text-green fw-600">${formatCurrency(s.totalRevenue)}</td>
        <td>${formatCurrency(s.totalFuel)}</td>
        <td>${formatCurrency(s.totalMaintenance)}</td>
        <td class="text-amber">${formatCurrency(s.totalCost)}</td>
        <td class="${net >= 0 ? 'roi-positive' : 'roi-negative'}">${formatCurrency(net)}</td>
        <td>${formatCurrency(s.vehicle.acquisitionCost)}</td>
        <td class="${roiCls}">${s.roi}%</td>
        <td>${s.fuelEfficiency > 0 ? s.fuelEfficiency + ' km/L' : '—'}</td>
        <td>${s.costPerKm > 0 ? '₹' + s.costPerKm + '/km' : '—'}</td>
      </tr>`;
        }).join('') || '<tr><td colspan="13" style="text-align:center;padding:40px;color:var(--text-muted);">No data yet</td></tr>';
    }

    // Driver Performance Table
    const dperfBody = document.getElementById('dperf-body');
    if (dperfBody) {
        dperfBody.innerHTML = drivers.map(d => {
            const scoreBarCls = d.safetyScore >= 85 ? 'progress-green' : d.safetyScore >= 65 ? 'progress-amber' : 'progress-red';
            return `<tr>
        <td><span class="td-main">${d.name}</span></td>
        <td>${makeTypeTag(d.category)}</td>
        <td><span class="fw-700 text-blue">${d.tripsCompleted}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="progress-bar-wrap" style="width:60px;"><div class="progress-bar ${scoreBarCls}" style="width:${d.safetyScore}%"></div></div>
            <span class="fw-600">${d.safetyScore}</span>
          </div>
        </td>
        <td>${expiryPill(d.licenseExpiry)}</td>
        <td>${makePill(d.status)}</td>
      </tr>`;
        }).join('');
    }

    renderCharts();
}

function renderCharts() {
    const fuelCanvas = document.getElementById('chart-fuel');
    if (!fuelCanvas) return;

    const labels = allStats.map(s => s.vehicle.plate);
    const fuelEff = allStats.map(s => parseFloat(s.fuelEfficiency) || 0);
    const fuelCosts = allStats.map(s => s.totalFuel);
    const maintCosts = allStats.map(s => s.totalMaintenance);
    const revenues = allStats.map(s => s.totalRevenue);
    const totalCosts = allStats.map(s => s.totalCost);

    const chartDefaults = {
        responsive: true,
        plugins: { legend: { labels: { color: '#8b9cc8', font: { family: 'Inter', size: 12 } } } },
        scales: {
            x: { ticks: { color: '#8b9cc8', font: { family: 'Inter' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#8b9cc8', font: { family: 'Inter' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        }
    };

    // Fuel Efficiency Chart
    new Chart(fuelCanvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: 'km/L', data: fuelEff, backgroundColor: 'rgba(34,197,94,0.7)', borderColor: '#22c55e', borderWidth: 1, borderRadius: 6 }]
        },
        options: chartDefaults
    });

    // Cost Breakdown Stacked
    const costCanvas = document.getElementById('chart-cost');
    if (costCanvas) {
        new Chart(costCanvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Fuel Cost', data: fuelCosts, backgroundColor: 'rgba(79,142,247,0.75)', borderRadius: 4 },
                    { label: 'Maintenance', data: maintCosts, backgroundColor: 'rgba(245,158,11,0.75)', borderRadius: 4 },
                ]
            },
            options: { ...chartDefaults, scales: { ...chartDefaults.scales, x: { ...chartDefaults.scales.x, stacked: true }, y: { ...chartDefaults.scales.y, stacked: true } } }
        });
    }

    // Revenue vs Cost
    const revCanvas = document.getElementById('chart-rev');
    if (revCanvas) {
        new Chart(revCanvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Revenue (₹)', data: revenues, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 },
                    { label: 'Total Cost (₹)', data: totalCosts, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
                ]
            },
            options: chartDefaults
        });
    }

    // Trip Status Doughnut
    const tripCanvas = document.getElementById('chart-trips');
    if (tripCanvas) {
        const trips = DB.getAll('trips');
        const statuses = ['Dispatched', 'Completed', 'Cancelled', 'Draft'];
        const counts = statuses.map(s => trips.filter(t => t.status === s).length);
        new Chart(tripCanvas, {
            type: 'doughnut',
            data: {
                labels: statuses,
                datasets: [{ data: counts, backgroundColor: ['rgba(79,142,247,0.8)', 'rgba(34,197,94,0.8)', 'rgba(239,68,68,0.8)', 'rgba(107,125,170,0.6)'], borderWidth: 0 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#8b9cc8', font: { family: 'Inter', size: 12 } } } } }
        });
    }
}

function exportCSVReport() {
    const headers = ['Vehicle', 'Model', 'Type', 'Trips', 'Revenue', 'Fuel Cost', 'Maint Cost', 'Total Cost', 'Net Profit', 'Acq Cost', 'ROI %', 'Fuel Eff (km/L)', 'Cost/km'];
    const rows = allStats.map(s => [
        s.vehicle.plate, s.vehicle.model, s.vehicle.type, s.trips,
        s.totalRevenue, s.totalFuel, s.totalMaintenance, s.totalCost,
        (s.totalRevenue - s.totalCost), s.vehicle.acquisitionCost, s.roi,
        s.fuelEfficiency, s.costPerKm
    ]);
    exportCSV('fleetflow-analytics-report.csv', headers, rows);
}

function exportPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(20);
        doc.setTextColor(79, 142, 247);
        doc.text('FleetFlow — Operational Analytics Report', 14, 18);

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 140);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 26);

        const headers = [['Vehicle', 'Model', 'Trips', 'Revenue', 'Fuel', 'Maint.', 'Total Cost', 'Net', 'ROI%', 'km/L', '₹/km']];
        const rows = allStats.map(s => [
            s.vehicle.plate, s.vehicle.model, s.trips,
            formatCurrency(s.totalRevenue), formatCurrency(s.totalFuel),
            formatCurrency(s.totalMaintenance), formatCurrency(s.totalCost),
            formatCurrency(s.totalRevenue - s.totalCost),
            s.roi + '%', s.fuelEfficiency, s.costPerKm
        ]);

        doc.autoTable({
            startY: 32,
            head: headers,
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [22, 28, 42], textColor: [79, 142, 247], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fillColor: [17, 21, 32], textColor: [200, 210, 240], fontSize: 8 },
            alternateRowStyles: { fillColor: [22, 28, 42] },
            styles: { lineColor: [40, 50, 80], lineWidth: 0.3 },
        });

        // Driver table
        const driverHeaders = [['Driver', 'Category', 'Trips', 'Safety Score', 'License Expiry', 'Status']];
        const driverRows = DB.getAll('drivers').map(d => [d.name, d.category, d.tripsCompleted, d.safetyScore, d.licenseExpiry, d.status]);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 12,
            head: driverHeaders,
            body: driverRows,
            theme: 'grid',
            headStyles: { fillColor: [22, 28, 42], textColor: [34, 197, 94], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fillColor: [17, 21, 32], textColor: [200, 210, 240], fontSize: 8 },
            styles: { lineColor: [40, 50, 80], lineWidth: 0.3 },
        });

        doc.save('fleetflow-report.pdf');
        Toast.success('PDF report exported!');
    } catch (e) {
        Toast.error('PDF export failed. Please try CSV instead.');
        console.error(e);
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('analytics.html')) {
        renderAnalytics();
    }
});
