// =============================================
// FleetFlow - Maintenance Page Logic
// =============================================

function openNewServiceModal() {
    const sel = document.getElementById('ns-vehicle');
    if (!sel) return;
    const vehicles = DB.getAll('vehicles').filter(v => v.status !== 'Retired');
    sel.innerHTML = '<option value="">— Select vehicle —</option>' +
        vehicles.map(v => `<option value="${v.id}">${v.plate} — ${v.model} (${v.status})</option>`).join('');

    const dateInp = document.getElementById('ns-date');
    if (dateInp) dateInp.value = new Date().toISOString().split('T')[0];

    const errEl = document.getElementById('ns-error');
    if (errEl) errEl.classList.remove('show');

    Modal.open('modal-new-service');
}

function saveNewService() {
    const vehicleId = document.getElementById('ns-vehicle').value;
    const issue = document.getElementById('ns-issue').value.trim();
    const date = document.getElementById('ns-date').value;
    const cost = document.getElementById('ns-cost').value || '0';
    const notes = document.getElementById('ns-notes').value.trim();
    const errEl = document.getElementById('ns-error');

    if (!vehicleId || !issue || !date) {
        if (errEl) { errEl.textContent = 'Vehicle, issue, and date are required.'; errEl.classList.add('show'); }
        return;
    }
    if (errEl) errEl.classList.remove('show');

    const result = DB.addMaintenanceLog({ vehicleId, issue, date, cost: parseFloat(cost), notes });
    Modal.close('modal-new-service');
    const v = DB.getById('vehicles', vehicleId);
    Toast.success(`Service log created. ${v?.plate} is now "In Shop."`);
    ['ns-issue', 'ns-cost', 'ns-notes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const vSel = document.getElementById('ns-vehicle');
    if (vSel) vSel.value = '';
    renderMaintenance();
}

function markComplete(id) {
    const result = DB.completeMaintenanceLog(id);
    if (result.error) { Toast.error(result.error); return; }
    Toast.success('Service marked complete. Vehicle restored to Available!');
    renderMaintenance();
}

function deleteLog(id) {
    if (!confirm('Delete this maintenance log?')) return;
    DB.remove('maintenance', id);
    Toast.info('Log removed.');
    renderMaintenance();
}

function renderMaintenance() {
    const searchEl = document.getElementById('m-search');
    const statusEl = document.getElementById('m-status');
    const vehicleFilterEl = document.getElementById('m-vehicle');
    if (!searchEl || !statusEl || !vehicleFilterEl) return;

    const search = searchEl.value.toLowerCase();
    const statusF = statusEl.value;
    const vehicleF = vehicleFilterEl.value;
    const logs = DB.getAll('maintenance').slice().reverse();
    const vehicles = DB.getAll('vehicles');

    // Populate vehicle filter
    const curVal = vehicleFilterEl.value;
    vehicleFilterEl.innerHTML = '<option value="all">All Vehicles</option>' +
        vehicles.map(v => `<option value="${v.id}" ${curVal === v.id ? 'selected' : ''}>${v.plate}</option>`).join('');

    // KPIs
    const totalCost = logs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const inProg = logs.filter(l => l.status === 'In Progress').length;
    const kpiEl = document.getElementById('maint-kpi');
    if (kpiEl) {
        kpiEl.innerHTML = `
      <div class="kpi-card kpi-red"><div class="kpi-header"><span class="kpi-label">In Progress</span><div class="kpi-icon">🔧</div></div><div class="kpi-value">${inProg}</div><div class="kpi-sub">Active service entries</div></div>
      <div class="kpi-card kpi-green"><div class="kpi-header"><span class="kpi-label">Completed</span><div class="kpi-icon">✅</div></div><div class="kpi-value">${logs.filter(l => l.status === 'Completed').length}</div></div>
      <div class="kpi-card kpi-amber"><div class="kpi-header"><span class="kpi-label">Total Service Cost</span><div class="kpi-icon">💰</div></div><div class="kpi-value" style="font-size:22px;">${formatCurrency(totalCost)}</div></div>
      <div class="kpi-card kpi-blue"><div class="kpi-header"><span class="kpi-label">Total Logs</span><div class="kpi-icon">📋</div></div><div class="kpi-value">${logs.length}</div></div>
    `;
    }

    // Banner
    const inShop = vehicles.filter(v => v.status === 'In Shop');
    const banner = document.getElementById('shop-banner');
    const bannerText = document.getElementById('shop-banner-text');
    if (banner && bannerText) {
        if (inShop.length > 0) {
            banner.style.display = 'block';
            bannerText.textContent = `${inShop.length} vehicle(s) currently In Shop: ${inShop.map(v => v.plate).join(', ')}`;
        } else {
            banner.style.display = 'none';
        }
    }

    const body = document.getElementById('m-body');
    if (!body) return;

    const filtered = logs.filter(l => {
        const v = vehicles.find(v => v.id === l.vehicleId) || {};
        const matchSearch = !search || `${l.id} ${v.plate || ''} ${v.model || ''} ${l.issue}`.toLowerCase().includes(search);
        const matchStatus = statusF === 'all' || l.status === statusF;
        const matchVehicle = vehicleF === 'all' || l.vehicleId === vehicleF;
        return matchSearch && matchStatus && matchVehicle;
    });

    body.innerHTML = filtered.map(l => {
        const v = vehicles.find(v => v.id === l.vehicleId) || {};
        return `<tr>
      <td><span class="text-amber fw-600">#${l.id.toUpperCase()}</span></td>
      <td><div class="td-main">${v.plate || '—'}</div><div class="td-sub">${v.model || '—'}</div></td>
      <td><span class="fw-600">${l.issue}</span></td>
      <td>${formatDate(l.date)}</td>
      <td class="text-amber fw-600">${formatCurrency(l.cost)}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.notes || ''}">${l.notes || '—'}</td>
      <td>${makePill(l.status)}</td>
      <td>
        <div class="td-actions">
          ${l.status === 'In Progress' ? `<button class="btn btn-success btn-sm" onclick="markComplete('${l.id}')">✅ Done</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteLog('${l.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
    }).join('');

    const emptyEl = document.getElementById('m-table-empty');
    if (emptyEl) emptyEl.style.display = filtered.length === 0 ? 'block' : 'none';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('maintenance.html')) {
        renderMaintenance();
    }
});
