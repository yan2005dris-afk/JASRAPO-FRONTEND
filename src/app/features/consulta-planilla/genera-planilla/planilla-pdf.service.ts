import { Injectable, inject } from '@angular/core';
import { TDocumentDefinitions, Content, Table } from 'pdfmake/interfaces';
import { PdfGeneratorService } from '../../../shared/services/pdf-generator.service';

@Injectable({
  providedIn: 'root',
})
export class PlanillaPdfService {
  private pdfGenerator = inject(PdfGeneratorService);

  async generatePlanillaBlob(data: any): Promise<Blob> {
    const definition = this.getPlanillaDefinition(data);
    return this.pdfGenerator.generatePdfBlob(definition);
  }

  private getPlanillaDefinition(data: any): TDocumentDefinitions {
    // Definición de estilos
    const styles = {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5] as [number, number, number, number],
      },
      tableExample: {
        margin: [0, 5, 0, 15] as [number, number, number, number],
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: 'black',
        fillColor: '#f3f4f6',
      },
      total: {
        bold: true,
        fontSize: 14,
      }
    };

    const definition: TDocumentDefinitions = {
      content: [
        {
          columns: [
            {
              text: 'JAPO - Sistema de Agua Potable',
              style: 'header',
              width: '*'
            },
            {
              text: `PLANILLA N° ${data.numeroPlanilla || '001-001-00000123'}`,
              alignment: 'right',
              width: 'auto'
            }
          ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 }] },
        { text: '\n' },
        {
          columns: [
            {
              stack: [
                { text: 'DATOS DEL CLIENTE', style: 'subheader' },
                { text: `Cliente: ${data.clienteNombre || 'CLIENTE DE PRUEBA'}` },
                { text: `C.I./RUC: ${data.clienteIdentificacion || '9999999999'}` },
                { text: `Dirección: ${data.direccion || 'Barrio Central'}` },
                { text: `Medidor: ${data.medidor || 'MED-10293'}` },
              ]
            },
            {
              stack: [
                { text: 'PERIODO DE CONSUMO', style: 'subheader' },
                { text: `Mes: ${data.mes || 'Mayo'}` },
                { text: `Año: ${data.anio || '2026'}` },
                { text: `Fecha Emisión: ${data.fechaEmision || '12/05/2026'}` },
                { text: `Fecha Vencimiento: ${data.fechaVencimiento || '30/05/2026'}`, color: 'red', bold: true },
              ],
              alignment: 'right'
            }
          ]
        },
        { text: '\nDETALLE DE CONSUMO', style: 'subheader' },
        this.getDetalleConsumoTable(data),
        { text: '\n' },
        {
          columns: [
            { text: '', width: '*' },
            {
              width: 'auto',
              table: {
                widths: [100, 100],
                body: [
                  ['Subtotal:', `$ ${data.subtotal || '12.50'}`],
                  ['Mantenimiento:', `$ ${data.mantenimiento || '1.50'}`],
                  [{ text: 'TOTAL A PAGAR:', style: 'total' }, { text: `$ ${data.total || '14.00'}`, style: 'total' }],
                ]
              },
              layout: 'noBorders'
            }
          ]
        },
        { text: '\n\n' },
        {
          qr: `PLANILLA-${data.numeroPlanilla || '123'}-CLIENTE-${data.clienteIdentificacion || '999'}`,
          fit: 80,
          alignment: 'center'
        },
        { text: 'Escanee para validar su pago', alignment: 'center', fontSize: 8, margin: [0, 5, 0, 0] }
      ],
      styles: styles,
      footer: (currentPage, pageCount) => {
        return {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          margin: [0, 10, 0, 0]
        };
      }
    };

    return definition;
  }

  private getDetalleConsumoTable(data: any): Content {
    return {
      style: 'tableExample',
      table: {
        widths: ['*', 'auto', 'auto', 'auto'],
        headerRows: 1,
        body: [
          [
            { text: 'Concepto', style: 'tableHeader' },
            { text: 'Lec. Anterior', style: 'tableHeader' },
            { text: 'Lec. Actual', style: 'tableHeader' },
            { text: 'Consumo (m³)', style: 'tableHeader' }
          ],
          [
            'Consumo de Agua Potable',
            data.lecturaAnterior || '1240',
            data.lecturaActual || '1255',
            data.consumo || '15'
          ],
          [
            'Alcantarillado',
            '-',
            '-',
            'Fijo'
          ]
        ]
      },
      layout: 'lightHorizontalLines'
    };
  }
}
