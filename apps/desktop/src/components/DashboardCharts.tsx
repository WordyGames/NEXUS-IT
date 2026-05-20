import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, StatCard } from './ui';

interface Props {
  equipmentByCompany: Record<string, number>;
  equipmentByStatus: Record<string, number>;
  equipmentByType: Record<string, number>;
  ticketsByStatus: Record<string, number>;
  ticketsByPriority: Record<string, number>;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
const STATUS_COLORS: Record<string, string> = {
  active: '#10b981', inactive: '#6b7280', maintenance: '#f59e0b', retired: '#ef4444',
};

const DashboardCharts: React.FC<Props> = ({
  equipmentByCompany,
  equipmentByStatus,
  equipmentByType,
  ticketsByStatus,
  ticketsByPriority,
}) => (
  <div className="space-y-6">
    {/* Charts */}
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Análisis y Tendencias</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Equipos por Compañía</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(equipmentByCompany).map(([name, value]) => ({ name: name.split(' ').slice(0, 2).join(' '), value }))}
                cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}
                label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
              >
                {Object.keys(equipmentByCompany).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Tickets por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(ticketsByStatus).map(([estado, cantidad]) => ({ estado, cantidad }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="estado" /><YAxis />
              <Tooltip /><Legend />
              <Bar dataKey="cantidad" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Tickets por Prioridad</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(ticketsByPriority).map(([prioridad, cantidad]) => ({ prioridad, cantidad }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="prioridad" /><YAxis />
              <Tooltip /><Legend />
              <Bar dataKey="cantidad" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Estados de Equipos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(equipmentByStatus).map(([name, value]) => ({ name, value }))}
                cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}
                label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
              >
                {Object.keys(equipmentByStatus).map((status, i) => (
                  <Cell key={i} fill={STATUS_COLORS[status] ?? '#3b82f6'} />
                ))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Equipos por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(equipmentByType).map(([tipo, cantidad]) => ({ tipo, cantidad }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo" /><YAxis />
              <Tooltip /><Legend />
              <Bar dataKey="cantidad" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

      </div>
    </div>

    {/* Estado de Equipos */}
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Estado de Equipos</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(equipmentByStatus).map(([status, count]) => {
          const colorMap: Record<string, 'green' | 'slate' | 'yellow' | 'red' | 'blue'> = {
            active: 'green', inactive: 'slate', maintenance: 'yellow', retired: 'red',
          };
          return (
            <StatCard
              key={status}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              value={count as number}
              color={colorMap[status] ?? 'blue'}
            />
          );
        })}
      </div>
    </div>
  </div>
);

export default DashboardCharts;
