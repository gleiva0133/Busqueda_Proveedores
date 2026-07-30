import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  ArrowRightLeft,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { MatchedResultItem } from '../types';
import { calculateReassignment } from '../utils/reassignmentEngine';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

interface ReassignmentTabProps {
  matchedItems: MatchedResultItem[];
}

export const ReassignmentTab: React.FC<ReassignmentTabProps> = ({ matchedItems }) => {
  const { categoryReassignments, itemReassignments, workloadBalance } =
    calculateReassignment(matchedItems);

  const changedCount = itemReassignments.filter(i => i.cambioComprador).length;
  const totalCount = itemReassignments.length;

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Propuesta de Reasignación Inteligente de Compradores
            </h2>
            <p className="text-xs text-slate-400">
              Asigna la propiedad total de cada categoría al comprador con mayor experiencia previa en el rubro, equilibrando la carga de trabajo general.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-700/60">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400">Categorías Agrupadas</span>
            <div className="text-xl font-bold text-amber-300 mt-1">
              {categoryReassignments.length}
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400">Ítems Reasignados</span>
            <div className="text-xl font-bold text-sky-300 mt-1">
              {changedCount} <span className="text-xs font-normal text-slate-400">de {totalCount} ({Math.round((changedCount / (totalCount || 1)) * 100)}%)</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400">Compradores Activos</span>
            <div className="text-xl font-bold text-emerald-300 mt-1">
              {workloadBalance.length}
            </div>
          </div>
        </div>
      </div>

      {/* Category Owner Table & Balance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Owners */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>Comprador Asignado por Categoría (Dueño del Grupo)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase font-semibold border-b border-slate-700">
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Comprador Asignado</th>
                  <th className="py-2.5 px-3 text-center">Ítems Previos</th>
                  <th className="py-2.5 px-3 text-right">Total en Grupo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-300">
                {categoryReassignments.map((catRes, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/40 transition">
                    <td className="py-2.5 px-3 font-medium text-white">{catRes.categoria}</td>
                    <td className="py-2.5 px-3 font-semibold text-amber-300">
                      {catRes.compradorAsignado}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400">
                      {catRes.itemsPreviosEnCategoria}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-sky-300">
                      {catRes.totalItemsCategoria}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workload Balance Chart */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Balance de Carga: Antes vs. Después de Reasignar</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadBalance} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="comprador" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="itemsAntes" name="Ítems Antes" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="itemsDespues" name="Ítems Después" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Item Reassignments */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <ArrowRightLeft className="w-4 h-4 text-sky-400" />
            <span>Detalle Ítem por Ítem: Comprador Original vs. Reasignado</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-semibold border-b border-slate-700">
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Comprador Original</th>
                <th className="py-3 px-4">Comprador Reasignado</th>
                <th className="py-3 px-4 text-center">Estado Cambio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-300">
              {itemReassignments.map((item, idx) => (
                <tr key={idx} className={`hover:bg-slate-700/40 transition ${item.cambioComprador ? 'bg-amber-500/5' : ''}`}>
                  <td className="py-3 px-4 font-mono font-bold text-slate-200">#{item.numItem}</td>
                  <td className="py-3 px-4 font-semibold text-white max-w-xs truncate">{item.material}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-900 text-amber-300 border border-slate-700 rounded text-[11px]">
                      {item.categoria}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{item.compradorOriginal}</td>
                  <td className="py-3 px-4 font-bold text-amber-300">{item.compradorReasignado}</td>
                  <td className="py-3 px-4 text-center">
                    {item.cambioComprador ? (
                      <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-medium">
                        Reasignado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] bg-slate-700/50 text-slate-400 rounded font-medium">
                        Sin Cambio
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
