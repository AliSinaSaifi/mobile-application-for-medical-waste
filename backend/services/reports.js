const { Op } = require('sequelize');
const Container = require('../models/pg/Container');
const Task = require('../models/pg/Task');
const Alert = require('../models/Alert');
const History = require('../models/mongo/History');
const DisposalLog = require('../models/mongo/DisposalLog');

const REPORT_TYPES = new Set(['overview', 'dept', 'type', 'alerts']);
const AGGREGATIONS = new Set(['day', 'week', 'month']);
const SORT_FIELDS = new Set(['department', 'containers', 'avgFullness', 'totalWeight', 'needsAttention']);

const WASTE_TYPE_LABELS = {
  A: 'Sharp Medical Waste',
  B: 'Infectious Medical Waste',
  C: 'Pharmaceutical Waste',
  D: 'General Medical Waste',
};

const WASTE_TYPE_COLORS = {
  A: '#1A6EFF',
  B: '#00D68F',
  C: '#F59E0B',
  D: '#8B5CF6',
};

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseDateRange({ period, startDate, endDate } = {}) {
  let start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : null;

  if ((!start || Number.isNaN(start.getTime())) && period) {
    const trimmed = String(period).trim();
    const normalized = trimmed.toLowerCase();
    const monthMatch = trimmed.match(/^([a-zA-Z]{3,9})\s+(\d{4})$/);
    const yearMatch = trimmed.match(/^(\d{4})$/);

    if (normalized === 'day' || normalized === 'today') {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = now;
    } else if (normalized === 'week' || normalized === 'weekly') {
      end = new Date();
      start = new Date(end);
      start.setDate(end.getDate() - 7);
    } else if (normalized === 'month' || normalized === 'monthly') {
      end = new Date();
      start = new Date(end);
      start.setMonth(end.getMonth() - 1);
    } else if (normalized === 'year' || normalized === 'yearly') {
      end = new Date();
      start = new Date(end);
      start.setFullYear(end.getFullYear() - 1);
    } else if (monthMatch) {
      const monthIndex = new Date(`${monthMatch[1]} 1, ${monthMatch[2]}`).getMonth();
      if (!Number.isNaN(monthIndex)) {
        start = new Date(Number(monthMatch[2]), monthIndex, 1);
        end = new Date(Number(monthMatch[2]), monthIndex + 1, 1);
      }
    } else if (yearMatch) {
      start = new Date(Number(yearMatch[1]), 0, 1);
      end = new Date(Number(yearMatch[1]) + 1, 0, 1);
    }
  }

  if (start && Number.isNaN(start.getTime())) start = null;
  if (end && Number.isNaN(end.getTime())) end = null;
  if (endDate && end) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  if (start && end && start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  return { start, end };
}

function buildMongoDateFilter(field, dateRange) {
  const filter = {};
  if (dateRange.start) filter.$gte = dateRange.start;
  if (dateRange.end) filter.$lt = dateRange.end;
  return Object.keys(filter).length ? { [field]: filter } : {};
}

function buildSequelizeDateFilter(field, dateRange) {
  const filter = {};
  if (dateRange.start) filter[Op.gte] = dateRange.start;
  if (dateRange.end) filter[Op.lt] = dateRange.end;
  return Object.keys(filter).length ? { [field]: filter } : {};
}

function getDepartment(container) {
  const location = String(container.location || '').trim();
  if (!location || location.toLowerCase().includes('auto-created')) return 'Unassigned';
  return location.split(',')[0].trim() || 'Unassigned';
}

function toPercent(value) {
  const rounded = Math.round(Number(value) || 0);
  return Math.min(100, Math.max(0, rounded));
}

function getPeriodKey(date, aggregation) {
  const d = new Date(date);
  if (aggregation === 'day') return d.toISOString().slice(0, 10);
  if (aggregation === 'week') {
    const firstDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = firstDay.getUTCDay() || 7;
    firstDay.setUTCDate(firstDay.getUTCDate() + 1 - day);
    return firstDay.toISOString().slice(0, 10);
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function getLatestReadings(dateRange) {
  const dateMatch = buildMongoDateFilter('timestamp', dateRange);
  return History.aggregate([
    { $match: dateMatch },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$binId',
        fullness: { $first: '$fullness' },
        timestamp: { $first: '$timestamp' },
      },
    },
  ]);
}

async function getReportsData(query = {}) {
  const reportType = REPORT_TYPES.has(query.reportType) ? query.reportType : 'overview';
  const aggregation = AGGREGATIONS.has(query.aggregation) ? query.aggregation : 'month';
  const dateRange = parseDateRange(query);
  const page = clampNumber(query.page, 1, 100000, 1);
  const limit = clampNumber(query.limit, 1, 500, 50);
  const search = String(query.search || '').trim().toLowerCase();
  const sortBy = SORT_FIELDS.has(query.sortBy) ? query.sortBy : 'department';
  const sortDir = String(query.sortDir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

  const [containers, latestReadings, disposalLogs, unresolvedAlerts, alerts, completedTasks] = await Promise.all([
    Container.findAll({ order: [['createdAt', 'ASC']] }),
    getLatestReadings(dateRange),
    DisposalLog.find(buildMongoDateFilter('completedAt', dateRange)).lean(),
    Alert.find({ resolved: false, ...buildMongoDateFilter('timestamp', dateRange) }).lean(),
    Alert.find(buildMongoDateFilter('timestamp', dateRange)).lean(),
    Task.findAll({
      where: {
        status: 'completed',
        ...buildSequelizeDateFilter('completedAt', dateRange),
      },
      attributes: ['id', 'containerId', 'completedAt'],
    }),
  ]);

  const latestByBin = new Map(latestReadings.map((r) => [String(r._id), Number(r.fullness) || 0]));
  const containerByQr = new Map(containers.map((container) => [String(container.qrCode), container]));
  const weightByContainer = new Map();
  let totalWeight = 0;

  disposalLogs.forEach((log) => {
    const containerId = String(log.containerId);
    const weight = Number(log.weightKg) || 0;
    totalWeight += weight;
    weightByContainer.set(containerId, (weightByContainer.get(containerId) || 0) + weight);
  });

  const alertCountByContainer = new Map();
  unresolvedAlerts.forEach((alert) => {
    const id = String(alert.containerId || '');
    if (!id || id === '—') return;
    alertCountByContainer.set(id, (alertCountByContainer.get(id) || 0) + 1);
  });

  const departmentMap = new Map();
  const wasteMap = new Map();

  containers.forEach((container) => {
    const qrCode = String(container.qrCode);
    const department = getDepartment(container);
    const fullness = latestByBin.get(qrCode) ?? 0;
    const weight = weightByContainer.get(qrCode) || 0;
    const needsAttention = fullness >= 80 || (alertCountByContainer.get(qrCode) || 0) > 0 ? 1 : 0;

    if (!departmentMap.has(department)) {
      departmentMap.set(department, {
        name: department,
        bins: 0,
        fullnessTotal: 0,
        totalWeight: 0,
        needsAttention: 0,
      });
    }

    const dept = departmentMap.get(department);
    dept.bins += 1;
    dept.fullnessTotal += fullness;
    dept.totalWeight += weight;
    dept.needsAttention += needsAttention;

    const wasteType = container.wasteType || 'A';
    if (!wasteMap.has(wasteType)) {
      wasteMap.set(wasteType, { type: wasteType, name: WASTE_TYPE_LABELS[wasteType] || `Type ${wasteType}`, count: 0 });
    }
    wasteMap.get(wasteType).count += 1;
  });

  let departments = Array.from(departmentMap.values()).map((dept) => ({
    name: dept.name,
    bins: dept.bins,
    avgFullness: dept.bins ? toPercent(dept.fullnessTotal / dept.bins) : 0,
    totalWeight: Number(dept.totalWeight.toFixed(1)),
    needsAttention: dept.needsAttention,
  }));

  if (search) {
    departments = departments.filter((dept) => dept.name.toLowerCase().includes(search));
  }

  departments.sort((a, b) => {
    const av = sortBy === 'department' ? a.name : a[sortBy];
    const bv = sortBy === 'department' ? b.name : b[sortBy];
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const totalDepartments = departments.length;
  const paginatedDepartments = departments.slice((page - 1) * limit, page * limit);
  const maxContainers = Math.max(10, ...departments.map((dept) => dept.bins));
  const maxWeight = Math.max(1, ...departments.map((dept) => dept.totalWeight));

  const barData = paginatedDepartments.map((dept) => ({
    label: dept.name,
    fullness: dept.avgFullness,
    count: dept.bins,
    countPct: toPercent((dept.bins / maxContainers) * 100),
    weight: toPercent((dept.totalWeight / maxWeight) * 100),
    totalWeight: dept.totalWeight,
  }));

  const totalContainers = containers.length;
  const averageFullness = totalContainers
    ? toPercent(containers.reduce((sum, container) => sum + (latestByBin.get(String(container.qrCode)) ?? 0), 0) / totalContainers)
    : 0;
  const needsAttention = containers.reduce((sum, container) => {
    const qrCode = String(container.qrCode);
    const fullness = latestByBin.get(qrCode) ?? 0;
    return sum + (fullness >= 80 || (alertCountByContainer.get(qrCode) || 0) > 0 ? 1 : 0);
  }, 0);

  const wasteTypeDistribution = Array.from(wasteMap.values()).map((entry) => ({
    name: entry.name,
    type: entry.type,
    count: entry.count,
    pct: totalContainers ? Math.round((entry.count / totalContainers) * 100) : 0,
    color: WASTE_TYPE_COLORS[entry.type] || '#1A6EFF',
  }));

  const statusCounts = alerts.reduce((acc, alert) => {
    const key = alert.resolved ? 'resolved' : alert.severity || 'info';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { critical: 0, warning: 0, info: 0, resolved: 0 });

  const timeSeriesMap = new Map();
  disposalLogs.forEach((log) => {
    const key = getPeriodKey(log.completedAt || log.createdAt || new Date(), aggregation);
    if (!timeSeriesMap.has(key)) timeSeriesMap.set(key, { period: key, totalWeight: 0, disposals: 0 });
    const row = timeSeriesMap.get(key);
    row.totalWeight += Number(log.weightKg) || 0;
    row.disposals += 1;
  });

  return {
    params: {
      reportType,
      aggregation,
      period: query.period || '',
      startDate: dateRange.start ? dateRange.start.toISOString() : null,
      endDate: dateRange.end ? dateRange.end.toISOString() : null,
      page,
      limit,
      search,
      sortBy,
      sortDir,
    },
    kpis: {
      totalContainers,
      averageFullness,
      needsAttention,
      totalWeight: Number(totalWeight.toFixed(1)),
      completedTasks: completedTasks.length,
    },
    departments: paginatedDepartments,
    barData,
    wasteTypeDistribution,
    statusCounts,
    timeSeries: Array.from(timeSeriesMap.values())
      .map((row) => ({ ...row, totalWeight: Number(row.totalWeight.toFixed(1)) }))
      .sort((a, b) => a.period.localeCompare(b.period)),
    pagination: {
      page,
      limit,
      total: totalDepartments,
      pages: Math.max(1, Math.ceil(totalDepartments / limit)),
    },
  };
}

function reportsToCsv(report) {
  const rows = [
    ['Department', 'Containers', 'Avg. Fullness', 'Total Weight (kg)', 'Need Attention'],
    ...report.departments.map((dept) => [
      dept.name,
      dept.bins,
      `${dept.avgFullness}%`,
      dept.totalWeight.toFixed(1),
      dept.needsAttention,
    ]),
  ];

  return rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

module.exports = {
  getReportsData,
  reportsToCsv,
};
