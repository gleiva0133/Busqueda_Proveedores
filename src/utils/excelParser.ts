import * as XLSX from 'xlsx';
import { Supplier, RequisitionItem, PODashboardItem } from '../types';
import { quitarAcentos, classifyRequirementCategory } from './supplierMatcher';

/**
 * Normalizes headers and parses uploaded CSV/Excel file into Supplier array
 */
export function parseSuppliersFile(fileData: ArrayBuffer | string): Supplier[] {
  let workbook: XLSX.WorkBook;
  if (typeof fileData === 'string') {
    workbook = XLSX.read(fileData, { type: 'string' });
  } else {
    workbook = XLSX.read(fileData, { type: 'array' });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawData || rawData.length === 0) return [];

  return rawData.map((row, index) => {
    // Detect columns dynamically
    const normalizedKeys: Record<string, any> = {};
    Object.keys(row).forEach(k => {
      const cleanKey = quitarAcentos(k);
      normalizedKeys[cleanKey] = row[k];
    });

    const getVal = (...possibleKeys: string[]): string => {
      for (const pk of possibleKeys) {
        for (const [key, val] of Object.entries(normalizedKeys)) {
          if (key.includes(pk) && val !== undefined && val !== null && val !== '') {
            return String(val).trim();
          }
        }
      }
      return '';
    };

    return {
      id: `SUP-${index + 1}`,
      ruc: getVal('ruc', 'identificacion', 'tax'),
      razonSocial: getVal('razon', 'social', 'empresa', 'nombre'),
      nombreComercial: getVal('comercial', 'fantasia', 'marca', 'empresa') || getVal('razon', 'social', 'empresa'),
      contacto: getVal('contacto', 'persona', 'representante', 'vendedor'),
      telefono: getVal('telefono', 'fono', 'tel'),
      celular: getVal('celular', 'movil', 'wha'),
      email: getVal('correo', 'email', 'mail'),
      ciudad: getVal('ciudad', 'canton', 'localidad'),
      region: getVal('region', 'provincia', 'zona'),
      proveedorGrupos: getVal('grupo', 'ofertan', 'categoria', 'rubro', 'servicio'),
      marcas: getVal('marca', 'representa', 'linea'),
      ofertan: getVal('ofertan', 'producto', 'servicio', 'detalle', 'actividad', 'grupo'),
      categoriaPrincipal: getVal('categoria', 'rubro') || 'GENERAL',
      origen: 'base_local'
    };
  });
}

/**
 * Parses Requirements sheet (qryPOs_Temp)
 */
export function parseRequirementsFile(fileData: ArrayBuffer): RequisitionItem[] {
  const workbook = XLSX.read(fileData, { type: 'array' });
  // Prefer sheet 'qryPOs_Temp' if exists, otherwise first sheet
  const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('qrypos_temp')) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawData || rawData.length === 0) return [];

  return rawData.map((row, index) => {
    const normalizedKeys: Record<string, any> = {};
    Object.keys(row).forEach(k => {
      normalizedKeys[quitarAcentos(k)] = row[k];
    });

    const getVal = (...possibleKeys: string[]): any => {
      for (const pk of possibleKeys) {
        for (const [key, val] of Object.entries(normalizedKeys)) {
          if (key.includes(pk) && val !== undefined && val !== null && val !== '') {
            return val;
          }
        }
      }
      return '';
    };

    return {
      numItem: getVal('num item', 'item', 'codigo', 'id') || index + 1,
      nombreMaterial: String(getVal('nombre material', 'material', 'descripcion', 'producto')).trim(),
      especif1: String(getVal('especif1', 'especificacion1', 'marca')).trim(),
      especif2: String(getVal('especif2', 'especificacion2', 'modelo')).trim(),
      especif3: String(getVal('especif3', 'especificacion3', 'observacion')).trim(),
      cantidad: parseFloat(getVal('cantidad', 'cant', 'qty')) || 1,
      unidad: String(getVal('unidad', 'um', 'medida')).trim() || 'UND',
      fPrevistaEntrega: String(getVal('f prevista', 'fecha entrega', 'f entrega')).trim(),
      comprador: String(getVal('comprador', 'comprador original', 'buyer', 'usuario')).trim() || 'Sin asignar',
      numPO: String(getVal('num po', 'po', 'orden')).trim(),
      tablaDemanda: String(getVal('tabla demanda', 'demanda', 'grupo', 'codigo')).trim(),
      fAsignacion: String(getVal('f asignacion', 'fecha asignacion', 'asignacion')).trim()
    };
  });
}

/**
 * Parses PO Status Dashboard sheet (dbo_vw_LM_PO_Estado)
 */
export function parsePODashboardFile(fileData: ArrayBuffer): PODashboardItem[] {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawData || rawData.length === 0) return [];

  const now = new Date();

  return rawData.map((row, index) => {
    const normalizedKeys: Record<string, any> = {};
    Object.keys(row).forEach(k => {
      normalizedKeys[quitarAcentos(k)] = row[k];
    });

    const getVal = (...possibleKeys: string[]): any => {
      for (const pk of possibleKeys) {
        for (const [key, val] of Object.entries(normalizedKeys)) {
          if (key.includes(pk) && val !== undefined && val !== null && val !== '') {
            return val;
          }
        }
      }
      return '';
    };

    const estadoPOVal = Number(getVal('estado po', 'estado_po')) || 0;
    const estadoTDVal = String(getVal('estado_td', 'estado td')).trim().toUpperCase();
    const tRetrasoVal = Number(getVal('t retraso', 'retraso')) || 0;

    let estadoPODetalle = 'PO emitida - entregada a tiempo';
    if (estadoPOVal === 1) estadoPODetalle = 'PO emitida - en seguimiento/entrega';
    if (estadoPOVal === 2) estadoPODetalle = 'Sin emitir PO aún';

    const esCancelado = estadoTDVal.includes('CANCEL') || String(getVal('num po', 'po')).toUpperCase().includes('CANCEL');

    let estadoEntregaDetalle = 'A tiempo';
    if (esCancelado) {
      estadoEntregaDetalle = 'Cancelado';
    } else if (estadoTDVal.includes('SUSPEND')) {
      estadoEntregaDetalle = 'Suspendido';
    } else if (tRetrasoVal > 0) {
      estadoEntregaDetalle = 'Retrasado';
    } else if (estadoPOVal === 2) {
      estadoEntregaDetalle = 'Sin emitir PO aún';
    }

    const fAsignacion = getVal('f asignacion tabla', 'f asignacion');
    const fFirma = getVal('f firma po', 'f firma');

    let diasEmision: number | null = null;
    if (fAsignacion && fFirma) {
      const d1 = new Date(fAsignacion);
      const d2 = new Date(fFirma);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        diasEmision = Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    let diasEsperando: number | null = null;
    if (!fFirma && fAsignacion) {
      const d1 = new Date(fAsignacion);
      if (!isNaN(d1.getTime())) {
        diasEsperando = Math.max(0, Math.floor((now.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    const precioU = parseFloat(getVal('precio u', 'precio unitario')) || 0;
    const precioU2 = parseFloat(getVal('precio u2')) || 0;
    const precioU3 = parseFloat(getVal('precio u3')) || 0;
    const cantPO = parseFloat(getVal('cant_po', 'cantidad')) || 1;

    let mejorPrecioAlterno = 0;
    if (precioU2 > 0 && precioU3 > 0) {
      mejorPrecioAlterno = Math.min(precioU2, precioU3);
    } else if (precioU2 > 0) {
      mejorPrecioAlterno = precioU2;
    } else if (precioU3 > 0) {
      mejorPrecioAlterno = precioU3;
    }

    const ahorroUnitario = mejorPrecioAlterno > 0 && mejorPrecioAlterno < precioU ? (precioU - mejorPrecioAlterno) : 0;
    const ahorroPotencialTotal = ahorroUnitario * cantPO;

    const subtotal = parseFloat(getVal('subtotal item', 'subtotal')) || (precioU * cantPO);
    const usSubtotalI1 = parseFloat(getVal('us_subtotal_i_1', 'gasto total', 'total con iva')) || (subtotal * 1.12);
    const ivaEstimado = Math.max(0, usSubtotalI1 - subtotal);

    let bucketRetraso = 'Sin retraso';
    if (tRetrasoVal > 0 && tRetrasoVal <= 30) bucketRetraso = 'Leve (1-30 días)';
    else if (tRetrasoVal > 30 && tRetrasoVal <= 90) bucketRetraso = 'Moderado (31-90 días)';
    else if (tRetrasoVal > 90 && tRetrasoVal <= 180) bucketRetraso = 'Crítico (91-180 días)';
    else if (tRetrasoVal > 180) bucketRetraso = 'Severo (>180 días)';

    const nombreMat = String(getVal('nombre material', 'material', 'descripcion')).trim() || `Item ${index + 1}`;
    const categoryClass = classifyRequirementCategory({ nombreMaterial: nombreMat });

    return {
      numPO: String(getVal('num po', 'po')).trim() || `PO-${index + 1}`,
      estadoPO: estadoPOVal,
      estadoPODetalle,
      estadoPos: String(getVal('estado pos', 'pos')).trim() || 'Ok',
      tRetraso: tRetrasoVal,
      estadoTD: estadoTDVal,
      estadoEntregaDetalle,
      nAnio: parseInt(getVal('n_anio', 'anio', 'year')) || now.getFullYear(),
      nMes: parseInt(getVal('n_mes', 'mes', 'month')) || (now.getMonth() + 1),
      fAsignacionTabla: String(fAsignacion),
      fFirmaPO: String(fFirma),
      fPrevistaEntrega: String(getVal('f prevista de entrega', 'f prevista', 'entrega')),
      comprador: String(getVal('comprador', 'buyer')).trim() || 'Sin asignar',
      precioU,
      precioU2,
      precioU3,
      subtotalItem: subtotal,
      usSubtotalI1,
      cantPO,
      proveedor: String(getVal('proveedor', 'vendor', 'supplier')).trim() || 'No asignado',
      soloSource: String(getVal('solo source', 'solosource', 'unico')).trim().toUpperCase() || 'NO',
      nombreMaterial: nombreMat,
      categoria: categoryClass,
      diasEmisionPO: diasEmision,
      diasEsperandoPO: diasEsperando,
      esCancelado,
      ahorroPotencialTotal,
      ivaEstimado,
      bucketRetraso
    };
  });
}
