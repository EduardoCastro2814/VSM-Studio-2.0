import { toPng, toJpeg } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getNodesBounds } from '@xyflow/react';
import { formatSeconds } from '../components/layout/TimelinePanel';
import { db } from '../lib/supabase';

// Helper to pause execution for visual rendering stability
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// CORS converter to Base64
export const convertUrlToBase64 = async (url: string): Promise<string> => {
  if (!url || url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn(`CORS: No se pudo convertir la imagen ${url} a Base64.`, err);
    return url;
  }
};

// Ingests canvas bounds and converts to data url
export const captureCanvas = async (
  nodes: any[],
  scale: number = 2,
  format: 'png' | 'jpeg' = 'png'
): Promise<string> => {
  const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewportElement) {
    console.error('Lienzo: No se encontró el contenedor .react-flow__viewport');
    return '';
  }

  // 1. Brief timeout to let shapes, text, and SVG rendering cycles complete
  await wait(450);

  // 2. Crop calculation bounds
  let bounds = { x: 0, y: 0, width: 800, height: 600 };
  if (nodes.length > 0) {
    bounds = getNodesBounds(nodes);
  }

  const pad = 55; // 55px padding margin around the elements
  const targetWidth = bounds.width + pad * 2;
  const targetHeight = bounds.height + pad * 2;

  // 3. Inject markers definition into the viewport element temporarily to preserve arrows
  const markersSvg = document.getElementById('vsm-markers-svg');
  let clonedMarkers: Node | null = null;
  if (markersSvg && viewportElement) {
    clonedMarkers = markersSvg.cloneNode(true);
    viewportElement.appendChild(clonedMarkers);
  }

  // 4. Viewport centering coordinates transformation
  const options = {
    width: targetWidth,
    height: targetHeight,
    style: {
      width: `${targetWidth}px`,
      height: `${targetHeight}px`,
      transform: `translate(${-bounds.x + pad}px, ${-bounds.y + pad}px) scale(1)`,
      transformOrigin: 'top left',
    },
    backgroundColor: document.documentElement.classList.contains('dark') ? '#090d16' : '#ffffff',
    pixelRatio: scale, // multiplier scale (1 = standard, 2 = high, 3 = print)
    cacheBust: true,
    fontEmbedCSS: '', // Prevents font download issues (which usually trigger CORS / fetch errors)
  };

  try {
    let dataUrl = '';
    if (format === 'jpeg') {
      dataUrl = await toJpeg(viewportElement, options);
    } else {
      dataUrl = await toPng(viewportElement, options);
    }

    // Clean up temporary markers injection
    if (clonedMarkers && viewportElement.contains(clonedMarkers)) {
      viewportElement.removeChild(clonedMarkers);
    }

    return dataUrl;
  } catch (err) {
    console.warn('Error capturando el lienzo con html-to-image. Intentando fallback con html2canvas...', err);
    
    // Clean up temporary markers injection for safety
    if (clonedMarkers && viewportElement.contains(clonedMarkers)) {
      viewportElement.removeChild(clonedMarkers);
    }

    // Fallback: html2canvas
    try {
      const canvas = await html2canvas(viewportElement, {
        width: targetWidth,
        height: targetHeight,
        scale: scale,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#090d16' : '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png');
    } catch (html2canvasErr) {
      console.error('Error fallback con html2canvas:', html2canvasErr);
      return '';
    }
  }
};

// Export to PNG Image
export const exportToPng = async (
  projectName: string, 
  nodes: any[], 
  quality: 'standard' | 'high' | 'print',
  projectId?: string,
  saveMode: 'download' | 'supabase' | 'both' = 'download'
): Promise<string | null> => {
  const scale = quality === 'print' ? 3 : quality === 'high' ? 2 : 1;
  const dataUrl = await captureCanvas(nodes, scale, 'png');
  if (!dataUrl) return null;

  const filename = `${projectName.replace(/\s+/g, '_')}_VSM_${quality}.png`;

  if (saveMode === 'download' || saveMode === 'both') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  if ((saveMode === 'supabase' || saveMode === 'both') && projectId) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const url = await db.uploadAsset(projectId, blob, filename, 'image/png');
      return url;
    } catch (err) {
      console.error('Error uploading PNG to Supabase:', err);
    }
  }
  return null;
};

// Export to JPG Image
export const exportToJpg = async (
  projectName: string, 
  nodes: any[], 
  quality: 'standard' | 'high' | 'print',
  projectId?: string,
  saveMode: 'download' | 'supabase' | 'both' = 'download'
): Promise<string | null> => {
  const scale = quality === 'print' ? 3 : quality === 'high' ? 2 : 1;
  const dataUrl = await captureCanvas(nodes, scale, 'jpeg');
  if (!dataUrl) return null;

  const filename = `${projectName.replace(/\s+/g, '_')}_VSM_${quality}.jpg`;

  if (saveMode === 'download' || saveMode === 'both') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  if ((saveMode === 'supabase' || saveMode === 'both') && projectId) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const url = await db.uploadAsset(projectId, blob, filename, 'image/jpeg');
      return url;
    } catch (err) {
      console.error('Error uploading JPG to Supabase:', err);
    }
  }
  return null;
};

// Export to editable JSON
export const exportToJson = async (
  project: any,
  saveMode: 'download' | 'supabase' | 'both' = 'download'
): Promise<string | null> => {
  const jsonData = JSON.stringify(project, null, 2);
  const filename = `${project.name.replace(/\s+/g, '_')}_VSM.json`;

  if (saveMode === 'download' || saveMode === 'both') {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonData);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  if (saveMode === 'supabase' || saveMode === 'both') {
    try {
      const jsonBlob = new Blob([jsonData], { type: 'application/json' });
      const url = await db.uploadAsset(project.id, jsonBlob, filename, 'application/json');
      return url;
    } catch (err) {
      console.error('Error uploading JSON to Supabase:', err);
    }
  }
  return null;
};

// Export PDF (3 Pages: Cover -> VSM Image -> Detailed Metrics Layout)
export const exportToPdf = async (
  project: { name: string; author: string; nodes: any[]; edges: any[]; id: string },
  metrics: {
    totalVa: number;
    totalNva: number;
    totalLeadTime: number;
    pce: number;
    efficiency: number;
    processesCount: number;
    inventoriesCount: number;
    kaizensCount: number;
  },
  nodes: any[],
  scale: number = 2,
  saveMode: 'download' | 'supabase' | 'both' = 'download'
): Promise<string | null> => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // PAGE 1: Cover Page
  doc.setFillColor(31, 41, 55); // Corporate Dark Slate
  doc.rect(0, 0, width, height, 'F');

  // Decorative blue border accent
  doc.setFillColor(37, 99, 235); // VSM Brand Blue
  doc.rect(0, 0, 15, height, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('VSM STUDIO', 35, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(156, 163, 175); // Slate 400
  doc.text('Reporte de Mapa de Flujo de Valor (Value Stream Mapping)', 35, 72);

  // Line Divider
  doc.setDrawColor(55, 65, 81);
  doc.setLineWidth(1);
  doc.line(35, 85, 250, 85);

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(`Proyecto: ${project.name}`, 35, 105);

  doc.setFontSize(12);
  doc.setTextColor(209, 213, 219);
  doc.text(`Autor: ${project.author || 'Lean Expert'}`, 35, 125);
  doc.text(`Fecha de Emisión: ${dateStr}`, 35, 133);

  // Cover Footer
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Generado por VSM Studio - Software Profesional de Optimización Lean', 35, 185);

  // PAGE 2: Visual VSM Rendered Canvas
  doc.addPage();
  
  // Header bar page 2
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, width, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VSM STUDIO - MAPA DE FLUJO DE VALOR', 12, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Proyecto: ${project.name}`, width - 80, 11);

  // Capture canvas
  const canvasImg = await captureCanvas(nodes, scale, 'png');
  if (canvasImg) {
    let boundsWidth = 800;
    let boundsHeight = 600;
    if (nodes.length > 0) {
      const bounds = getNodesBounds(nodes);
      boundsWidth = bounds.width;
      boundsHeight = bounds.height;
    }
    const boundsAspectRatio = boundsWidth / boundsHeight;

    const maxWidth = width - 24; // max width margin (273mm)
    const maxHeight = height - 32; // max height margin (160mm)

    let imgWidth = maxWidth;
    let imgHeight = maxWidth / boundsAspectRatio;

    if (imgHeight > maxHeight) {
      imgHeight = maxHeight;
      imgWidth = maxHeight * boundsAspectRatio;
    }

    const imgX = (width - imgWidth) / 2;
    const imgY = 24 + (maxHeight - imgHeight) / 2;

    doc.addImage(canvasImg, 'PNG', imgX, imgY, imgWidth, imgHeight);
  }

  // PAGE 3: Resume KPIs and Data Summaries
  doc.addPage();
  
  // Header bar page 3
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, width, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VSM STUDIO - ANÁLISIS DE INDICADORES LEAN', 12, 11);

  doc.setTextColor(17, 24, 39); // Gray Text
  
  // KPI Metrics panel
  doc.setFillColor(243, 244, 246);
  doc.rect(12, 28, width - 24, 38, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RESUMEN DE MÉTRICAS GENERALES', 18, 36);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Tiempo de Ciclo de Entrega (Lead Time): ${formatSeconds(metrics.totalLeadTime)}`, 18, 44);
  doc.text(`Tiempo de Valor Agregado (Process Time): ${formatSeconds(metrics.totalVa)}`, 18, 50);
  doc.text(`Tiempo de No Valor Agregado (Wait Time): ${formatSeconds(metrics.totalNva)}`, 18, 56);
  
  doc.text(`Procesos Totales: ${metrics.processesCount}`, 145, 44);
  doc.text(`Inventarios Totales: ${metrics.inventoriesCount}`, 145, 50);
  doc.text(`Eventos Kaizen: ${metrics.kaizensCount}`, 145, 56);

  doc.setFont('helvetica', 'bold');
  doc.text(`Eficiencia del Ciclo del Proceso (PCE): ${metrics.pce.toFixed(2)}%`, 215, 44);
  doc.text(`Ratio de Eficiencia (VA / LT): ${(metrics.efficiency * 100).toFixed(2)}%`, 215, 50);

  // Table process headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE PROCESOS DETECTADOS', 12, 78);

  doc.setFillColor(229, 231, 235);
  doc.rect(12, 83, width - 24, 6, 'F');
  doc.setFontSize(8);
  doc.text('Nombre del Proceso', 16, 87);
  doc.text('Tiempo de Ciclo (C/T)', 85, 87);
  doc.text('Tiempo de Cambio (C/O)', 130, 87);
  doc.text('Uptime %', 175, 87);
  doc.text('Scrap %', 215, 87);
  doc.text('OEE %', 255, 87);

  const procNodes = project.nodes
    .filter((n: any) => n.type === 'process')
    .sort((a: any, b: any) => a.position.x - b.position.x);

  doc.setFont('helvetica', 'normal');
  let yOffset = 93;
  procNodes.slice(0, 8).forEach((node: any) => {
    doc.text(node.data.label || 'Proceso', 16, yOffset);
    doc.text(String(node.data.ct || '0s'), 85, yOffset);
    doc.text(String(node.data.co || '0s'), 130, yOffset);
    doc.text(`${node.data.uptime || '100'}%`, 175, yOffset);
    doc.text(`${node.data.scrap || '0'}%`, 215, yOffset);
    doc.text(`${node.data.oee || '100'}%`, 255, yOffset);
    
    doc.setDrawColor(243, 244, 246);
    doc.line(12, yOffset + 2, width - 12, yOffset + 2);
    yOffset += 6;
  });

  // Table inventory headers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INVENTARIOS REGISTRADOS', 12, 153);

  doc.setFillColor(229, 231, 235);
  doc.rect(12, 158, width - 24, 6, 'F');
  doc.setFontSize(8);
  doc.text('Identificador / Ubicación', 16, 162);
  doc.text('Cantidad Registrada (unidades)', 110, 162);
  doc.text('Tiempo Equivalente de Espera', 210, 162);

  const invNodes = project.nodes
    .filter((n: any) => n.type === 'inventory')
    .sort((a: any, b: any) => a.position.x - b.position.x);

  doc.setFont('helvetica', 'normal');
  let yOffsetInv = 168;
  invNodes.slice(0, 4).forEach((node: any, idx: number) => {
    doc.text(`Inventario #${idx + 1}`, 16, yOffsetInv);
    doc.text(`${Number(node.data.quantity || 0).toLocaleString()} uds`, 110, yOffsetInv);
    doc.text(String(node.data.time || '0d'), 210, yOffsetInv);
    
    doc.setDrawColor(243, 244, 246);
    doc.line(12, yOffsetInv + 2, width - 12, yOffsetInv + 2);
    yOffsetInv += 6;
  });

  // Page index footer page 3
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Página 3 de 3 - Reporte de Métricas Lean', 12, height - 8);

  const filename = `${project.name.replace(/\s+/g, '_')}_Reporte.pdf`;

  if (saveMode === 'download' || saveMode === 'both') {
    doc.save(filename);
  }

  if (saveMode === 'supabase' || saveMode === 'both') {
    try {
      const pdfBlob = doc.output('blob');
      const url = await db.uploadAsset(project.id, pdfBlob, filename, 'application/pdf');
      return url;
    } catch (err) {
      console.error('Error uploading PDF to Supabase:', err);
    }
  }

  return null;
};
