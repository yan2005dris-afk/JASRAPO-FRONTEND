import { Injectable, inject } from '@angular/core';
import { TDocumentDefinitions, StyleDictionary, Margins } from 'pdfmake/interfaces';
import { PdfGeneratorService } from '../../../shared/services/pdf-generator.service';
import { LOGO_JASRAPO_BASE64 } from '../../../shared/constants/images.constant';

@Injectable({
  providedIn: 'root',
})
export class PlanillaPdfService {
  private pdfGenerator = inject(PdfGeneratorService);

  async generatePlanillaBlob(data: any): Promise<Blob> {
    const definition = this.getPlanillaDefinition(data);
    return this.pdfGenerator.generatePdfBlob(definition);
  }

  downloadPlanilla(data: any, fileName: string = 'planilla.pdf'): void {
    const definition = this.getPlanillaDefinition(data);
    this.pdfGenerator.downloadPdf(definition, fileName);
  }

  private getPlanillaDefinition(data: any): TDocumentDefinitions {
    const styles: StyleDictionary = {
      headerLogo: {
        alignment: 'left'
      },
      headerCompanyInfo: {
        fontSize: 9,
        bold: true,
        margin: [0, 5, 0, 0] as Margins
      },
      headerFacturaBox: {
        margin: [0, 0, 0, 0] as Margins
      },
      facturaTitle: {
        fontSize: 14,
        bold: true,
        color: '#4F46E5',
        alignment: 'center',
        margin: [0, 5, 0, 5] as Margins,
        characterSpacing: 2
      },
      facturaText: {
        fontSize: 8,
        margin: [0, 2, 0, 2] as Margins
      },
      facturaTextBold: {
        fontSize: 8,
        bold: true,
        margin: [0, 2, 0, 2] as Margins
      },
      clientInfoBox: {
        margin: [0, 10, 0, 10] as Margins
      },
      clientText: {
        fontSize: 9,
        margin: [0, 2, 0, 2] as Margins
      },
      tableHeader: {
        fontSize: 8,
        bold: true,
        fillColor: '#F3F4F6',
        alignment: 'center',
        margin: [0, 4, 0, 4] as Margins
      },
      tableCellCenter: {
        fontSize: 8,
        alignment: 'center',
        margin: [0, 4, 0, 4] as Margins
      },
      tableCellLeft: {
        fontSize: 8,
        alignment: 'left',
        margin: [0, 4, 0, 4] as Margins
      },
      tableCellRight: {
        fontSize: 8,
        alignment: 'right',
        margin: [0, 4, 0, 4] as Margins
      },
      footerTextTitle: {
        fontSize: 9,
        bold: true,
        margin: [0, 5, 0, 2] as Margins
      },
      footerText: {
        fontSize: 8,
        margin: [0, 2, 0, 2] as Margins
      },
      subtotalBox: {
        margin: [0, 0, 0, 0] as Margins
      },
      blueBanner: {
        fillColor: '#5C6BC0',
        color: 'white',
        margin: [0, 10, 0, 0] as Margins
      },
      bannerTextBold: {
        fontSize: 10,
        bold: true,
        margin: [10, 10, 10, 2] as Margins
      },
      bannerText: {
        fontSize: 8,
        margin: [10, 0, 10, 10] as Margins
      }
    };

    const definition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      content: [
        // TOP SECTION: Logo & Company Info + Factura Box
        {
          columns: [
            // Left Column
            {
              width: '55%',
              stack: [
                {
                  columns: [
                    {
                      image: LOGO_JASRAPO_BASE64,
                      width: 60,
                      margin: [0, 0, 10, 0] as Margins
                    },
                    {
                      stack: [
                        { text: 'Junta de Agua Olon', fontSize: 16, bold: true },
                        { text: 'JUNTA ADMINISTRADORA DE SERVICIOS DE AGUA Y ALCANTARILLADO', fontSize: 9, bold: true }
                      ]
                    }
                  ]
                },
                { text: '\n' },
                {
                  text: [
                    { text: 'Dirección Matriz: ', bold: true },
                    'Av. Principal Olon, Calle de los Surfistas S/N'
                  ],
                  fontSize: 8
                },
                {
                  text: [
                    { text: 'Dirección Sucursal: ', bold: true },
                    'Via San José - Entrada a la Cascada'
                  ],
                  fontSize: 8
                },
                {
                  text: [
                    { text: 'OBLIGADO A LLEVAR CONTABILIDAD: ', bold: true },
                    'SÍ'
                  ],
                  fontSize: 8
                }
              ]
            },
            // Right Column (Factura Box)
            {
              width: '45%',
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        { text: 'R.U.C.: 2490003456001', style: 'facturaTextBold' },
                        { text: 'FACTURA', style: 'facturaTitle' },
                        { text: `No.: ${data.numeroPlanilla || '001-001-000084729'}`, style: 'facturaTextBold' },
                        { text: 'NÚMERO DE AUTORIZACIÓN:', style: 'facturaTextBold', fontSize: 7 },
                        { text: data.claveAcceso || '1305202301249000345600120010010000847291234567819', style: 'facturaText', fontSize: 7 },
                        { text: 'CLAVE DE ACCESO:', style: 'facturaTextBold', fontSize: 7 },
                        {
                           text: '||||| ||| ||||||| || ||| ||||| ||||||',
                           fontSize: 18,
                           margin: [0, 2, 0, 2] as Margins,
                           alignment: 'center'
                        },
                        { text: data.claveAcceso || '1305202301249000345600120010010000847291234567819', style: 'facturaText', fontSize: 6, alignment: 'center' }
                      ],
                      margin: [5, 5, 5, 5] as Margins
                    }
                  ]
                ]
              }
            }
          ],
          columnGap: 20
        },

        // MIDDLE SECTION 1: Client Info Box
        {
          style: 'clientInfoBox',
          table: {
            widths: ['50%', '50%'],
            body: [
              [
                {
                  stack: [
                    { text: [{ text: 'Cliente: ', bold: true }, data.clienteNombre || 'RIVAS CEVALLOS JUSTO SEVERO'], style: 'clientText' },
                    { text: [{ text: 'RUC/CI: ', bold: true }, data.clienteIdentificacion || '0912271290'], style: 'clientText' },
                    { text: [{ text: 'Dirección: ', bold: true }, data.direccion || 'CALLE LOS ALMENDROS Y SEGUNDA SUR - OLON'], style: 'clientText' },
                  ],
                  border: [true, true, false, true],
                  margin: [5, 5, 5, 5] as Margins
                },
                {
                  stack: [
                    {
                      columns: [
                        { text: [{ text: 'Cuenta: ', bold: true }, data.cuenta || '1007941'], style: 'clientText' },
                        { text: [{ text: 'Teléfono: ', bold: true }, data.telefono || '0987654321'], style: 'clientText' }
                      ]
                    },
                    { text: [{ text: 'Fecha Emisión: ', bold: true }, data.fechaEmision || '13/05/2023'], style: 'clientText' },
                    { text: [{ text: 'Fecha y Hora de Autorización: ', bold: true }, data.fechaAutorizacion || '13/05/2023 14:48:12'], style: 'clientText' }
                  ],
                  border: [false, true, true, true],
                  margin: [5, 5, 5, 5] as Margins
                }
              ]
            ]
          }
        },

        // MIDDLE SECTION 2: Meter Info Table
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', '*', '*', '*', '*', '*'],
            body: [
              [
                { text: 'N° Medidor', style: 'tableHeader' },
                { text: 'Lectura Anterior', style: 'tableHeader' },
                { text: 'Lectura Actual', style: 'tableHeader' },
                { text: 'Consumo', style: 'tableHeader' },
                { text: 'Categoría', style: 'tableHeader' },
                { text: 'Facturación', style: 'tableHeader' },
                { text: 'Meses', style: 'tableHeader' },
                { text: 'Vencimiento', style: 'tableHeader' }
              ],
              [
                { text: data.medidor || '-', style: 'tableCellCenter' },
                { text: data.lecturaAnterior || '-', style: 'tableCellCenter' },
                { text: data.lecturaActual || '-', style: 'tableCellCenter' },
                { text: data.consumo || '-', style: 'tableCellCenter' },
                { text: data.categoria || '-', style: 'tableCellCenter' },
                { text: data.facturacion || '-', style: 'tableCellCenter' },
                { text: data.mesesAtrasados || '-', style: 'tableCellCenter' },
                { text: data.fechaVencimiento || '-', style: 'tableCellCenter' }
              ]
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => 1,
            vLineWidth: (i: number, node: any) => 1,
            hLineColor: (i: number, node: any) => '#D1D5DB',
            vLineColor: (i: number, node: any) => '#D1D5DB',
          },
          margin: [0, 0, 0, 10] as Margins
        },

        // MIDDLE SECTION 3: Details Table
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Código', style: 'tableHeader' },
                { text: 'Cant.', style: 'tableHeader' },
                { text: 'Descripción', style: 'tableHeader' },
                { text: 'Unitario', style: 'tableHeader' },
                { text: 'Subsidio', style: 'tableHeader' },
                { text: 'Precio Sin Sub.', style: 'tableHeader' },
                { text: 'Desc.', style: 'tableHeader' },
                { text: 'Total', style: 'tableHeader' }
              ],
              ...((data.detalles && data.detalles.length > 0 ? data.detalles : [
                { codigo: 'AGU', cant: '1.0', desc: 'Consumo de Agua Potable (Minimo 10m3)', uni: '6.50', sub: '0.0', pre: '6.50', des: '0.00', tot: '6.50' }
              ]).map((d: any) => [
                { text: d.codigo, style: 'tableCellLeft' },
                { text: d.cant, style: 'tableCellCenter' },
                { text: d.desc, style: 'tableCellLeft' },
                { text: d.uni, style: 'tableCellRight' },
                { text: d.sub, style: 'tableCellRight' },
                { text: d.pre, style: 'tableCellRight' },
                { text: d.des, style: 'tableCellRight' },
                { text: d.tot, style: 'tableCellRight' }
              ]))
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => 1,
            vLineWidth: (i: number, node: any) => 1,
            hLineColor: (i: number, node: any) => '#D1D5DB',
            vLineColor: (i: number, node: any) => '#D1D5DB',
          },
          margin: [0, 0, 0, 15] as Margins
        },

        // BOTTOM SECTION: Additional Info & Subtotals
        {
          columns: [
            // Left Column
            {
              width: '55%',
              stack: [
                {
                  table: {
                    widths: ['*'],
                    body: [
                      [
                        { text: 'INFORMACIÓN ADICIONAL', style: 'tableHeader', border: [false, false, false, true] }
                      ],
                      [
                        {
                          stack: [
                            { text: [{ text: 'Email: ', bold: true }, data.email || 'jaguasolon@jasrapo.com.ec'], style: 'footerText' },
                            { text: [{ text: 'Dirección: ', bold: true }, data.direccionAdicional || 'Comunidad Olón, Parroquia Manglaralto'], style: 'footerText' },
                            { text: [{ text: 'Periodo: ', bold: true }, data.periodo || 'ABRIL 2023 - MAYO 2023'], style: 'footerText' }
                          ],
                          border: [false, false, false, false],
                          margin: [5, 5, 5, 5] as Margins
                        }
                      ]
                    ]
                  },
                  layout: {
                    hLineWidth: (i: number, node: any) => 1,
                    vLineWidth: (i: number, node: any) => 1,
                    hLineColor: (i: number, node: any) => '#D1D5DB',
                    vLineColor: (i: number, node: any) => '#D1D5DB',
                  },
                  margin: [0, 0, 0, 10] as Margins
                },
                {
                  stack: [
                    {
                      text: 'FORMAS DE PAGO:',
                      style: 'footerTextTitle',
                      color: '#4F46E5'
                    },
                    {
                      ul: [
                        { text: 'Efectivo o Cheque en ventanillas JASRAPO', style: 'footerText' },
                        { text: 'Depósito o Transferencia Banco del Pacifico Cta. Cte. 12345678', style: 'footerText' },
                        { text: 'App Banca Móvil - Servicios - Agua Potable Olón', style: 'footerText' }
                      ],
                      color: '#4B5563',
                      margin: [10, 0, 0, 0] as Margins
                    }
                  ],
                  margin: [5, 0, 0, 0] as Margins
                }
              ]
            },
            // Right Column
            {
              width: '45%',
              style: 'subtotalBox',
              table: {
                widths: ['*', 'auto'],
                body: [
                  [
                    { text: 'SUBTOTAL 0%', style: 'footerTextTitle', margin: [5, 5, 5, 5] as Margins },
                    { text: data.subtotal0 || '11.98', style: 'tableCellRight', margin: [5, 5, 5, 5] as Margins }
                  ],
                  [
                    { text: 'SUBTOTAL 12%', style: 'footerTextTitle', margin: [5, 5, 5, 5] as Margins },
                    { text: data.subtotal12 || '0.00', style: 'tableCellRight', margin: [5, 5, 5, 5] as Margins }
                  ],
                  [
                    { text: 'IVA 12%', style: 'footerTextTitle', margin: [5, 5, 5, 5] as Margins },
                    { text: data.iva12 || '0.00', style: 'tableCellRight', margin: [5, 5, 5, 5] as Margins }
                  ],
                  [
                    { text: 'VALOR TOTAL', bold: true, fontSize: 10, color: 'white', fillColor: '#1F2937', margin: [5, 5, 5, 5] as Margins },
                    { text: data.total || '11.98', bold: true, fontSize: 10, color: 'white', fillColor: '#1F2937', alignment: 'right', margin: [5, 5, 5, 5] as Margins }
                  ]
                ]
              },
              layout: {
                hLineWidth: (i: number, node: any) => 1,
                vLineWidth: (i: number, node: any) => 1,
                hLineColor: (i: number, node: any) => '#D1D5DB',
                vLineColor: (i: number, node: any) => '#D1D5DB',
              }
            }
          ],
          columnGap: 20
        },
        
        { text: '\n' },

        // FOOTER SECTION: Resumen de cuenta
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*'],
            body: [
              [
                { text: 'RESUMEN DE CUENTA', colSpan: 3, style: 'tableHeader' },
                {},
                {}
              ],
              [
                { text: 'CONSUMO MES', style: 'tableHeader' },
                { text: 'VALORES ATRASADOS', style: 'tableHeader' },
                { text: 'DESCUENTOS', style: 'tableHeader' }
              ],
              [
                { text: data.resumenConsumo || '11.98', style: 'tableCellCenter' },
                { text: data.resumenAtrasados || '0.00', style: 'tableCellCenter' },
                { text: data.resumenDescuentos || '0.00', style: 'tableCellCenter' }
              ]
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => 1,
            vLineWidth: (i: number, node: any) => 1,
            hLineColor: (i: number, node: any) => '#D1D5DB',
            vLineColor: (i: number, node: any) => '#D1D5DB',
          },
          margin: [0, 10, 0, 10] as Margins
        },

        {
          columns: [
            { text: `Dirección de Correo del Cliente: ${data.correoCliente || 'rcevallos@email.com'}`, fontSize: 7, bold: true },
            { text: 'Este documento es una representación impresa de un comprobante electrónico', fontSize: 7, italics: true, alignment: 'right' }
          ]
        },

        // Blue Banner
        {
          style: 'blueBanner',
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: 'Ahora puedes pagar tus planillas de agua potable en las ventanillas de:', style: 'bannerTextBold' },
                    { text: 'Banco Guayaquil, Pichincha, Bolivariano y corresponsales no bancarios (Banco del Barrio, Mi Vecino). Aceptamos todas las tarjetas de crédito y débito.', style: 'bannerText' }
                  ],
                  border: [false, false, false, false]
                }
              ]
            ]
          },
          layout: 'noBorders'
        }
      ],
      styles: styles
    };

    return definition;
  }
}
