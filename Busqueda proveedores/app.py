import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import re
import io

# ==========================================
# 1. CONFIGURACIÓN DE LA PÁGINA
# ==========================================
st.set_page_config(page_title="Buscador de Proveedores Mineros", layout="wide")
st.title("⛏️ Buscador de Proveedores Mineros - Supply Chain")
st.markdown("Sube tus archivos para generar un análisis estratégico de proveedores locales, nacionales e internacionales.")

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
    """Clasifica el requerimiento según descripción y especificaciones"""
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
    elif any(x in texto for x in ['valvula', 'válvula', 'valve', 'check', 'regulador']):
        return 'VÁLVULAS E INSTRUMENTACIÓN'
    elif any(x in texto for x in ['cable', 'transformador', 'electrico', 'motor', 'ventilador']):
        return 'MATERIAL ELÉCTRICO'
    elif any(x in texto for x in ['tubo', 'tuberia', 'pipe', 'cobre', 'inoxidable', 'plancha']):
        return 'TUBERÍAS Y METALES'
    elif any(x in texto for x in ['repuesto', 'part', 'manija', 'puerta', 'asiento', 'ford', 'jac', 'ranger']):
        return 'REPUESTOS VEHICULOS Y MAQUINARIA'
    elif any(x in texto for x in ['filtro', 'cartucho', 'manocomando', 'sedal']):
        return 'FILTRACIÓN'
    elif any(x in texto for x in ['epp', 'seguridad', 'guante', 'casco', 'arnes', 'detector']):
        return 'EPP Y SEGURIDAD INDUSTRIAL'
    elif any(x in texto for x in ['quimico', 'floculante', 'reactivo', 'laboratorio']):
        return 'QUÍMICOS Y LABORATORIO'
    else:
        return 'FERRETERÍA GENERAL'

def buscar_proveedores_categoria(categoria, df_proveedores):
    """Busca proveedores según la categoría del material"""
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

# ==========================================
# 3. INTERFAZ DE STREAMLIT
# ==========================================

col1, col2 = st.columns(2)
with col1:
    archivo_proveedores = st.file_uploader("📂 1. Sube tu base de proveedores (CSV)", type=['csv'])
with col2:
    archivo_requerimientos = st.file_uploader("📂 2. Sube tus requerimientos (Excel)", type=['xlsx', 'xls'])

if archivo_proveedores and archivo_requerimientos:
    with st.spinner("⚙️ Procesando datos y cruzando información..."):
        try:
            # Cargar datos desde los archivos subidos
            df_prov = pd.read_csv(archivo_proveedores, encoding='utf-8-sig')
            df_prov.columns = [col.strip() for col in df_prov.columns]
            df_prov = detectar_columnas(df_prov, ['RAZÓN SOCIAL', 'CONTACTO', 'TELEFONO', 'CORREO'])
            
            df_req = pd.read_excel(archivo_requerimientos, sheet_name='qryPOs_Temp')
            df_req.columns = df_req.columns.str.strip()
            
            # Clasificar
            df_req['CATEGORIA'] = df_req.apply(clasificar_requerimiento, axis=1)
            
            resultados = []
            barra_progreso = st.progress(0)
            
            for idx, row in df_req.iterrows():
                categoria = row['CATEGORIA']
                material = row.get('Nombre Material', 'N/A')
                prov_categoria = buscar_proveedores_categoria(categoria, df_prov)
                
                proveedores_info = []
                for _, prov in prov_categoria.iterrows():
                    info = {
                        'RUC': str(prov.get('RUC', '')),
                        'Razón Social': prov.get('RAZÓN SOCIAL', ''),
                        'Nombre Comercial': prov.get('NOMBRE COMERCIAL', ''),
                        'Contacto': prov.get('CONTACTO', ''),
                        'Teléfono': str(prov.get('TELEFONO', '')),
                        'Celular': str(prov.get('CELULAR', '')),
                        'Email': prov.get('CORREO', ''),
                        'Ciudad': prov.get('Ciudad OK', prov.get('REGION', '')),
                        'Región': prov.get('REGION', '')
                    }
                    proveedores_info.append(info)
                
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
                    'Num Proveedores': len(proveedores_info),
                    'Proveedores': ", ".join([p['Nombre Comercial'] for p in proveedores_info[:3]]) # Muestra los primeros 3
                })
                barra_progreso.progress((idx + 1) / len(df_req))
            
            df_detalle = pd.DataFrame(resultados)
            
            # Generar Excel en memoria
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df_detalle.to_excel(writer, sheet_name='01_ANALISIS_DETALLADO', index=False)
                
                # Hoja de proveedores locales prioritarios
                todos_provs = []
                for cat in df_req['CATEGORIA'].unique():
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
            
            st.success("✅ ¡Análisis completado con éxito!")
            
            # Botón de descarga
            st.download_button(
                label="📥 Descargar Reporte Excel",
                data=output.getvalue(),
                file_name=f"ANALISIS_PROVEEDORES_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            
            # Vista previa
            st.subheader("Vista previa del análisis (Primeros 5 ítems)")
            st.dataframe(df_detalle.head(), use_container_width=True)
            
        except Exception as e:
            st.error(f"❌ Error al procesar los archivos: {str(e)}")
            st.info("💡 Asegúrate de que el archivo Excel tenga una hoja llamada 'qryPOs_Temp' y que el CSV tenga las columnas esperadas.")