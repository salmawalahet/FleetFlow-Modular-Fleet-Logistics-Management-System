// =============================================
// FleetFlow - Data Layer (db.js)
// Relational localStorage-based data store
// =============================================

const DB = (() => {
  const KEYS = {
    users: 'ff_users',
    vehicles: 'ff_vehicles',
    drivers: 'ff_drivers',
    trips: 'ff_trips',
    maintenance: 'ff_maintenance',
    expenses: 'ff_expenses',
  };

  // ---- Seed Data ----
  const SEED = {
    users: [
      { id: 'u1', name: 'Fleet Manager', email: 'manager@fleetflow.io', password: 'manager123', role: 'manager' },
      { id: 'u2', name: 'Sarah Dispatch', email: 'dispatcher@fleetflow.io', password: 'dispatch123', role: 'dispatcher' },
      { id: 'u3', name: 'Sam Analytics', email: 'analyst@fleetflow.io', password: 'analyst123', role: 'analyst' },
      { id: 'u4', name: 'Rita Safety', email: 'safety@fleetflow.io', password: 'safety123', role: 'safety' },
    ],
    vehicles: [
      { id: 'v1', plate: 'MH-00-2017', model: 'TATA 407', type: 'Truck', maxCapacity: 5000, odometer: 79000, status: 'Available', acquisitionCost: 1200000, region: 'Mumbai' },
      { id: 'v2', plate: 'MH-12-4521', model: 'Mahindra Bolero', type: 'Van', maxCapacity: 1500, odometer: 42000, status: 'On Trip', acquisitionCost: 800000, region: 'Pune' },
      { id: 'v3', plate: 'DL-01-9988', model: 'Ashok Leyland', type: 'Truck', maxCapacity: 8000, odometer: 158000, status: 'In Shop', acquisitionCost: 2500000, region: 'Delhi' },
      { id: 'v4', plate: 'KA-09-1234', model: 'TVS King', type: 'Bike', maxCapacity: 150, odometer: 12000, status: 'Available', acquisitionCost: 120000, region: 'Bangalore' },
      { id: 'v5', plate: 'GJ-05-7890', model: 'Eicher Pro', type: 'Truck', maxCapacity: 6000, odometer: 94000, status: 'Available', acquisitionCost: 1800000, region: 'Ahmedabad' },
      { id: 'v6', plate: 'MH-14-3345', model: 'Force Tempo', type: 'Van', maxCapacity: 2000, odometer: 31000, status: 'Available', acquisitionCost: 950000, region: 'Mumbai' },
    ],
    drivers: [
      { id: 'd1', name: 'Alex Rodrigues', license: 'MH-DL-20191023', licenseExpiry: '2027-06-15', category: 'Truck', status: 'On Duty', safetyScore: 92, tripsCompleted: 54, phone: '9876543210', joinDate: '2021-03-01' },
      { id: 'd2', name: 'John Mathew', license: 'KA-DL-20180512', licenseExpiry: '2026-03-10', category: 'Van', status: 'On Duty', safetyScore: 78, tripsCompleted: 38, phone: '9812345678', joinDate: '2020-07-15' },
      { id: 'd3', name: 'Priya Singh', license: 'DL-DL-20200310', licenseExpiry: '2025-12-01', category: 'Truck', status: 'Off Duty', safetyScore: 88, tripsCompleted: 67, phone: '9745612300', joinDate: '2019-11-20' },
      { id: 'd4', name: 'Kumar Ravi', license: 'GJ-DL-20170801', licenseExpiry: '2026-02-28', category: 'Bike', status: 'On Duty', safetyScore: 95, tripsCompleted: 112, phone: '9632587410', joinDate: '2018-05-10' },
      { id: 'd5', name: 'Fatima Nair', license: 'MH-DL-20220615', licenseExpiry: '2028-06-15', category: 'Van', status: 'Suspended', safetyScore: 61, tripsCompleted: 21, phone: '9512346789', joinDate: '2022-08-01' },
    ],
    trips: [
      { id: 't1', vehicleId: 'v2', driverId: 'd2', cargoWeight: 1200, origin: 'Mumbai', destination: 'Pune', status: 'Dispatched', distance: 148, revenue: 15000, fuelExpense: 2200, miscExpense: 500, date: '2026-02-19', completedDate: null },
      { id: 't2', vehicleId: 'v1', driverId: 'd1', cargoWeight: 4500, origin: 'Mumbai', destination: 'Nagpur', status: 'Completed', distance: 832, revenue: 45000, fuelExpense: 12000, miscExpense: 1500, date: '2026-02-15', completedDate: '2026-02-17' },
      { id: 't3', vehicleId: 'v5', driverId: 'd3', cargoWeight: 5800, origin: 'Ahmedabad', destination: 'Mumbai', status: 'Completed', distance: 530, revenue: 38000, fuelExpense: 9500, miscExpense: 800, date: '2026-02-10', completedDate: '2026-02-11' },
      { id: 't4', vehicleId: 'v4', driverId: 'd4', cargoWeight: 80, origin: 'Bangalore', destination: 'Mysore', status: 'Cancelled', distance: 145, revenue: 3000, fuelExpense: 400, miscExpense: 100, date: '2026-02-08', completedDate: null },
    ],
    maintenance: [
      { id: 'm1', vehicleId: 'v3', issue: 'Engine Issue', cost: 10000, date: '2026-02-20', status: 'In Progress', notes: 'Fuel injector replacement needed' },
      { id: 'm2', vehicleId: 'v1', issue: 'Oil Change', cost: 2500, date: '2026-02-15', status: 'Completed', notes: 'Routine oil and filter change' },
      { id: 'm3', vehicleId: 'v2', issue: 'Tyre Replacement', cost: 8000, date: '2026-01-20', status: 'Completed', notes: 'All 4 tyres replaced' },
    ],
    expenses: [
      { id: 'e1', tripId: 't1', vehicleId: 'v2', driverId: 'd2', liters: 80, fuelCost: 2200, miscCost: 500, date: '2026-02-19', notes: '' },
      { id: 'e2', tripId: 't2', vehicleId: 'v1', driverId: 'd1', liters: 430, fuelCost: 12000, miscCost: 1500, date: '2026-02-17', notes: 'Toll charges included' },
      { id: 'e3', tripId: 't3', vehicleId: 'v5', driverId: 'd3', liters: 340, fuelCost: 9500, miscCost: 800, date: '2026-02-11', notes: '' },
    ],
  };

  function init() {
    Object.keys(KEYS).forEach(key => {
      if (!localStorage.getItem(KEYS[key])) {
        localStorage.setItem(KEYS[key], JSON.stringify(SEED[key]));
      }
    });
  }

  function getAll(entity) {
    return JSON.parse(localStorage.getItem(KEYS[entity]) || '[]');
  }

  function getById(entity, id) {
    return getAll(entity).find(item => item.id === id) || null;
  }

  function save(entity, items) {
    localStorage.setItem(KEYS[entity], JSON.stringify(items));
  }

  function insert(entity, item) {
    const items = getAll(entity);
    item.id = item.id || generateId(entity);
    items.push(item);
    save(entity, items);
    return item;
  }

  function update(entity, id, changes) {
    const items = getAll(entity);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...changes };
    save(entity, items);
    return items[idx];
  }

  function remove(entity, id) {
    const items = getAll(entity).filter(i => i.id !== id);
    save(entity, items);
  }

  function generateId(entity) {
    const prefix = { users: 'u', vehicles: 'v', drivers: 'd', trips: 't', maintenance: 'm', expenses: 'e' };
    const items = getAll(entity);
    const max = items.reduce((m, i) => {
      const n = parseInt(i.id.replace(/\D/g, ''));
      return n > m ? n : m;
    }, 0);
    return (prefix[entity] || 'x') + (max + 1);
  }

  // ---- Business Logic Helpers ----
  function getAvailableVehicles() {
    return getAll('vehicles').filter(v => v.status === 'Available');
  }

  function getAvailableDrivers() {
    const today = new Date();
    return getAll('drivers').filter(d =>
      (d.status === 'On Duty') &&
      new Date(d.licenseExpiry) > today
    );
  }

  function createTrip(tripData) {
    const vehicle = getById('vehicles', tripData.vehicleId);
    const driver = getById('drivers', tripData.driverId);
    const today = new Date();

    if (!vehicle) return { error: 'Vehicle not found.' };
    if (!driver) return { error: 'Driver not found.' };
    if (vehicle.status !== 'Available') return { error: `Vehicle is currently ${vehicle.status}.` };
    if (driver.status !== 'On Duty') return { error: `Driver is currently ${driver.status}.` };
    if (new Date(driver.licenseExpiry) <= today) return { error: 'Driver license has expired. Cannot assign.' };
    if (parseFloat(tripData.cargoWeight) > parseFloat(vehicle.maxCapacity)) {
      return { error: `Cargo weight (${tripData.cargoWeight}kg) exceeds vehicle capacity (${vehicle.maxCapacity}kg).` };
    }

    const trip = insert('trips', {
      ...tripData,
      status: 'Dispatched',
      date: new Date().toISOString().split('T')[0],
      completedDate: null,
      revenue: parseFloat(tripData.revenue) || 0,
      fuelExpense: 0,
      miscExpense: 0,
    });

    update('vehicles', vehicle.id, { status: 'On Trip' });
    update('drivers', driver.id, { status: 'On Duty' });

    return { trip };
  }

  function completeTrip(tripId, finalOdometer) {
    const trip = getById('trips', tripId);
    if (!trip) return { error: 'Trip not found.' };

    update('trips', tripId, {
      status: 'Completed',
      completedDate: new Date().toISOString().split('T')[0],
    });

    update('vehicles', trip.vehicleId, {
      status: 'Available',
      ...(finalOdometer ? { odometer: parseFloat(finalOdometer) } : {}),
    });

    const driver = getById('drivers', trip.driverId);
    if (driver) {
      update('drivers', trip.driverId, {
        status: 'On Duty',
        tripsCompleted: (driver.tripsCompleted || 0) + 1,
      });
    }

    return { success: true };
  }

  function cancelTrip(tripId) {
    const trip = getById('trips', tripId);
    if (!trip) return { error: 'Trip not found.' };
    update('trips', tripId, { status: 'Cancelled' });
    update('vehicles', trip.vehicleId, { status: 'Available' });
    return { success: true };
  }

  function addMaintenanceLog(data) {
    const log = insert('maintenance', {
      ...data,
      status: 'In Progress',
    });
    update('vehicles', data.vehicleId, { status: 'In Shop' });
    return { log };
  }

  function completeMaintenanceLog(logId) {
    const log = getById('maintenance', logId);
    if (!log) return { error: 'Log not found.' };
    update('maintenance', logId, { status: 'Completed' });
    // Only return to Available if no other in-progress maintenance
    const remaining = getAll('maintenance').filter(m => m.vehicleId === log.vehicleId && m.status === 'In Progress' && m.id !== logId);
    if (remaining.length === 0) {
      update('vehicles', log.vehicleId, { status: 'Available' });
    }
    return { success: true };
  }

  // ---- Analytics Helpers ----
  function getVehicleStats(vehicleId) {
    const vehicle = getById('vehicles', vehicleId);
    if (!vehicle) return null;

    const trips = getAll('trips').filter(t => t.vehicleId === vehicleId && t.status === 'Completed');
    const expenses = getAll('expenses').filter(e => e.vehicleId === vehicleId);
    const maintenance = getAll('maintenance').filter(m => m.vehicleId === vehicleId);

    const totalFuel = expenses.reduce((s, e) => s + (parseFloat(e.fuelCost) || 0), 0);
    const totalMisc = expenses.reduce((s, e) => s + (parseFloat(e.miscCost) || 0), 0);
    const totalMaintenance = maintenance.reduce((s, m) => s + (parseFloat(m.cost) || 0), 0);
    const totalRevenue = trips.reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0);
    const totalDistance = trips.reduce((s, t) => s + (parseFloat(t.distance) || 0), 0);
    const totalLiters = expenses.reduce((s, e) => s + (parseFloat(e.liters) || 0), 0);
    const totalCost = totalFuel + totalMisc + totalMaintenance;
    const roi = vehicle.acquisitionCost > 0
      ? ((totalRevenue - totalCost) / vehicle.acquisitionCost * 100).toFixed(1)
      : 0;
    const fuelEfficiency = totalLiters > 0 ? (totalDistance / totalLiters).toFixed(2) : 0;
    const costPerKm = totalDistance > 0 ? (totalCost / totalDistance).toFixed(2) : 0;

    return {
      vehicle,
      trips: trips.length,
      totalRevenue,
      totalFuel,
      totalMaintenance,
      totalCost,
      totalDistance,
      totalLiters,
      roi,
      fuelEfficiency,
      costPerKm,
    };
  }

  function getDashboardKPIs() {
    const vehicles = getAll('vehicles');
    const trips = getAll('trips');
    const drivers = getAll('drivers');

    const activeFleet = vehicles.filter(v => v.status === 'On Trip').length;
    const maintenanceAlerts = vehicles.filter(v => v.status === 'In Shop').length;
    const available = vehicles.filter(v => v.status === 'Available').length;
    const total = vehicles.filter(v => v.status !== 'Retired').length;
    const utilizationRate = total > 0 ? Math.round((activeFleet / total) * 100) : 0;
    const pendingCargo = trips.filter(t => t.status === 'Draft').length;
    const dispatchedTrips = trips.filter(t => t.status === 'Dispatched').length;

    return { activeFleet, maintenanceAlerts, utilizationRate, pendingCargo, dispatchedTrips, total, available };
  }

  return {
    init, getAll, getById, save, insert, update, remove,
    getAvailableVehicles, getAvailableDrivers,
    createTrip, completeTrip, cancelTrip,
    addMaintenanceLog, completeMaintenanceLog,
    getVehicleStats, getDashboardKPIs,
    KEYS,
  };
})();
