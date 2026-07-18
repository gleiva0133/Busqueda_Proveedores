import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import re
import io
import os
import json
import requests
import unicodedata
import time
import plotly.express as px

# ==========================================
# 1. CONFIGURACIÓN DE LA PÁGINA
# ==========================================
st.set_page_config(page_title="Buscador de Proveedores Mineros", layout="wide")
st.title("⛏️ Buscador de Proveedores Mineros - Supply Chain")
st.markdown("Sube tus archivos para generar un análisis estratégico de proveedores locales, nacionales e internacionales.")

# Carpeta local para persistir el archivo de proveedores mientras la app esté activa
PERSIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_local")
os.makedirs(PERSIST_DIR, exist_ok=True)
PERSIST_PATH = os.path.join(PERSIST_DIR, "proveedores_guardado.csv")

# ==========================================
# 2. DEFINICIÓN DE FUNCIONES
# ==========================================

def detectar_columnas(df, columnas_busqueda):
    """Mapea columnas aunque tengan nombres ligeramente diferentes"""
    mapeo = {}
    for col_objetivo in columnas_busqueda:
        for col_real in df.columns:
            if col_objetivo.lower() in col_real.lower() or col_real.lower() in col_objetivo.lower():
                mapeo[col_real] = col_objetivo
                break
    return df.rename(columns=mapeo)


def clasificar_requerimiento(row):
    """Clasifica el requerimiento según descripción y especificaciones (español + chino)"""
    texto = str(row.get('Nombre Material', '')).lower() + ' ' + \
            str(row.get('Especif1', '')).lower() + ' ' + \
            str(row.get('Especif2', '')).lower() + ' ' + \
            str(row.get('Especif3', '')).lower()

    if any(x in texto for x in ['electrodo', 'soldadura', '7018', '6010', 'disco', 'desbaste']):
        return 'SOLDADURA Y ABRASIVOS'
    elif any(x in texto for x in ['rodamiento', 'bearing', 'ruliman', 'cojinete']):
        return 'RODAMIENTOS Y TRANSMISIÓN'
    elif any(x in texto for x in ['bomba', 'bomb', 'electrobomba', 'hidraulic']):
        return 'BOMBAS Y SISTEMAS HIDRÁULICOS'
    elif any(x in texto for x in ['valvula', 'válvula', 'valve', 'check', 'regulador de presion', 'regulador de presión', 'regulador de flujo']):
        return 'VÁLVULAS E INSTRUMENTACIÓN'
    elif any(x in texto for x in [
        'sensor de algas', 'algas verdes', 'sensor de presion barometrica', 'sensor de presión barométrica',
        'monitoreo ambiental', 'calidad del aire', 'calidad del agua', 'estacion meteorologica',
        'estación meteorológica', 'pluviometro', 'pluviómetro', 'anemometro', 'anemómetro',
        'medio ambiente', 'medioambiental', 'barometrica', 'barométrica',
        'sensor de conductividad', 'conductividad', 'sensor de turbiedad', 'turbiedad', 'turbidez',
        'oxigeno disuelto', 'oxígeno disuelto', 'sensor de clorofila', 'clorofila',
        'humedad relativa', 'datalogger', 'data logger', 'cr350', 'cr300', 'cr1000',
        'estacion de monitoreo', 'estación de monitoreo',
        '气压传感器', '绿藻', '环境监测', '气压计', '电导率', '浊度', '溶解氧', '叶绿素', '数据记录器', '湿度传感器'
    ]):
        return 'EQUIPO Y MONITOREO AMBIENTAL'
    elif any(x in texto for x in [
        'computador', 'computadora', 'laptop', 'portatil', 'portátil', 'mouse', 'teclado',
        'monitor', 'servidor', 'impresora', 'modem', 'módem', 'router', 'ups',
        'tarjeta de procesamiento', 'tarjeta madre', 'placa madre', 'disco duro', 'memoria ram',
        'toner', 'tóner', 'cartucho de tinta', 'switch de red', 'cable de red', 'access point',
        'punto de acceso', 'flash memory', 'pendrive', 'memoria usb', 'cpu', 'ofimatica', 'ofimática',
        '电脑', '笔记本电脑', '打印机', '路由器', '服务器', '显示器', '硒鼓'
    ]):
        return 'SUMINISTROS DE COMPUTACIÓN Y TECNOLOGÍA'
    elif any(x in texto for x in [
        'publicitari', 'cartel', 'rotulo', 'rótulo', 'letrero', 'valla publicitaria', 'banner',
        'pendon', 'pendón', 'gigantografia', 'gigantografía', 'vinil adhesivo', 'lona publicitaria',
        'diseño grafico', 'diseño gráfico', 'imprenta', 'material pop',
        '广告', '海报', '招牌', '横幅'
    ]):
        return 'DISEÑO Y PUBLICIDAD'
    elif any(x in texto for x in [
        'papeleria', 'papelería', 'esfero', 'esferografico', 'esferográfico', 'boligrafo', 'bolígrafo',
        'lapiz', 'lápiz', 'pluma estilografica', 'pluma estilográfica', 'mina de recambio',
        'grapa', 'grapadora', 'carpeta', 'cuaderno', 'marcador', 'resaltador', 'clip', 'sobre manila',
        '钢笔', '笔芯', '文具', '圆珠笔'
    ]):
        return 'PAPELERÍA Y OFICINA'
    elif any(x in texto for x in ['cable', 'transformador', 'electrico', 'eléctrico', 'ventilador']):
        return 'MATERIAL ELÉCTRICO'
    elif any(x in texto for x in ['tubo', 'tuberia', 'tubería', 'pipe', 'cobre', 'inoxidable', 'plancha']):
        return 'TUBERÍAS Y METALES'
    elif any(x in texto for x in [
        'repuesto', 'part', 'manija', 'puerta', 'asiento', 'ford', 'jac', 'ranger',
        'freno', 'frenos', 'cilindro maestro', 'muelle', 'ballesta', 'ballestas', 'resorte',
        'amortiguador', 'suspension', 'suspensión', 'embrague', 'radiador', 'alternador',
        'motor de arranque', 'bujia', 'bujía', 'correa', 'faro', 'faros', 'espejo retrovisor',
        'parachoques', 'guardafango', 'guardachoque', 'llanta', 'neumatico', 'neumático', 'rin',
        'chasis', 'carroceria', 'carrocería', 'camion', 'camión', 'camioneta', 'vehiculo', 'vehículo',
        'parabrisas',
        '制动', '刹车', '离合器', '悬挂', '发动机', '变速箱', '轮胎', '车灯', '保险杠', '板簧', '减震'
    ]):
        return 'REPUESTOS VEHICULOS Y MAQUINARIA'
    elif any(x in texto for x in [
        'madera', 'aserradero', 'mueble', 'muebles', 'menaje de casa', 'menaje de cocina', 'menaje',
        'cama', 'colchon', 'colchón', 'mesa de noche', 'velador', 'ropero', 'armario',
        'escritorio', 'silla', 'sillon', 'sillón', 'estanteria', 'estantería', 'archivador',
        'utensilio de cocina', 'utensilios de cocina', 'vajilla', 'olla', 'ollas', 'sarten', 'sartén',
        'cubiertos de cocina', 'menaje de oficina',
        '家具', '木材', '床垫', '厨具'
    ]):
        return 'MADERA Y MUEBLES'
    elif any(x in texto for x in ['filtro', 'cartucho', 'manocomando', 'sedal']):
        return 'FILTRACIÓN'
    elif any(x in texto for x in ['epp', 'seguridad', 'guante', 'casco', 'arnes', 'arnés', 'detector']):
        return 'EPP Y SEGURIDAD INDUSTRIAL'
    elif any(x in texto for x in ['quimico', 'químico', 'floculante', 'reactivo', 'laboratorio']):
        return 'QUÍMICOS Y LABORATORIO'
    else:
        return 'FERRETERÍA GENERAL'


def quitar_acentos(texto):
    return ''.join(c for c in unicodedata.normalize('NFD', str(texto)) if unicodedata.category(c) != 'Mn')


def encontrar_columna_asignacion(df):
    """Busca la columna de fecha de asignación aunque el nombre varíe ligeramente"""
    for col in df.columns:
        limpio = quitar_acentos(col).lower()
        if 'asignacion' in limpio:
            return col
    return None


def encontrar_columna_tabla_demanda(df):
    """Busca la columna 'Tabla Demanda' (o número de tabla de demanda) aunque el nombre varíe"""
    for col in df.columns:
        limpio = quitar_acentos(col).lower()
        if 'demanda' in limpio:
            return col
    return None


def buscar_proveedores_categoria(categoria, df_proveedores):
    """Busca proveedores según la categoría del material, dentro de la base local"""
    terminos_busqueda = {
        'SOLDADURA Y ABRASIVOS': ['SOLDADURA', 'ELECTRODO', 'ABRASIVO', 'DISCO', 'INDURA', 'AGA'],
        'RODAMIENTOS Y TRANSMISIÓN': ['RODAMIENTO', 'RULIMAN', 'TRANSMISION', 'MECANICA'],
        'BOMBAS Y SISTEMAS HIDRÁULICOS': ['BOMBA', 'HIDRAULIC', 'FLUID', 'FLUIDMAQ'],
        'VÁLVULAS E INSTRUMENTACIÓN': ['VALVULA', 'INSTRUMENT', 'CONTROL', 'PIVALTEC'],
        'MATERIAL ELÉCTRICO': ['ELECTRIC', 'ENERGAU', 'DISMELEC', 'CABLE', 'MOTOR'],
        'TUBERÍAS Y METALES': ['TUBO', 'ACERO', 'METAL', 'NOVACERO', 'VALORES Y METALES'],
        'REPUESTOS VEHICULOS Y MAQUINARIA': ['AUTOMOTRIZ', 'REPUESTO', 'MAQUINARIA', 'JAC', 'FORD'],
        'FILTRACIÓN': ['FILTRO', 'CARTUCHO', 'FLUIDMAQ'],
        'EPP Y SEGURIDAD INDUSTRIAL': ['EPP', 'SEGURIDAD', 'GROUP4', 'SAFETY'],
        'QUÍMICOS Y LABORATORIO': ['QUIMIC', 'LAB', 'INDURA', 'LINDE'],
        'PAPELERÍA Y OFICINA': ['PAPELER', 'OFICINA', 'SUMINISTRO', 'ESCRITORIO'],
        'EQUIPO Y MONITOREO AMBIENTAL': ['AMBIENTAL', 'MONITOREO', 'SENSOR', 'INSTRUMENT'],
        'SUMINISTROS DE COMPUTACIÓN Y TECNOLOGÍA': ['COMPUTACION', 'TECNOLOGIA', 'SISTEMAS', 'INFORMATICA', 'COMPUTO'],
        'DISEÑO Y PUBLICIDAD': ['PUBLICIDAD', 'DISEÑO', 'IMPRENTA', 'GRAFICA', 'ROTULOS'],
        'MADERA Y MUEBLES': ['MADERA', 'ASERRADERO', 'MUEBLE', 'MENAJE'],
        'FERRETERÍA GENERAL': ['FERRETER', 'HERRAMIENT', 'GENERAL']
    }

    terminos = terminos_busqueda.get(categoria, ['FERRETER'])
    mask = pd.Series(False, index=df_proveedores.index)
    columnas_busqueda = ['PROVEEDOR DE GRUPOS', 'MARCAS', 'OFERTAN', 'RAZÓN SOCIAL', 'NOMBRE COMERCIAL']

    for col in columnas_busqueda:
        if col in df_proveedores.columns:
            for termino in terminos:
                mask |= df_proveedores[col].fillna('').astype(str).str.contains(termino, case=False, na=False)

    return df_proveedores[mask].copy()


def buscar_proveedores_ia(categoria, ejemplos_materiales, api_key, intentos=3, debug=False, usar_busqueda_web=False):
    """
    Usa el modelo Gemini de Google para encontrar proveedores adicionales, fuera de la
    base local del usuario. Por defecto usa solo el conocimiento general del modelo
    (funciona en el nivel 100% gratuito, sin facturación). Si usar_busqueda_web=True,
    activa la herramienta de Búsqueda de Google (grounding), que suele requerir
    facturación habilitada en el proyecto de Google Cloud.
    Devuelve una lista de dicts. Si algo falla, devuelve lista vacía y avisa.
    """
    if not api_key:
        return []

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"
    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}

    if usar_busqueda_web:
        instruccion_fuente = "Usa la búsqueda web para identificar empresas proveedoras reales y actuales."
    else:
        instruccion_fuente = (
            "Basándote en tu conocimiento general (sin búsqueda web en vivo), nombra empresas, "
            "fabricantes, marcas o distribuidores conocidos que operen en este rubro. Es información "
            "de referencia que el usuario deberá verificar, no hace falta que confirmes datos exactos "
            "de contacto en tiempo real."
        )

    prompt = f"""Eres un asistente de compras (supply chain) para una empresa minera en Ecuador.
{instruccion_fuente}
Identifica empresas proveedoras (fabricantes, distribuidores o representantes) de productos de la
categoría: {categoria}.
Ejemplos de materiales concretos que se necesitan: {ejemplos_materiales}.
Prioriza proveedores en Ecuador o la región andina, pero incluye internacionales conocidos si son relevantes
(por ejemplo marcas o distribuidores reconocidos del rubro industrial/minero).
Incluye cualquier empresa razonablemente relacionada aunque no tengas 100% de certeza sobre su información
de contacto; es mejor dar una sugerencia a validar que ninguna. Solo deja la lista vacía si la categoría
es tan genérica que no aplica ningún proveedor especializado.
Responde ÚNICAMENTE con un JSON válido (una lista), sin texto adicional, explicaciones ni bloques de código,
con este formato exacto:
[{{"nombre_empresa": "...", "ciudad_pais": "...", "sitio_web_o_contacto": "...", "descripcion_breve": "..."}}]
Máximo 5 empresas."""

    body = {"contents": [{"parts": [{"text": prompt}]}]}
    if usar_busqueda_web:
        body["tools"] = [{"google_search": {}}]

    for intento in range(intentos):
        try:
            resp = requests.post(url, headers=headers, json=body, timeout=40)
            if resp.status_code == 429:
                time.sleep(15 * (intento + 1))  # espera progresiva antes de reintentar: 15s, 30s, 45s
                continue
            resp.raise_for_status()
            data = resp.json()
            contenido = data["candidates"][0]["content"]["parts"][0]["text"].strip()

            if debug:
                with st.expander(f"🔍 Debug — respuesta cruda para '{categoria}'"):
                    st.code(contenido)

            # Extrae el bloque JSON aunque venga rodeado de texto o ```json ... ```
            match = re.search(r"\[.*\]", contenido, flags=re.DOTALL)
            contenido_json = match.group(0) if match else contenido
            proveedores = json.loads(contenido_json)
            return proveedores if isinstance(proveedores, list) else []
        except Exception as e:
            if intento == intentos - 1:
                st.warning(f"⚠️ No se pudo obtener resultados de IA para la categoría '{categoria}': {e}")
                return []
            time.sleep(3)
    st.warning(f"⚠️ Límite de peticiones alcanzado para la categoría '{categoria}' (429). Intenta de nuevo en un momento.")
    return []


# ==========================================
# 3. BARRA LATERAL: CONFIGURACIÓN DE IA (OPCIONAL)
# ==========================================

with st.sidebar:
    st.header("🔑 Búsqueda con IA (opcional)")
    with st.expander("¿Qué es esto?"):
        st.markdown(
            "Además de tu base de proveedores, la app puede pedirle a **Gemini "
            "(Google AI)**, con búsqueda web activada, que encuentre empresas "
            "proveedoras adicionales para cada categoría, fuera de tu listado.\n\n"
            "**Para usarlo necesitas una API key gratuita de Google:**\n"
            "1. Entra a [Google AI Studio](https://aistudio.google.com/apikey)\n"
            "2. Inicia sesión con tu cuenta de Google\n"
            "3. Haz clic en 'Create API key' y cópiala\n"
            "4. Pégala abajo\n\n"
            "⚠️ **Si te aparecen errores 429 (límite de peticiones) constantemente:** "
            "la función de búsqueda web de Gemini suele requerir que el proyecto de "
            "Google Cloud asociado a tu API key tenga **facturación habilitada** (no "
            "necesitas gastar dinero, solo activarla) para desbloquear una cuota "
            "normal. Revisa esto en [Google AI Studio → Billing](https://aistudio.google.com/) "
            "o en la consola de Google Cloud, sección 'Facturación'.\n\n"
            "Si no la tienes todavía, no pasa nada: la app funciona igual, solo "
            "usará tu base de datos local."
        )
    gemini_api_key = st.text_input("API Key de Google (Gemini)", type="password", placeholder="AIza...")
    usar_ia = st.checkbox("Buscar proveedores adicionales con IA", value=False,
                           disabled=not gemini_api_key,
                           help="Se activa solo si ingresas una API key arriba.")
    usar_busqueda_web = st.checkbox(
        "🌐 Usar búsqueda web en vivo (requiere facturación en Google)",
        value=False, disabled=not gemini_api_key,
        help="Si lo dejas desactivado, la IA usa su conocimiento general (gratis, sin tarjeta). "
             "Si lo activas, busca en internet en tiempo real, pero suele necesitar facturación "
             "habilitada en tu proyecto de Google."
    )
    debug_ia = st.checkbox("🔍 Modo diagnóstico (mostrar respuesta cruda de la IA)", value=False,
                            disabled=not gemini_api_key)
    if st.button("🔄 Limpiar caché de IA y volver a buscar"):
        st.session_state.cache_ia = {}
        st.success("Caché de IA limpiada. Vuelve a procesar tus archivos.")
    if not gemini_api_key:
        st.caption("Ingresa tu API key para habilitar esta opción.")

def construir_url_descarga_directa(url_compartido):
    """Convierte un link de compartir de OneDrive/SharePoint en uno de descarga directa"""
    separador = '&' if '?' in url_compartido else '?'
    return f"{url_compartido}{separador}download=1"


def cargar_csv_desde_onedrive(url_compartido):
    """
    Descarga el archivo de proveedores desde un link de OneDrive/SharePoint y lo
    convierte en DataFrame. Requiere que el link tenga permiso de acceso público
    o 'cualquier persona con el enlace'; si el tenant restringe el acceso a
    cuentas autenticadas de la organización, la descarga anónima fallará.
    """
    url_descarga = construir_url_descarga_directa(url_compartido)
    resp = requests.get(url_descarga, timeout=30, allow_redirects=True)
    resp.raise_for_status()
    contenido = resp.content

    # A veces SharePoint devuelve una página HTML de login en vez del archivo
    if resp.headers.get('Content-Type', '').startswith('text/html'):
        raise ValueError(
            "El enlace devolvió una página web (probablemente de inicio de sesión) en vez del "
            "archivo. Es posible que el link no tenga permiso de acceso público."
        )

    try:
        df = pd.read_csv(io.BytesIO(contenido), encoding='utf-8-sig')
    except Exception:
        df = pd.read_excel(io.BytesIO(contenido))

    df.columns = [c.strip() for c in df.columns]
    df = detectar_columnas(df, ['RAZÓN SOCIAL', 'CONTACTO', 'TELEFONO', 'CORREO'])
    return df


ONEDRIVE_CSV_URL = (
    "https://ecuacorrienteecuador-my.sharepoint.com/:x:/g/personal/"
    "gustavo_leiva_ecuacorrienteecuador_onmicrosoft_com/"
    "IQB4qHPGpaDnSpKKICB3FVYDAXkfVmBL5ymMol8kEHPk5e0?e=twyKIJ"
)

# ==========================================
# 4. CARGA Y PERSISTENCIA DEL ARCHIVO DE PROVEEDORES
# ==========================================

if "df_prov" not in st.session_state:
    st.session_state.df_prov = None
    st.session_state.fuente_prov = None
    if os.path.exists(PERSIST_PATH):
        try:
            df_guardado = pd.read_csv(PERSIST_PATH, encoding='utf-8-sig')
            df_guardado = detectar_columnas(df_guardado, ['RAZÓN SOCIAL', 'CONTACTO', 'TELEFONO', 'CORREO'])
            st.session_state.df_prov = df_guardado
            st.session_state.fuente_prov = "guardado localmente"
        except Exception:
            st.session_state.df_prov = None

    # Si no hay nada guardado localmente todavía, intenta cargar el archivo por
    # defecto desde OneDrive automáticamente.
    if st.session_state.df_prov is None:
        try:
            with st.spinner("🔗 Cargando base de proveedores por defecto desde OneDrive..."):
                df_onedrive = cargar_csv_desde_onedrive(ONEDRIVE_CSV_URL)
            st.session_state.df_prov = df_onedrive
            st.session_state.fuente_prov = "OneDrive (por defecto)"
            df_onedrive.to_csv(PERSIST_PATH, index=False, encoding='utf-8-sig')
        except Exception as e:
            st.session_state.df_prov = None
            st.session_state.error_onedrive = str(e)

col1, col2 = st.columns(2)

with col1:
    if st.session_state.df_prov is not None:
        st.success(
            f"✅ Base de proveedores en memoria: {len(st.session_state.df_prov)} registros "
            f"(fuente: {st.session_state.fuente_prov})."
        )
        colb1, colb2, colb3 = st.columns(3)
        with colb1:
            reemplazar = st.checkbox("Subir archivo propio")
        with colb2:
            if st.button("🔄 Recargar desde OneDrive"):
                try:
                    with st.spinner("🔗 Recargando desde OneDrive..."):
                        df_onedrive = cargar_csv_desde_onedrive(ONEDRIVE_CSV_URL)
                    st.session_state.df_prov = df_onedrive
                    st.session_state.fuente_prov = "OneDrive (por defecto)"
                    df_onedrive.to_csv(PERSIST_PATH, index=False, encoding='utf-8-sig')
                    st.rerun()
                except Exception as e:
                    st.error(f"❌ No se pudo recargar desde OneDrive: {e}")
        with colb3:
            if st.button("🗑️ Eliminar archivo guardado"):
                st.session_state.df_prov = None
                st.session_state.fuente_prov = None
                if os.path.exists(PERSIST_PATH):
                    os.remove(PERSIST_PATH)
                st.rerun()
    else:
        reemplazar = True
        if st.session_state.get("error_onedrive"):
            st.warning(
                f"⚠️ No se pudo cargar automáticamente el archivo por defecto desde OneDrive "
                f"({st.session_state.error_onedrive}). Sube tu base de proveedores manualmente."
            )

    archivo_proveedores = None
    if reemplazar or st.session_state.df_prov is None:
        archivo_proveedores = st.file_uploader("📂 1. Sube tu base de proveedores (CSV)", type=['csv'])
        if archivo_proveedores is not None:
            df_nuevo = pd.read_csv(archivo_proveedores, encoding='utf-8-sig')
            df_nuevo.columns = [c.strip() for c in df_nuevo.columns]
            df_nuevo = detectar_columnas(df_nuevo, ['RAZÓN SOCIAL', 'CONTACTO', 'TELEFONO', 'CORREO'])
            st.session_state.df_prov = df_nuevo
            st.session_state.fuente_prov = "archivo propio"
            df_nuevo.to_csv(PERSIST_PATH, index=False, encoding='utf-8-sig')
            st.info("💾 Archivo guardado. No necesitarás volver a subirlo mientras la app siga activa.")

with col2:
    archivo_requerimientos = st.file_uploader("📂 2. Sube tus requerimientos (Excel)", type=['xlsx', 'xls'])

df_prov = st.session_state.df_prov

# ==========================================
# 5. PROCESAMIENTO
# ==========================================

if df_prov is not None and archivo_requerimientos:
    with st.spinner("⚙️ Procesando datos y cruzando información..."):
        try:
            df_req = pd.read_excel(archivo_requerimientos, sheet_name='qryPOs_Temp')
            df_req.columns = df_req.columns.str.strip()

            # Clasificar
            df_req['CATEGORIA'] = df_req.apply(clasificar_requerimiento, axis=1)

            # Segunda pasada: términos genéricos (ej. "Baterías", "Shield de protección")
            # no se pueden identificar solo por palabra clave, pero si la mayoría de los
            # demás ítems de su misma [Tabla Demanda] pertenecen a una categoría
            # específica, se asume que son parte del mismo kit/paquete y se reasignan.
            col_tabla_demanda = encontrar_columna_tabla_demanda(df_req)
            if col_tabla_demanda:
                def _refinar_por_grupo(grupo):
                    genericos = grupo['CATEGORIA'] == 'FERRETERÍA GENERAL'
                    if genericos.any() and not genericos.all():
                        especificas = grupo.loc[~genericos, 'CATEGORIA']
                        moda = especificas.mode()
                        if not moda.empty and (especificas == moda.iloc[0]).mean() >= 0.5:
                            grupo.loc[genericos, 'CATEGORIA'] = moda.iloc[0]
                    return grupo

                df_req = df_req.groupby(col_tabla_demanda, group_keys=False).apply(_refinar_por_grupo)
            else:
                st.warning("⚠️ No se encontró una columna de 'Tabla Demanda' en el Excel; "
                           "se omite el refinamiento de categorías genéricas por grupo.")

            # Cache de resultados de IA por categoría (para no repetir llamadas)
            if "cache_ia" not in st.session_state:
                st.session_state.cache_ia = {}

            categorias_unicas = df_req['CATEGORIA'].unique()

            # Detectar columna de fecha de asignación y calcular retraso (hoy - F Asignación)
            col_fecha_asignacion = encontrar_columna_asignacion(df_req)
            hoy = pd.Timestamp(datetime.now().date())
            if col_fecha_asignacion:
                df_req['_fecha_asignacion'] = pd.to_datetime(df_req[col_fecha_asignacion], errors='coerce')
                df_req['_retraso_dias'] = (hoy - df_req['_fecha_asignacion']).dt.days
            else:
                df_req['_fecha_asignacion'] = pd.NaT
                df_req['_retraso_dias'] = np.nan
                st.warning("⚠️ No se encontró una columna de fecha de asignación en el Excel; "
                           "los gráficos de retraso no estarán disponibles.")

            if usar_ia and gemini_api_key:
                st.write("🌐 Buscando proveedores adicionales con IA por categoría...")
                barra_ia = st.progress(0)
                for i, cat in enumerate(categorias_unicas):
                    if cat not in st.session_state.cache_ia:
                        ejemplos = ", ".join(
                            df_req[df_req['CATEGORIA'] == cat]['Nombre Material'].dropna().astype(str).unique()[:5]
                        )
                        st.session_state.cache_ia[cat] = buscar_proveedores_ia(
                            cat, ejemplos, gemini_api_key, debug=debug_ia, usar_busqueda_web=usar_busqueda_web
                        )
                        time.sleep(12 if usar_busqueda_web else 2)  # el grounding necesita más pausa; modo gratuito no
                    barra_ia.progress((i + 1) / len(categorias_unicas))

            resultados = []
            barra_progreso = st.progress(0)

            for idx, row in df_req.iterrows():
                categoria = row['CATEGORIA']
                material = row.get('Nombre Material', 'N/A')
                prov_categoria = buscar_proveedores_categoria(categoria, df_prov)

                proveedores_info = []
                for _, prov in prov_categoria.iterrows():
                    info = {
                        'RUC': str(prov.get('RUC', '') if pd.notna(prov.get('RUC', '')) else ''),
                        'Razón Social': str(prov.get('RAZÓN SOCIAL', '') if pd.notna(prov.get('RAZÓN SOCIAL', '')) else ''),
                        'Nombre Comercial': str(prov.get('NOMBRE COMERCIAL', '') if pd.notna(prov.get('NOMBRE COMERCIAL', '')) else ''),
                        'Contacto': str(prov.get('CONTACTO', '') if pd.notna(prov.get('CONTACTO', '')) else ''),
                        'Teléfono': str(prov.get('TELEFONO', '') if pd.notna(prov.get('TELEFONO', '')) else ''),
                        'Celular': str(prov.get('CELULAR', '') if pd.notna(prov.get('CELULAR', '')) else ''),
                        'Email': str(prov.get('CORREO', '') if pd.notna(prov.get('CORREO', '')) else ''),
                        'Ciudad': str(prov.get('Ciudad OK', prov.get('REGION', '')) if pd.notna(prov.get('Ciudad OK', prov.get('REGION', ''))) else ''),
                        'Región': str(prov.get('REGION', '') if pd.notna(prov.get('REGION', '')) else '')
                    }
                    proveedores_info.append(info)

                proveedores_ia_cat = st.session_state.cache_ia.get(categoria, []) if usar_ia else []

                resultados.append({
                    'Num Ítem': row.get('Num Ítem', ''),
                    'Categoría': categoria,
                    'Material': material,
                    'Especificaciones': f"{row.get('Especif1', '')} | {row.get('Especif2', '')} | {row.get('Especif3', '')}",
                    'Cantidad': row.get('Cantidad', ''),
                    'Unidad': row.get('Unidad de medida', ''),
                    'Fecha Entrega': row.get('F Prevista de entrega', ''),
                    'Comprador': row.get('Comprador', ''),
                    'PO': row.get('Num PO', ''),
                    'F Asignación': row.get('_fecha_asignacion', pd.NaT),
                    'Retraso (días)': row.get('_retraso_dias', np.nan),
                    'Num Proveedores (Base propia)': len(proveedores_info),
                    'Proveedores (Base propia)': ", ".join([p['Nombre Comercial'] or '(sin nombre)' for p in proveedores_info[:3]]),
                    'Num Proveedores (IA)': len(proveedores_ia_cat),
                    'Proveedores (IA)': ", ".join([str(p.get('nombre_empresa') or '') for p in proveedores_ia_cat[:3]])
                })
                barra_progreso.progress((idx + 1) / len(df_req))

            df_detalle = pd.DataFrame(resultados)

            # ==========================================
            # PROPUESTA DE RE-ASIGNACIÓN POR GRUPO (CATEGORÍA)
            # ==========================================
            # Algoritmo de balanceo: se procesan las categorías de mayor a menor tamaño
            # y cada una se asigna al comprador que, en ese momento, tenga MENOS ítems
            # acumulados en total. En caso de empate en la carga, se prefiere al
            # comprador que ya tenía más ítems en esa categoría (y, si persiste el
            # empate, mayor retraso promedio). Esto evita que una sola persona termine
            # acumulando varias categorías grandes.
            resumen_grupo = (
                df_detalle.groupby(['Categoría', 'Comprador'])
                .agg(Num_Items=('Num Ítem', 'count'), Retraso_Prom=('Retraso (días)', 'mean'))
                .reset_index()
            )
            totales_categoria = df_detalle.groupby('Categoría')['Num Ítem'].count().rename('Total Ítems en la Categoría')
            categorias_por_tamano = totales_categoria.sort_values(ascending=False).index.tolist()
            universo_compradores = sorted(df_detalle['Comprador'].dropna().unique().tolist())

            carga_actual = {c: 0 for c in universo_compradores}
            mapa_duenos = {}
            filas_resumen = []

            for cat in categorias_por_tamano:
                tam_grupo = int(totales_categoria[cat])
                candidatos_categoria = (
                    resumen_grupo[resumen_grupo['Categoría'] == cat]
                    .set_index('Comprador')[['Num_Items', 'Retraso_Prom']]
                )
                # Ordena TODOS los compradores por: menor carga actual primero;
                # en empate, más ítems previos en esta categoría; luego mayor retraso.
                orden = sorted(
                    universo_compradores,
                    key=lambda c: (
                        carga_actual[c],
                        -candidatos_categoria['Num_Items'].get(c, 0),
                        -(candidatos_categoria['Retraso_Prom'].get(c, -1) or -1)
                    )
                )
                elegido = orden[0]
                mapa_duenos[cat] = elegido
                carga_actual[elegido] += tam_grupo

                filas_resumen.append({
                    'Categoría': cat,
                    'Comprador Asignado (dueño del grupo)': elegido,
                    'Ítems que ya tenía en el grupo': int(candidatos_categoria['Num_Items'].get(elegido, 0)),
                    'Retraso promedio del dueño en el grupo (días)': candidatos_categoria['Retraso_Prom'].get(elegido, np.nan),
                    'Total Ítems en la Categoría': tam_grupo
                })

            df_reasignacion = df_detalle[['Num Ítem', 'Categoría', 'Material', 'Comprador', 'Retraso (días)']].copy()
            df_reasignacion = df_reasignacion.rename(columns={'Comprador': 'Comprador Original'})
            df_reasignacion['Comprador Reasignado'] = df_reasignacion['Categoría'].map(mapa_duenos)
            df_reasignacion['¿Cambió de comprador?'] = (
                df_reasignacion['Comprador Original'] != df_reasignacion['Comprador Reasignado']
            )

            resumen_categorias = pd.DataFrame(filas_resumen)
            resumen_categorias['Retraso promedio del dueño en el grupo (días)'] = resumen_categorias[
                'Retraso promedio del dueño en el grupo (días)'].round(1)

            balance_antes = df_detalle['Comprador'].value_counts().rename('Ítems Antes')
            balance_despues = df_reasignacion['Comprador Reasignado'].value_counts().rename('Ítems Después')
            balance_carga = (
                pd.concat([balance_antes, balance_despues], axis=1)
                .fillna(0).astype(int)
                .reset_index().rename(columns={'index': 'Comprador'})
            )
            balance_carga['Diferencia'] = balance_carga['Ítems Después'] - balance_carga['Ítems Antes']

            # Generar Excel en memoria
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df_detalle.to_excel(writer, sheet_name='01_ANALISIS_DETALLADO', index=False)

                # Hoja de proveedores locales prioritarios
                todos_provs = []
                for cat in categorias_unicas:
                    provs = buscar_proveedores_categoria(cat, df_prov)
                    for _, prov in provs.iterrows():
                        todos_provs.append({
                            'Categoría': cat,
                            'RUC': str(prov.get('RUC', '')),
                            'Nombre Comercial': prov.get('NOMBRE COMERCIAL', ''),
                            'Contacto': prov.get('CONTACTO', ''),
                            'Teléfono/Celular': f"{prov.get('TELEFONO', '')} / {prov.get('CELULAR', '')}",
                            'Email': prov.get('CORREO', ''),
                            'Ciudad/Región': f"{prov.get('Ciudad OK', '')} - {prov.get('REGION', '')}"
                        })

                df_todos_provs = pd.DataFrame(todos_provs).drop_duplicates(subset=['RUC'])
                df_todos_provs.to_excel(writer, sheet_name='02_BASE_PROVEEDORES', index=False)

                # Hoja de proveedores adicionales encontrados por IA
                if usar_ia:
                    ia_rows = []
                    for cat in categorias_unicas:
                        for p in st.session_state.cache_ia.get(cat, []):
                            ia_rows.append({
                                'Categoría': cat,
                                'Nombre Empresa': p.get('nombre_empresa', ''),
                                'Ciudad/País': p.get('ciudad_pais', ''),
                                'Sitio web / Contacto': p.get('sitio_web_o_contacto', ''),
                                'Descripción': p.get('descripcion_breve', '')
                            })
                    df_ia = pd.DataFrame(ia_rows)
                    if not df_ia.empty:
                        df_ia.to_excel(writer, sheet_name='03_PROVEEDORES_IA', index=False)

                # Hoja de propuesta de re-asignación por grupo
                df_reasignacion.to_excel(writer, sheet_name='04_REASIGNACION', index=False, startrow=1)
                fila_resumen = len(df_reasignacion) + 4
                resumen_categorias.to_excel(writer, sheet_name='04_REASIGNACION', index=False, startrow=fila_resumen + 1)
                fila_balance = fila_resumen + len(resumen_categorias) + 4
                balance_carga.to_excel(writer, sheet_name='04_REASIGNACION', index=False, startrow=fila_balance + 1)

                ws = writer.sheets['04_REASIGNACION']
                ws.cell(row=1, column=1, value="DETALLE POR ÍTEM: comprador original vs. reasignado")
                ws.cell(row=fila_resumen + 1, column=1, value="RESUMEN POR CATEGORÍA: comprador asignado (dueño del grupo)")
                ws.cell(row=fila_balance + 1, column=1, value="BALANCE DE CARGA: ítems por comprador, antes vs. después")

            st.success("✅ ¡Análisis completado con éxito!")

            st.download_button(
                label="📥 Descargar Reporte Excel",
                data=output.getvalue(),
                file_name=f"ANALISIS_PROVEEDORES_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )

            st.subheader("Vista previa del análisis (Primeros 5 ítems)")
            st.dataframe(df_detalle.head(), use_container_width=True)

            if usar_ia:
                origen_ia = "una búsqueda web en vivo" if usar_busqueda_web else "el conocimiento general del modelo de IA (sin búsqueda en vivo)"
                st.caption(
                    f"ℹ️ Los proveedores marcados como 'IA' no están verificados por tu empresa: "
                    f"provienen de {origen_ia} y deben validarse antes de contactarlos."
                )

            # ==========================================
            # 5B. PROPUESTA DE RE-ASIGNACIÓN POR GRUPO
            # ==========================================
            st.markdown("---")
            st.header("🔄 Propuesta de Re-asignación de Ítems")
            st.markdown(
                "Por cada **categoría**, se asigna todo el grupo al comprador que ya tenía más ítems "
                "en ese grupo (y, en caso de empate, mayor retraso promedio), buscando equilibrar la "
                "carga total entre compradores."
            )

            st.subheader("Comprador asignado por categoría")
            st.dataframe(resumen_categorias, use_container_width=True)

            colr1, colr2 = st.columns(2)
            with colr1:
                fig_balance = px.bar(
                    balance_carga.melt(id_vars='Comprador', value_vars=['Ítems Antes', 'Ítems Después'],
                                        var_name='Momento', value_name='Número de ítems'),
                    x='Comprador', y='Número de ítems', color='Momento', barmode='group',
                    title='Carga por Comprador: antes vs. después de re-asignar'
                )
                fig_balance.update_layout(xaxis_tickangle=-30)
                st.plotly_chart(fig_balance, use_container_width=True)
            with colr2:
                st.markdown("**Balance de carga**")
                st.dataframe(balance_carga.sort_values('Ítems Después', ascending=False), use_container_width=True)

            with st.expander("Ver detalle por ítem (comprador original vs. reasignado)"):
                st.dataframe(df_reasignacion, use_container_width=True)

            # ==========================================
            # 6. GRÁFICOS
            # ==========================================
            st.markdown("---")
            st.header("📊 Análisis Visual")

            df_validas = df_detalle.dropna(subset=['Retraso (días)']).copy()

            if col_fecha_asignacion and not df_validas.empty:
                colg1, colg2 = st.columns(2)

                with colg1:
                    retraso_comprador = (
                        df_validas.groupby('Comprador')['Retraso (días)']
                        .mean().round(1).sort_values(ascending=False).reset_index()
                    )
                    fig1 = px.bar(
                        retraso_comprador, x='Comprador', y='Retraso (días)',
                        title='Retraso promedio por Comprador (días)',
                        text='Retraso (días)', color='Retraso (días)',
                        color_continuous_scale='Reds'
                    )
                    fig1.update_layout(xaxis_tickangle=-30)
                    st.plotly_chart(fig1, use_container_width=True)

                with colg2:
                    items_comprador = df_detalle['Comprador'].value_counts().reset_index()
                    items_comprador.columns = ['Comprador', 'Número de ítems']
                    fig2 = px.bar(
                        items_comprador, x='Comprador', y='Número de ítems',
                        title='Número de ítems por Comprador',
                        text='Número de ítems', color='Número de ítems',
                        color_continuous_scale='Blues'
                    )
                    fig2.update_layout(xaxis_tickangle=-30)
                    st.plotly_chart(fig2, use_container_width=True)

                colg3, colg4 = st.columns(2)

                with colg3:
                    fig3 = px.box(
                        df_validas, x='Comprador', y='Retraso (días)',
                        title='Distribución del retraso por Comprador (dispersión)',
                        points='all'
                    )
                    fig3.update_layout(xaxis_tickangle=-30)
                    st.plotly_chart(fig3, use_container_width=True)

                with colg4:
                    fig4 = px.histogram(
                        df_validas, x='Retraso (días)', nbins=20,
                        title='Distribución general del retraso (días)'
                    )
                    st.plotly_chart(fig4, use_container_width=True)

                colg5, colg6 = st.columns(2)

                with colg5:
                    retraso_categoria = (
                        df_validas.groupby('Categoría')['Retraso (días)']
                        .mean().round(1).sort_values(ascending=False).reset_index()
                    )
                    fig5 = px.bar(
                        retraso_categoria, x='Categoría', y='Retraso (días)',
                        title='Retraso promedio por Categoría (días)',
                        text='Retraso (días)'
                    )
                    fig5.update_layout(xaxis_tickangle=-30)
                    st.plotly_chart(fig5, use_container_width=True)

                with colg6:
                    items_categoria = df_detalle['Categoría'].value_counts().reset_index()
                    items_categoria.columns = ['Categoría', 'Número de ítems']
                    fig6 = px.pie(
                        items_categoria, names='Categoría', values='Número de ítems',
                        title='Distribución de ítems por Categoría'
                    )
                    st.plotly_chart(fig6, use_container_width=True)

                fig7 = px.scatter(
                    df_validas, x='Retraso (días)', y='Comprador', color='Categoría',
                    size='Num Proveedores (Base propia)', hover_data=['Material', 'PO'],
                    title='Retraso por ítem: Comprador vs Categoría (tamaño = # proveedores propios)'
                )
                st.plotly_chart(fig7, use_container_width=True)
            else:
                st.info("No hay suficientes datos de fecha de asignación válidos para generar los gráficos de retraso.")

        except Exception as e:
            st.error(f"❌ Error al procesar los archivos: {str(e)}")
            st.info("💡 Asegúrate de que el archivo Excel tenga una hoja llamada 'qryPOs_Temp' y que el CSV tenga las columnas esperadas.")
elif df_prov is None:
    st.info("👆 Sube tu base de proveedores (CSV) para comenzar.")
elif not archivo_requerimientos:
    st.info("👆 Sube tu archivo de requerimientos (Excel) para comenzar.")
