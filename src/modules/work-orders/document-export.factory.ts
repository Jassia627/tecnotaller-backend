/**
 * ============================================================================
 * PATRÓN DE DISEÑO CREACIONAL: ABSTRACT FACTORY (Fábrica Abstracta)
 * Dominio: TecnoTaller - Familias de Generación y Exportación de Documentos Técnicos
 * ============================================================================
 * Propósito: Proveer una interfaz para crear familias de documentos técnicos
 * relacionados (Comprobante de Recepción, Informe Técnico de Diagnóstico y 
 * Certificado de Garantía) sin acoplar el código a un formato específico
 * (PDF/Impresión, CSV/Hojas de cálculo o JSON estructurado).
 */

// ============================================================================
// DTOs y Datos de Entrada para los Documentos
// ============================================================================
export interface ExportResult {
  filename: string;
  mimeType: string;
  content: string;
}

export interface WorkOrderReceiptData {
  guideNumber: string;
  customerName: string;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial: string;
  problemDescription: string;
  receivedAt: string;
  estimatedCost: number;
}

export interface DiagnosticReportData {
  guideNumber: string;
  technicianName: string;
  findings: string;
  partsReplaced: string[];
  laborDurationMinutes: number;
  finalPrice: number;
}

export interface WarrantyCertificateData {
  guideNumber: string;
  customerName: string;
  warrantyDays: number;
  startDate: string;
  terms: string;
}

// ============================================================================
// 1. PRODUCTOS ABSTRACTOS (Lado Izquierdo del Diagrama)
// ============================================================================

/**
 * Producto Abstracto A: Comprobante de Recepción / Ticket de entrega
 */
export interface IWorkOrderReceiptExporter {
  exportReceipt(data: WorkOrderReceiptData): ExportResult;
}

/**
 * Producto Abstracto B: Informe Técnico de Diagnóstico y Reparación
 */
export interface IDiagnosticReportExporter {
  exportDiagnostic(data: DiagnosticReportData): ExportResult;
}

/**
 * Producto Abstracto C: Póliza o Certificado Legal de Garantía
 */
export interface IWarrantyCertificateExporter {
  exportWarranty(data: WarrantyCertificateData): ExportResult;
}

// ============================================================================
// 2. PRODUCTOS CONCRETOS POR FAMILIA
// ============================================================================

// ----------------------------------------------------------------------------
// FAMILIA 1: Formato PDF / HTML para Impresión Física
// ----------------------------------------------------------------------------
export class PdfWorkOrderReceiptExporter implements IWorkOrderReceiptExporter {
  exportReceipt(data: WorkOrderReceiptData): ExportResult {
    return {
      filename: `ticket-${data.guideNumber}.pdf`,
      mimeType: 'application/pdf',
      content: `[PDF - TICKET DE RECEPCIÓN]\nGuía: ${data.guideNumber}\nCliente: ${data.customerName}\nEquipo: ${data.deviceBrand} ${data.deviceModel} (S/N: ${data.deviceSerial})\nFalla: ${data.problemDescription}\nTotal Estimado: $${data.estimatedCost.toFixed(2)}`,
    };
  }
}

export class PdfDiagnosticReportExporter implements IDiagnosticReportExporter {
  exportDiagnostic(data: DiagnosticReportData): ExportResult {
    return {
      filename: `diagnostico-${data.guideNumber}.pdf`,
      mimeType: 'application/pdf',
      content: `[PDF - INFORME TÉCNICO]\nOrden: ${data.guideNumber}\nTécnico: ${data.technicianName}\nHallazgos: ${data.findings}\nRepuestos: ${data.partsReplaced.join(', ') || 'Ninguno'}\nTiempo: ${data.laborDurationMinutes} min\nPrecio Final: $${data.finalPrice.toFixed(2)}`,
    };
  }
}

export class PdfWarrantyCertificateExporter implements IWarrantyCertificateExporter {
  exportWarranty(data: WarrantyCertificateData): ExportResult {
    return {
      filename: `garantia-${data.guideNumber}.pdf`,
      mimeType: 'application/pdf',
      content: `[PDF - CERTIFICADO DE GARANTÍA]\nGuía: ${data.guideNumber}\nBeneficiario: ${data.customerName}\nVigencia: ${data.warrantyDays} días desde ${data.startDate}\nTérminos: ${data.terms}`,
    };
  }
}

// ----------------------------------------------------------------------------
// FAMILIA 2: Formato CSV / Excel para Contabilidad y Auditoría
// ----------------------------------------------------------------------------
export class CsvWorkOrderReceiptExporter implements IWorkOrderReceiptExporter {
  exportReceipt(data: WorkOrderReceiptData): ExportResult {
    return {
      filename: `ticket-${data.guideNumber}.csv`,
      mimeType: 'text/csv',
      content: `guia,cliente,marca,modelo,serial,falla,costo_estimado\n"${data.guideNumber}","${data.customerName}","${data.deviceBrand}","${data.deviceModel}","${data.deviceSerial}","${data.problemDescription}",${data.estimatedCost}`,
    };
  }
}

export class CsvDiagnosticReportExporter implements IDiagnosticReportExporter {
  exportDiagnostic(data: DiagnosticReportData): ExportResult {
    return {
      filename: `diagnostico-${data.guideNumber}.csv`,
      mimeType: 'text/csv',
      content: `guia,tecnico,repuestos_usados,minutos_labor,precio_final\n"${data.guideNumber}","${data.technicianName}","${data.partsReplaced.join(';')}",${data.laborDurationMinutes},${data.finalPrice}`,
    };
  }
}

export class CsvWarrantyCertificateExporter implements IWarrantyCertificateExporter {
  exportWarranty(data: WarrantyCertificateData): ExportResult {
    return {
      filename: `garantia-${data.guideNumber}.csv`,
      mimeType: 'text/csv',
      content: `guia,cliente,dias_vigencia,fecha_inicio\n"${data.guideNumber}","${data.customerName}",${data.warrantyDays},"${data.startDate}"`,
    };
  }
}

// ----------------------------------------------------------------------------
// FAMILIA 3: Formato JSON Estructurado para APIs / Integraciones
// ----------------------------------------------------------------------------
export class JsonWorkOrderReceiptExporter implements IWorkOrderReceiptExporter {
  exportReceipt(data: WorkOrderReceiptData): ExportResult {
    return {
      filename: `ticket-${data.guideNumber}.json`,
      mimeType: 'application/json',
      content: JSON.stringify({ documentType: 'RECEIPT', ...data }, null, 2),
    };
  }
}

export class JsonDiagnosticReportExporter implements IDiagnosticReportExporter {
  exportDiagnostic(data: DiagnosticReportData): ExportResult {
    return {
      filename: `diagnostico-${data.guideNumber}.json`,
      mimeType: 'application/json',
      content: JSON.stringify({ documentType: 'DIAGNOSTIC_REPORT', ...data }, null, 2),
    };
  }
}

export class JsonWarrantyCertificateExporter implements IWarrantyCertificateExporter {
  exportWarranty(data: WarrantyCertificateData): ExportResult {
    return {
      filename: `garantia-${data.guideNumber}.json`,
      mimeType: 'application/json',
      content: JSON.stringify({ documentType: 'WARRANTY_CERTIFICATE', ...data }, null, 2),
    };
  }
}

// ============================================================================
// 3. FACTORÍA ABSTRACTA (Centro del Diagrama)
// ============================================================================
export interface ITechnicalDocumentFactory {
  createReceiptExporter(): IWorkOrderReceiptExporter;
  createDiagnosticReportExporter(): IDiagnosticReportExporter;
  createWarrantyCertificateExporter(): IWarrantyCertificateExporter;
}

// Factoría Concreta 1: PDF / Impresión
export class PdfDocumentFactory implements ITechnicalDocumentFactory {
  createReceiptExporter(): IWorkOrderReceiptExporter {
    return new PdfWorkOrderReceiptExporter();
  }
  createDiagnosticReportExporter(): IDiagnosticReportExporter {
    return new PdfDiagnosticReportExporter();
  }
  createWarrantyCertificateExporter(): IWarrantyCertificateExporter {
    return new PdfWarrantyCertificateExporter();
  }
}

// Factoría Concreta 2: CSV / Hojas de Cálculo
export class CsvDocumentFactory implements ITechnicalDocumentFactory {
  createReceiptExporter(): IWorkOrderReceiptExporter {
    return new CsvWorkOrderReceiptExporter();
  }
  createDiagnosticReportExporter(): IDiagnosticReportExporter {
    return new CsvDiagnosticReportExporter();
  }
  createWarrantyCertificateExporter(): IWarrantyCertificateExporter {
    return new CsvWarrantyCertificateExporter();
  }
}

// Factoría Concreta 3: JSON Estructurado
export class JsonDocumentFactory implements ITechnicalDocumentFactory {
  createReceiptExporter(): IWorkOrderReceiptExporter {
    return new JsonWorkOrderReceiptExporter();
  }
  createDiagnosticReportExporter(): IDiagnosticReportExporter {
    return new JsonDiagnosticReportExporter();
  }
  createWarrantyCertificateExporter(): IWarrantyCertificateExporter {
    return new JsonWarrantyCertificateExporter();
  }
}

// ============================================================================
// 4. FACTORY PRODUCER / SELECTOR (Lado Derecho del Diagrama)
// ============================================================================
export type DocumentFormat = 'pdf' | 'csv' | 'json';

export class DocumentExporterProducer {
  private static readonly factories: Record<DocumentFormat, () => ITechnicalDocumentFactory> = {
    pdf: () => new PdfDocumentFactory(),
    csv: () => new CsvDocumentFactory(),
    json: () => new JsonDocumentFactory(),
  };

  public static getFactory(format: DocumentFormat): ITechnicalDocumentFactory {
    const factoryCreator = this.factories[format.toLowerCase() as DocumentFormat];
    if (!factoryCreator) {
      throw new Error(`Formato de documento no soportado: ${format}`);
    }
    return factoryCreator();
  }
}
