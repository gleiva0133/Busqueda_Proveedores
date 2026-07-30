import React from 'react';
import { Pickaxe, ShieldCheck, Database, Sparkles, RefreshCw } from 'lucide-react';

interface HeaderProps {
  supplierCount: number;
  requirementCount: number;
  activeSource: string;
  onResetToDefault: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  supplierCount,
  requirementCount,
  activeSource,
  onResetToDefault,
  activeTab,
  setActiveTab
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Pickaxe className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Buscador de Proveedores Mineros
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  Supply Chain 2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Plataforma de emparejamiento de proveedores, reasignación inteligente de carga y control de POs
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Base:</span>
              <span className="font-semibold text-emerald-300">{supplierCount} proveed.</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">Reqs:</span>
              <span className="font-semibold text-amber-300">{requirementCount} ítems</span>
            </div>

            <button
              onClick={onResetToDefault}
              className="inline-flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Cargar datos de ejemplo prediseñados"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Cargar Ejemplo</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-1 border-t border-slate-800 pt-2 pb-1">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Buscador y Emparejamiento</span>
          </button>

          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'directory'
                ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Directorio de Proveedores ({supplierCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('reassignment')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'reassignment'
                ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Propuesta de Reasignación</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span>Dashboard Performance POs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
