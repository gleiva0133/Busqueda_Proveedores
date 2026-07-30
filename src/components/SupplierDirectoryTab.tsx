import React, { useState } from 'react';
import {
  Building2,
  Search,
  Plus,
  MapPin,
  Phone,
  Mail,
  Tag,
  ShieldCheck,
  User,
  Filter,
  Check
} from 'lucide-react';
import { Supplier } from '../types';

interface SupplierDirectoryTabProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
}

export const SupplierDirectoryTab: React.FC<SupplierDirectoryTabProps> = ({
  suppliers,
  onAddSupplier
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Supplier Form State
  const [newRuc, setNewRuc] = useState('');
  const [newRazonSocial, setNewRazonSocial] = useState('');
  const [newNombreComercial, setNewNombreComercial] = useState('');
  const [newContacto, setNewContacto] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCiudad, setNewCiudad] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newMarcas, setNewMarcas] = useState('');
  const [newOfertan, setNewOfertan] = useState('');
  const [newCategoria, setNewCategoria] = useState('');

  // Get unique regions
  const regions = Array.from(new Set(suppliers.map(s => s.region).filter(Boolean))).sort();

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(sup => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      term === '' ||
      sup.razonSocial.toLowerCase().includes(term) ||
      sup.nombreComercial.toLowerCase().includes(term) ||
      sup.ruc.toLowerCase().includes(term) ||
      sup.contacto.toLowerCase().includes(term) ||
      sup.marcas.toLowerCase().includes(term) ||
      sup.ofertan.toLowerCase().includes(term) ||
      sup.proveedorGrupos.toLowerCase().includes(term);

    const matchesReg = selectedRegion === 'ALL' || sup.region === selectedRegion;

    return matchesSearch && matchesReg;
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRazonSocial && !newNombreComercial) return;

    const newSup: Supplier = {
      id: `SUP-USER-${Date.now()}`,
      ruc: newRuc || '9999999999001',
      razonSocial: newRazonSocial || newNombreComercial,
      nombreComercial: newNombreComercial || newRazonSocial,
      contacto: newContacto || 'Ventas',
      telefono: newTelefono || 'N/A',
      celular: '',
      email: newEmail || 'contacto@proveedor.com',
      ciudad: newCiudad || 'Ecuador',
      region: newRegion || 'Nacional',
      proveedorGrupos: newCategoria || 'FERRETERÍA GENERAL',
      marcas: newMarcas || 'VARIAS',
      ofertan: newOfertan || 'Suministros varios',
      categoriaPrincipal: newCategoria || 'FERRETERÍA GENERAL',
      origen: 'base_local'
    };

    onAddSupplier(newSup);
    setIsModalOpen(false);

    // Reset Form
    setNewRuc('');
    setNewRazonSocial('');
    setNewNombreComercial('');
    setNewContacto('');
    setNewTelefono('');
    setNewEmail('');
    setNewCiudad('');
    setNewRegion('');
    setNewMarcas('');
    setNewOfertan('');
    setNewCategoria('');
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <span>Master de Proveedores Mineros e Industriales</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Directorio consolidado de empresas proveedoras locales e internacionales con cobertura minera
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Proveedor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por RUC, Razón Social, Marca, Producto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas las Regiones ({regions.length})</option>
            {regions.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((sup, idx) => (
          <div
            key={sup.id || idx}
            className="bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-2xl p-5 shadow-sm space-y-3 transition flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base leading-snug">
                    {sup.nombreComercial || sup.razonSocial}
                  </h3>
                  {sup.razonSocial && sup.razonSocial !== sup.nombreComercial && (
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{sup.razonSocial}</p>
                  )}
                  <p className="text-[10px] font-mono text-amber-400/90 mt-0.5">RUC: {sup.ruc || 'N/A'}</p>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full shrink-0">
                  Verificado
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-700/60 text-xs text-slate-300">
                {sup.contacto && (
                  <div className="flex items-center space-x-2 text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sup.contacto}</span>
                  </div>
                )}

                <div className="flex items-center space-x-3 text-slate-300">
                  {sup.telefono && (
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{sup.telefono}</span>
                    </div>
                  )}
                  {sup.email && (
                    <div className="flex items-center space-x-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                </div>

                {(sup.ciudad || sup.region) && (
                  <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{sup.ciudad} {sup.region ? `- ${sup.region}` : ''}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700/60 space-y-1.5">
              {sup.marcas && (
                <div className="text-[11px] text-slate-300">
                  <span className="font-semibold text-slate-400">Marcas:</span> {sup.marcas}
                </div>
              )}
              {sup.ofertan && (
                <div className="text-[11px] text-slate-400 line-clamp-2">
                  <span className="font-semibold text-slate-300">Ofertan:</span> {sup.ofertan}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>Registrar Nuevo Proveedor</span>
            </h3>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">RUC</label>
                  <input
                    type="text"
                    required
                    placeholder="1790000000001"
                    value={newRuc}
                    onChange={e => setNewRuc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Categoría Principal</label>
                  <input
                    type="text"
                    placeholder="Ej. SOLDADURA, VÁLVULAS"
                    value={newCategoria}
                    onChange={e => setNewCategoria(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Razón Social</label>
                <input
                  type="text"
                  required
                  placeholder="PROVEEDORES MINEROS S.A."
                  value={newRazonSocial}
                  onChange={e => setNewRazonSocial(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nombre Comercial</label>
                <input
                  type="text"
                  placeholder="Nombre corto o marca"
                  value={newNombreComercial}
                  onChange={e => setNewNombreComercial(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Contacto</label>
                  <input
                    type="text"
                    placeholder="Ing. Juan Delgado"
                    value={newContacto}
                    onChange={e => setNewContacto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Teléfono</label>
                  <input
                    type="text"
                    placeholder="02-2800000"
                    value={newTelefono}
                    onChange={e => setNewTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="ventas@proveedor.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Ciudad / Región</label>
                  <input
                    type="text"
                    placeholder="Quito, Pichincha"
                    value={newCiudad}
                    onChange={e => {
                      setNewCiudad(e.target.value);
                      setNewRegion(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Marcas Representadas</label>
                <input
                  type="text"
                  placeholder="SKF, Parker, Miller..."
                  value={newMarcas}
                  onChange={e => setNewMarcas(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Productos / Oferta</label>
                <textarea
                  rows={2}
                  placeholder="Electrodos, bombas sumergibles, válvulas de control..."
                  value={newOfertan}
                  onChange={e => setNewOfertan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
