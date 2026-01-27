import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: any) => string;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function exportToPDF(
  title: string,
  columns: ExportColumn[],
  data: any[],
  filename: string,
  options?: {
    subtitle?: string;
    orientation?: "portrait" | "landscape";
    includeTimestamp?: boolean;
  }
) {
  const doc = new jsPDF({
    orientation: options?.orientation || "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(18);
  doc.setTextColor(59, 80, 104);
  doc.text(title, pageWidth / 2, 20, { align: "center" });

  if (options?.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(options.subtitle, pageWidth / 2, 28, { align: "center" });
  }

  if (options?.includeTimestamp !== false) {
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth / 2, options?.subtitle ? 34 : 28, { align: "center" });
  }

  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      if (col.format) return col.format(value);
      if (value === null || value === undefined) return "-";
      if (typeof value === "boolean") return value ? "Yes" : "No";
      return String(value);
    })
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: options?.subtitle ? 40 : 34,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 80, 104],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 247, 245],
    },
    columnStyles: columns.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width };
      }
      return acc;
    }, {} as Record<number, { cellWidth: number }>),
  });

  doc.save(`${filename}.pdf`);
}

export function exportSingleToPDF(
  title: string,
  sections: { label: string; value: string }[],
  filename: string,
  options?: {
    subtitle?: string;
  }
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 25;

  doc.setFontSize(18);
  doc.setTextColor(59, 80, 104);
  doc.text(title, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  if (options?.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(options.subtitle, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
  }

  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  sections.forEach((section) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.text(section.label, margin, yPos);
    yPos += 5;

    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    
    const lines = doc.splitTextToSize(section.value || "-", pageWidth - margin * 2);
    doc.text(lines, margin, yPos);
    yPos += lines.length * 5 + 8;
  });

  doc.save(`${filename}.pdf`);
}

export function exportToExcel(
  columns: ExportColumn[],
  data: any[],
  filename: string,
  sheetName?: string
) {
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      if (col.format) return col.format(value);
      if (value === null || value === undefined) return "";
      if (typeof value === "boolean") return value ? "Yes" : "No";
      return value;
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  const colWidths = columns.map((col) => ({
    wch: col.width ? col.width / 3 : Math.max(col.header.length, 15),
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Data");

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
