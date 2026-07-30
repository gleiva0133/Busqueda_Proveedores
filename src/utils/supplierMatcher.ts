import { Supplier, RequisitionItem, MatchedResultItem } from '../types';

export function quitarAcentos(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'SOLDADURA Y ABRASIVOS': ['soldadura', 'electrodo', 'abrasivo', 'disco', 'desbaste', 'corte', '7018', '6010', 'indura', 'miller', 'lincoln', 'oxigeno', 'argon', 'alambre', 'soldar', 'careta', 'fotosensible'],
  'EXPLOSIVOS Y VOLADURA': ['explosivo', 'dinamita', 'detonador', 'fulminante', 'anfo', 'voladura', 'cordon', 'cordón', 'mecha', 'emulsion', 'emulsión', 'enaex', 'exsa', 'orica', 'booster', 'retardo'],
  'RODAMIENTOS Y TRANSMISIÓN': ['rodamiento', 'bearing', 'ruliman', 'rulimán', 'cojinete', 'chumacera', 'skf', 'timken', 'fag', 'retén', 'reten', 'cadena', 'optibelt', 'polea', 'transmisión', 'transmision'],
  'BOMBAS Y SISTEMAS HIDRÁULICOS': ['bomba', 'electrobomba', 'sumergible', 'hidraulica', 'hidráulica', 'fluid', 'fluidmaq', 'parker', 'eaton', 'manguera', 'acople', 'piston', 'cilindro', 'ksb', 'sulzer', 'flygt'],
  'VÁLVULAS E INSTRUMENTACIÓN': ['valvula', 'válvula', 'valve', 'check', 'mariposa', 'guillotina', 'regulador', 'manometro', 'manómetro', 'presion', 'presión', 'flujo', 'swagelok', 'pivaltec', 'transmisor', 'fischer', 'spirax'],
  'EQUIPO Y MONITOREO AMBIENTAL': ['ambiental', 'sensor', 'algas', 'barometrica', 'barométrica', 'medio ambiente', 'calidad del agua', 'calidad del aire', 'estacion', 'estación', 'meteorologica', 'meteorológica', 'pluviometro', 'anemometro', 'conductividad', 'turbiedad', 'datalogger', 'cr350', 'campbell', 'ysi', 'horiba', 'vaisala', ' Green algae', 'chlorophyll'],
  'SUMINISTROS DE COMPUTACIÓN Y TECNOLOGÍA': ['computador', 'computadora', 'laptop', 'portatil', 'portátil', 'mouse', 'teclado', 'monitor', 'servidor', 'impresora', 'modem', 'módem', 'router', 'ups', 'tarjeta', 'disco duro', 'memoria', 'toner', 'tóner', 'cartucho', 'switch', 'cable de red', 'access point', 'usb', 'cpu', 'dell', 'hp', 'lenovo', 'cisco', 'fortinet'],
  'DISEÑO Y PUBLICIDAD': ['publicitari', 'cartel', 'rotulo', 'rótulo', 'letrero', 'valla', 'banner', 'pendon', 'pendón', 'gigantografia', 'gigantografía', 'vinil', 'lona', 'diseño', 'imprenta', 'graficare'],
  'RECONOCIMIENTOS Y ARTÍCULOS PROMOCIONALES': ['trofeo', 'medalla', 'placa', 'recuerdo', 'premio', 'reconocimiento', 'promocional', 'souvenir'],
  'PAPELERÍA Y OFICINA': ['papeleria', 'papelería', 'esfero', 'esferografico', 'esferográfico', 'boligrafo', 'bolígrafo', 'lapiz', 'lápiz', 'grapa', 'grapadora', 'carpeta', 'cuaderno', 'marcador', 'resaltador', 'clip', 'resma', 'papel', 'sobre'],
  'MATERIAL ELÉCTRICO': ['cable', 'transformador', 'electrico', 'eléctrico', 'ventilador', 'led', 'solar', 'breaker', 'luminaria', 'schneider', 'siemens', 'abb', 'centelsa', 'dismelec', 'trifasico', 'trifásico'],
  'TUBERÍAS Y METALES': ['tubo', 'tuberia', 'tubería', 'pipe', 'cobre', 'inoxidable', 'plancha', 'barra', 'perfil', 'viga', 'acero', 'novacero', 'armco', 'estructural', 'chapa'],
  'MATERIALES DE CONSTRUCCIÓN': ['geomembrana', 'petreo', 'pétreo', 'grava', 'arena', 'piedra', 'agregado', 'ripio', 'cemento', 'hormigon', 'hormigón', 'cantera', 'holcim', 'hdpe'],
  'COMBUSTIBLES Y LUBRICANTES': ['combustible', 'diesel', 'diésel', 'gasolina', 'lubricante', 'aceite', 'grasa', 'mobil', 'shell', 'castrol', 'primax', 'terpel', 'iso 68', '15w40'],
  'REPUESTOS VEHICULOS Y MAQUINARIA': ['repuesto', 'part', 'manija', 'puerta', 'asiento', 'ford', 'jac', 'ranger', 'freno', 'frenos', 'cilindro', 'muelle', 'ballesta', 'resorte', 'amortiguador', 'suspension', 'suspensión', 'embrague', 'radiador', 'alternador', 'motor', 'bujia', 'correa', 'faro', 'llanta', 'neumatico', 'rin', 'chasis', 'carroceria', 'camion', 'camioneta', 'vehiculo', 'parabrisas', 'toyota', 'bosch', 'mann'],
  'MADERA Y MUEBLES': ['madera', 'aserradero', 'mueble', 'muebles', 'menaje', 'cama', 'colchon', 'colchón', 'mesa', 'velador', 'ropero', 'armario', 'escritorio', 'silla', 'sillon', 'sillón', 'estanteria', 'polin', 'polín', 'triplex'],
  'ASEO Y LIMPIEZA': ['aseo', 'limpieza', 'detergente', 'jabon', 'jabón', 'desinfectante', 'escoba', 'trapeador', 'papel higienico', 'papel higiénico', 'toalla', 'lejia', 'lejía', 'cloro', 'clorox', 'prolimpio'],
  'FILTRACIÓN': ['filtro', 'cartucho', 'manocomando', 'sedal', 'purificador', 'malla'],
  'EPP Y SEGURIDAD INDUSTRIAL': ['epp', 'seguridad', 'guante', 'casco', 'arnes', 'arnés', 'detector', 'dotacion', 'dotación', 'uniforme', 'ropa de trabajo', '3m', 'msa', 'botas', 'dielectrico', 'dieléctrico'],
  'QUÍMICOS Y LABORATORIO': ['quimico', 'químico', 'floculante', 'reactivo', 'laboratorio', 'acido', 'ácido', 'sulfato', 'merck', 'proquim', 'basf', 'flotacion', 'flotación'],
  'FERRETERÍA GENERAL': ['ferretera', 'ferreteria', 'ferretería', 'herramienta', 'tornillo', 'tuerca', 'perno', 'arandela', 'llave', 'alicate', 'martillo']
};

export const DEPARTMENT_CODES: Record<string, { departamento: string; categoriasProbables: string[] }> = {
  AD: { departamento: 'Administración de Campamento', categoriasProbables: ['ASEO Y LIMPIEZA', 'MADERA Y MUEBLES', 'PAPELERÍA Y OFICINA'] },
  AP: { departamento: 'Ampliación de proyectos', categoriasProbables: ['MATERIALES DE CONSTRUCCIÓN', 'VÁLVULAS E INSTRUMENTACIÓN', 'TUBERÍAS Y METALES'] },
  BE: { departamento: 'Beneficio', categoriasProbables: ['TUBERÍAS Y METALES', 'VÁLVULAS E INSTRUMENTACIÓN', 'SOLDADURA Y ABRASIVOS', 'BOMBAS Y SISTEMAS HIDRÁULICOS'] },
  CL: { departamento: 'Comercio Y Logística', categoriasProbables: ['COMBUSTIBLES Y LUBRICANTES', 'REPUESTOS VEHICULOS Y MAQUINARIA'] },
  EC: { departamento: 'Gestión de Equipos', categoriasProbables: ['REPUESTOS VEHICULOS Y MAQUINARIA', 'RODAMIENTOS Y TRANSMISIÓN'] },
  EX: { departamento: 'Explotación', categoriasProbables: ['EXPLOSIVOS Y VOLADURA', 'TUBERÍAS Y METALES', 'FILTRACIÓN'] },
  GA: { departamento: 'G. Ambiente', categoriasProbables: ['QUÍMICOS Y LABORATORIO', 'EQUIPO Y MONITOREO AMBIENTAL'] },
  GD: { departamento: 'Gestión de Relaves', categoriasProbables: ['BOMBAS Y SISTEMAS HIDRÁULICOS', 'MATERIALES DE CONSTRUCCIÓN'] },
  GE: { departamento: 'Gestión de Equipos', categoriasProbables: ['REPUESTOS VEHICULOS Y MAQUINARIA', 'RODAMIENTOS Y TRANSMISIÓN'] },
  GI: { departamento: 'Gestión de Inversión', categoriasProbables: ['MATERIALES DE CONSTRUCCIÓN', 'MATERIAL ELÉCTRICO'] },
  IG: { departamento: 'Ing. De Minas', categoriasProbables: ['MATERIALES DE CONSTRUCCIÓN', 'EXPLOSIVOS Y VOLADURA'] },
  OP: { departamento: 'Oficina de Presidencia', categoriasProbables: ['MADERA Y MUEBLES', 'PAPELERÍA Y OFICINA', 'SUMINISTROS DE COMPUTACIÓN Y TECNOLOGÍA'] },
  PT: { departamento: 'Producción y Tecnología', categoriasProbables: ['QUÍMICOS Y LABORATORIO', 'VÁLVULAS E INSTRUMENTACIÓN'] },
  RH: { departamento: 'Recursos Humanos', categoriasProbables: ['RECONOCIMIENTOS Y ARTÍCULOS PROMOCIONALES', 'DISEÑO Y PUBLICIDAD'] },
  SS: { departamento: 'SSO (Seguridad)', categoriasProbables: ['EPP Y SEGURIDAD INDUSTRIAL'] },
  '20': { departamento: 'Gestión de Equipos', categoriasProbables: ['REPUESTOS VEHICULOS Y MAQUINARIA'] },
  MA: { departamento: 'Gestión de Equipos', categoriasProbables: ['REPUESTOS VEHICULOS Y MAQUINARIA'] },
  IT: { departamento: 'IT / Tecnología', categoriasProbables: ['SUMINISTROS DE COMPUTACIÓN Y TECNOLOGÍA'] }
};

export const DEPARTMENT_ALIASES: Record<string, string> = {
  BEN: 'BE',
  ADC: 'AD',
  GAMB: 'GA',
  SSO: 'SS',
  GDR: 'GD',
  INFORMATICA: 'IT',
  EQUIPOS: 'GE'
};

export function extractDepartmentCode(tablaDemandaValue?: string): string | null {
  if (!tablaDemandaValue) return null;
  const upper = tablaDemandaValue.toString().trim().toUpperCase();
  if (upper.includes('MATERIAL PROCUREMENT PLAN')) return 'MA';

  const segments = upper.split(/[-_\s]+/);
  for (const seg of segments) {
    if (DEPARTMENT_CODES[seg]) return seg;
    if (DEPARTMENT_ALIASES[seg]) return DEPARTMENT_ALIASES[seg];
  }

  const matchLetters = upper.match(/^([A-ZÑ]+)/);
  if (matchLetters && DEPARTMENT_CODES[matchLetters[1]]) return matchLetters[1];

  return null;
}

export function classifyRequirementCategory(item: {
  nombreMaterial: string;
  especif1?: string;
  especif2?: string;
  especif3?: string;
}): string {
  const text = quitarAcentos(
    `${item.nombreMaterial || ''} ${item.especif1 || ''} ${item.especif2 || ''} ${item.especif3 || ''}`
  );

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'FERRETERÍA GENERAL') continue;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        return category;
      }
    }
  }

  return 'FERRETERÍA GENERAL';
}

export function processAndMatchRequirements(
  requirements: RequisitionItem[],
  suppliers: Supplier[]
): MatchedResultItem[] {
  // Step 1: Initial classification
  const classified = requirements.map(req => ({
    req,
    categoria: classifyRequirementCategory(req)
  }));

  // Step 2: Majority Category Voting per Tabla Demanda / Group
  const groupCategoryCounts: Record<string, Record<string, number>> = {};
  classified.forEach(({ req, categoria }) => {
    const groupKey = req.tablaDemanda || req.numPO || 'DEFAULT';
    if (!groupCategoryCounts[groupKey]) {
      groupCategoryCounts[groupKey] = {};
    }
    if (categoria !== 'FERRETERÍA GENERAL') {
      groupCategoryCounts[groupKey][categoria] = (groupCategoryCounts[groupKey][categoria] || 0) + 1;
    }
  });

  const groupMajorityMap: Record<string, string> = {};
  for (const [groupKey, counts] of Object.entries(groupCategoryCounts)) {
    let bestCat = '';
    let maxCount = 0;
    let totalSpecific = 0;
    for (const [cat, cnt] of Object.entries(counts)) {
      totalSpecific += cnt;
      if (cnt > maxCount) {
        maxCount = cnt;
        bestCat = cat;
      }
    }
    if (bestCat && maxCount / totalSpecific >= 0.5) {
      groupMajorityMap[groupKey] = bestCat;
    }
  }

  // Step 3: Match suppliers for each item
  const now = new Date();

  return classified.map(({ req, categoria }) => {
    const groupKey = req.tablaDemanda || req.numPO || 'DEFAULT';
    let finalCategory = categoria;

    // Apply majority rule if current is generic
    if (finalCategory === 'FERRETERÍA GENERAL' && groupMajorityMap[groupKey]) {
      finalCategory = groupMajorityMap[groupKey];
    }

    // Apply department hint if still generic
    const deptCode = extractDepartmentCode(req.tablaDemanda);
    const deptInfo = deptCode ? DEPARTMENT_CODES[deptCode] : null;
    let pistaAplicada = false;

    if (finalCategory === 'FERRETERÍA GENERAL' && deptInfo && deptInfo.categoriasProbables.length === 1) {
      finalCategory = deptInfo.categoriasProbables[0];
      pistaAplicada = true;
    }

    // Find suppliers in database
    const { matched, quality } = findSuppliersForCategoryAndMaterial(finalCategory, req, suppliers);

    // Calculate Delay Days
    let retrasoDias: number | null = null;
    if (req.fAsignacion) {
      const assignDate = new Date(req.fAsignacion);
      if (!isNaN(assignDate.getTime())) {
        const diffTime = now.getTime() - assignDate.getTime();
        retrasoDias = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    return {
      numItem: req.numItem,
      categoria: finalCategory,
      material: req.nombreMaterial,
      especificaciones: [req.especif1, req.especif2, req.especif3].filter(Boolean).join(' | '),
      cantidad: req.cantidad || 1,
      unidad: req.unidad || 'UND',
      fechaEntrega: req.fPrevistaEntrega || 'Pendiente',
      comprador: req.comprador || 'Sin asignar',
      numPO: req.numPO || 'S/N',
      tablaDemanda: req.tablaDemanda || 'S/N',
      departamento: deptInfo?.departamento || (deptCode ? `Depto ${deptCode}` : 'General'),
      pistaAplicada,
      fechaAsignacion: req.fAsignacion || 'N/A',
      retrasoDias,
      matchedSuppliersCount: matched.length,
      matchedSuppliersList: matched,
      matchedIASuppliersCount: 0,
      matchedIASuppliersList: [],
      matchQuality: quality
    };
  });
}

/**
 * Robust Multi-Strategy Supplier Search logic:
 * 1. Category/Keyword direct match
 * 2. Material token search
 * 3. Broad industry fallback (ensures suppliers are found if database has any relevant entries!)
 */
export function findSuppliersForCategoryAndMaterial(
  category: string,
  item: RequisitionItem,
  allSuppliers: Supplier[]
): { matched: Supplier[]; quality: 'Alta' | 'Media' | 'Sugerida' } {
  if (!allSuppliers || allSuppliers.length === 0) {
    return { matched: [], quality: 'Alta' };
  }

  const categoryKeywords = CATEGORY_KEYWORDS[category] || [quitarAcentos(category)];
  const itemText = quitarAcentos(`${item.nombreMaterial} ${item.especif1 || ''} ${item.especif2 || ''}`);

  // Strategy 1: High quality match (Category keyword in supplier fields)
  const highQualityMatched = allSuppliers.filter(s => {
    const supText = quitarAcentos(
      `${s.proveedorGrupos || ''} ${s.marcas || ''} ${s.ofertan || ''} ${s.razonSocial || ''} ${s.nombreComercial || ''} ${s.categoriaPrincipal || ''}`
    );

    return categoryKeywords.some(kw => supText.includes(kw));
  });

  if (highQualityMatched.length > 0) {
    return { matched: highQualityMatched, quality: 'Alta' };
  }

  // Strategy 2: Medium quality token match (Words from item description matched in supplier offer/brand)
  const tokens = itemText
    .split(/[\s,.\-/()]+/)
    .filter(t => t.length >= 4 && !['para', 'con', 'para', 'para', 'tipo', 'marca', 'incluye', 'apto'].includes(t));

  if (tokens.length > 0) {
    const tokenMatched = allSuppliers.filter(s => {
      const supText = quitarAcentos(
        `${s.proveedorGrupos || ''} ${s.marcas || ''} ${s.ofertan || ''} ${s.razonSocial || ''} ${s.nombreComercial || ''}`
      );
      return tokens.some(token => supText.includes(token));
    });

    if (tokenMatched.length > 0) {
      return { matched: tokenMatched, quality: 'Media' };
    }
  }

  // Strategy 3: Sugerida / Broad Industry Fallback
  // If no direct keyword or token match, return suppliers in broad related field (e.g. Ferretería/Industrial/General)
  const broadFallback = allSuppliers.filter(s => {
    const supText = quitarAcentos(
      `${s.proveedorGrupos || ''} ${s.ofertan || ''} ${s.nombreComercial || ''} ${s.razonSocial || ''}`
    );
    return (
      supText.includes('ferreter') ||
      supText.includes('industrial') ||
      supText.includes('general') ||
      supText.includes('mineria') ||
      supText.includes('suministro')
    );
  });

  if (broadFallback.length > 0) {
    return { matched: broadFallback.slice(0, 5), quality: 'Sugerida' };
  }

  // If still nothing, return top 3 suppliers from total list so user always gets options
  return { matched: allSuppliers.slice(0, 3), quality: 'Sugerida' };
}
