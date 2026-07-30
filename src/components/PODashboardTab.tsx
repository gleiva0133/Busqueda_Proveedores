import React, { useState } from 'react';
import {
  Upload,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  FileText,
  Percent,
  PieChart as PieChartIcon,
  BarChart2,
  Calendar,
  Filter
} from 'lucide-react';
import { PODashboardItem } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter
} from 'recharts';

interface PODashboardTabProps {
  poItems: PODashboardItem[];
  onUploadPODashboard: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4', '#64748b'];

export const PODashboardTab: React.FC<PODashboardTabProps> = ({ poItems, onUploadPODashboard }) => {
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');

  // Extract filter options
  const years = Array.from(new Set(poItems.map(i => i.nAnio).filter(Boolean))).sort() as number[];
  const months = Array.from(new Set(poItems.map(i => i.nMes).filter(Boolean))).sort() as number[];
  const buyers = Array.from(new Set(poItems.map(i => i.comprador).filter(Boolean))).sort() as string[];

  // Filter Items
  const filteredPOItems = poItems.filter(item => {
    const matchesYear = selectedYear === 'ALL' || String(item.nAnio) === selectedYear;
    const matchesMonth = selectedMonth === 'ALL' || String(item.nMes) === selectedMonth;
    const matchesBuyer = selectedBuyer === 'ALL' || item.comprador === selectedBuyer;
    return matchesYear && matchesMonth && matchesBuyer;
  });

  // Calculate Official Spend Items (Issued POs and NOT cancelled)
  const officialIssuedItems = filteredPOItems.filter(i => i.fFirmaPO && !i.esCancelado);

  // KPIs
  const totalItemsCount = filteredPOItems.length;
  const uniquePOsCount = new Set(filteredPOItems.map(i => i.numPO)).size;
  const totalGastoOficial = officialIssuedItems.reduce((acc, i) => acc + (i.usSubtotalI1 || 0), 0);
  const totalAhorroPotencial = officialIssuedItems.reduce((acc, i) => acc + (i.ahorroPotencialTotal || 0), 0);

  const otdItems = filteredPOItems.filter(i => i.estadoPos?.toLowerCase() === 'ok');
  const otdPercentage = totalItemsCount > 0 ? (otdItems.length / totalItemsCount) * 100 : 0;

  const emissionDaysArr = filteredPOItems
    .map(i => i.diasEmisionPO)
    .filter((d): d is number => d !== null && d !== undefined);
  const avgEmissionDays =
    emissionDaysArr.length > 0
      ? emissionDaysArr.reduce((a, b) => a + b, 0) / emissionDaysArr.length
      : 0;

  const activeIssuedPOWithDelay = filteredPOItems.filter(i => i.estadoPO === 1 && (i.tRetraso || 0) > 0);
  const avgDelayDays =
    activeIssuedPOWithDelay.length > 0
      ? activeIssuedPOWithDelay.reduce((a, b) => a + (b.tRetraso || 0), 0) / activeIssuedPOWithDelay.length
      : 0;

  const soleSourceItems = filteredPOItems.filter(i => i.soloSource?.toUpperCase() === 'SI');
  const soleSourcePct = totalItemsCount > 0 ? (soleSourceItems.length / totalItemsCount) * 100 : 0;

  // Chart 1: Volume & Spend per Buyer
  const buyerSummaryMap: Record<string, { count: number; spend: number }> = {};
  filteredPOItems.forEach(i => {
    const b = i.comprador || 'Sin asignar';
    if (!buyerSummaryMap[b]) buyerSummaryMap[b] = { count: 0, spend: 0 };
    buyerSummaryMap[b].count += 1;
    if (i.fFirmaPO && !i.esCancelado) {
      buyerSummaryMap[b].spend += i.usSubtotalI1 || 0;
    }
  });

  const buyerChartData = Object.entries(buyerSummaryMap).map(([buyer, val]) => ({
    comprador: buyer,
    items: val.count,
    spend: Math.round(val.spend)
  }));

  // Chart 2: Delivery State Breakdown
  const deliveryStateCounts: Record<string, number> = {};
  filteredPOItems.forEach(i => {
    const st = i.estadoEntregaDetalle || 'Otros';
    deliveryStateCounts[st] = (deliveryStateCounts[st] || 0) + 1;
  });

  const deliveryStateChartData = Object.entries(deliveryStateCounts).map(([state, count]) => ({
    name: state,
    value: count
  }));

  // Chart 3: Delay Severity Buckets
  const delayBucketCounts: Record<string, number> = {
    'Sin retraso': 0,
    'Leve (1-30 días)': 0,
    'Moderado (31-90 días)': 0,
    'Crítico (91-180 días)': 0,
    'Severo (>180 días)': 0
  };

  filteredPOItems.forEach(i => {
    if (i.bucketRetraso && delayBucketCounts[i.bucketRetraso] !== undefined) {
      delayBucketCounts[i.bucketRetraso] += 1;
    }
  });

  const delayBucketChartData = Object.entries(delayBucketCounts).map(([bucket, count]) => ({
    severidad: bucket,
    cantidad: count
  }));

  // Chart 4: Category Pareto ABC Analysis
  const categorySpendMap: Record<string, number> = {};
  officialIssuedItems.forEach(i => {
    const cat = i.categoria || 'VARIOS';
    categorySpendMap[cat] = (categorySpendMap[cat] || 0) + (i.usSubtotalI1 || 0);
  });

  const sortedCategoriesBySpend = Object.entries(categorySpendMap)
    .map(([cat, spend]) => ({ categoria: cat, gasto: Math.round(spend) }))
    .sort((a, b) => b.gasto - a.gasto);

  return (
    <div className="space-y-6">
      {/* Upload and Filter Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-amber-400" />
            <span>Dashboard de Performance de Compras y Órdenes de Compra (PO)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Métricas clave de eficiencia del proceso, cumplimiento de proveedores, costos e IVA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Upload PO Status Excel */}
          <label className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-2 cursor-pointer transition shadow-sm">
            <Upload className="w-4 h-4" />
            <span>Sube Reporte POs (dbo_vw_LM_PO_Estado)</span>
            <input type="file" accept=".xlsx, .xls" onChange={onUploadPODashboard} className="hidden" />
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-slate-400 text-[11px] mb-1 font-medium">Año</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todos los Años ({years.length})</option>
            {years.map(y => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 text-[11px] mb-1 font-medium">Mes</label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todos los Meses ({months.length})</option>
            {months.map(m => (
              <option key={m} value={String(m)}>
                Mes {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 text-[11px] mb-1 font-medium">Comprador</label>
          <select
            value={selectedBuyer}
            onChange={e => setSelectedBuyer(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todos los Compradores ({buyers.length})</option>
            {buyers.map(b => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Gasto Oficial (USD c/IVA)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300">
            ${totalGastoOficial.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-slate-400">En {officialIssuedItems.length} ítems con PO emitida</p>
        </div>

        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>On-Time Delivery (OTD)</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-300">
            {Math.round(otdPercentage)}%
          </div>
          <p className="text-[10px] text-slate-400">Entregas dentro del plazo acordado</p>
        </div>

        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Días Prom. Emisión PO</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">
            {avgEmissionDays.toFixed(1)} días
          </div>
          <p className="text-[10px] text-amber-400/90 font-medium">Objetivo sugerido: &lt; 5 días</p>
        </div>

        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Ahorro Potencial</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">
            ${totalAhorroPotencial.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-slate-400">Vía negociación con mejor alternativa</p>
        </div>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">Órdenes Únicas (POs)</span>
            <div className="text-lg font-bold text-white mt-0.5">{uniquePOsCount}</div>
          </div>
          <FileText className="w-8 h-8 text-slate-600" />
        </div>

        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">Retraso Promedio (PO Activas)</span>
            <div className="text-lg font-bold text-rose-300 mt-0.5">{Math.round(avgDelayDays)} días</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-500/50" />
        </div>

        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400">% Sole Source (Proveedor Único)</span>
            <div className="text-lg font-bold text-amber-300 mt-0.5">{soleSourcePct.toFixed(1)}%</div>
          </div>
          <Percent className="w-8 h-8 text-amber-500/50" />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buyer Spend & Volume */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span>Gasto Oficial Gestionado por Comprador (USD)</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buyerChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="comprador" stroke="#94a3b8" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                <Bar dataKey="spend" name="Gasto Total (USD)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery States Pie */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <PieChartIcon className="w-4 h-4 text-sky-400" />
            <span>Estado de Entregas y POs</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deliveryStateChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {deliveryStateChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delay Severity Buckets */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Severidad de Retrasos en Órdenes Emitidas</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delayBucketChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="severidad" stroke="#94a3b8" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                <Bar dataKey="cantidad" name="Número de ítems" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pareto ABC Spend */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>Gasto Oficial por Categoría (Clasificación Pareto ABC)</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedCategoriesBySpend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="categoria" stroke="#94a3b8" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                <Bar dataKey="gasto" name="Gasto Total (USD)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
