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
    elif any(x in texto for x in [
        'explosivo', 'dinamita', 'detonador', 'fulminante', 'anfo', 'voladura',
        'cordon detonante', 'cordón detonante', 'mecha lenta', 'emulsion explosiva', 'emulsión explosiva'
    ]):
        return 'EXPLOSIVOS Y VOLADURA'
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
        'trofeo', 'medalla', 'placa de reconocimiento', 'recuerdo corporativo', 'premio',
        'reconocimiento', 'regalo corporativo', 'souvenir'
    ]):
        return 'RECONOCIMIENTOS Y ARTÍCULOS PROMOCIONALES'
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
        'geomembrana', 'material petreo', 'material pétreo', 'grava', 'arena', 'piedra',
        'agregado', 'ripio', 'cemento', 'hormigon', 'hormigón', 'cantera'
    ]):
        return 'MATERIALES DE CONSTRUCCIÓN'
    elif any(x in texto for x in [
        'combustible', 'diesel', 'diésel', 'gasolina', 'lubricante', 'aceite lubricante',
        'grasa lubricante'
    ]):
        return 'COMBUSTIBLES Y LUBRICANTES'
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
    elif any(x in texto for x in [
        'articulo de aseo', 'articulos de aseo', 'artículo de aseo', 'artículos de aseo', 'limpieza',
        'detergente', 'jabon', 'jabón', 'desinfectante', 'escoba', 'trapeador', 'papel higienico',
        'papel higiénico', 'toalla de papel', 'lejia', 'lejía', 'cloro'
    ]):
        return 'ASEO Y LIMPIEZA'
    elif any(x in texto for x in ['filtro', 'cartucho', 'manocomando', 'sedal']):
        return 'FILTRACIÓN'
    elif any(x in texto for x in [
        'epp', 'seguridad', 'guante', 'casco', 'arnes', 'arnés', 'detector',
        'dotacion', 'dotación', 'uniforme', 'ropa de trabajo'
    ]):
        return 'EPP Y SEGURIDAD INDUSTRIAL'
    elif any(x in texto for x in ['quimico', 'químico', 'floculante', 'reactivo', 'laboratorio']):
        return 'QUÍMICOS Y LABORATORIO'
    else:
        return 'FERRETERÍA GENERAL'


NOMENCLATURA_TABLA_DEMANDA = {
    'AD': {'departamento': 'Administración de Campamento', 'categorias_probables': ['ASEO Y LIMPIEZA', 'MADERA Y MUEBLES']},
    'AP': {'departamento': 'Ampliación de proyectos', 'categorias_probables': ['MATERIALES DE CONSTRUCCIÓN', 'VÁLVULAS E INSTRUMENTACIÓN', 'TUBERÍAS Y METALES']},
    'BE': {'departamento': 'Beneficio', 'categorias_probables': ['TUBERÍAS Y METALES', 'VÁLVULAS E INSTRUMENTACIÓN', 'SOLDADURA Y ABRASIVOS', 'REPUESTOS VEHICULOS Y MAQUINARIA']},
    'CL': {'departamento': 'Comercio Y Logística', 'categorias_probables': ['COMBUSTIBLES Y LUBRICANTES']},
    'EC': {'departamento': 'Gestión de Equipos', 'categorias_probables': ['REPUESTOS VEHICULOS Y MAQUINARIA']},
    'EX': {'departamento': 'Explotación', 'categorias_probables': ['EXPLOSIVOS Y VOLADURA', 'TUBERÍAS Y METALES', 'FILTRACIÓN']},
    'GA': {'departamento': 'G. Ambiente', 'categorias_probables': ['QUÍMICOS Y LABORATORIO', 'EQUIPO Y MONITOREO AMBIENTAL']},
    'GD': {'departamento': 'Gestión de Relaves', 'categorias_probables': ['FERRETERÍA GENERAL']},
    'GE': {'departamento': 'Gestión de Equipos', 'categorias_probables': ['REPUESTOS VEHICULOS Y MAQUINARIA']},
    'GI': {'departamento': 'Gestión de Inversión', 'categorias_probables': ['FERRETERÍA GENERAL']},
    'IG': {'departamento': 'Ing. De Minas', 'categorias_probables': ['MATERIALES DE CONSTRUCCIÓN']},
    'OP': {'departamento': 'Oficina de Presidencia', 'categorias_probables': ['MADERA Y MUEBLES', 'PAPELERÍA Y OFICINA']},
    'PT': {'departamento': 'Producción y Tecnología', 'categorias_probables': ['QUÍMICOS Y LABORATORIO']},
    'RH': {'departamento': 'Recursos Humanos', 'categorias_probables': ['RECONOCIMIENTOS Y ARTÍCULOS PROMOCIONALES']},
    'SS': {'departamento': 'SSO', 'categorias_probables': ['EPP Y SEGURIDAD INDUSTRIAL']},
    '20': {'departamento': 'Gestión de Equipos', 'categorias_probables': ['REPUESTOS VEHICULOS Y MAQUINARIA']},
    'MA': {'departamento': 'Gestión de Equipos', 'categorias_probables': ['REPUESTOS VEHICULOS Y MAQUINARIA']},
    'IT': {'departamento': 'IT', 'categorias_probables': ['SUMINISTROS DE COMPUTACIÓN Y TECNOLOGÍA']},
}

# Alias para abreviaturas largas observadas en los datos reales, que apuntan al
# mismo código canónico de 2 letras de NOMENCLATURA_TABLA_DEMANDA.
ALIASES_CODIGO_DEPARTAMENTO = {
    'BEN': 'BE',    # Beneficio
    'ADC': 'AD',    # Administración de Campamento
    'GAMB': 'GA',   # G. Ambiente
    'SSO': 'SS',    # SSO
    'GDR': 'GD',    # Gestión de Relaves
}


def extraer_codigo_departamento(valor_tabla_demanda):
    """
    Extrae el código de departamento desde el valor de [Tabla Demanda] buscando, entre los
    segmentos separados por guiones/espacios/guiones bajos, cuál coincide EXACTAMENTE con un
    código conocido (o alias) de NOMENCLATURA_TABLA_DEMANDA.
    Ej.: 'ECSA-GE-SP-2026-022' -> segmentos ['ECSA','GE','SP','2026','022'] -> 'GE' coincide
    (Gestión de Equipos). 'ECSA-BEN-SP-2025-007' -> 'BEN' es alias de 'BE' (Beneficio).
    Caso especial: si el texto es una frase tipo 'Material procurement plan sheet for the
    ... quarter of ... of Mirador' (sin código corto), se interpreta como Gestión de Equipos.
    Si ningún segmento coincide exactamente, cae de vuelta al bloque de letras/dígitos inicial.
    """
    texto = str(valor_tabla_demanda).strip().upper()

    if 'MATERIAL PROCUREMENT PLAN SHEET' in texto:
        return 'MA'

    segmentos = re.split(r'[-_\s]+', texto)
    for segmento in segmentos:
        if segmento in NOMENCLATURA_TABLA_DEMANDA:
            return segmento
        if segmento in ALIASES_CODIGO_DEPARTAMENTO:
            return ALIASES_CODIGO_DEPARTAMENTO[segmento]

    # Respaldo: si ningún segmento coincidió exactamente, usa el bloque inicial de letras/dígitos
    match = re.match(r'^([A-ZÑ]+)', texto)
    if match:
        return match.group(1)
    match = re.match(r'^(\d+)', texto)
    if match:
        return match.group(1)
    return None


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
        'ASEO Y LIMPIEZA': ['ASEO', 'LIMPIEZA', 'QUIMICA'],
        'COMBUSTIBLES Y LUBRICANTES': ['COMBUSTIBLE', 'LUBRICANTE', 'PETROLEO', 'DIESEL'],
        'EXPLOSIVOS Y VOLADURA': ['EXPLOSIVO', 'VOLADURA', 'DETONADOR', 'EXSA', 'ENAEX'],
        'MATERIALES DE CONSTRUCCIÓN': ['CONSTRUCCION', 'MATERIALES', 'CANTERA', 'AGREGADOS', 'HORMIGON'],
        'RECONOCIMIENTOS Y ARTÍCULOS PROMOCIONALES': ['PROMOCIONAL', 'TROFEO', 'REGALOS', 'PUBLICIDAD'],
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
                llave_grupo = df_req[col_tabla_demanda]

                def _moda_valida(serie):
                    especificas = serie[serie != 'FERRETERÍA GENERAL']
                    if especificas.empty:
                        return pd.Series({'categoria': None, 'proporcion': 0.0})
                    moda = especificas.mode()
                    if moda.empty:
                        return pd.Series({'categoria': None, 'proporcion': 0.0})
                    cat = moda.iloc[0]
                    return pd.Series({'categoria': cat, 'proporcion': (especificas == cat).mean()})

                resumen_modas = df_req.groupby(llave_grupo)['CATEGORIA'].apply(_moda_valida).unstack()
                mapa_moda = resumen_modas[resumen_modas['proporcion'] >= 0.5]['categoria'].to_dict()

                es_generico = df_req['CATEGORIA'] == 'FERRETERÍA GENERAL'
                categoria_sugerida = llave_grupo.map(mapa_moda)
                aplicar = es_generico & categoria_sugerida.notna()
                df_req.loc[aplicar, 'CATEGORIA'] = categoria_sugerida[aplicar]
            else:
                st.warning("⚠️ No se encontró una columna de 'Tabla Demanda' en el Excel; "
                           "se omite el refinamiento de categorías genéricas por grupo.")

            # Tercera pasada: pista por departamento (según el código en [Tabla Demanda]).
            # Solo se aplica como ayuda ADICIONAL, no determinante: únicamente a ítems que
            # sigan sin clasificar (Ferretería General) tras las dos pasadas anteriores, y
            # solo si el departamento tiene UNA categoría típica clara. Queda registrado en
            # una columna aparte para que el equipo de compras pueda revisar estos casos.
            df_req['_codigo_depto'] = None
            df_req['_departamento'] = ''
            df_req['_pista_aplicada'] = False
            if col_tabla_demanda:
                df_req['_codigo_depto'] = df_req[col_tabla_demanda].apply(extraer_codigo_departamento)
                df_req['_departamento'] = df_req['_codigo_depto'].map(
                    lambda c: NOMENCLATURA_TABLA_DEMANDA.get(c, {}).get('departamento', '')
                )

                def _aplicar_pista_departamento(fila):
                    if fila['CATEGORIA'] != 'FERRETERÍA GENERAL':
                        return fila['CATEGORIA'], False
                    info = NOMENCLATURA_TABLA_DEMANDA.get(fila['_codigo_depto'])
                    if info and len(info['categorias_probables']) == 1:
                        candidata = info['categorias_probables'][0]
                        if candidata != 'FERRETERÍA GENERAL':
                            return candidata, True
                    return fila['CATEGORIA'], False

                resultado_pista = df_req.apply(_aplicar_pista_departamento, axis=1, result_type='expand')
                df_req['CATEGORIA'] = resultado_pista[0]
                df_req['_pista_aplicada'] = resultado_pista[1]

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
                    'Tabla Demanda': row.get(col_tabla_demanda, '') if col_tabla_demanda else '',
                    'Departamento (Tabla Demanda)': row.get('_departamento', ''),
                    'Categoría asignada por pista de Departamento': bool(row.get('_pista_aplicada', False)),
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


# ==========================================================================
# 6. DASHBOARD DE PERFORMANCE DE COMPRAS (PO)
# ==========================================================================
st.markdown("---")
st.title("📊 Dashboard de Performance de Compras")
st.markdown(
    "Sube el archivo de estado de órdenes de compra (ej. `dbo_vw_LM_PO_Estado.xlsx`) para ver "
    "KPIs de eficiencia del proceso, cumplimiento de proveedores, costos y riesgo."
)


def clasificar_estado_td(valor):
    """Interpreta el campo Estado_TD: número = días de retraso, código = PO cerrada, texto = cancelado/suspendido"""
    texto = str(valor).strip().upper()
    if texto in ('NAN', 'NONE', ''):
        return 'Sin dato'
    if 'CANCEL' in texto:
        return 'Cancelado'
    if 'SUSPEND' in texto or 'SUPEND' in texto:
        return 'Suspendido'
    try:
        num = float(texto)
        if num > 0:
            return 'Retrasado'
        elif num == 0:
            return 'A tiempo'
        else:
            return 'Adelantado'
    except ValueError:
        return 'Cerrado (PO completada)'


def bucket_severidad_retraso(dias):
    """Clasifica el retraso en buckets de severidad"""
    if pd.isna(dias) or dias <= 0:
        return 'Sin retraso'
    elif dias <= 30:
        return 'Leve (1-30 días)'
    elif dias <= 90:
        return 'Moderado (31-90 días)'
    elif dias <= 180:
        return 'Crítico (91-180 días)'
    else:
        return 'Severo (>180 días)'


archivo_dashboard = st.file_uploader(
    "📂 Archivo de estado de órdenes de compra (Excel)", type=['xlsx', 'xls'], key="uploader_dashboard"
)

if archivo_dashboard:
    try:
        with st.spinner("⚙️ Cargando y preparando datos del dashboard..."):
            df_po = pd.read_excel(archivo_dashboard)
            df_po.columns = df_po.columns.str.strip()

            columnas_esperadas = [
                'Estado PO', 'Estado Pos', 'T Retraso', 'Estado_TD', 'N_Año', 'N_Mes',
                'F Asignacion Tabla', 'F Firma PO', 'Comprador', 'Num PO', 'Precio U',
                'Subtotal Ítem', 'Proveedor', 'Solo Source', 'Precio U2', 'Precio U3',
                'US_Subtotal_I_1', 'Cant_PO', 'Nombre Material'
            ]
            faltantes = [c for c in columnas_esperadas if c not in df_po.columns]
            if faltantes:
                st.warning(f"⚠️ Columnas no encontradas en el archivo (se omiten los análisis que las requieren): {', '.join(faltantes)}")

            # --- Fechas ---
            for col_fecha in ['F Firma PO', 'F Prevista de entrega', 'F Entrega']:
                if col_fecha in df_po.columns:
                    df_po[col_fecha] = pd.to_datetime(df_po[col_fecha], errors='coerce')
            if 'F Asignacion Tabla' in df_po.columns:
                df_po['F Asignacion Tabla'] = pd.to_datetime(df_po['F Asignacion Tabla'], errors='coerce')
            if 'F Prevista de entrega' in df_po.columns:
                df_po.loc[df_po['F Prevista de entrega'] < pd.Timestamp('1950-01-01'), 'F Prevista de entrega'] = pd.NaT

            # --- Tiempo de emisión de PO (días) ---
            if 'F Firma PO' in df_po.columns and 'F Asignacion Tabla' in df_po.columns:
                df_po['Días Emisión PO'] = (df_po['F Firma PO'] - df_po['F Asignacion Tabla']).dt.days

                hoy = pd.Timestamp(datetime.now().date())
                df_po['Días Esperando PO'] = np.where(
                    df_po['F Firma PO'].isna() & df_po['F Asignacion Tabla'].notna(),
                    (hoy - df_po['F Asignacion Tabla']).dt.days,
                    np.nan
                )

            # --- Estado PO legible ---
            # 0: PO emitida y entregada a tiempo | 1: PO emitida, en seguimiento/entrega | 2: sin emitir PO aún
            if 'Estado PO' in df_po.columns:
                mapa_estado_po = {
                    0: 'PO emitida - entregada a tiempo',
                    1: 'PO emitida - en seguimiento/entrega',
                    2: 'Sin emitir PO aún'
                }
                df_po['Estado PO (detalle)'] = df_po['Estado PO'].map(mapa_estado_po).fillna('Desconocido')

            # --- Estado_TD parseado ---
            if 'Estado_TD' in df_po.columns:
                df_po['Estado Entrega (detalle)'] = df_po['Estado_TD'].apply(clasificar_estado_td)

            # --- Solo Source normalizado ---
            if 'Solo Source' in df_po.columns:
                df_po['Solo Source (norm)'] = df_po['Solo Source'].astype(str).str.strip().str.upper()
                df_po.loc[~df_po['Solo Source (norm)'].isin(['SI', 'NO']), 'Solo Source (norm)'] = np.nan

            # --- IVA estimado (US_Subtotal_I_1 con IVA vs Subtotal Ítem sin IVA) ---
            if 'US_Subtotal_I_1' in df_po.columns and 'Subtotal Ítem' in df_po.columns:
                df_po['IVA Estimado'] = df_po['US_Subtotal_I_1'] - df_po['Subtotal Ítem']

            # --- Ahorro potencial por negociación (mejor precio alterno vs el pagado) ---
            if all(c in df_po.columns for c in ['Precio U', 'Precio U2', 'Precio U3', 'Cant_PO']):
                df_po['Mejor Precio Alterno'] = df_po[['Precio U2', 'Precio U3']].min(axis=1, skipna=True)
                df_po['Ahorro Potencial Unitario'] = (df_po['Precio U'] - df_po['Mejor Precio Alterno']).clip(lower=0)
                df_po['Ahorro Potencial Total'] = df_po['Ahorro Potencial Unitario'] * df_po['Cant_PO']

            # --- Severidad de retraso (solo aplica a PO ya emitidas, T Retraso) ---
            if 'T Retraso' in df_po.columns:
                df_po['Bucket Retraso'] = df_po['T Retraso'].apply(bucket_severidad_retraso)

            # --- Categoría de material (reutiliza la misma clasificación del resto de la app,
            # incluyendo el refinamiento por grupo y la pista de departamento) ---
            if 'Nombre Material' in df_po.columns:
                df_po['Categoría'] = df_po.apply(clasificar_requerimiento, axis=1)

                col_td_dash = encontrar_columna_tabla_demanda(df_po)
                if col_td_dash:
                    llave_grupo_dash = df_po[col_td_dash]

                    def _moda_valida_dash(serie):
                        especificas = serie[serie != 'FERRETERÍA GENERAL']
                        if especificas.empty:
                            return pd.Series({'categoria': None, 'proporcion': 0.0})
                        moda = especificas.mode()
                        if moda.empty:
                            return pd.Series({'categoria': None, 'proporcion': 0.0})
                        cat = moda.iloc[0]
                        return pd.Series({'categoria': cat, 'proporcion': (especificas == cat).mean()})

                    resumen_modas_dash = df_po.groupby(llave_grupo_dash)['Categoría'].apply(_moda_valida_dash).unstack()
                    mapa_moda_dash = resumen_modas_dash[resumen_modas_dash['proporcion'] >= 0.5]['categoria'].to_dict()
                    es_generico_dash = df_po['Categoría'] == 'FERRETERÍA GENERAL'
                    categoria_sugerida_dash = llave_grupo_dash.map(mapa_moda_dash)
                    aplicar_dash = es_generico_dash & categoria_sugerida_dash.notna()
                    df_po.loc[aplicar_dash, 'Categoría'] = categoria_sugerida_dash[aplicar_dash]

                    # Pista adicional por departamento (código en Tabla Demanda), no determinante
                    df_po['_codigo_depto_dash'] = df_po[col_td_dash].apply(extraer_codigo_departamento)
                    df_po['Departamento (Tabla Demanda)'] = df_po['_codigo_depto_dash'].map(
                        lambda c: NOMENCLATURA_TABLA_DEMANDA.get(c, {}).get('departamento', '')
                    )

                    def _aplicar_pista_departamento_dash(fila):
                        if fila['Categoría'] != 'FERRETERÍA GENERAL':
                            return fila['Categoría']
                        info = NOMENCLATURA_TABLA_DEMANDA.get(fila['_codigo_depto_dash'])
                        if info and len(info['categorias_probables']) == 1:
                            candidata = info['categorias_probables'][0]
                            if candidata != 'FERRETERÍA GENERAL':
                                return candidata
                        return fila['Categoría']

                    df_po['Categoría'] = df_po.apply(_aplicar_pista_departamento_dash, axis=1)

            # --- Año / Mes para filtros ---
            if 'N_Año' in df_po.columns:
                df_po['_Año'] = df_po['N_Año']
                if 'F Asignacion Tabla' in df_po.columns:
                    df_po['_Año'] = df_po['_Año'].fillna(df_po['F Asignacion Tabla'].dt.year)
            elif 'F Asignacion Tabla' in df_po.columns:
                df_po['_Año'] = df_po['F Asignacion Tabla'].dt.year

            if 'N_Mes' in df_po.columns:
                df_po['_Mes'] = df_po['N_Mes']
                if 'F Asignacion Tabla' in df_po.columns:
                    df_po['_Mes'] = df_po['_Mes'].fillna(df_po['F Asignacion Tabla'].dt.month)
            elif 'F Asignacion Tabla' in df_po.columns:
                df_po['_Mes'] = df_po['F Asignacion Tabla'].dt.month

        st.success(f"✅ {len(df_po)} registros cargados.")

        # ================== FILTROS ==================
        st.subheader("🔎 Filtros")
        colf1, colf2, colf3, colf4 = st.columns(4)
        with colf1:
            años_disponibles = sorted([int(a) for a in df_po['_Año'].dropna().unique()])
            f_anios = st.multiselect("Año", años_disponibles, default=años_disponibles)
        with colf2:
            nombres_mes = {1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
                            7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'}
            meses_disponibles = sorted([int(m) for m in df_po['_Mes'].dropna().unique()])
            f_meses = st.multiselect(
                "Mes", meses_disponibles, default=meses_disponibles,
                format_func=lambda m: nombres_mes.get(m, str(m))
            )
        with colf3:
            compradores_disponibles = sorted(df_po['Comprador'].dropna().unique())
            f_compradores = st.multiselect("Comprador", compradores_disponibles, default=compradores_disponibles)
        with colf4:
            proveedores_disponibles = sorted(df_po['Proveedor'].dropna().unique())
            f_proveedores = st.multiselect(
                "Proveedor (vacío = todos)", proveedores_disponibles, default=[]
            )

        df_f = df_po[
            df_po['_Año'].isin(f_anios) &
            df_po['_Mes'].isin(f_meses) &
            df_po['Comprador'].isin(f_compradores)
        ].copy()
        if f_proveedores:
            df_f = df_f[df_f['Proveedor'].isin(f_proveedores)]

        st.caption(f"Mostrando {len(df_f):,} de {len(df_po):,} ítems según los filtros seleccionados.")

        # --- Bandera de cancelación: detecta 'CANCELA', 'CANCELADO', 'Cancelando',
        # 'CANCELAOD' (con error de tipeo), etc., tanto en Estado_TD como en Num PO ---
        def _contiene_cancela(*valores):
            return any('CANCEL' in str(v).strip().upper() for v in valores if pd.notna(v))

        cols_estado_cancel = [c for c in ['Estado_TD', 'Num PO'] if c in df_f.columns]
        if cols_estado_cancel:
            df_f['Es Cancelado'] = df_f[cols_estado_cancel].apply(
                lambda fila: _contiene_cancela(*fila.values), axis=1
            )
        else:
            df_f['Es Cancelado'] = False

        # --- Monto oficial: solo POs YA EMITIDAS (con F Firma PO) y NO canceladas ---
        if 'F Firma PO' in df_f.columns:
            df_oficial = df_f[df_f['F Firma PO'].notna() & ~df_f['Es Cancelado']].copy()
        else:
            df_oficial = df_f[~df_f['Es Cancelado']].copy()

        st.caption(
            f"💵 Montos oficiales calculados sobre {len(df_oficial):,} ítems con PO emitida y no cancelada "
            f"(se excluyeron {df_f['Es Cancelado'].sum():,} ítems cancelados y "
            f"{(df_f['F Firma PO'].isna() & ~df_f['Es Cancelado']).sum():,} sin PO emitida aún, del total filtrado)."
        )

        if df_f.empty:
            st.warning("No hay datos para los filtros seleccionados.")
        else:
            # ================== RESUMEN KPI ==================
            st.markdown("### 📌 Resumen General")
            total_items = len(df_f)
            total_pos = df_f['Num PO'].nunique() if 'Num PO' in df_f.columns else np.nan
            gasto_total = df_oficial['US_Subtotal_I_1'].sum() if 'US_Subtotal_I_1' in df_oficial.columns else np.nan
            otd = (df_f['Estado Pos'] == 'Ok').mean() * 100 if 'Estado Pos' in df_f.columns else np.nan
            dias_emision_prom = df_f['Días Emisión PO'].mean() if 'Días Emisión PO' in df_f.columns else np.nan
            retraso_prom_activo = (
                df_f.loc[df_f['Estado PO'] == 1, 'T Retraso'].mean()
                if 'Estado PO' in df_f.columns and 'T Retraso' in df_f.columns else np.nan
            )
            pct_sole_source = (
                (df_f['Solo Source (norm)'] == 'SI').mean() * 100
                if 'Solo Source (norm)' in df_f.columns and df_f['Solo Source (norm)'].notna().any() else np.nan
            )
            ahorro_total = df_oficial['Ahorro Potencial Total'].sum() if 'Ahorro Potencial Total' in df_oficial.columns else np.nan

            k1, k2, k3, k4 = st.columns(4)
            k1.metric("Total ítems", f"{total_items:,}")
            k2.metric("Gasto total (USD, c/IVA)", f"${gasto_total:,.0f}" if pd.notna(gasto_total) else "N/D")
            k3.metric("OTD (On-Time Delivery)", f"{otd:.1f}%" if pd.notna(otd) else "N/D")
            k4.metric(
                "Días prom. emisión PO", f"{dias_emision_prom:.1f}" if pd.notna(dias_emision_prom) else "N/D",
                help="Objetivo sugerido: < 5 días"
            )

            k5, k6, k7, k8 = st.columns(4)
            k5.metric("PO's únicas", f"{total_pos:,.0f}" if pd.notna(total_pos) else "N/D")
            k6.metric(
                "Retraso prom. (PO ya emitidas)",
                f"{retraso_prom_activo:.0f} días" if pd.notna(retraso_prom_activo) else "N/D"
            )
            k7.metric(
                "% Sole Source", f"{pct_sole_source:.1f}%" if pd.notna(pct_sole_source) else "N/D",
                help="Objetivo sugerido: < 20%"
            )
            k8.metric("Ahorro potencial por negociación", f"${ahorro_total:,.0f}" if pd.notna(ahorro_total) else "N/D")

            st.caption(
                "ℹ️ 'Sin emitir PO aún' (Estado PO = 2) representa ítems que todavía no tienen orden de compra "
                "firmada; para esos, el indicador relevante es 'Días Esperando PO' (ver sección de Eficiencia), "
                "no el retraso de entrega."
            )

            # ================== 1. EFICIENCIA DEL PROCESO ==================
            st.markdown("---")
            st.header("⏱️ 1. Desempeño del Proceso de Compras")

            col1, col2 = st.columns(2)
            with col1:
                if 'Días Emisión PO' in df_f.columns:
                    fig = px.histogram(
                        df_f.dropna(subset=['Días Emisión PO']), x='Días Emisión PO', nbins=30,
                        title='Distribución: días para emitir la PO (F Firma PO - F Asignación)'
                    )
                    fig.add_vline(x=5, line_dash='dash', line_color='red',
                                  annotation_text='Objetivo: 5 días')
                    st.plotly_chart(fig, use_container_width=True)
            with col2:
                if 'Días Esperando PO' in df_f.columns:
                    pendientes = df_f.dropna(subset=['Días Esperando PO'])
                    if not pendientes.empty:
                        fig = px.histogram(
                            pendientes, x='Días Esperando PO', nbins=30,
                            title='Ítems SIN PO aún: días en espera de emisión'
                        )
                        st.plotly_chart(fig, use_container_width=True)
                    else:
                        st.info("No hay ítems pendientes de emisión de PO en el filtro actual.")

            col3, col4 = st.columns(2)
            with col3:
                vol_comprador = df_f['Comprador'].value_counts().reset_index()
                vol_comprador.columns = ['Comprador', 'Número de ítems']
                fig = px.bar(
                    vol_comprador, x='Comprador', y='Número de ítems',
                    title='Volumen de ítems gestionados por Comprador', text='Número de ítems'
                )
                fig.update_layout(xaxis_tickangle=-30)
                st.plotly_chart(fig, use_container_width=True)
            with col4:
                if 'US_Subtotal_I_1' in df_oficial.columns:
                    gasto_comprador = df_oficial.groupby('Comprador')['US_Subtotal_I_1'].sum().sort_values(ascending=False).reset_index()
                    gasto_comprador.columns = ['Comprador', 'Gasto Total (USD)']
                    fig = px.bar(
                        gasto_comprador, x='Comprador', y='Gasto Total (USD)',
                        title='Gasto oficial gestionado por Comprador (USD, c/IVA — solo PO emitidas, no canceladas)'
                    )
                    fig.update_layout(xaxis_tickangle=-30)
                    st.plotly_chart(fig, use_container_width=True)

            # ================== 2. DESEMPEÑO DE ENTREGAS / PROVEEDORES ==================
            st.markdown("---")
            st.header("🚚 2. Desempeño de Entregas y Proveedores")

            col5, col6 = st.columns(2)
            with col5:
                if 'Estado PO (detalle)' in df_f.columns:
                    fig = px.pie(
                        df_f, names='Estado PO (detalle)', title='Distribución por Estado de la PO', hole=0.4
                    )
                    st.plotly_chart(fig, use_container_width=True)
            with col6:
                if 'Estado Entrega (detalle)' in df_f.columns:
                    estado_td_counts = df_f['Estado Entrega (detalle)'].value_counts().reset_index()
                    estado_td_counts.columns = ['Estado', 'Cantidad']
                    fig = px.bar(
                        estado_td_counts, x='Estado', y='Cantidad', title='Estado detallado de entrega (Estado_TD)',
                        color='Estado'
                    )
                    st.plotly_chart(fig, use_container_width=True)

            if 'Bucket Retraso' in df_f.columns and 'Estado PO' in df_f.columns:
                df_activas = df_f[df_f['Estado PO'] == 1]
                if not df_activas.empty:
                    col7, col8 = st.columns(2)
                    with col7:
                        bucket_counts = df_activas['Bucket Retraso'].value_counts().reindex(
                            ['Sin retraso', 'Leve (1-30 días)', 'Moderado (31-90 días)',
                             'Crítico (91-180 días)', 'Severo (>180 días)']
                        ).fillna(0).reset_index()
                        bucket_counts.columns = ['Severidad', 'Cantidad']
                        fig = px.bar(
                            bucket_counts, x='Severidad', y='Cantidad', title='Ítems (con PO emitida) por severidad de retraso',
                            color='Severidad'
                        )
                        st.plotly_chart(fig, use_container_width=True)
                    with col8:
                        if 'Proveedor' in df_activas.columns:
                            retraso_prov = (
                                df_activas.groupby('Proveedor')['T Retraso']
                                .agg(['mean', 'count']).query('count >= 2')
                                .sort_values('mean', ascending=False).head(15).reset_index()
                            )
                            retraso_prov.columns = ['Proveedor', 'Retraso Promedio (días)', 'Núm. Ítems']
                            fig = px.bar(
                                retraso_prov, x='Retraso Promedio (días)', y='Proveedor', orientation='h',
                                title='Top 15 proveedores por retraso promedio (mín. 2 ítems)'
                            )
                            fig.update_layout(yaxis={'categoryorder': 'total ascending'})
                            st.plotly_chart(fig, use_container_width=True)

            # ================== 3. ANÁLISIS DE COSTOS ==================
            st.markdown("---")
            st.header("💰 3. Análisis de Costos")

            col9, col10 = st.columns(2)
            with col9:
                if 'US_Subtotal_I_1' in df_oficial.columns and '_Año' in df_oficial.columns and '_Mes' in df_oficial.columns:
                    df_temp = df_oficial.dropna(subset=['_Año', '_Mes']).copy()
                    df_temp['Periodo'] = df_temp['_Año'].astype(int).astype(str) + '-' + df_temp['_Mes'].astype(int).astype(str).str.zfill(2)
                    gasto_periodo = df_temp.groupby('Periodo')['US_Subtotal_I_1'].sum().reset_index().sort_values('Periodo')
                    fig = px.line(
                        gasto_periodo, x='Periodo', y='US_Subtotal_I_1', markers=True,
                        title='Gasto oficial por período (USD, c/IVA — solo PO emitidas, no canceladas)'
                    )
                    fig.update_layout(xaxis_tickangle=-45)
                    st.plotly_chart(fig, use_container_width=True)
            with col10:
                if 'IVA Estimado' in df_oficial.columns:
                    iva_total = df_oficial['IVA Estimado'].sum()
                    iva_pct = (df_oficial['IVA Estimado'].sum() / df_oficial['Subtotal Ítem'].sum() * 100) if df_oficial['Subtotal Ítem'].sum() else np.nan
                    st.metric("IVA total estimado (oficial)", f"${iva_total:,.0f}")
                    st.metric("Impacto IVA (% sobre subtotal)", f"{iva_pct:.1f}%" if pd.notna(iva_pct) else "N/D")
                    fig = px.box(df_oficial, y='IVA Estimado', title='Distribución del IVA estimado por ítem (oficial)')
                    st.plotly_chart(fig, use_container_width=True)

            if 'Categoría' in df_oficial.columns and 'US_Subtotal_I_1' in df_oficial.columns:
                st.markdown("#### Análisis ABC (Pareto) por Categoría — gasto oficial")
                gasto_cat = df_oficial.groupby('Categoría')['US_Subtotal_I_1'].sum().sort_values(ascending=False).reset_index()
                gasto_cat['% Acumulado'] = gasto_cat['US_Subtotal_I_1'].cumsum() / gasto_cat['US_Subtotal_I_1'].sum() * 100
                gasto_cat['Clase ABC'] = pd.cut(
                    gasto_cat['% Acumulado'], bins=[0, 80, 95, 100], labels=['A', 'B', 'C'], include_lowest=True
                )
                fig = px.bar(gasto_cat, x='Categoría', y='US_Subtotal_I_1', color='Clase ABC',
                             title='Gasto oficial por Categoría (clasificación ABC)')
                fig.add_scatter(x=gasto_cat['Categoría'], y=gasto_cat['% Acumulado'], mode='lines+markers',
                                 name='% Acumulado', yaxis='y2')
                fig.update_layout(
                    xaxis_tickangle=-30,
                    yaxis2=dict(overlaying='y', side='right', range=[0, 105], title='% Acumulado')
                )
                st.plotly_chart(fig, use_container_width=True)
                with st.expander("Ver tabla ABC completa"):
                    st.dataframe(gasto_cat, use_container_width=True)

            # ================== 4. RIESGO Y COMPARACIÓN DE PROVEEDORES ==================
            st.markdown("---")
            st.header("⚠️ 4. Riesgo y Comparación de Proveedores")

            col11, col12 = st.columns(2)
            with col11:
                if 'Solo Source (norm)' in df_f.columns and df_f['Solo Source (norm)'].notna().any():
                    ss_counts = df_f['Solo Source (norm)'].value_counts().reset_index()
                    ss_counts.columns = ['Solo Source', 'Cantidad']
                    fig = px.pie(ss_counts, names='Solo Source', values='Cantidad',
                                 title='% de ítems Sole Source (proveedor único)', hole=0.4)
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No hay datos suficientes de 'Solo Source' en el filtro actual.")
            with col12:
                if all(c in df_f.columns for c in ['Proveedor', 'T Retraso']) and 'US_Subtotal_I_1' in df_oficial.columns:
                    matriz_conteo = df_f.groupby('Proveedor').agg(
                        Retraso_Prom=('T Retraso', 'mean'),
                        Num_Items=('Proveedor', 'count')
                    ).reset_index()
                    gasto_oficial_prov = (
                        df_oficial.groupby('Proveedor')['US_Subtotal_I_1'].sum()
                        .rename('Gasto_Total').reset_index()
                    )
                    matriz = matriz_conteo.merge(gasto_oficial_prov, on='Proveedor', how='left')
                    matriz['Gasto_Total'] = matriz['Gasto_Total'].fillna(0)
                    matriz = matriz.query('Num_Items >= 2')
                    if not matriz.empty:
                        fig = px.scatter(
                            matriz, x='Retraso_Prom', y='Gasto_Total', size='Num_Items', hover_name='Proveedor',
                            title='Matriz de riesgo: Gasto oficial vs Retraso promedio por proveedor',
                            labels={'Retraso_Prom': 'Retraso promedio (días)', 'Gasto_Total': 'Gasto oficial (USD)'}
                        )
                        st.plotly_chart(fig, use_container_width=True)

            if 'Ahorro Potencial Total' in df_oficial.columns:
                st.markdown("#### Oportunidades de ahorro por negociación (Precio U vs. mejores alternativas) — gasto oficial")
                ahorro_prov = (
                    df_oficial[df_oficial['Ahorro Potencial Total'] > 0]
                    .groupby('Proveedor')['Ahorro Potencial Total']
                    .sum().sort_values(ascending=False).head(15).reset_index()
                )
                if not ahorro_prov.empty:
                    fig = px.bar(
                        ahorro_prov, x='Ahorro Potencial Total', y='Proveedor', orientation='h',
                        title='Top 15 proveedores con mayor ahorro potencial si se usa la mejor alternativa'
                    )
                    fig.update_layout(yaxis={'categoryorder': 'total ascending'})
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No se detectaron oportunidades de ahorro (Precio U ya es el más bajo) en el filtro actual.")

            # ================== 5. TEMPORALIDAD ==================
            st.markdown("---")
            st.header("📅 5. Temporalidad")

            col13, col14 = st.columns(2)
            with col13:
                if '_Año' in df_f.columns and '_Mes' in df_f.columns:
                    df_temp2 = df_f.dropna(subset=['_Año', '_Mes']).copy()
                    df_temp2['Periodo'] = df_temp2['_Año'].astype(int).astype(str) + '-' + df_temp2['_Mes'].astype(int).astype(str).str.zfill(2)
                    vol_periodo = df_temp2.groupby('Periodo').size().reset_index(name='Número de ítems').sort_values('Periodo')
                    fig = px.bar(vol_periodo, x='Periodo', y='Número de ítems', title='Volumen de compras por período')
                    fig.update_layout(xaxis_tickangle=-45)
                    st.plotly_chart(fig, use_container_width=True)
            with col14:
                if 'Num Días Entrega' in df_f.columns:
                    fig = px.histogram(
                        df_f.dropna(subset=['Num Días Entrega']), x='Num Días Entrega', nbins=30,
                        title='Lead time comprometido (Num Días Entrega)'
                    )
                    st.plotly_chart(fig, use_container_width=True)

            # ================== TABLA DETALLE ==================
            st.markdown("---")
            with st.expander("📋 Ver tabla de datos filtrados"):
                columnas_mostrar = [c for c in [
                    'Num PO', 'Tabla Demanda', 'Departamento (Tabla Demanda)', 'Comprador', 'Proveedor',
                    'Nombre Material', 'Categoría', 'Estado PO (detalle)', 'Estado Entrega (detalle)',
                    'T Retraso', 'Días Emisión PO', 'Días Esperando PO', 'Precio U', 'Precio U2', 'Precio U3',
                    'Ahorro Potencial Total', 'US_Subtotal_I_1', 'Solo Source (norm)', '_Año', '_Mes'
                ] if c in df_f.columns]
                st.dataframe(df_f[columnas_mostrar], use_container_width=True)

    except Exception as e:
        st.error(f"❌ Error al procesar el archivo del dashboard: {str(e)}")
        st.info("💡 Verifica que el archivo tenga las columnas esperadas del reporte de estado de PO's.")
