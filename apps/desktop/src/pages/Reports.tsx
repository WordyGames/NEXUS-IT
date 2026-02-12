import React, { useEffect, useState } from 'react';
import { Calendar, Download, Filter } from 'lucide-react';
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
import styles from './Reports.module.css';

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

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);

  // Filtros
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [company, setCompany] = useState<Company>();

  // Datos calculados
  const [dailyStats, setDailyStats] = useState<ReportStats[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStats[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, maintenancesData] = await Promise.all([
        getTickets(),
        getMaintenances()
      ]);
      setTickets(ticketsData);
      setMaintenances(maintenancesData);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas cuando cambian filtros o datos
  useEffect(() => {
    calculateStats();
  }, [tickets, maintenances, dateFrom, dateTo, company]);

  const calculateStats = () => {
    let filteredTickets = [...tickets];
    let filteredMaintenances = [...maintenances];

    // Aplicar filtros de fecha
    if (dateFrom) {
      const from = new Date(dateFrom);
      filteredTickets = filteredTickets.filter(
        t => new Date(t.createdAt as any) >= from
      );
      filteredMaintenances = filteredMaintenances.filter(
        m => new Date(m.createdAt as any) >= from
      );
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filteredTickets = filteredTickets.filter(
        t => new Date(t.createdAt as any) <= to
      );
      filteredMaintenances = filteredMaintenances.filter(
        m => new Date(m.createdAt as any) <= to
      );
    }

    // Aplicar filtro de empresa
    if (company) {
      filteredTickets = filteredTickets.filter(t => t.company === company);
      filteredMaintenances = filteredMaintenances.filter(
        m => m.company === company
      );
    }

    // Calcular estadísticas diarias
    const dailyMap = new Map<string, ReportStats>();

    filteredTickets.forEach(t => {
      if (!t.createdAt) return;
      const dateObj = new Date(t.createdAt as any);
      if (isNaN(dateObj.getTime())) return;
      const date = dateObj.toISOString().split('T')[0];
      const current = dailyMap.get(date) || {
        period: date,
        tickets: 0,
        maintenances: 0,
        resolvedTickets: 0,
        completedMaintenances: 0
      };
      current.tickets++;
      if (
        t.status === TicketStatus.RESOLVED ||
        t.status === TicketStatus.CLOSED
      ) {
        current.resolvedTickets++;
      }
      dailyMap.set(date, current);
    });

    filteredMaintenances.forEach(m => {
      if (!m.createdAt) return;
      const dateObj = new Date(m.createdAt as any);
      if (isNaN(dateObj.getTime())) return;
      const date = dateObj.toISOString().split('T')[0];
      const current = dailyMap.get(date) || {
        period: date,
        tickets: 0,
        maintenances: 0,
        resolvedTickets: 0,
        completedMaintenances: 0
      };
      current.maintenances++;
      if (m.status === MaintenanceStatus.COMPLETADO) {
        current.completedMaintenances++;
      }
      dailyMap.set(date, current);
    });

    setDailyStats(
      Array.from(dailyMap.values()).sort((a, b) =>
        a.period.localeCompare(b.period)
      )
    );

    // Calcular estadísticas por empresa
    const companyMap = new Map<string, CompanyStats>();

    filteredTickets.forEach(t => {
      const current = companyMap.get(t.company) || {
        company: t.company,
        tickets: 0,
        maintenances: 0,
        resolutionRate: 0
      };
      current.tickets++;
      companyMap.set(t.company, current);
    });

    filteredMaintenances.forEach(m => {
      const current = companyMap.get(m.company) || {
        company: m.company,
        tickets: 0,
        maintenances: 0,
        resolutionRate: 0
      };
      current.maintenances++;
      companyMap.set(m.company, current);
    });

    // Calcular tasa de resolución
    Array.from(companyMap.values()).forEach(stats => {
      const companyTickets = filteredTickets.filter(
        t => t.company === stats.company
      );
      if (companyTickets.length > 0) {
        const resolved = companyTickets.filter(
          t =>
            t.status === TicketStatus.RESOLVED ||
            t.status === TicketStatus.CLOSED
        ).length;
        stats.resolutionRate = Math.round((resolved / companyTickets.length) * 100);
      }
    });

    setCompanyStats(Array.from(companyMap.values()));

    // Distribución de estados
    const statusCount = filteredTickets.reduce(
      (acc, t) => {
        const status = t.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    setStatusDistribution(
      Object.entries(statusCount).map(([status, count]) => ({
        name: status,
        value: count
      }))
    );
  };

  const handleExportReport = () => {
    exportCompleteReport([], tickets, maintenances);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Calendar className="text-blue-600" />
            Reportes por Período
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Análisis temporal de tickets y mantenimientos
          </p>
        </div>
        <button
          onClick={handleExportReport}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          disabled={loading}
        >
          <Download size={18} />
          Exportar Reporte
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600 dark:text-gray-400" />
          <h2 className="font-semibold text-gray-800 dark:text-white">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Desde
            </label>
            <input
              type="date"
              aria-label="Fecha de inicio"
              value={dateFrom || ''}
              onChange={(e) => setDateFrom(e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hasta
            </label>
            <input
              type="date"
              aria-label="Fecha final"
              value={dateTo || ''}
              onChange={(e) => setDateTo(e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Empresa
            </label>
            <select
              aria-label="Filtrar por empresa"
              value={company || ''}
              onChange={(e) => setCompany((e.target.value as Company) || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todas las empresas</option>
              {Object.values(Company).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Tickets</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
            {tickets.filter(t => {
              if (dateFrom && new Date(t.createdAt as any) < new Date(dateFrom)) return false;
              if (dateTo && new Date(t.createdAt as any) > new Date(dateTo + 'T23:59:59')) return false;
              if (company && t.company !== company) return false;
              return true;
            }).length}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-green-600 dark:text-green-400 text-sm font-medium">Resueltos</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">
            {tickets.filter(t => {
              if (dateFrom && new Date(t.createdAt as any) < new Date(dateFrom)) return false;
              if (dateTo && new Date(t.createdAt as any) > new Date(dateTo + 'T23:59:59')) return false;
              if (company && t.company !== company) return false;
              return t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED;
            }).length}
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Mantenimientos</p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">
            {maintenances.filter(m => {
              if (dateFrom && new Date(m.createdAt as any) < new Date(dateFrom)) return false;
              if (dateTo && new Date(m.createdAt as any) > new Date(dateTo + 'T23:59:59')) return false;
              if (company && m.company !== company) return false;
              return true;
            }).length}
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">Completados</p>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-2">
            {maintenances.filter(m => {
              if (dateFrom && new Date(m.createdAt as any) < new Date(dateFrom)) return false;
              if (dateTo && new Date(m.createdAt as any) > new Date(dateTo + 'T23:59:59')) return false;
              if (company && m.company !== company) return false;
              return m.status === MaintenanceStatus.COMPLETADO;
            }).length}
          </p>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia Diaria */}
        {dailyStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
              Tendencia Diaria
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                <XAxis
                  dataKey="period"
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="tickets"
                  stroke="#3b82f6"
                  name="Tickets"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="maintenances"
                  stroke="#8b5cf6"
                  name="Mantenimientos"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Distribución por Empresa */}
        {companyStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
              Actividad por Empresa
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={companyStats}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                <XAxis
                  dataKey="company"
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="tickets" fill="#3b82f6" name="Tickets" />
                <Bar dataKey="maintenances" fill="#8b5cf6" name="Mantenimientos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Distribución de Estados */}
        {statusDistribution.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
              Distribución de Estados
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    `${name}: ${value}`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tasa de Resolución */}
        {companyStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
              Tasa de Resolución por Empresa
            </h3>
            <div className="space-y-3">
              {companyStats.map(stat => (
                <div key={stat.company}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.company}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.resolutionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      aria-label={`Tasa de resolución: ${stat.resolutionRate}%`}
                      title={`${stat.resolutionRate}% de resolución`}
                      className={styles.resolutionFill}
                      style={{ '--resolution-percent': `${stat.resolutionRate}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
