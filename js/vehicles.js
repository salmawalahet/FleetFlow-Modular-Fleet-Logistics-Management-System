// =============================================
// FleetFlow - Vehicle Registry Page Logic
// =============================================

function renderVehicles() {
    const searchInput = document.getElementById('v-search');
    const typeFilter = document.getElementById('v-type');
    const statusFilter = document.getElementById('v-status');
    const regionFilter = document.getElementById('v-region');

    if (!searchInput || !typeFilter || !statusFilter || !regionFilter) return;

    const search = searchInput.value;
    const typeF = typeFilter.value;
    const statusF = statusFilter.value;
    const regionF = regionFilter.value;
    const vehicles = DB.getAll('vehicles');

    // KPIs
    const kpiEl = document.getElementById('vehicle-kpi');
    if (kpiEl) {
        kpiEl.innerHTML = `
      <div class="kpi-card kpi-green"><div class="kpi-header"><span class="kpi-label">Available</span><div class="kpi-icon">✅</div></div><div class="kpi-value">${vehicles.filter(v => v.status === 'Available').length}</div></div>
      <div class="kpi-card kpi-blue"><div class="kpi-header"><span class="kpi-label">On Trip</span><div class="kpi-icon">🚛</div></div><div class="kpi-value">${vehicles.filter(v => v.status === 'On Trip').length}</div></div>
      <div class="kpi-card kpi-red"><div class="kpi-header"><span class="kpi-label">In Shop</span><div class="kpi-icon">🔧</div></div><div class="kpi-value">${vehicles.filter(v => v.status === 'In Shop').length}</div></div>
      <div class="kpi-card kpi-amber"><div class="kpi-header"><span class="kpi-label">Total Fleet</span><div class="kpi-icon">📋</div></div><div class="kpi-value">${vehicles.filter(v => v.status !== 'Retired').length}</div></div>
    `;
    }

    const body = document.getElementById('v-body');
    if (!body) return;

    let i = 1;
    body.innerHTML = vehicles.map(v => {
        const match =
            (!search || `${v.plate} ${v.model} ${v.region}`.toLowerCase().includes(search.toLowerCase())) &&
            (typeF === 'all' || v.type === typeF) &&
            (statusF === 'all' || v.status === statusF) &&
            (regionF === 'all' || v.region === regionF);
        if (!match) return '';
        return `<tr data-searchable="${v.plate} ${v.model} ${v.region} ${v.type}" data-type="${v.type}" data-status="${v.status}" data-region="${v.region || ''}">
      <td>${i++}</td>
      <td><span class="text-blue fw-600">${v.plate}</span></td>
      <td><div class="td-main">${v.model}</div></td>
      <td>${makeTypeTag(v.type)}</td>
      <td>${Number(v.maxCapacity).toLocaleString()} kg</td>
      <td>${Number(v.odometer).toLocaleString()} km</td>
      <td>${v.region || '—'}</td>
      <td>${makePill(v.status)}</td>
      <td>
        <label class="toggle-switch" title="Toggle Out of Service">
          <input type="checkbox" ${v.status === 'Retired' ? 'checked' : ''} onchange="toggleRetired('${v.id}', this.checked)" ${v.status === 'On Trip' ? 'disabled' : ''}/>
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEdit('${v.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteVehicle('${v.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
    }).join('');

    const rows = body.querySelectorAll('tr');
    const visible = [...rows].filter(r => r.innerHTML.trim()).length;
    const emptyEl = document.getElementById('v-table-empty');
    if (emptyEl) emptyEl.style.display = visible === 0 ? 'block' : 'none';
}

function saveNewVehicle() {
    const plate = document.getElementById('nv-plate').value.trim();
    const type = document.getElementById('nv-type').value;
    const model = document.getElementById('nv-model').value.trim();
    const cap = document.getElementById('nv-capacity').value;
    const odo = document.getElementById('nv-odometer').value || '0';
    const region = document.getElementById('nv-region').value;
    const cost = document.getElementById('nv-cost').value || '0';
    const errEl = document.getElementById('nv-error');

    if (!plate || !type || !model || !cap) {
        errEl.textContent = 'Please fill all required fields.'; errEl.classList.add('show'); return;
    }
    const existing = DB.getAll('vehicles').find(v => v.plate.toLowerCase() === plate.toLowerCase());
    if (existing) { errEl.textContent = 'A vehicle with this plate already exists.'; errEl.classList.add('show'); return; }
    errEl.classList.remove('show');

    DB.insert('vehicles', { plate, type, model, maxCapacity: parseFloat(cap), odometer: parseFloat(odo), status: 'Available', acquisitionCost: parseFloat(cost), region });
    Modal.close('modal-new-vehicle');
    Toast.success(`${plate} registered successfully!`);
    ['nv-plate', 'nv-model', 'nv-capacity', 'nv-odometer', 'nv-cost'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('nv-type').value = ''; document.getElementById('nv-region').value = '';
    renderVehicles();
}

function openEdit(id) {
    const v = DB.getById('vehicles', id);
    if (!v) return;
    document.getElementById('ev-id').value = v.id;
    document.getElementById('ev-plate').value = v.plate;
    document.getElementById('ev-type').value = v.type;
    document.getElementById('ev-model').value = v.model;
    document.getElementById('ev-capacity').value = v.maxCapacity;
    document.getElementById('ev-odometer').value = v.odometer;
    document.getElementById('ev-region').value = v.region || '';
    document.getElementById('ev-cost').value = v.acquisitionCost || 0;
    Modal.open('modal-edit-vehicle');
}

function saveEditVehicle() {
    const id = document.getElementById('ev-id').value;
    DB.update('vehicles', id, {
        plate: document.getElementById('ev-plate').value.trim(),
        type: document.getElementById('ev-type').value,
        model: document.getElementById('ev-model').value.trim(),
        maxCapacity: parseFloat(document.getElementById('ev-capacity').value),
        odometer: parseFloat(document.getElementById('ev-odometer').value),
        region: document.getElementById('ev-region').value,
        acquisitionCost: parseFloat(document.getElementById('ev-cost').value) || 0,
    });
    Modal.close('modal-edit-vehicle');
    Toast.success('Vehicle updated!');
    renderVehicles();
}

function toggleRetired(id, isRetired) {
    const v = DB.getById('vehicles', id);
    if (v.status === 'On Trip') { Toast.warning('Cannot retire a vehicle currently on trip.'); renderVehicles(); return; }
    DB.update('vehicles', id, { status: isRetired ? 'Retired' : 'Available' });
    Toast.info(isRetired ? 'Vehicle marked as Out of Service.' : 'Vehicle restored to Available.');
    renderVehicles();
}

function deleteVehicle(id) {
    const v = DB.getById('vehicles', id);
    if (v && v.status === 'On Trip') { Toast.error('Cannot delete a vehicle currently on trip.'); return; }
    if (!confirm(`Delete vehicle ${v?.plate}? This cannot be undone.`)) return;
    DB.remove('vehicles', id);
    Toast.success('Vehicle removed.');
    renderVehicles();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('vehicles.html')) {
        renderVehicles();
    }
});
