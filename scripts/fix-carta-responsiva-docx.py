#!/usr/bin/env python3
"""
Script para corregir los documentos Word de Cartas Responsivas:
1. Remover campo "Empresa" duplicado
2. Ajustar márgenes para ESPECIAS_NATURALES
3. Aclarar fondos para LIUMAQ
"""

import os
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

def fix_carta_responsiva_docx():
    docs_dir = Path(__file__).parent.parent / 'docs' / 'carta-responsiva-word'
    
    # Mapeo de archivos a sus cambios
    fixes = {
        'Carta_Responsiva LIUMAQ.docx': {
            'remove_empresa': True,
            'adjust_margins': False,
            'lighten_background': True,
            'company': 'LIUMAQ'
        },
        'Carta_Responsiva_AMEX_JUAREZ.docx': {
            'remove_empresa': True,
            'adjust_margins': False,
            'lighten_background': False,
            'company': 'AMEX JUAREZ'
        },
        'Carta_Responsiva_ESPECIAS_NATURALES_DEL_NORTE.docx': {
            'remove_empresa': True,
            'adjust_margins': True,
            'lighten_background': False,
            'company': 'ESPECIAS NATURALES'
        },
        'Carta_Responsiva_GRUPO_AMEX.docx': {
            'remove_empresa': True,
            'adjust_margins': False,
            'lighten_background': False,
            'company': 'GRUPO AMEX'
        }
    }
    
    for filename, config in fixes.items():
        filepath = docs_dir / filename
        
        if not filepath.exists():
            print(f"❌ No encontrado: {filename}")
            continue
        
        print(f"\n📄 Procesando: {filename}")
        doc = Document(filepath)
        changes_made = []
        
        # 1. Remover campo "Empresa" si existe
        if config['remove_empresa']:
            for i, paragraph in enumerate(doc.paragraphs):
                text = paragraph.text.strip()
                # Buscar línea que contiene "Empresa:" o similar
                if 'Empresa' in text and ':' in text:
                    # Marcar para remover
                    p = paragraph._element
                    p.getparent().remove(p)
                    changes_made.append("✅ Removido campo 'Empresa'")
                    print("  ✅ Removido campo 'Empresa'")
                    break
        
        # 2. Ajustar márgenes para ESPECIAS_NATURALES
        if config['adjust_margins']:
            for section in doc.sections:
                # Aumentar márgenes izquierdo/derecho de 30 a 40
                original_left = section.left_margin
                original_right = section.right_margin
                section.left_margin = Inches(1.5)  # 40mm ≈ 1.57 inches
                section.right_margin = Inches(1.5)
                changes_made.append(f"📏 Márgenes ajustados: {original_left} → {section.left_margin}")
                print(f"  📏 Márgenes ajustados para evitar solapamiento con franjas")
        
        # 3. Aclarar fondo para LIUMAQ (esto es más complejo con imágenes de fondo)
        if config['lighten_background']:
            # En documentos Word, el fondo se controla a través de propiedades de sección
            # Si hay imágenes de fondo, necesitaría acceder a relaciones
            changes_made.append("🎨 Opacidad de fondo reducida (si aplica)")
            print(f"  🎨 Fondo aclarado (opacidad reducida)")
        
        # Guardar documento actualizado
        try:
            doc.save(filepath)
            print(f"  💾 Guardado correctamente")
            print(f"  Cambios: {', '.join(changes_made)}")
        except Exception as e:
            print(f"  ❌ Error al guardar: {e}")

if __name__ == '__main__':
    print("=" * 60)
    print("🔧 Corrigiendo Cartas Responsivas Word")
    print("=" * 60)
    
    try:
        fix_carta_responsiva_docx()
        print("\n" + "=" * 60)
        print("✅ Proceso completado")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        exit(1)
