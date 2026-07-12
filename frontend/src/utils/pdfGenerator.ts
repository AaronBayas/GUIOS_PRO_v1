import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Evaluacion, AIRecomendacion } from '../types'
import { getImportanciaClass } from './guiosad.utils'

export const generatePDF = (evaluacion: Evaluacion, ai: AIRecomendacion | null) => {
  const doc = new jsPDF()
  
  // Colores corporativos (oficina)
  const primaryColor: [number, number, number] = [29, 78, 216] // Azul profesional
  const textDark: [number, number, number] = [30, 41, 59] // Gris oscuro
  const textLight: [number, number, number] = [100, 116, 139] // Gris medio

  // Logo / Cabecera
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...primaryColor)
  doc.text('GUIOSPRO', 20, 25)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...textLight)
  doc.text('Análisis de Adopción de Software de Código Abierto', 70, 23)

  // Línea separadora
  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(0.8)
  doc.line(20, 32, 190, 32)

  // SECCIÓN 1: Información
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...primaryColor)
  doc.text('INFORMACIÓN DEL SOFTWARE EVALUADO', 20, 45)

  doc.setFontSize(11)
  doc.setTextColor(...textDark)
  
  let currentY = 55

  // Nombre
  doc.setFont('helvetica', 'bold')
  doc.text('Nombre del Software:', 20, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(evaluacion.software_nombre, 65, currentY)
  
  currentY += 8

  // Descripción
  doc.setFont('helvetica', 'bold')
  doc.text('Descripción:', 20, currentY)
  doc.setFont('helvetica', 'normal')
  const descLines = doc.splitTextToSize(evaluacion.software_descripcion || 'N/A', 120)
  doc.text(descLines, 65, currentY)
  
  currentY += Math.max(8, descLines.length * 5 + 3)
  
  // Evaluador
  doc.setFont('helvetica', 'bold')
  doc.text('Evaluador:', 20, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(evaluacion.evaluador_nombre || 'N/A', 65, currentY)
  
  currentY += 8

  // Fecha
  doc.setFont('helvetica', 'bold')
  doc.text('Fecha de Evaluación:', 20, currentY)
  doc.setFont('helvetica', 'normal')
  const fecha = new Date(evaluacion.created_at || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(fecha, 65, currentY)

  let startY = currentY + 15

  // SECCIÓN 2: Resultados
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...primaryColor)
  doc.text('RESULTADOS DE LA EVALUACIÓN', 20, startY)
  
  const tableData = evaluacion.evaluacion_factores
    .filter(ef => ef.clasificacion_foda)
    .map(ef => [
      ef.factor.factor_name,
      ef.importancia_relativa || '-',
      ef.ponderacion_media !== null ? ef.ponderacion_media.toFixed(2) : '-',
      ef.alcance_override || ef.factor.tipo_impacto || '-',
      ef.clasificacion_foda || '-'
    ])

  autoTable(doc, {
    startY: startY + 5,
    head: [['Factor', 'Imp. Relativa', 'Ponderación', 'Alcance', 'FODA']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 4, textColor: textDark },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Colorear el texto de FODA sin re-dibujar la celda (evita letras borrosas)
      if (data.section === 'body' && data.column.index === 4) {
        const text = data.cell.raw as string
        if (text === 'Fortaleza') data.cell.styles.textColor = [21, 128, 61] // Verde
        if (text === 'Oportunidad') data.cell.styles.textColor = [29, 78, 216] // Azul
        if (text === 'Debilidad') data.cell.styles.textColor = [185, 28, 28] // Rojo
        if (text === 'Amenaza') data.cell.styles.textColor = [234, 88, 12] // Naranja
      }
    }
  })

  // @ts-ignore (propiedad expuesta por autotable)
  startY = doc.lastAutoTable.finalY + 15

  // SECCIÓN 3: Recomendación del sistema
  if (startY > 250) {
    doc.addPage()
    startY = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...primaryColor)
  doc.text('RECOMENDACIÓN DEL SISTEMA', 20, startY)

  // Caja de color de la recomendación
  const rec = evaluacion.recomendacion
  let boxColor: [number, number, number] = [226, 232, 240]
  let recText = 'Adopción No Recomendada'
  if (rec === 'A') { boxColor = [220, 252, 231]; recText = 'Adopción Recomendada' }
  if (rec === 'B') { boxColor = [254, 249, 195]; recText = 'Adopción Condicionada' }
  if (rec === 'C') { boxColor = [254, 226, 226] }

  const recommendationMsg = `Recomendación ${rec || 'N/A'}: ${recText}`
  
  doc.setFillColor(...boxColor)
  doc.setDrawColor(203, 213, 225) // Borde suave
  doc.setLineWidth(0.3)
  doc.roundedRect(20, startY + 5, 170, 20, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...textDark)
  doc.text(recommendationMsg, 25, startY + 17)

  startY += 35

  // SECCIÓN 4: Análisis Cualitativo (IA)
  if (ai && ai.respuesta_texto) {
    if (startY > 220) {
      doc.addPage()
      startY = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...primaryColor)
    doc.text('ANÁLISIS CUALITATIVO', 20, startY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...textDark)
    
    // Extraer DETALLE
    let textToPrint = ai.respuesta_texto
    const detalleMatch = ai.respuesta_texto.match(/<DETALLE>\s*([\s\S]*?)(?:<\/DETALLE>|$)/i)
    if (detalleMatch) {
      textToPrint = detalleMatch[1].trim()
    } else {
      // Si no hay <DETALLE>, intentar limpiar <RESUMEN> para que no se imprima en el PDF si es todo lo que hay
      textToPrint = textToPrint.replace(/<RESUMEN>[\s\S]*?(?:<\/RESUMEN>|<DETALLE>|$)/i, '').trim()
    }

    // Limpiar etiquetas XML que hayan podido quedar
    textToPrint = textToPrint.replace(/<\/?(?:RESUMEN|DETALLE)>/ig, '')

    // Limpiar markdown simple para el PDF
    textToPrint = textToPrint
      .replace(/## /g, '')
      .replace(/### /g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/_/g, '')
      
    const paragraphs = textToPrint.split(/\n+/).map(p => p.trim()).filter(Boolean)
    let currentY = startY + 10

    paragraphs.forEach(paragraph => {
      // Calcular dimensiones del párrafo para el salto de página
      const dimensions = doc.getTextDimensions(paragraph, { maxWidth: 170 })
      
      if (currentY + dimensions.h > 280) {
        doc.addPage()
        currentY = 20
      }
      
      doc.text(paragraph, 20, currentY, { maxWidth: 170, align: 'justify' })
      currentY += dimensions.h + 4 // Espaciado extra entre párrafos
    })
  }

  // Footer en todas las páginas
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Página ${i} de ${pageCount} - Generado por GUIOS PRO`, 105, 290, { align: 'center' })
  }

  doc.save(`Informe_GUIOSAD_${evaluacion.software_nombre.replace(/\s+/g, '_')}.pdf`)
}
