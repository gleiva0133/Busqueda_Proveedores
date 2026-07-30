import React, { useState } from 'react';
import {
  Upload,
  Search,
  Download,
  Building2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Tag,
  Filter
} from 'lucide-react';
import { MatchedResultItem, Supplier, IASupplier } from '../types';
import * as XLSX from 'xlsx';

interface SupplierSearchTabProps {
  matchedResults: MatchedResultItem[];
  suppliers: Supplier[];
  onUploadSuppliers: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadRequirements: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunAISearch: (category: string) => Promise<void>;
  isLoadingAI: boolean;
  activeCategorySearching?: string;
  isUsingDefaultData: boolean;
}

export const SupplierSearchTab: React.FC<SupplierSearchTabProps> = ({
  matchedResults,
  suppliers,
  onUploadSuppliers,
  onUploadRequirements,
  onRunAISearch,
  isLoadingAI,
  activeCategorySearching,
  isUsingDefaultData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedQuality, setSelectedQuality] = useState<string>('ALL');
  const [expandedRow, setExpandedRow] = useState<string | number | null>(null);

  // Extract unique categories
  const categories = Array.from(new Set(matchedResults.map(r => r.categoria))).sort();

  // Filter matched results
  const filteredResults = matchedResults.filter(item => {
    const matchesSearch =
      searchTerm === '' ||
      item.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.comprador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numPO.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tablaDemanda.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCategory === 'ALL' || item.categoria === selectedCategory;
    const matchesQuality = selectedQuality === 'ALL' || item.matchQuality === selectedQuality;

    return matchesSearch && matchesCat && matchesQuality;
  });

  // Calculate summary metrics
  const totalItems = matchedResults.length;
  const itemsWithMatchedLocal = matchedResults.filter(r => r.matchedSuppliersCount > 0).length;
  const itemsWithAI = matchedResults.filter(r => r.matchedIASuppliersCount > 0).length;
  const totalCategoriesCount = categories.length;

  // Export results to Excel
  const handleExportExcel = () => {
    if (matchedResults.length === 0) return;

    // Sheet 1: Detailed Analysis
    const sheet1Data = matchedResults.map(r => ({
      'Num Ítem': r.numItem,
      'Categoría': r.categoria,
      'Material': r.material,
      'Especificaciones': r.especificaciones,
      'Cantidad': r.cantidad,
      'Unidad': r.unidad,
      'Fecha Entrega': r.fechaEntrega,
      'Comprador': r.comprador,
      'PO': r.numPO,
      'Tabla Demanda': r.tablaDemanda,
      'Departamento': r.departamento,
      'Fecha Asignación': r.fechaAsignacion,
      'Retraso (días)': r.retrasoDias ?? 'N/A',
      'Calidad Coincidencia': r.matchQuality,
      'Núm. Proveedores Local': r.matchedSuppliersCount,
      'Proveedores Locales': r.matchedSuppliersList.map(s => s.nombreComercial || s.razonSocial).join(', '),
      'Núm. Proveedores IA': r.matchedIASuppliersCount,
      'Proveedores IA': r.matchedIASuppliersList.map(s => s.nombre_empresa).join(', ')
    }));

    // Sheet 2: Unique Suppliers Database
    const sheet2Data = suppliers.map(s => ({
      'RUC': s.ruc,
      'Razón Social': s.razonSocial,
      'Nombre Comercial': s.nombreComercial,
      'Contacto': s.contacto,
      'Teléfono': s.telefono,
      'Celular': s.celular,
      'Correo': s.email,
      'Ciudad': s.ciudad,
      'Región': s.region,
      'Grupos / Rubros': s.proveedorGrupos,
      'Marcas': s.marcas,
      'Ofertan / Productos': s.ofertan
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
    const ws2 = XLSX.utils.json_to_sheet(sheet2Data);

    XLSX.utils.book_append_sheet(wb, ws1, 'ANALISIS_DETALLADO');
    XLSX.utils.book_append_sheet(wb, ws2, 'BASE_PROVEEDORES');

    XLSX.writeFile(wb, `ANALISIS_PROVEEDORES_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* File Upload Banner */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">Archivos de Trabajo</h2>
              {isUsingDefaultData && (
                <span className="px-2.5 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-medium">
                  Modo Ejemplo Activo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Sube tus archivos reales de Proveedores (CSV/Excel) y Requerimientos de Compra (<code className="text-amber-300">qryPOs_Temp</code>)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upload Suppliers */}
            <label className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-900/90 hover:bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-xl cursor-pointer text-xs font-medium text-slate-200 transition group shadow-sm">
              <Upload className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="block font-semibold">1. Base Proveedores</span>
                <span className="text-[10px] text-slate-400">CSV o Excel (.xlsx)</span>
              </div>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={onUploadSuppliers} className="hidden" />
            </label>

            {/* Upload Requirements */}
            <label className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-900/90 hover:bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-xl cursor-pointer text-xs font-medium text-slate-200 transition group shadow-sm">
              <Upload className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="block font-semibold">2. Requerimientos</span>
                <span className="text-[10px] text-slate-400">Excel (qryPOs_Temp)</span>
              </div>
              <input type="file" accept=".xlsx, .xls" onChange={onUploadRequirements} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Requerimientos Totales</span>
            <span className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Tag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{totalItems}</div>
          <p className="text-[11px] text-slate-400 mt-1">Materiales en cola de compra</p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Categorías Detectadas</span>
            <span className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <Filter className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-sky-300 mt-2">{totalCategoriesCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Rubros mineros especializados</p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Coincidencia Base Local</span>
            <span className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-2">
            {itemsWithMatchedLocal} / {totalItems}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 font-medium">
            {totalItems > 0 ? `${Math.round((itemsWithMatchedLocal / totalItems) * 100)}% cubierto en base` : '0%'}
          </p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Enriquecidos con IA</span>
            <span className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-300 mt-2">{itemsWithAI}</div>
          <p className="text-[11px] text-slate-400 mt-1">Proveedores externos vía Gemini</p>
        </div>
      </div>

      {/* Filters and Controls Bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por material, comprador, PO..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas las Categorías ({categories.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Match Quality Filter */}
          <select
            value={selectedQuality}
            onChange={e => setSelectedQuality(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas las Calidades</option>
            <option value="Alta">Alta Coincidencia</option>
            <option value="Media">Media Coincidencia</option>
            <option value="Sugerida">Sugerida / Dominio</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportExcel}
          disabled={matchedResults.length === 0}
          className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Reporte Excel</span>
        </button>
      </div>

      {/* Results Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <span>Resultados de Emparejamiento</span>
            <span className="text-xs font-normal text-slate-400">
              ({filteredResults.length} de {matchedResults.length} ítems)
            </span>
          </h3>
          <span className="text-xs text-slate-400">
            Haz clic en una fila para desplegar detalles del proveedor
          </span>
        </div>

        {filteredResults.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-400/80 mb-3" />
            <p className="text-sm font-medium text-slate-300">No se encontraron requerimientos que coincidan con los filtros.</p>
            <p className="text-xs text-slate-500 mt-1">Prueba limpiando los términos de búsqueda o cambiando la categoría.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                  <th className="py-3 px-4">Item / PO</th>
                  <th className="py-3 px-4">Material & Especificaciones</th>
                  <th className="py-3 px-4">Categoría / Depto</th>
                  <th className="py-3 px-4">Comprador</th>
                  <th className="py-3 px-4 text-center">Proveedores Encontrados</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-xs text-slate-300">
                {filteredResults.map(item => {
                  const isExpanded = expandedRow === item.numItem;
                  const isSearchingThisCategory =
                    isLoadingAI && activeCategorySearching === item.categoria;

                  return (
                    <React.Fragment key={item.numItem}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : item.numItem)}
                        className={`hover:bg-slate-700/40 transition cursor-pointer ${
                          isExpanded ? 'bg-slate-700/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-slate-200">#{item.numItem}</div>
                          <div className="text-[10px] text-slate-400">{item.numPO || item.tablaDemanda}</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-white line-clamp-2">{item.material}</div>
                          {item.especificaciones && (
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.especificaciones}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Cant: <span className="text-slate-300">{item.cantidad} {item.unidad}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md">
                            {item.categoria}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                            <span>Depto: {item.departamento}</span>
                            {item.pistaAplicada && (
                              <span className="text-sky-400 text-[9px] font-semibold" title="Refinado por código de departamento">
                                (Pista Depto)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200">{item.comprador}</div>
                          {item.retrasoDias !== null && item.retrasoDias > 0 ? (
                            <div className="text-[10px] text-rose-400 flex items-center space-x-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{item.retrasoDias} días retraso</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-400 mt-0.5">A tiempo</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <span
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 ${
                                item.matchedSuppliersCount > 0
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{item.matchedSuppliersCount} proveedores</span>
                            </span>

                            {item.matchedIASuppliersCount > 0 && (
                              <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md flex items-center space-x-1">
                                <Sparkles className="w-3 h-3" />
                                <span>+{item.matchedIASuppliersCount} en IA</span>
                              </span>
                            )}

                            <span className="text-[10px] text-slate-500">
                              Calidad: {item.matchQuality}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onRunAISearch(item.categoria);
                            }}
                            disabled={isSearchingThisCategory}
                            className="px-3 py-1.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-700/50 rounded-lg text-xs font-medium inline-flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
                            title="Buscar proveedores externos adicionales para esta categoría usando IA"
                          >
                            <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isSearchingThisCategory ? 'animate-spin' : ''}`} />
                            <span>{isSearchingThisCategory ? 'Buscando...' : 'Buscar IA'}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-900/90">
                          <td colSpan={6} className="p-4 border-t border-slate-700">
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                                <Building2 className="w-4 h-4" />
                                <span>Proveedores Encontrados en Base Local ({item.matchedSuppliersCount})</span>
                              </h4>

                              {item.matchedSuppliersCount === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  No se encontraron coincidencias exactas en la base local. Haz clic en 'Buscar IA' arriba para descubrir proveedores externos en esta categoría.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {item.matchedSuppliersList.map((sup, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-slate-800 border border-slate-700/80 rounded-xl p-3 text-xs space-y-2 hover:border-amber-500/40 transition"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="font-bold text-white text-sm">
                                            {sup.nombreComercial || sup.razonSocial}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-mono">
                                            RUC: {sup.ruc || 'N/A'}
                                          </div>
                                        </div>
                                        <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-medium">
                                          Local
                                        </span>
                                      </div>

                                      {sup.contacto && (
                                        <div className="flex items-center space-x-1.5 text-slate-300">
                                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>Contacto: {sup.contacto}</span>
                                        </div>
                                      )}

                                      <div className="flex items-center space-x-3 text-slate-300">
                                        {sup.telefono && (
                                          <div className="flex items-center space-x-1">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>{sup.telefono}</span>
                                          </div>
                                        )}
                                        {sup.email && (
                                          <div className="flex items-center space-x-1 truncate">
                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate">{sup.email}</span>
                                          </div>
                                        )}
                                      </div>

                                      {(sup.ciudad || sup.region) && (
                                        <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                          <span>{sup.ciudad} {sup.region ? `- ${sup.region}` : ''}</span>
                                        </div>
                                      )}

                                      {sup.marcas && (
                                        <div className="pt-1 border-t border-slate-700/60 text-[10px] text-slate-400">
                                          <span className="font-semibold text-slate-300">Marcas:</span> {sup.marcas}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* AI Discovered Suppliers if any */}
                              {item.matchedIASuppliersCount > 0 && (
                                <div className="pt-3 border-t border-slate-800 space-y-3">
                                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-2">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                    <span>Proveedores Descubiertos por IA Gemini ({item.matchedIASuppliersCount})</span>
                                  </h4>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {item.matchedIASuppliersList.map((aiSup, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-3 text-xs space-y-2"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="font-bold text-purple-200">
                                            {aiSup.nombre_empresa}
                                          </div>
                                          <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-medium">
                                            IA Gemini
                                          </span>
                                        </div>

                                        <div className="text-[11px] text-slate-300">
                                          {aiSup.descripcion_breve}
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-purple-300/80 pt-1 border-t border-purple-800/30">
                                          <span>📍 {aiSup.ciudad_pais}</span>
                                          <span>🌐 {aiSup.sitio_web_o_contacto}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
