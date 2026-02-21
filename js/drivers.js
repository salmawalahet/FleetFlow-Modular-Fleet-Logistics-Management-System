// =============================================
// FleetFlow - Drivers Page Logic
// =============================================

function saveNewDriver() {
    const name = document.getElementById('nd-name').value.trim();
    const phone = document.getElementById('nd-phone').value.trim();
    const license = document.getElementById('nd-license').value.trim();
    const expiry = document.getElementById('nd-expiry').value;
    const cat = document.getElementById('nd-cat').value;
    const join = document.getElementById('nd-join').value;
    const errEl = document.getElementById('nd-error');

    if (!name || !license || !expiry || !cat) {
        if (errEl) { errEl.textContent = 'Name, license, expiry, and category are required.'; errEl.classList.add('show'); }
        return;
    }
    if (errEl) errEl.classList.remove('show');

    DB.insert('drivers', { name, phone, license, licenseExpiry: expiry, category: cat, joinDate: join, status: 'On Duty', safetyScore: 80, tripsCompleted: 0 });
    Modal.close('modal-new-driver');
    Toast.success(`${name} registered successfully!`);
    renderDrivers();
}

function openEditDriver(id) {
    const d = DB.getById('drivers', id);
    if (!d) return;
    document.getElementById('ed-id').value = d.id;
    document.getElementById('ed-name').value = d.name;
    document.getElementById('ed-phone').value = d.phone || '';
    document.getElementById('ed-license').value = d.license;
    document.getElementById('ed-expiry').value = d.licenseExpiry;
    document.getElementById('ed-cat').value = d.category;
    document.getElementById('ed-score').value = d.safetyScore;
    Modal.open('modal-edit-driver');
}

function saveEditDriver() {
    const id = document.getElementById('ed-id').value;
    DB.update('drivers', id, {
        name: document.getElementById('ed-name').value.trim(),
        phone: document.getElementById('ed-phone').value.trim(),
        license: document.getElementById('ed-license').value.trim(),
        licenseExpiry: document.getElementById('ed-expiry').value,
        category: document.getElementById('ed-cat').value,
        safetyScore: parseFloat(document.getElementById('ed-score').value) || 0,
    });
    Modal.close('modal-edit-driver');
    Toast.success('Driver updated!');
    renderDrivers();
}

function setDriverStatus(id, status) {
    DB.update('drivers', id, { status });
    Toast.info(`Status set to ${status}.`);
    renderDrivers();
}

function deleteDriver(id) {
    const d = DB.getById('drivers', id);
    if (!confirm(`Remove driver ${d?.name}?`)) return;
    DB.remove('drivers', id);
    Toast.success('Driver removed.');
    renderDrivers();
}

function exportDrivers() {
    const drivers = DB.getAll('drivers');
    const headers = ['ID', 'Name', 'License', 'Category', 'Expiry', 'Safety Score', 'Trips', 'Status'];
    const rows = drivers.map(d => [d.id, d.name, d.license, d.category, d.licenseExpiry, d.safetyScore, d.tripsCompleted, d.status]);
    exportCSV('fleetflow-drivers.csv', headers, rows);
}

function scoreColor(score) {
    if (score >= 85) return 'progress-green';
    if (score >= 65) return 'progress-amber';
    return 'progress-red';
}

function renderDrivers() {
    const searchEl = document.getElementById('d-search');
    const statusEl = document.getElementById('d-status');
    const catEl = document.getElementById('d-cat');
    const viewEl = document.getElementById('d-view');
    if (!searchEl || !statusEl || !catEl || !viewEl) return;

    const search = searchEl.value.toLowerCase();
    const statusF = statusEl.value;
    const catF = catEl.value;
    const viewMode = viewEl.value;
    const drivers = DB.getAll('drivers');

    // KPIs
    const expired = drivers.filter(d => daysUntilExpiry(d.licenseExpiry) < 0).length;
    const expiring = drivers.filter(d => { const x = daysUntilExpiry(d.licenseExpiry); return x >= 0 && x < 30; }).length;
    const kpiEl = document.getElementById('driver-kpi');
    if (kpiEl) {
        kpiEl.innerHTML = `
      <div class="kpi-card kpi-green"><div class="kpi-header"><span class="kpi-label">On Duty</span><div class="kpi-icon">✅</div></div><div class="kpi-value">${drivers.filter(d => d.status === 'On Duty').length}</div></div>
      <div class="kpi-card kpi-amber"><div class="kpi-header"><span class="kpi-label">Off Duty</span><div class="kpi-icon">🔘</div></div><div class="kpi-value">${drivers.filter(d => d.status === 'Off Duty').length}</div></div>
      <div class="kpi-card kpi-red"><div class="kpi-header"><span class="kpi-label">Suspended</span><div class="kpi-icon">🚫</div></div><div class="kpi-value">${drivers.filter(d => d.status === 'Suspended').length}</div></div>
      <div class="kpi-card kpi-red"><div class="kpi-header"><span class="kpi-label">Expired Licenses</span><div class="kpi-icon">⚠️</div></div><div class="kpi-value">${expired}</div><div class="kpi-sub">${expiring} expiring within 30 days</div></div>
      <div class="kpi-card kpi-blue"><div class="kpi-header"><span class="kpi-label">Avg. Safety Score</span><div class="kpi-icon">🏆</div></div><div class="kpi-value">${drivers.length ? Math.round(drivers.reduce((s, d) => s + d.safetyScore, 0) / drivers.length) : 0}</div></div>
    `;
    }

    const filtered = drivers.filter(d => {
        const matchSearch = !search || `${d.name} ${d.license} ${d.category}`.toLowerCase().includes(search);
        const matchStatus = statusF === 'all' || d.status === statusF;
        const matchCat = catF === 'all' || d.category === catF;
        return matchSearch && matchStatus && matchCat;
    });

    const cardsView = document.getElementById('driver-cards-view');
    const tableView = document.getElementById('driver-table-view');

    if (viewMode === 'cards') {
        cardsView.style.display = 'grid';
        tableView.style.display = 'none';
        cardsView.innerHTML = filtered.map(d => {
            const days = daysUntilExpiry(d.licenseExpiry);
            const expired = days < 0;
            const expWarn = days >= 0 && days < 30;
            return `<div class="driver-card" style="${expired ? 'border-color:var(--accent-red);' : expWarn ? 'border-color:var(--accent-amber);' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div class="driver-avatar">${d.name.charAt(0)}</div>
          ${makePill(d.status)}
        </div>
        <div class="driver-name">${d.name}</div>
        <div class="driver-license">🪪 ${d.license} · ${makeTypeTag(d.category)}</div>
        <div class="driver-meta">
          <div class="driver-meta-item"><div class="driver-meta-val text-blue">${d.tripsCompleted}</div><div class="driver-meta-lbl">Trips</div></div>
          <div class="driver-meta-item"><div class="driver-meta-val ${d.safetyScore >= 85 ? 'text-green' : d.safetyScore >= 65 ? 'text-amber' : 'text-red'}">${d.safetyScore}</div><div class="driver-meta-lbl">Safety</div></div>
          <div class="driver-meta-item"><div class="driver-meta-val" style="font-size:14px;">${expired ? '<span class="text-red">EXPIRED</span>' : expWarn ? `<span class="text-amber">${days}d</span>` : formatDate(d.licenseExpiry)}</div><div class="driver-meta-lbl">License</div></div>
        </div>
        <div class="driver-score-bar">
          <div class="driver-score-label"><span>Safety Score</span><span>${d.safetyScore}/100</span></div>
          <div class="progress-bar-wrap"><div class="progress-bar ${scoreColor(d.safetyScore)}" style="width:${d.safetyScore}%"></div></div>
        </div>
        <div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap;">
          ${d.status !== 'On Duty' ? `<button class="btn btn-success btn-sm" onclick="setDriverStatus('${d.id}','On Duty')">✅ On Duty</button>` : ''}
          ${d.status !== 'Off Duty' ? `<button class="btn btn-ghost btn-sm" onclick="setDriverStatus('${d.id}','Off Duty')">💤 Off Duty</button>` : ''}
          ${d.status !== 'Suspended' ? `<button class="btn btn-danger btn-sm" onclick="setDriverStatus('${d.id}','Suspended')">🚫 Suspend</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="openEditDriver('${d.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDriver('${d.id}')">🗑️</button>
        </div>
      </div>`;
        }).join('') || '<p class="text-muted" style="grid-column:1/-1;text-align:center;padding:40px;">No drivers found.</p>';
    } else {
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
        let i = 1;
        const body = document.getElementById('d-body');
        if (body) {
            body.innerHTML = filtered.map(d => {
                const days = daysUntilExpiry(d.licenseExpiry);
                return `<tr>
          <td>${i++}</td>
          <td><div class="td-main">${d.name}</div><div class="td-sub">${d.phone || ''}</div></td>
          <td><span style="font-size:12px;">${d.license}</span></td>
          <td>${makeTypeTag(d.category)}</td>
          <td>${expiryPill(d.licenseExpiry)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="progress-bar-wrap" style="width:60px;"><div class="progress-bar ${scoreColor(d.safetyScore)}" style="width:${d.safetyScore}%"></div></div>
              <span class="fw-600">${d.safetyScore}</span>
            </div>
          </td>
          <td>${d.tripsCompleted}</td>
          <td>${makePill(d.status)}</td>
          <td>
            <div class="td-actions">
              ${d.status !== 'On Duty' ? `<button class="btn btn-success btn-sm" onclick="setDriverStatus('${d.id}','On Duty')">✅</button>` : ''}
              ${d.status !== 'Suspended' ? `<button class="btn btn-danger btn-sm" onclick="setDriverStatus('${d.id}','Suspended')">🚫</button>` : ''}
              <button class="btn btn-ghost btn-sm" onclick="openEditDriver('${d.id}')">✏️</button>
            </div>
          </td>
        </tr>`;
            }).join('');
            const emptyEl = document.getElementById('d-table-empty');
            if (emptyEl) emptyEl.style.display = filtered.length === 0 ? 'block' : 'none';
        }
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('drivers.html')) {
        renderDrivers();
    }
});
