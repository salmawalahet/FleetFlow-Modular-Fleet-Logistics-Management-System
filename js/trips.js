// =============================================
// FleetFlow - Trip Dispatcher Page Logic
// =============================================

function populateTripForm() {
    const vehicleSel = document.getElementById('nt-vehicle');
    const driverSel = document.getElementById('nt-driver');
    if (!vehicleSel || !driverSel) return;

    const avVehicles = DB.getAvailableVehicles();
    const avDrivers = DB.getAvailableDrivers();

    vehicleSel.innerHTML = '<option value="">— Choose available vehicle —</option>' +
        avVehicles.map(v => `<option value="${v.id}" data-cap="${v.maxCapacity}">${v.plate} — ${v.model} (${Number(v.maxCapacity).toLocaleString()} kg)</option>`).join('');
    driverSel.innerHTML = '<option value="">— Choose available driver —</option>' +
        avDrivers.map(d => `<option value="${d.id}">${d.name} (${d.category}) — 🏆 ${d.safetyScore}</option>`).join('');
}

function updateCapacityHint() {
    const sel = document.getElementById('nt-vehicle');
    const opt = sel.options[sel.selectedIndex];
    const cap = opt?.dataset?.cap;
    const hintEl = document.getElementById('cap-hint');
    if (hintEl) hintEl.textContent = cap ? `Max capacity: ${Number(cap).toLocaleString()} kg` : '';
    checkCargoLimit();
}

function checkCargoLimit() {
    const sel = document.getElementById('nt-vehicle');
    const opt = sel.options[sel.selectedIndex];
    const cap = parseFloat(opt?.dataset?.cap || 0);
    const cargo = parseFloat(document.getElementById('nt-cargo').value || 0);
    const warn = document.getElementById('cargo-warning');
    if (warn) warn.style.display = (cap > 0 && cargo > cap * 0.85 && cargo <= cap) ? 'block' : 'none';
}

function createTrip() {
    const vehicleId = document.getElementById('nt-vehicle').value;
    const driverId = document.getElementById('nt-driver').value;
    const cargoWeight = document.getElementById('nt-cargo').value;
    const origin = document.getElementById('nt-origin').value.trim();
    const destination = document.getElementById('nt-dest').value.trim();
    const revenue = document.getElementById('nt-revenue').value || '0';
    const distance = document.getElementById('nt-distance').value || '0';
    const fuelExpense = document.getElementById('nt-fuel').value || '0';
    const errEl = document.getElementById('nt-error');

    if (!vehicleId || !driverId || !cargoWeight || !origin || !destination) {
        if (errEl) { errEl.textContent = 'Please fill all required fields.'; errEl.classList.add('show'); }
        return;
    }
    if (errEl) errEl.classList.remove('show');

    const result = DB.createTrip({ vehicleId, driverId, cargoWeight: parseFloat(cargoWeight), origin, destination, revenue: parseFloat(revenue), distance: parseFloat(distance), fuelExpense: parseFloat(fuelExpense) });
    if (result.error) {
        if (errEl) { errEl.textContent = result.error; errEl.classList.add('show'); }
        Toast.error(result.error, 5000);
        return;
    }
    Modal.close('modal-new-trip');
    Toast.success('Trip dispatched successfully!');
    renderTrips();
}

function openCompleteTripModal(id) {
    const idInp = document.getElementById('complete-trip-id');
    const odoInp = document.getElementById('complete-odo');
    if (idInp) idInp.value = id;
    if (odoInp) odoInp.value = '';
    Modal.open('modal-complete-trip');
}

function doCompleteTrip() {
    const id = document.getElementById('complete-trip-id').value;
    const odo = document.getElementById('complete-odo').value;
    const result = DB.completeTrip(id, odo);
    if (result.error) { Toast.error(result.error); return; }
    Modal.close('modal-complete-trip');
    Toast.success('Trip completed! Vehicle & Driver now Available.');
    renderTrips();
}

function cancelTrip(id) {
    const trip = DB.getById('trips', id);
    if (!confirm(`Cancel trip #${id.toUpperCase()}?`)) return;
    DB.cancelTrip(id);
    Toast.info('Trip cancelled.');
    renderTrips();
}

function renderTrips() {
    const searchEl = document.getElementById('t-search');
    const statusEl = document.getElementById('t-status');
    if (!searchEl || !statusEl) return;

    const search = searchEl.value.toLowerCase();
    const statusF = statusEl.value;
    const trips = DB.getAll('trips').slice().reverse();
    const vehicles = DB.getAll('vehicles');
    const drivers = DB.getAll('drivers');

    const counts = { Draft: 0, Dispatched: 0, Completed: 0, Cancelled: 0 };
    trips.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

    const kpiEl = document.getElementById('trip-kpi');
    if (kpiEl) {
        kpiEl.innerHTML = `
      <div class="kpi-card kpi-blue"><div class="kpi-header"><span class="kpi-label">Dispatched</span><div class="kpi-icon">🚚</div></div><div class="kpi-value">${counts.Dispatched}</div></div>
      <div class="kpi-card kpi-green"><div class="kpi-header"><span class="kpi-label">Completed</span><div class="kpi-icon">✅</div></div><div class="kpi-value">${counts.Completed}</div></div>
      <div class="kpi-card kpi-amber"><div class="kpi-header"><span class="kpi-label">Draft</span><div class="kpi-icon">📝</div></div><div class="kpi-value">${counts.Draft}</div></div>
      <div class="kpi-card kpi-red"><div class="kpi-header"><span class="kpi-label">Cancelled</span><div class="kpi-icon">❌</div></div><div class="kpi-value">${counts.Cancelled}</div></div>
    `;
    }

    const body = document.getElementById('t-body');
    if (!body) return;

    const visible = trips.filter(t => {
        const v = vehicles.find(v => v.id === t.vehicleId) || {};
        const d = drivers.find(d => d.id === t.driverId) || {};
        const matchSearch = !search || `${t.id} ${v.plate || ''} ${v.model || ''} ${d.name || ''} ${t.origin || ''} ${t.destination || ''}`.toLowerCase().includes(search);
        const matchStatus = statusF === 'all' || t.status === statusF;
        return matchSearch && matchStatus;
    });

    body.innerHTML = visible.map(t => {
        const v = vehicles.find(v => v.id === t.vehicleId) || {};
        const d = drivers.find(d => d.id === t.driverId) || {};
        const canComplete = t.status === 'Dispatched';
        const canCancel = t.status === 'Dispatched' || t.status === 'Draft';
        return `<tr>
      <td><span class="text-blue fw-600">#${t.id.toUpperCase()}</span><div class="td-sub">${formatDate(t.date)}</div></td>
      <td>${makeTypeTag(v.type || 'Van')}</td>
      <td><div class="td-main">${v.plate || '—'}</div><div class="td-sub">${v.model || '—'}</div></td>
      <td>${d.name || '—'}</td>
      <td>${t.origin || '—'}</td>
      <td>${t.destination || '—'}</td>
      <td>${Number(t.cargoWeight || 0).toLocaleString()}</td>
      <td>${formatCurrency(t.revenue)}</td>
      <td>${formatDate(t.date)}</td>
      <td>${makePill(t.status)}</td>
      <td>
        <div class="td-actions">
          ${canComplete ? `<button class="btn btn-success btn-sm" onclick="openCompleteTripModal('${t.id}')">✅ Done</button>` : ''}
          ${canCancel ? `<button class="btn btn-danger btn-sm" onclick="cancelTrip('${t.id}')">✕ Cancel</button>` : ''}
        </div>
      </td>
    </tr>`;
    }).join('');

    const emptyEl = document.getElementById('t-table-empty');
    if (emptyEl) emptyEl.style.display = visible.length === 0 ? 'block' : 'none';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('trips.html')) {
        renderTrips();
        const newTripBtn = document.querySelector('[onclick="Modal.open(\'modal-new-trip\')"]');
        if (newTripBtn) {
            newTripBtn.addEventListener('click', populateTripForm);
        }
    }
});
