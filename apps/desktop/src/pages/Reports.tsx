import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, Download, Filter, ClipboardList, CheckCircle2, Wrench, CheckSquare } from 'lucide-react';
import {
  Ticket,
  Maintenance,
  TicketStatus,
  MaintenanceStatus,
  Company,
  getTickets,
  getMaintenances
} from '@nexus-it/shared';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { exportCompleteReport } from '../utils/exportToExcel';
import { toDate } from '../utils/dateUtils';
import { useTheme } from '../contexts/ThemeContext';
import { Spinner, StatCard, Card, Button } from '../components/ui';

interface ReportStats {
  period: string;
  tickets: number;
  maintenances: number;
  resolvedTickets: number;
  completedMaintenances: number;
}

interface CompanyStats {
  company: string;
  tickets: number;
  maintenances: number;
  resolutionRate: number;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Reports: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [company, setCompany] = useState<Company | ''>('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [t, m] = await Promise.all([getTickets(), getMaintenances()]);
      setTickets(t);
      setMaintenances(m);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // ── Apply filters once ───────────────────────────────────────────────────────

  const { filteredTickets, filteredMaintenances } = useMemo(() => {
    let ft = [...tickets];
    let fm = [...maintenances];

    if (dateFrom) {
      const from = new Date(dateFrom);
      ft = ft.filter((t) => toDate(t.createdAt as any) >= from);
      fm = fm.filter((m) => toDate(m.createdAt as any) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      ft = ft.filter((t) => toDate(t.createdAt as any) <= to);
      fm = fm.filter((m) => toDate(m.createdAt as any) <= to);
    }
    if (company) {
      ft = ft.filter((t) => t.company === company);
      fm = fm.filter((m) => m.company === company);
    }

    return { filteredTickets: ft, filteredMaintenances: fm };
  }, [tickets, maintenances, dateFrom, dateTo, company]);

  // ── Computed chart data ──────────────────────────────────────────────────────

  const { dailyStats, companyStats, statusDistribution } = useMemo(() => {
    const dailyMap = new Map<string, ReportStats>();

    filteredTickets.forEach((t) => {
      if (!t.createdAt) return;
      const d = toDate(t.createdAt as any);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      const cur = dailyMap.get(key) ?? { period: key, tickets: 0, maintenances: 0, resolvedTickets: 0, completedMaintenances: 0 };
      cur.tickets++;
      if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) cur.resolvedTickets++;
      dailyMap.set(key, cur);
    });

    filteredMaintenances.forEach((m) => {
      if (!m.createdAt) return;
      const d = toDate(m.createdAt as any);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      const cur = dailyMap.get(key) ?? { period: key, tickets: 0, maintenances: 0, resolvedTickets: 0, completedMaintenances: 0 };
      cur.maintenances++;
      if (m.status === MaintenanceStatus.COMPLETADO) cur.completedMaintenances++;
      dailyMap.set(key, cur);
    });

    const companyMap = new Map<string, CompanyStats>();
    filteredTickets.forEach((t) => {
      const cur = companyMap.get(t.company) ?? { company: t.company, tickets: 0, maintenances: 0, resolutionRate: 0 };
      cur.tickets++;
      companyMap.set(t.company, cur);
    });
    filteredMaintenances.forEach((m) => {
      const cur = companyMap.get(m.company) ?? { company: m.company, tickets: 0, maintenances: 0, resolutionRate: 0 };
      cur.maintenances++;
      companyMap.set(m.company, cur);
    });
    companyMap.forEach((stats) => {
      const ct = filteredTickets.filter((t) => t.company === stats.company);
      if (ct.length > 0) {
        const resolved = ct.filter((t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length;
        stats.resolutionRate = Math.round((resolved / ct.length) * 100);
      }
    });

    const statusCount = filteredTickets.reduce((acc, t) => {
      const s = t.status || 'unknown';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      dailyStats: Array.from(dailyMap.values()).sort((a, b) => a.period.localeCompare(b.period)),
      companyStats: Array.from(companyMap.values()),
      statusDistribution: Object.entries(statusCount).map(([name, value]) => ({ name, value })),
    };
  }, [filteredTickets, filteredMaintenances]);

  // ── Theme-aware tooltip styles ────────────────────────────────────────────────
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }
    : { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' };

  const axisColor = theme === 'dark' ? '#64748b' : '#94a3b8';
  const gridColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';

  const resolvedCount = filteredTickets.filter((t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length;
  const completedCount = filteredMaintenances.filter((m) => m.status === MaintenanceStatus.COMPLETADO).length;

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors';

  if (loading) return <Spinner size="xl" label="Cargando reportes..." className="h-64 justify-center" />;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Calendar size={22} className="text-blue-500" />
            Reportes por Período
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Análisis temporal de tickets y mantenimientos</p>
        </div>
        <Button
          variant="primary"
          iconLeft={<Download size={15} />}
          onClick={() => exportCompleteReport([], tickets, maintenances)}
          disabled={loading}
        >
          Exportar Reporte
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Desde</label>
            <input type="date" aria-label="Fecha de inicio" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Hasta</label>
            <input type="date" aria-label="Fecha final" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Empresa</label>
            <select aria-label="Filtrar por empresa" value={company} onChange={(e) => setCompany(e.target.value as Company | '')} className={inputCls}>
              <option value="">Todas las empresas</option>
              {Object.values(Company).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tickets" value={filteredTickets.length} icon={<ClipboardList size={18} />} color="blue" />
        <StatCard label="Resueltos" value={resolvedCount} icon={<CheckCircle2 size={18} />} color="green" />
        <StatCard label="Mantenimientos" value={filteredMaintenances.length} icon={<Wrench size={18} />} color="purple" />
        <StatCard label="Completados" value={completedCount} icon={<CheckSquare size={18} />} color="yellow" />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {dailyStats.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Tendencia Diaria</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyStats}>
                <CartesianGrid stroke={gridColor} strokeDasharray="5 5" />
                <XAxis dataKey="period" stroke={axisColor} tick={{ fontSize: 11 }} />
                <YAxis stroke={axisColor} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600 }} />
                <Legend />
                <Line type="monotone" dataKey="tickets" stroke="#3b82f6" name="Tickets" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="maintenances" stroke="#8b5cf6" name="Mantenimientos" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {companyStats.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Actividad por Empresa</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={companyStats}>
                <CartesianGrid stroke={gridColor} strokeDasharray="5 5" />
                <XAxis dataKey="company" stroke={axisColor} tick={{ fontSize: 11 }} />
                <YAxis stroke={axisColor} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600 }} />
                <Legend />
                <Bar dataKey="tickets" fill="#3b82f6" name="Tickets" radius={[3, 3, 0, 0]} />
                <Bar dataKey="maintenances" fill="#8b5cf6" name="Mantenimientos" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {statusDistribution.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Distribución de Estados</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {statusDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {companyStats.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Tasa de Resolución por Empresa</h3>
            <div className="space-y-4 mt-2">
              {companyStats.map((stat) => (
                <div key={stat.company}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-600 dark:text-slate-400 truncate">{stat.company}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 ml-4 tabular-nums">{stat.resolutionRate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    {/* dynamic percentage — inline width is the only viable approach here */}
                    {/* eslint-disable-next-line react/forbid-component-props */}
                    <div
                      className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, stat.resolutionRate))}%` }} // eslint-disable-line
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {(dailyStats.length === 0 && companyStats.length === 0) && (
        <Card>
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
            Sin datos para el período y filtros seleccionados.
          </p>
        </Card>
      )}
    </div>
  );
};

export default Reports;
