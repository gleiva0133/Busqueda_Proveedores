export interface Supplier {
  id?: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  contacto: string;
  telefono: string;
  celular: string;
  email: string;
  ciudad: string;
  region: string;
  proveedorGrupos: string;
  marcas: string;
  ofertan: string;
  categoriaPrincipal?: string;
  origen?: 'base_local' | 'ia';
}

export interface RequisitionItem {
  numItem: string | number;
  nombreMaterial: string;
  especif1?: string;
  especif2?: string;
  especif3?: string;
  cantidad?: number | string;
  unidad?: string;
  fPrevistaEntrega?: string;
  comprador: string;
  numPO?: string;
  tablaDemanda?: string;
  fAsignacion?: string;
  [key: string]: any;
}

export interface MatchedResultItem {
  numItem: string | number;
  categoria: string;
  material: string;
  especificaciones: string;
  cantidad: string | number;
  unidad: string;
  fechaEntrega: string;
  comprador: string;
  numPO: string;
  tablaDemanda: string;
  departamento: string;
  pistaAplicada: boolean;
  fechaAsignacion: string;
  retrasoDias: number | null;
  matchedSuppliersCount: number;
  matchedSuppliersList: Supplier[];
  matchedIASuppliersCount: number;
  matchedIASuppliersList: IASupplier[];
  matchQuality: 'Alta' | 'Media' | 'Sugerida';
}

export interface IASupplier {
  nombre_empresa: string;
  ciudad_pais: string;
  sitio_web_o_contacto: string;
  descripcion_breve: string;
  categoria?: string;
}

export interface CategoryReassignment {
  categoria: string;
  compradorAsignado: string;
  itemsPreviosEnCategoria: number;
  retrasoPromedioOwner: number | null;
  totalItemsCategoria: number;
}

export interface ItemReassignment {
  numItem: string | number;
  categoria: string;
  material: string;
  compradorOriginal: string;
  compradorReasignado: string;
  cambioComprador: boolean;
  retrasoDias: number | null;
}

export interface WorkloadBalance {
  comprador: string;
  itemsAntes: number;
  itemsDespues: number;
  diferencia: number;
}

export interface PODashboardItem {
  numPO: string;
  estadoPO: number;
  estadoPODetalle: string;
  estadoPos?: string;
  tRetraso?: number;
  estadoTD?: string;
  estadoEntregaDetalle: string;
  nAnio?: number;
  nMes?: number;
  fAsignacionTabla?: string;
  fFirmaPO?: string;
  fPrevistaEntrega?: string;
  comprador: string;
  precioU?: number;
  precioU2?: number;
  precioU3?: number;
  subtotalItem?: number;
  usSubtotalI1?: number; // Gasto total con IVA
  cantPO?: number;
  proveedor: string;
  soloSource?: string;
  nombreMaterial: string;
  categoria: string;
  diasEmisionPO?: number | null;
  diasEsperandoPO?: number | null;
  esCancelado: boolean;
  ahorroPotencialTotal?: number;
  ivaEstimado?: number;
  bucketRetraso: string;
}
