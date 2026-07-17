import { toPng, toJpeg } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { parseTimeToSeconds, formatSeconds } from '../components/layout/TimelinePanel';
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

  // 2. Crop calculation bounds - Custom calculation to prevent any elements from being cut off
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(node => {
    const x = node.position.x;
    const y = node.position.y;
    const w = node.measured?.width || Number(node.width) || Number(node.style?.width) || 150;
    const h = node.measured?.height || Number(node.height) || Number(node.style?.height) || 80;
    
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  });

  if (nodes.length === 0) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const bounds = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };

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
    pixelRatio: scale, // multiplier scale
    cacheBust: true,
    fontEmbedCSS: '',
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

// Generates combined export with legend, timeline, and metrics for PNG/JPG
export const getCombinedExportCanvas = async (
  nodes: any[],
  _edges: any[],
  projectName: string,
  author: string,
  metrics: {
    totalVa: number;
    totalNva: number;
    totalLeadTime: number;
    pce: number;
    processesCount: number;
    inventoriesCount: number;
    kaizensCount: number;
  },
  scale: number = 2
): Promise<string> => {
  const canvasImgData = await captureCanvas(nodes, scale, 'png');
  if (!canvasImgData) return '';

  return new Promise((resolve) => {
    const img = new Image();
    img.src = canvasImgData;
    img.onload = () => {
      const bannerHeight = 220 * scale; // Banner height
      const width = img.width;
      const height = img.height + bannerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(canvasImgData);
        return;
      }

      const isDark = document.documentElement.classList.contains('dark');
      const bgStyle = isDark ? '#0f172a' : '#ffffff';
      const textStyle = isDark ? '#f8fafc' : '#0f172a';
      const borderStyle = isDark ? '#334155' : '#e2e8f0';
      const labelStyle = isDark ? '#94a3b8' : '#64748b';

      // Background
      ctx.fillStyle = bgStyle;
      ctx.fillRect(0, 0, width, height);

      // Draw VSM viewport
      ctx.drawImage(img, 0, 0);

      // Divider line
      ctx.strokeStyle = borderStyle;
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(0, img.height);
      ctx.lineTo(width, img.height);
      ctx.stroke();

      // Project Info
      const xStart = 20 * scale;
      const yStart = img.height + 25 * scale;

      ctx.fillStyle = textStyle;
      ctx.font = `bold ${14 * scale}px sans-serif`;
      ctx.fillText(projectName, xStart, yStart);
      
      ctx.fillStyle = labelStyle;
      ctx.font = `${10 * scale}px sans-serif`;
      ctx.fillText(`Autor: ${author || 'Lean Expert'}  |  Fecha: ${new Date().toLocaleDateString('es-ES')}`, xStart, yStart + 16 * scale);

      // Metrics Block
      const xMetrics = xStart;
      const yMetrics = yStart + 35 * scale;
      
      ctx.fillStyle = textStyle;
      ctx.font = `bold ${11 * scale}px sans-serif`;
      ctx.fillText('MÉTRICAS CLAVE LEAN', xMetrics, yMetrics);

      ctx.fillStyle = textStyle;
      ctx.font = `${10 * scale}px sans-serif`;
      
      ctx.fillText(`Lead Time (LT): ${formatSeconds(metrics.totalLeadTime)}`, xMetrics, yMetrics + 15 * scale);
      ctx.fillText(`Tiempo Valor Agregado (VA): ${formatSeconds(metrics.totalVa)}`, xMetrics, yMetrics + 28 * scale);
      ctx.fillText(`Eficiencia de Proceso (PCE): ${metrics.pce.toFixed(2)}%`, xMetrics, yMetrics + 41 * scale);
      ctx.fillText(`Elementos: ${metrics.processesCount} Proc / ${metrics.inventoriesCount} Inv / ${metrics.kaizensCount} Kaiz`, xMetrics, yMetrics + 54 * scale);

      // Legend
      const xLegend = width / 2.6;
      const yLegend = yStart;

      ctx.fillStyle = textStyle;
      ctx.font = `bold ${11 * scale}px sans-serif`;
      ctx.fillText('LEYENDA DE SÍMBOLOS VSM', xLegend, yLegend);

      const drawSymbolText = (x: number, y: number, color: string, text: string, isLine: boolean = false, lineStyle: string = 'solid') => {
        if (isLine) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 * scale;
          if (lineStyle === 'dashed') {
            ctx.setLineDash([4 * scale, 3 * scale]);
          } else if (lineStyle === 'dotted') {
            ctx.setLineDash([2 * scale, 2 * scale]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.beginPath();
          ctx.moveTo(x, y - 4 * scale);
          ctx.lineTo(x + 20 * scale, y - 4 * scale);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(x, y - 8 * scale, 10 * scale, 10 * scale);
        }

        ctx.fillStyle = textStyle;
        ctx.font = `${9 * scale}px sans-serif`;
        ctx.fillText(text, x + (isLine ? 25 * scale : 15 * scale), y);
      };

      drawSymbolText(xLegend, yLegend + 20 * scale, '#3b82f6', 'Proceso');
      drawSymbolText(xLegend, yLegend + 35 * scale, '#f59e0b', 'Inventario');
      drawSymbolText(xLegend, yLegend + 50 * scale, '#ef4444', 'Kaizen Burst (Abierto)');
      drawSymbolText(xLegend, yLegend + 65 * scale, '#22c55e', 'Kaizen Cerrado (Implementado)');

      drawSymbolText(xLegend + 155 * scale, yLegend + 20 * scale, isDark ? '#e2e8f0' : '#1f2937', 'Flujo Físico', true);
      drawSymbolText(xLegend + 155 * scale, yLegend + 35 * scale, '#2563eb', 'Flujo Info Manual', true, 'dotted');
      drawSymbolText(xLegend + 155 * scale, yLegend + 50 * scale, '#a855f7', 'Flujo Info Sistema', true, 'dashed');

      // Timeline Steps Summary
      const xTimeline = width / 1.35;
      const yTimeline = yStart;

      ctx.fillStyle = textStyle;
      ctx.font = `bold ${11 * scale}px sans-serif`;
      ctx.fillText('LÍNEA DE TIEMPO (TIMELINE)', xTimeline, yTimeline);

      const boxWidth = 20 * scale;
      const boxHeight = 10 * scale;
      let curX = xTimeline;
      let curY = yTimeline + 30 * scale;

      const procNodes = nodes
        .filter(n => n.type === 'process' || n.type === 'inventory')
        .sort((a, b) => a.position.x - b.position.x)
        .slice(0, 7);

      if (procNodes.length > 0) {
        ctx.strokeStyle = textStyle;
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(curX, curY + boxHeight);

        procNodes.forEach((node) => {
          const isProcess = node.type === 'process';
          const nodeData = node.data as any;
          
          if (isProcess) {
            ctx.lineTo(curX, curY + boxHeight);
            ctx.lineTo(curX + boxWidth, curY + boxHeight);
            
            ctx.fillStyle = '#10b981';
            ctx.font = `${7 * scale}px sans-serif`;
            ctx.fillText(nodeData.ct || '0s', curX + 2 * scale, curY + boxHeight - 3 * scale);
          } else {
            ctx.lineTo(curX, curY);
            ctx.lineTo(curX + boxWidth, curY);
            
            ctx.fillStyle = '#f59e0b';
            ctx.font = `${7 * scale}px sans-serif`;
            ctx.fillText(nodeData.time || '0d', curX + 2 * scale, curY + boxHeight + 8 * scale);
          }
          curX += boxWidth;
        });
        
        ctx.lineTo(curX, curY + boxHeight);
        ctx.stroke();
      } else {
        ctx.fillStyle = labelStyle;
        ctx.font = `italic ${9 * scale}px sans-serif`;
        ctx.fillText('Sin datos de tiempo', xTimeline, yTimeline + 25 * scale);
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve(canvasImgData);
    };
  });
};

// Export to PNG Image
export const exportToPng = async (
  projectName: string, 
  nodes: any[], 
  edges: any[],
  quality: 'standard' | 'high' | 'print',
  projectId?: string,
  saveMode: 'download' | 'supabase' | 'both' = 'download',
  author: string = 'Lean Expert'
): Promise<string | null> => {
  const scale = quality === 'print' ? 3 : quality === 'high' ? 2 : 1;

  let totalVa = 0;
  let totalNva = 0;
  let processesCount = 0;
  let inventoriesCount = 0;
  let kaizensCount = 0;

  nodes.forEach(node => {
    const nodeData = node.data as any;
    if (node.type === 'process') {
      processesCount++;
      totalVa += parseTimeToSeconds(nodeData.ct || '0s', 's');
    } else if (node.type === 'inventory') {
      inventoriesCount++;
      totalNva += parseTimeToSeconds(nodeData.time || '0d', 'd');
    } else if (node.type === 'kaizen' || node.type === 'kaizen_implemented') {
      kaizensCount++;
    }
  });

  const totalLeadTime = totalVa + totalNva;
  const pce = totalLeadTime > 0 ? (totalVa / totalLeadTime) * 100 : 0;

  const metrics = {
    totalVa,
    totalNva,
    totalLeadTime,
    pce,
    processesCount,
    inventoriesCount,
    kaizensCount
  };

  const dataUrl = await getCombinedExportCanvas(nodes, edges, projectName, author, metrics, scale);
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
  edges: any[],
  quality: 'standard' | 'high' | 'print',
  projectId?: string,
  saveMode: 'download' | 'supabase' | 'both' = 'download',
  author: string = 'Lean Expert'
): Promise<string | null> => {
  const scale = quality === 'print' ? 3 : quality === 'high' ? 2 : 1;

  let totalVa = 0;
  let totalNva = 0;
  let processesCount = 0;
  let inventoriesCount = 0;
  let kaizensCount = 0;

  nodes.forEach(node => {
    const nodeData = node.data as any;
    if (node.type === 'process') {
      processesCount++;
      totalVa += parseTimeToSeconds(nodeData.ct || '0s', 's');
    } else if (node.type === 'inventory') {
      inventoriesCount++;
      totalNva += parseTimeToSeconds(nodeData.time || '0d', 'd');
    } else if (node.type === 'kaizen' || node.type === 'kaizen_implemented') {
      kaizensCount++;
    }
  });

  const totalLeadTime = totalVa + totalNva;
  const pce = totalLeadTime > 0 ? (totalVa / totalLeadTime) * 100 : 0;

  const metrics = {
    totalVa,
    totalNva,
    totalLeadTime,
    pce,
    processesCount,
    inventoriesCount,
    kaizensCount
  };

  const dataUrl = await getCombinedExportCanvas(nodes, edges, projectName, author, metrics, scale);
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

  if ((saveMode === 'supabase' || saveMode === 'both') && project.id) {
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

// Export PDF (4 Pages: Cover -> VSM Image -> Detailed Metrics Layout -> Timeline & Legend)
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
      // Calculate bounding box bounds to prevent cut-offs
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(node => {
        const x = node.position.x;
        const y = node.position.y;
        const w = node.measured?.width || Number(node.width) || Number(node.style?.width) || 150;
        const h = node.measured?.height || Number(node.height) || Number(node.style?.height) || 80;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
      });
      boundsWidth = maxX - minX;
      boundsHeight = maxY - minY;
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

  // Page index footer page 3
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Página 3 de 4 - Reporte de Métricas Lean', 12, height - 8);

  // PAGE 4: Timeline and Legend
  doc.addPage();
  
  // Header bar page 4
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, width, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VSM STUDIO - LEYENDA Y LÍNEA DE TIEMPO DETALLADA', 12, 11);

  // Left column: Legend
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LEYENDA DE SÍMBOLOS Y CONEXIONES', 12, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let yLeg = 36;

  const drawPdfLegendRow = (text: string, description: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(text, 14, yLeg);
    doc.setFont('helvetica', 'normal');
    doc.text(description, 70, yLeg);
    yLeg += 7;
  };

  drawPdfLegendRow('Proceso (Rectángulo Azul/Gris):', 'Representa una operación donde se agrega valor al producto.');
  drawPdfLegendRow('Inventario (Triángulo Amarillo):', 'Representa almacenamiento de materiales, genera tiempo de espera (NVA).');
  drawPdfLegendRow('Kaizen Burst (Destello Rojo):', 'Representa una oportunidad de mejora identificada en el flujo.');
  drawPdfLegendRow('Kaizen Cerrado (Destello Verde):', 'Representa un evento Kaizen ya implementado y cerrado.');
  drawPdfLegendRow('Flujo Físico (Línea Continua):', 'Representa el traslado físico de materiales o productos.');
  drawPdfLegendRow('Flujo de Información Manual:', 'Representa el traspaso de información en papel, verbal o llamadas.');
  drawPdfLegendRow('Flujo de Información Electrónico:', 'Representa transmisión digital (ERP, e-mail, EDI, sistemas).');

  // Right column: Detailed Timeline list
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PASOS CRONOLÓGICOS DEL FLUJO', 145, 28);

  const timelineSteps = project.nodes
    .filter((n: any) => n.type === 'process' || n.type === 'inventory')
    .sort((a: any, b: any) => a.position.x - b.position.x);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  let yTime = 36;
  
  if (timelineSteps.length > 0) {
    timelineSteps.slice(0, 16).forEach((node: any, idx: number) => {
      const isProcess = node.type === 'process';
      const label = node.data.label || (isProcess ? 'Proceso' : 'Inventario');
      const timeVal = isProcess ? (node.data.ct || '0s') : (node.data.time || '0d');
      const category = isProcess ? 'VALOR AGREGADO (VA)' : 'SIN VALOR AGREGADO (NVA)';
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${label}:`, 147, yTime);
      doc.setFont('helvetica', 'normal');
      doc.text(`${timeVal} - ${category}`, 200, yTime);
      yTime += 5.5;
    });
  } else {
    doc.text('No hay procesos ni inventarios en el lienzo.', 147, 36);
  }

  // Page index footer page 4
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Página 4 de 4 - Documentación Lean Manufacturing', 12, height - 8);

  const filename = `${project.name.replace(/\s+/g, '_')}_Reporte.pdf`;

  if (saveMode === 'download' || saveMode === 'both') {
    doc.save(filename);
  }

  if ((saveMode === 'supabase' || saveMode === 'both') && project.id) {
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
