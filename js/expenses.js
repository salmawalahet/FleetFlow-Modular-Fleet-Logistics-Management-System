// =============================================
// FleetFlow - Expenses Page Logic
// =============================================

function openExpenseModal() {
    const tripSel = document.getElementById('ne-trip');
    const vehicleSel = document.getElementById('ne-vehicle');
    const driverSel = document.getElementById('ne-driver');
    if (!tripSel || !vehicleSel || !driverSel) return;

    const trips = DB.getAll('trips');
    const vehicles = DB.getAll('vehicles');
    const drivers = DB.getAll('drivers');

    tripSel.innerHTML = '<option value="">— Optional —</option>' +
        trips.map(t => `<option value="${t.id}">#${t.id.toUpperCase()} — ${t.origin} → ${t.destination}</option>`).join('');
    vehicleSel.innerHTML = '<option value="">— Select vehicle —</option>' +
        vehicles.filter(v => v.status !== 'Retired').map(v => `<option value="${v.id}">${v.plate} — ${v.model}</option>`).join('');
    driverSel.innerHTML = '<option value="">— Select driver —</option>' +
        drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    const dateInp = document.getElementById('ne-date');
    if (dateInp) dateInp.value = new Date().toISOString().split('T')[0];

    const errEl = document.getElementById('ne-error');
    if (errEl) errEl.classList.remove('show');

    Modal.open('modal-new-expense');
}

function autofillFromTrip() {
    const tripId = document.getElementById('ne-trip').value;
    if (!tripId) return;
    const trip = DB.getById('trips', tripId);
    if (!trip) return;
    const vSel = document.getElementById('ne-vehicle');
    const dSel = document.getElementById('ne-driver');
    const fInp = document.getElementById('ne-fuel');
    if (vSel) vSel.value = trip.vehicleId;
    if (dSel) dSel.value = trip.driverId;
    if (fInp && trip.fuelExpense) fInp.value = trip.fuelExpense;
}

function saveExpense() {
    const vehicleId = document.getElementById('ne-vehicle').value;
    const date = document.getElementById('ne-date').value;
    const errEl = document.getElementById('ne-error');

    if (!vehicleId || !date) {
        if (errEl) { errEl.textContent = 'Vehicle and date are required.'; errEl.classList.add('show'); }
        return;
    }
    if (errEl) errEl.classList.remove('show');

    DB.insert('expenses', {
        tripId: document.getElementById('ne-trip').value || null,
        vehicleId,
        driverId: document.getElementById('ne-driver').value || null,
        date,
        liters: parseFloat(document.getElementById('ne-liters').value) || 0,
        fuelCost: parseFloat(document.getElementById('ne-fuel').value) || 0,
        miscCost: parseFloat(document.getElementById('ne-misc').value) || 0,
        notes: document.getElementById('ne-notes').value.trim(),
    });

    Modal.close('modal-new-expense');
    Toast.success('Expense recorded!');
    renderExpenses();
}

function deleteExpense(id) {
    if (!confirm('Delete this expense log?')) return;
    DB.remove('expenses', id);
    Toast.info('Expense removed.');
    renderExpenses();
}

function exportExpenses() {
    const expenses = DB.getAll('expenses');
    const vehicles = DB.getAll('vehicles');
    const drivers = DB.getAll('drivers');
    const headers = ['ID', 'Trip ID', 'Vehicle', 'Driver', 'Liters', 'Fuel Cost (₹)', 'Misc Cost (₹)', 'Total (₹)', 'Date'];
    const rows = expenses.map(e => {
        const v = vehicles.find(v => v.id === e.vehicleId) || {};
        const d = drivers.find(d => d.id === e.driverId) || {};
        return [e.id, e.tripId || '—', v.plate || '—', d.name || '—', e.liters || 0, e.fuelCost || 0, e.miscCost || 0, (parseFloat(e.fuelCost || 0) + parseFloat(e.miscCost || 0)), e.date];
    });
    exportCSV('fleetflow-expenses.csv', headers, rows);
}

function renderExpenses() {
    const searchEl = document.getElementById('e-search');
    const vehicleFilterEl = document.getElementById('e-vehicle');
    if (!searchEl || !vehicleFilterEl) return;

    const search = searchEl.value.toLowerCase();
    const vehicleF = vehicleFilterEl.value;
    const expenses = DB.getAll('expenses').slice().reverse();
    const vehicles = DB.getAll('vehicles');
    const drivers = DB.getAll('drivers');

    // Populate vehicle filter
    const curVal = vehicleFilterEl.value;
    vehicleFilterEl.innerHTML = '<option value="all">All Vehicles</option>' +
        vehicles.filter(v => v.status !== 'Retired').map(v => `<option value="${v.id}" ${curVal === v.id ? 'selected' : ''}>${v.plate}</option>`).join('');

    // KPIs
    const totalFuel = expenses.reduce((s, e) => s + (parseFloat(e.fuelCost) || 0), 0);
    const totalMisc = expenses.reduce((s, e) => s + (parseFloat(e.miscCost) || 0), 0);
    const totalLiters = expenses.reduce((s, e) => s + (parseFloat(e.liters) || 0), 0);
    const kpiEl = document.getElementById('exp-kpi');
    if (kpiEl) {
        kpiEl.innerHTML = `
      <div class="kpi-card kpi-red"><div class="kpi-header"><span class="kpi-label">Total Fuel Cost</span><div class="kpi-icon">⛽</div></div><div class="kpi-value" style="font-size:22px;">${formatCurrency(totalFuel)}</div></div>
      <div class="kpi-card kpi-amber"><div class="kpi-header"><span class="kpi-label">Misc Expenses</span><div class="kpi-icon">🧾</div></div><div class="kpi-value" style="font-size:22px;">${formatCurrency(totalMisc)}</div></div>
      <div class="kpi-card kpi-blue"><div class="kpi-header"><span class="kpi-label">Total Operational Cost</span><div class="kpi-icon">💰</div></div><div class="kpi-value" style="font-size:22px;">${formatCurrency(totalFuel + totalMisc)}</div></div>
      <div class="kpi-card kpi-green"><div class="kpi-header"><span class="kpi-label">Total Fuel (L)</span><div class="kpi-icon">🔵</div></div><div class="kpi-value">${formatNum(totalLiters, 0)}</div></div>
    `;
    }

    // Table
    const body = document.getElementById('e-body');
    if (!body) return;

    const filtered = expenses.filter(e => {
        const v = vehicles.find(v => v.id === e.vehicleId) || {};
        const d = drivers.find(d => d.id === e.driverId) || {};
        const matchSearch = !search || `${e.id} ${e.tripId || ''} ${v.plate || ''} ${d.name || ''}`.toLowerCase().includes(search);
        const matchVehicle = vehicleF === 'all' || e.vehicleId === vehicleF;
        return matchSearch && matchVehicle;
    });

    body.innerHTML = filtered.map(e => {
        const v = vehicles.find(v => v.id === e.vehicleId) || {};
        const d = drivers.find(d => d.id === e.driverId) || {};
        const trip = e.tripId ? DB.getById('trips', e.tripId) : null;
        const total = (parseFloat(e.fuelCost) || 0) + (parseFloat(e.miscCost) || 0);
        return `<tr>
      <td><span class="text-blue fw-600">#${e.id.toUpperCase()}</span></td>
      <td>${e.tripId ? `<span class="text-secondary">#${e.tripId.toUpperCase()}</span>` : '—'}</td>
      <td><div class="td-main">${v.plate || '—'}</div><div class="td-sub">${v.model || ''}</div></td>
      <td>${d.name || '—'}</td>
      <td>${trip?.distance ? trip.distance + ' km' : '—'}</td>
      <td>${e.liters || 0} L</td>
      <td>${formatCurrency(e.fuelCost)}</td>
      <td>${formatCurrency(e.miscCost)}</td>
      <td class="text-amber fw-700">${formatCurrency(total)}</td>
      <td>${formatDate(e.date)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteExpense('${e.id}')">🗑️</button></td>
    </tr>`;
    }).join('');
    const emptyEl = document.getElementById('e-table-empty');
    if (emptyEl) emptyEl.style.display = filtered.length === 0 ? 'block' : 'none';

    // Per-vehicle cost summary
    const summaryEl = document.getElementById('vehicle-cost-summary');
    if (summaryEl) {
        summaryEl.innerHTML = vehicles.filter(v => v.status !== 'Retired').map(v => {
            const stats = DB.getVehicleStats(v.id);
            if (!stats || stats.totalCost === 0) return '';
            return `<div style="padding:12px 0;border-bottom:1px solid var(--border-color);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div>
            <span class="fw-600" style="font-size:13px;">${v.plate}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:6px;">${v.model}</span>
          </div>
          <span class="text-amber fw-700">${formatCurrency(stats.totalCost)}</span>
        </div>
        <div style="font-size:11px;color:var(--text-secondary);display:flex;gap:12px;">
          <span>⛽ Fuel: ${formatCurrency(stats.totalFuel)}</span>
          <span>🔧 Maint: ${formatCurrency(stats.totalMaintenance)}</span>
        </div>
        <div class="progress-bar-wrap mt-8">
          <div class="progress-bar progress-amber" style="width:${Math.min(100, (stats.totalCost / 50000) * 100)}%"></div>
        </div>
      </div>`;
        }).filter(Boolean).join('') || '<p class="text-muted" style="font-size:13px;">No cost data yet.</p>';
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('expenses.html')) {
        renderExpenses();
    }
});
