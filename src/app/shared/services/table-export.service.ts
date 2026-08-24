import { Injectable, inject } from '@angular/core';
import { TDocumentDefinitions, Margins, Content } from 'pdfmake/interfaces';
import { PdfGeneratorService } from './pdf-generator.service';

export interface ExportColumn<T = Record<string, unknown>> {
  header: string;
  key?: keyof T | string;
  width?: number | string;
  transform?: (row: T, index: number) => string | number;
  align?: 'left' | 'center' | 'right';
}

export interface TableExportOptions<T = Record<string, unknown>> {
  title: string;
  subtitle?: string;
  fileName?: string;
  columns: ExportColumn<T>[];
  data: T[];
  metadata?: { label: string; value: string | number }[];
  summary?: string;
  orientation?: 'portrait' | 'landscape';
}

@Injectable({
  providedIn: 'root',
})
export class TableExportService {
  private readonly pdfGenerator = inject(PdfGeneratorService);

  /**
   * Exporta datos tabulares a un archivo CSV estructurado (UTF-8 con BOM para Excel).
   */
  exportToCsv<T extends Record<string, unknown>>(options: TableExportOptions<T>): void {
    const { title, columns, data, metadata, fileName = 'export' } = options;

    const lines: string[] = [];

    // Título y Metadatos
    lines.push(`"${title.replace(/"/g, '""')}"`);
    if (metadata && metadata.length > 0) {
      metadata.forEach((m) => {
        lines.push(`"${m.label}","${String(m.value).replace(/"/g, '""')}"`);
      });
      lines.push('');
    }

    // Encabezados
    const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(';');
    lines.push(headers);

    // Filas de datos
    data.forEach((row, idx) => {
      const rowValues = columns.map((col) => {
        let val: unknown;
        if (col.transform) {
          val = col.transform(row, idx);
        } else if (col.key) {
          val = row[col.key as keyof T];
        }
        if (val === null || val === undefined) {
          return '""';
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      lines.push(rowValues.join(';'));
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `${fileName}.csv`);
  }

  /**
   * Exporta datos tabulares a formato Excel (.xls mediante XML Spreadsheet estándar).
   */
  exportToExcel<T extends Record<string, unknown>>(options: TableExportOptions<T>): void {
    const { title, subtitle, columns, data, metadata, summary, fileName = 'export' } = options;

    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0C9EA1"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#597B7D"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBDEDF"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBDEDF"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0E2728"/>
   <Interior ss:Color="#DBF7F8" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="CellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Datos">
  <Table>`;

    xml += `<Row ss:Height="24"><Cell ss:StyleID="Title"><Data ss:Type="String">${this.escapeXml(title)}</Data></Cell></Row>`;
    if (subtitle) {
      xml += `<Row ss:Height="18"><Cell ss:StyleID="SubTitle"><Data ss:Type="String">${this.escapeXml(subtitle)}</Data></Cell></Row>`;
    }

    if (metadata && metadata.length > 0) {
      metadata.forEach((m) => {
        xml += `<Row><Cell ss:StyleID="SubTitle"><Data ss:Type="String">${this.escapeXml(m.label)}: ${this.escapeXml(String(m.value))}</Data></Cell></Row>`;
      });
    }

    xml += `<Row ss:Height="10"/>`; // Espacio en blanco

    // Encabezados
    xml += `<Row ss:Height="20">`;
    columns.forEach((col) => {
      xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${this.escapeXml(col.header)}</Data></Cell>`;
    });
    xml += `</Row>`;

    // Filas
    data.forEach((row, idx) => {
      xml += `<Row>`;
      columns.forEach((col) => {
        let val: unknown;
        if (col.transform) {
          val = col.transform(row, idx);
        } else if (col.key) {
          val = row[col.key as keyof T];
        }

        const alignStyle =
          col.align === 'right' ? 'CellRight' : col.align === 'center' ? 'CellCenter' : 'CellLeft';
        const strVal = val !== null && val !== undefined ? String(val) : '';
        const isNumeric = typeof val === 'number' && !isNaN(val);

        if (isNumeric) {
          xml += `<Cell ss:StyleID="${alignStyle}"><Data ss:Type="Number">${val}</Data></Cell>`;
        } else {
          xml += `<Cell ss:StyleID="${alignStyle}"><Data ss:Type="String">${this.escapeXml(strVal)}</Data></Cell>`;
        }
      });
      xml += `</Row>`;
    });

    if (summary) {
      xml += `<Row ss:Height="10"/>`;
      xml += `<Row><Cell ss:StyleID="SubTitle"><Data ss:Type="String">${this.escapeXml(summary)}</Data></Cell></Row>`;
    }

    xml += `</Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    this.triggerDownload(blob, `${fileName}.xls`);
  }

  /**
   * Exporta datos tabulares a un PDF estilizado según el Design System de JASRAPO.
   */
  exportToPdf<T extends Record<string, unknown>>(options: TableExportOptions<T>): void {
    const {
      title,
      subtitle = 'JASRAPO - JUNTA ADMINISTRADORA DE AGUA POTABLE',
      columns,
      data,
      metadata,
      summary,
      orientation = 'portrait',
      fileName = 'reporte',
    } = options;

    const fechaGeneracion = new Date().toLocaleString('es-EC');

    // Mapeo de anchos
    const widths = columns.map((col) => col.width || '*');

    // Construcción de la tabla
    const tableHeader = columns.map((col) => ({
      text: col.header,
      bold: true,
      fillColor: '#dbf7f8',
      color: '#0e2728',
      alignment: col.align || 'left',
      margin: [4, 5, 4, 5] as Margins,
      fontSize: 8,
    }));

    const tableRows = data.map((row, idx) => {
      return columns.map((col) => {
        let val: unknown;
        if (col.transform) {
          val = col.transform(row, idx);
        } else if (col.key) {
          val = row[col.key as keyof T];
        }

        return {
          text: val !== null && val !== undefined ? String(val) : '—',
          alignment: col.align || 'left',
          fontSize: 8,
          margin: [4, 4, 4, 4] as Margins,
        };
      });
    });

    // Metadatos divididos en 2 columnas
    const metaLeftStack: Content[] = [];
    const metaRightStack: Content[] = [];
    if (metadata && metadata.length > 0) {
      metadata.forEach((m, i) => {
        const item: Content = {
          text: [{ text: `${m.label}: `, bold: true }, String(m.value)],
          fontSize: 8,
          marginBottom: 2,
        };
        if (i % 2 === 0) metaLeftStack.push(item);
        else metaRightStack.push(item);
      });
    }

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: orientation,
      pageMargins: [30, 30, 30, 30],
      content: [
        // Encabezado
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: subtitle.toUpperCase(), style: 'mainHeader' },
                { text: title.toUpperCase(), style: 'subHeader' },
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: 'JASRAPO', bold: true, alignment: 'right', color: '#0c9ea1', fontSize: 12 },
                {
                  text: `Fecha: ${fechaGeneracion}`,
                  fontSize: 7,
                  alignment: 'right',
                  color: '#597b7d',
                },
              ],
            },
          ],
          marginBottom: 8,
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: orientation === 'landscape' ? 780 : 535,
              y2: 0,
              lineWidth: 1.5,
              lineColor: '#0c9ea1',
            },
          ],
          marginBottom: 10,
        },
        // Metadata Box si existe
        ...(metadata && metadata.length > 0
          ? [
              {
                columns: [
                  { width: '50%', stack: metaLeftStack },
                  { width: '50%', stack: metaRightStack },
                ],
                marginBottom: 10,
              },
            ]
          : []),
        // Tabla de datos
        {
          table: {
            headerRows: 1,
            widths,
            body: [tableHeader, ...tableRows],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#cbdedf',
          },
        },
        // Resumen y pie
        {
          marginTop: 10,
          columns: [
            {
              text: summary || `Total registros: ${data.length}`,
              fontSize: 8,
              bold: true,
              color: '#0e2728',
            },
            {
              text: 'Documento generado automáticamente',
              fontSize: 7,
              italics: true,
              alignment: 'right',
              color: '#597b7d',
            },
          ],
        },
      ],
      styles: {
        mainHeader: { fontSize: 11, bold: true, color: '#0c9ea1' },
        subHeader: { fontSize: 9, bold: true, color: '#0e2728', marginTop: 2 },
      },
    };

    this.pdfGenerator.downloadPdf(docDefinition, `${fileName}.pdf`);
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case "'":
          return '&apos;';
        case '"':
          return '&quot;';
        default:
          return c;
      }
    });
  }
}
