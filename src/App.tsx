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

  // Compute Matched Results dynamically
  const matchedResults = useMemo(() => {
    const baseMatched = processAndMatchRequirements(requirements, suppliers);

    // Merge AI suppliers if available
    return baseMatched.map(item => {
      const aiList = aiSuppliersMap[item.categoria] || [];
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

  // Handler: Call Gemini AI to search for suppliers in a category
  const handleRunAISearch = async (category: string) => {
    try {
      setIsLoadingAI(true);
      setActiveCategorySearching(category);

      const itemsInCat = requirements.filter(
        r => r.nombreMaterial && r.nombreMaterial.trim().length > 0
      );
      const examples = itemsInCat
        .slice(0, 5)
        .map(i => i.nombreMaterial)
        .join(', ');

      const response = await fetch('/api/gemini/search-suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, examples })
      });

      const data = await response.json();
      if (data.suppliers && Array.isArray(data.suppliers)) {
        setAiSuppliersMap(prev => ({
          ...prev,
          [category]: data.suppliers
        }));
      }
    } catch (err) {
      console.error('Error searching suppliers with Gemini:', err);
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
