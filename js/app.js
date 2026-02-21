// =============================================
// FleetFlow - Shared App Utilities (app.js)
// =============================================

// ---- Toast Notifications ----
const Toast = (() => {
    let container;
    function init() {
        container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    }
    function show(message, type = 'info', duration = 3500) {
        init();
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    return {
        success: (m, d) => show(m, 'success', d),
        error: (m, d) => show(m, 'error', d),
        warning: (m, d) => show(m, 'warning', d),
        info: (m, d) => show(m, 'info', d),
    };
})();

// ---- Modal Manager ----
const Modal = (() => {
    function open(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }
    function close(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    }
    function closeAll() {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
    return { open, close, closeAll };
})();

// ---- Status Pill Helper ----
function makePill(status) {
    const map = {
        'Available': 'available', 'On Trip': 'on-trip', 'In Shop': 'in-shop',
        'Retired': 'retired', 'On Duty': 'on-duty', 'Off Duty': 'off-duty',
        'Suspended': 'suspended', 'Draft': 'draft', 'Dispatched': 'dispatched',
        'Completed': 'completed', 'Cancelled': 'cancelled', 'In Progress': 'in-progress',
    };
    const cls = map[status] || 'draft';
    return `<span class="pill pill-${cls}">${status}</span>`;
}

// ---- Type Tag Helper ----
function makeTypeTag(type) {
    const map = { 'Truck': 'truck', 'Van': 'van', 'Bike': 'bike' };
    return `<span class="tag tag-${(map[type] || 'van')}">${type}</span>`;
}

// ---- Currency & Number Formatters ----
function formatCurrency(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
}
function formatNum(n, dec = 0) {
    return Number(n || 0).toFixed(dec);
}

// ---- Date Helpers ----
function formatDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysUntilExpiry(dateStr) {
    const now = new Date();
    const exp = new Date(dateStr);
    return Math.floor((exp - now) / (1000 * 60 * 60 * 24));
}
function expiryPill(dateStr) {
    const days = daysUntilExpiry(dateStr);
    if (days < 0) return `<span class="pill pill-cancelled">Expired</span>`;
    if (days < 30) return `<span class="pill pill-warning">Exp. in ${days}d</span>`;
    return `<span class="pill pill-available">${formatDate(dateStr)}</span>`;
}

// ---- Sidebar Navigation Renderer ----
function buildSidebar(activePage) {
    const session = Auth.getSession();
    if (!session) return;

    const allLinks = [
        { page: 'dashboard', icon: '📊', label: 'Dashboard', href: 'dashboard.html' },
        { page: 'vehicles', icon: '🚛', label: 'Vehicle Registry', href: 'vehicles.html' },
        { page: 'trips', icon: '🗺️', label: 'Trip Dispatcher', href: 'trips.html' },
        { page: 'maintenance', icon: '🔧', label: 'Maintenance', href: 'maintenance.html' },
        { page: 'expenses', icon: '⛽', label: 'Expenses & Fuel', href: 'expenses.html' },
        { page: 'drivers', icon: '👤', label: 'Driver Profiles', href: 'drivers.html' },
        { page: 'analytics', icon: '📈', label: 'Analytics', href: 'analytics.html' },
    ];

    const allowed = Auth.ROLE_PERMISSIONS[session.role] || [];
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    // Alert counts
    const maintenanceAlerts = DB.getAll('vehicles').filter(v => v.status === 'In Shop').length;
    const expiredDrivers = DB.getAll('drivers').filter(d => daysUntilExpiry(d.licenseExpiry) < 0).length;

    nav.innerHTML = allLinks.filter(l => allowed.includes(l.page)).map(l => {
        let badge = '';
        if (l.page === 'maintenance' && maintenanceAlerts) badge = `<span class="nav-badge">${maintenanceAlerts}</span>`;
        if (l.page === 'drivers' && expiredDrivers) badge = `<span class="nav-badge">${expiredDrivers}</span>`;
        return `<a href="${l.href}" class="nav-item ${activePage === l.page ? 'active' : ''}">
      <span class="nav-icon">${l.icon}</span>
      <span>${l.label}</span>
      ${badge}
    </a>`;
    }).join('');

    // User info
    const userEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    if (userEl) userEl.textContent = session.name;
    if (roleEl) roleEl.textContent = session.role;
    if (avatarEl) avatarEl.textContent = session.name.charAt(0).toUpperCase();
}

// ---- Table Search & Filter ----
function filterTable(tableId, searchValue, filters = {}) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr[data-searchable]');
    let visibleCount = 0;
    rows.forEach(row => {
        const text = (row.dataset.searchable || '').toLowerCase();
        const matchSearch = !searchValue || text.includes(searchValue.toLowerCase());
        let matchFilter = true;
        Object.entries(filters).forEach(([key, val]) => {
            if (val && val !== 'all') {
                const cellVal = row.dataset[key] || '';
                if (!cellVal.toLowerCase().includes(val.toLowerCase())) matchFilter = false;
            }
        });
        const show = matchSearch && matchFilter;
        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
    });
    const emptyEl = document.getElementById(tableId + '-empty');
    if (emptyEl) emptyEl.style.display = visibleCount === 0 ? 'block' : 'none';
}

// ---- CSV Export ----
function exportCSV(filename, headers, rows) {
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
    Toast.success(`Exported ${filename}`);
}

// ---- Close modals on overlay click ----
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') Modal.closeAll();
});
