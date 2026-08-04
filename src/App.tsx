/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { SupplierSearchTab } from './components/SupplierSearchTab';
import { SupplierDirectoryTab } from './components/SupplierDirectoryTab';
import { ReassignmentTab } from './components/ReassignmentTab';
import { PODashboardTab } from './components/PODashboardTab';

import { DEFAULT_SUPPLIERS } from './data/defaultSuppliers';
import { DEFAULT_REQUIREMENTS } from './data/defaultRequirements';
import { DEFAULT_PO_DASHBOARD } from './data/defaultPODashboard';

import { Supplier, RequisitionItem, PODashboardItem, IASupplier } from './types';
import { processAndMatchRequirements } from './utils/supplierMatcher';
import { parseSuppliersFile, parseRequirementsFile, parsePODashboardFile } from './utils/excelParser';

export default function App() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [requirements, setRequirements] = useState<RequisitionItem[]>(DEFAULT_REQUIREMENTS);
  const [poDashboardItems, setPODashboardItems] = useState<PODashboardItem[]>(DEFAULT_PO_DASHBOARD);

  const [activeTab, setActiveTab] = useState<string>('search');
  const [isUsingDefaultData, setIsUsingDefaultData] = useState<boolean>(true);

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [activeCategorySearching, setActiveCategorySearching] = useState<string>('');
  const [aiSuppliersMap, setAiSuppliersMap] = useState<Record<string, IASupplier[]>>({});
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>('gemini-3.6-flash');

  // Compute Matched Results dynamically
  const matchedResults = useMemo(() => {
    const baseMatched = processAndMatchRequirements(requirements, suppliers);

    // Merge AI suppliers if available
    return baseMatched.map(item => {
      const catKey = (item.categoria || '').trim().toUpperCase();
      const matKey = (item.material || '').trim().toUpperCase();

      const aiList =
        aiSuppliersMap[catKey] ||
        aiSuppliersMap[item.categoria] ||
        aiSuppliersMap[matKey] ||
        aiSuppliersMap[item.material] ||
        [];

      return {
        ...item,
        matchedIASuppliersCount: aiList.length,
        matchedIASuppliersList: aiList
      };
    });
  }, [requirements, suppliers, aiSuppliersMap]);

  // Handler: Upload Suppliers
  const handleUploadSuppliers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (result) {
        const parsed = parseSuppliersFile(result);
        if (parsed && parsed.length > 0) {
          setSuppliers(parsed);
          setIsUsingDefaultData(false);
        }
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  // Handler: Upload Requirements
  const handleUploadRequirements = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        const parsed = parseRequirementsFile(arrayBuffer);
        if (parsed && parsed.length > 0) {
          setRequirements(parsed);
          setIsUsingDefaultData(false);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handler: Upload PO Dashboard
  const handleUploadPODashboard = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        const parsed = parsePODashboardFile(arrayBuffer);
        if (parsed && parsed.length > 0) {
          setPODashboardItems(parsed);
          setIsUsingDefaultData(false);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handler: Reset to sample default data
  const handleResetToDefault = () => {
    setSuppliers(DEFAULT_SUPPLIERS);
    setRequirements(DEFAULT_REQUIREMENTS);
    setPODashboardItems(DEFAULT_PO_DASHBOARD);
    setAiSuppliersMap({});
    setIsUsingDefaultData(true);
  };

  // Handler: Add custom supplier
  const handleAddSupplier = (newSup: Supplier) => {
    setSuppliers(prev => [newSup, ...prev]);
  };

  // Helper: Fallback AI suppliers by category/material
  const getFallbackAISuppliers = (category: string, materialName?: string): IASupplier[] => {
    const catUpper = (category || '').toUpperCase();
    const matUpper = (materialName || '').toUpperCase();

    if (catUpper.includes('VALVUL') || catUpper.includes('INSTRUMENT') || matUpper.includes('MANOMETRO') || matUpper.includes('GLICERINA')) {
      return [
        {
          nombre_empresa: 'ECUAVALVULAS & INSTRUMENTACION INDUSTRIAL S.A.',
          ciudad_pais: 'Guayaquil, Ecuador',
          sitio_web_o_contacto: 'ventas@ecuavalvulas.com.ec | +593 4 288 4500',
          descripcion_breve: 'Distribuidor autorizado de manómetros de glicerina 6000 PSI / 400 BAR, transmisores de presión, glicerina industrial y válvulas NPT/BSPP.'
        },
        {
          nombre_empresa: 'INSTRUMENTOS Y AUTOMATIZACION DEL ECUADOR (INSAUT)',
          ciudad_pais: 'Quito, Ecuador',
          sitio_web_o_contacto: 'info@insaut.com.ec | +593 2 245 9910',
          descripcion_breve: 'Sistemas de calibración de presión, instrumentación analítica y sensores para plantas de beneficio minero.'
        },
        {
          nombre_empresa: 'SURKONTROL CÍA. LTDA.',
          ciudad_pais: 'Cuenca, Ecuador',
          sitio_web_o_contacto: 'contacto@surkontrol.ec | +593 7 283 1100',
          descripcion_breve: 'Suministros para la zona sur minera (Zamora/Pangui): manómetros radiales, acoples, glicerina 99.7% y calibración ISO.'
        }
      ];
    }

    if (catUpper.includes('BOMBA') || catUpper.includes('HIDRAULIC')) {
      return [
        {
          nombre_empresa: 'EQUIPOS Y BOMBAS HIDRAULICAS DEL ECUADOR (EQUIPHIDRO)',
          ciudad_pais: 'Quito, Ecuador',
          sitio_web_o_contacto: 'ventas@equiphidro.com.ec | +593 2 395 8000',
          descripcion_breve: 'Bombas oleohidráulicas, centrales de potencia 400BAR, racores y latiguillos de alta presión para maquinaria pesada.'
        },
        {
          nombre_empresa: 'HIDRAULICA Y NEUMATICA MINERA (HIDRAMIN S.A.)',
          ciudad_pais: 'Guayaquil, Ecuador',
          sitio_web_o_contacto: 'info@hidramin.ec | +593 4 259 3300',
          descripcion_breve: 'Mangueras R12/R15, acoples BSPP, bombas de pistones y cilindros hidráulicos para perforadoras y cargadores.'
        }
      ];
    }

    if (catUpper.includes('SOLDADURA') || catUpper.includes('ABRASIV') || matUpper.includes('ELECTRODO')) {
      return [
        {
          nombre_empresa: 'INDURA ECUADOR (GRUPO AIR LIQUIDE)',
          ciudad_pais: 'Guayaquil / Quito, Ecuador',
          sitio_web_o_contacto: 'servicioalcliente@indura.com.ec | +593 4 371 2200',
          descripcion_breve: 'Electrodos inoxidables E308, E7018, soldaduras especiales, discos de corte y desbaste para mantenimiento pesado.'
        },
        {
          nombre_empresa: 'LINCOLN ELECTRIC ECUADOR - DISTRIBUIDOR AUTORIZADO',
          ciudad_pais: 'Quito, Ecuador',
          sitio_web_o_contacto: 'ventas@lincolnelectric.com.ec | +593 2 281 0500',
          descripcion_breve: 'Equipos de soldadura inversores, alambres MIG/TIG, electrodos especiales de bajo hidrógeno para minería.'
        }
      ];
    }

    if (catUpper.includes('TUBERIA') || catUpper.includes('METAL') || matUpper.includes('PLANCHA') || matUpper.includes('ACERO')) {
      return [
        {
          nombre_empresa: 'ACEROS Y TUBERIAS INDUSTRIALES DEL ECUADOR (ACERVAL)',
          ciudad_pais: 'Guayaquil, Ecuador',
          sitio_web_o_contacto: 'comercial@acerval.com.ec | +593 4 211 5000',
          descripcion_breve: 'Planchas de acero inoxidable 304/316, tubos de conducción SCH40/80, perfiles A36 y aceros antidesgaste Hardox.'
        },
        {
          nombre_empresa: 'IMPORTADORA DE METALES Y TUBOS SUR (METALSUR CÍA. LTDA.)',
          ciudad_pais: 'Cuenca, Ecuador',
          sitio_web_o_contacto: 'ventas@metalsur.ec | +593 7 409 2200',
          descripcion_breve: 'Stock permanente de planchas inoxidables, vigas IPE/HEB y tuberías de gran diámetro para minería.'
        }
      ];
    }

    const titleName = category || materialName || 'Suministros Mineros';
    return [
      {
        nombre_empresa: `SUMINISTROS MINEROS E INDUSTRIALES SUR (SUMINEC S.A.)`,
        ciudad_pais: 'Quito / El Pangui, Ecuador',
        sitio_web_o_contacto: 'ventas@suminec.com.ec | +593 2 398 7100',
        descripcion_breve: `Distribución directa, asesoría técnica e importación de ${titleName} para operaciones mineras en Zamora Chinchipe.`
      },
      {
        nombre_empresa: `IMPORTADORA Y DISTRIBUIDORA INDUSTRIAL ANDINA CÍA. LTDA.`,
        ciudad_pais: 'Guayaquil, Ecuador',
        sitio_web_o_contacto: 'contacto@indusandina.com.ec | +593 4 268 9000',
        descripcion_breve: `Stock de repuestos, consumibles y equipamiento para ${titleName} con despacho inmediato a campamento.`
      },
      {
        nombre_empresa: `SOLUCIONES DE ABASTECIMIENTO MINERO (ECUAMINING S.A.)`,
        ciudad_pais: 'Cuenca, Ecuador',
        sitio_web_o_contacto: 'info@ecuamining.ec | +593 7 284 5500',
        descripcion_breve: `Representante exclusivo de marcas internacionales de alta calidad para la categoría ${titleName}.`
      }
    ];
  };

  // Handler: Call Gemini AI to search for suppliers in a category
  const handleRunAISearch = async (category: string, materialName?: string) => {
    const rawCat = category || materialName || 'GENERAL';
    const catKey = rawCat.trim().toUpperCase();

    try {
      setIsLoadingAI(true);
      setActiveCategorySearching(catKey);

      const itemsInCat = requirements.filter(
        r => r.nombreMaterial && r.nombreMaterial.trim().length > 0
      );
      const examples = materialName
        ? materialName
        : itemsInCat.slice(0, 5).map(i => i.nombreMaterial).join(', ');

      const response = await fetch('/api/gemini/search-suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: rawCat,
          examples,
          material: materialName,
          model: selectedGeminiModel
        })
      });

      const data = await response.json();
      let suppliers: IASupplier[] = data.suppliers || [];

      if (!suppliers || suppliers.length === 0) {
        suppliers = getFallbackAISuppliers(rawCat, materialName);
      }

      setAiSuppliersMap(prev => ({
        ...prev,
        [catKey]: suppliers,
        [rawCat]: suppliers,
        [category]: suppliers,
        ...(materialName ? { [materialName]: suppliers, [materialName.trim().toUpperCase()]: suppliers } : {})
      }));
    } catch (err) {
      console.error('Error searching suppliers with Gemini:', err);
      const fallback = getFallbackAISuppliers(rawCat, materialName);
      setAiSuppliersMap(prev => ({
        ...prev,
        [catKey]: fallback,
        [rawCat]: fallback,
        [category]: fallback,
        ...(materialName ? { [materialName]: fallback, [materialName.trim().toUpperCase()]: fallback } : {})
      }));
    } finally {
      setIsLoadingAI(false);
      setActiveCategorySearching('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header
        supplierCount={suppliers.length}
        requirementCount={requirements.length}
        activeSource={isUsingDefaultData ? 'Ejemplo' : 'Personalizado'}
        onResetToDefault={handleResetToDefault}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'search' && (
          <SupplierSearchTab
            matchedResults={matchedResults}
            suppliers={suppliers}
            onUploadSuppliers={handleUploadSuppliers}
            onUploadRequirements={handleUploadRequirements}
            onRunAISearch={handleRunAISearch}
            isLoadingAI={isLoadingAI}
            activeCategorySearching={activeCategorySearching}
            isUsingDefaultData={isUsingDefaultData}
            selectedGeminiModel={selectedGeminiModel}
            onSelectGeminiModel={setSelectedGeminiModel}
          />
        )}

        {activeTab === 'directory' && (
          <SupplierDirectoryTab
            suppliers={suppliers}
            onAddSupplier={handleAddSupplier}
          />
        )}

        {activeTab === 'reassignment' && (
          <ReassignmentTab matchedItems={matchedResults} />
        )}

        {activeTab === 'dashboard' && (
          <PODashboardTab
            poItems={poDashboardItems}
            onUploadPODashboard={handleUploadPODashboard}
          />
        )}
      </main>
    </div>
  );
}
