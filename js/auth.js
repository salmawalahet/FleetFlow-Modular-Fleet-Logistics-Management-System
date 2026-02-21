// =============================================
// FleetFlow - Auth Module (auth.js)
// =============================================

const Auth = (() => {
    const SESSION_KEY = 'ff_session';

    const ROLE_PERMISSIONS = {
        manager: ['dashboard', 'vehicles', 'trips', 'maintenance', 'expenses', 'drivers', 'analytics'],
        dispatcher: ['dashboard', 'trips', 'vehicles', 'maintenance', 'expenses'],
        safety: ['dashboard', 'drivers', 'trips'],
        analyst: ['dashboard', 'analytics', 'expenses'],
    };

    function login(email, password) {
        const users = DB.getAll('users');
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) return { error: 'Invalid email or password.' };
        const session = { userId: user.id, name: user.name, email: user.email, role: user.role };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { session };
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    }

    function getSession() {
        const s = localStorage.getItem(SESSION_KEY);
        return s ? JSON.parse(s) : null;
    }

    function isLoggedIn() {
        return !!getSession();
    }

    function hasAccess(page) {
        const session = getSession();
        if (!session) return false;
        const allowed = ROLE_PERMISSIONS[session.role] || [];
        return allowed.includes(page);
    }

    function requireAuth(page) {
        if (!isLoggedIn()) {
            window.location.href = 'index.html';
            return false;
        }
        if (page && !hasAccess(page)) {
            window.location.href = 'dashboard.html';
            return false;
        }
        return true;
    }

    function getCurrentUser() {
        const session = getSession();
        if (!session) return null;
        return DB.getById('users', session.userId) || session;
    }

    return { login, logout, getSession, isLoggedIn, hasAccess, requireAuth, getCurrentUser, ROLE_PERMISSIONS };
})();
