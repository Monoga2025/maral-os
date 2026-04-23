/**
 * DIAN Facturación Electrónica — UBL 2.1 Generator + CUFE
 *
 * Implementado desde cero basado en Anexo Técnico 1.9 DIAN.
 * dazza-dev/dian-feco es PHP — esta es la versión Node.
 *
 * Fase A: genera XML + calcula CUFE. Firma y envío en Fase B.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';

// ── Tipos ─────────────────────────────────────────────────────

export interface DIANConfig {
  nit: string;               // NIT emisor sin dígito verificación (ej: "901889479")
  digitoVerificacion: string;// Dígito de verificación (ej: "8")
  nombre: string;            // Razón social
  address: string;
  city: string;
  department: string;
  phone: string;
  email: string;

  softwareId: string;        // ID del software registrado en DIAN
  softwarePin: string;       // PIN del software (4 dígitos)
  resolucion: string;        // Número resolución DIAN
  resolucionFechaInicio: string; // YYYY-MM-DD
  resolucionFechaFin: string;    // YYYY-MM-DD
  prefijo: string;           // Prefijo facturas (ej: "FE")
  rangoDesde: number;        // Rango autorizado desde
  rangoHasta: number;        // Rango autorizado hasta

  testingMode: boolean;      // true = habilitación DIAN, false = producción
  certificatePath?: string;  // Ruta al .p12
  certificatePassword?: string;
}

export interface DIANParty {
  nit: string;
  nombre: string;
  address: string;
  city: string;
  department: string;
  countryCode: string;       // "CO"
  phone?: string;
  email?: string;
  tipoDoc?: string;          // "31" = NIT, "13" = CC, "22" = pasaporte
}

export interface DIANItem {
  lineNumber: number;
  description: string;
  qty: number;
  unit: string;              // "EA" = each, "KGM" = kg
  unitPrice: number;         // precio antes de IVA
  taxRate: number;           // porcentaje IVA (0, 5, 19)
  taxAmount: number;
  lineTotal: number;         // qty * unitPrice (antes de IVA)
}

export interface DIANInvoiceData {
  invoiceId: string;         // ID interno MARAL OS
  number: string;            // número completo: prefijo + consecutivo (ej: "FE0001")
  consecutivo: string;       // solo el número (ej: "0001")
  issueDate: Date;
  dueDate: Date;
  paymentMeans: '1' | '2';   // 1=contado, 2=crédito
  currency: string;          // "COP"
  buyer: DIANParty;
  items: DIANItem[];
  subtotal: number;
  totalIVA: number;
  totalINC: number;          // impuesto al consumo (0 por defecto)
  totalICA: number;          // ICA (0 por defecto)
  total: number;
  notes?: string;
}

// ── CUFE calculation (Anexo Técnico 1.9 DIAN) ─────────────────

export function calculateCUFE(invoice: DIANInvoiceData, config: DIANConfig): string {
  const numFac = invoice.number;
  const fecFac = toLocalDate(invoice.issueDate);
  const horFac = toLocalTime(invoice.issueDate);
  const valFac = invoice.subtotal.toFixed(2);

  // Impuestos: IVA=01, INC=04, ICA=03
  const codImp1 = '01'; const valImp1 = invoice.totalIVA.toFixed(2);
  const codImp2 = '04'; const valImp2 = invoice.totalINC.toFixed(2);
  const codImp3 = '03'; const valImp3 = invoice.totalICA.toFixed(2);
  const valTot  = invoice.total.toFixed(2);

  const nitOFE  = config.nit;
  const numAdq  = invoice.buyer.nit.replace(/\D/g, '');
  const ambiente = config.testingMode ? '2' : '1';

  // Clave técnica: SHA384(softwareId + pin + campos...)
  const clTecRaw = `${config.softwareId}${config.softwarePin}${numFac}${fecFac}${horFac}${valFac}${codImp1}${valImp1}${codImp2}${valImp2}${codImp3}${valImp3}${valTot}${nitOFE}${numAdq}`;
  const clTec = sha384(clTecRaw);

  // CUFE: SHA384(campos... + clTec + ambiente)
  const cufeRaw = `${numFac}${fecFac}${horFac}${valFac}${codImp1}${valImp1}${codImp2}${valImp2}${codImp3}${valImp3}${valTot}${nitOFE}${numAdq}${clTec}${ambiente}`;
  return sha384(cufeRaw);
}

function sha384(input: string): string {
  return crypto.createHash('sha384').update(input, 'utf8').digest('hex');
}

function toLocalDate(d: Date): string {
  // Formato YYYY-MM-DD en zona Colombia (UTC-5)
  const co = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return co.toISOString().split('T')[0];
}

function toLocalTime(d: Date): string {
  // Formato HH:MM:SS en zona Colombia
  const co = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return co.toISOString().split('T')[1].slice(0, 8) + '-05:00';
}

// ── UBL 2.1 XML Generator ─────────────────────────────────────

export function generateUBLXML(invoice: DIANInvoiceData, cufe: string, config: DIANConfig): string {
  const fecFac = toLocalDate(invoice.issueDate);
  const horFac = toLocalTime(invoice.issueDate);
  const fecVen = toLocalDate(invoice.dueDate);
  const perfil  = config.testingMode ? '2' : '1'; // 2=pruebas, 1=producción

  const taxPct = invoice.items[0]?.taxRate ?? 0; // asumimos un único rate por simplicidad

  const lines = invoice.items.map(item => itemLine(item)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:InvoiceControl>
            <sts:InvoiceAuthorization>${x(config.resolucion)}</sts:InvoiceAuthorization>
            <sts:AuthorizationPeriod>
              <cbc:StartDate>${config.resolucionFechaInicio}</cbc:StartDate>
              <cbc:EndDate>${config.resolucionFechaFin}</cbc:EndDate>
            </sts:AuthorizationPeriod>
            <sts:AuthorizedInvoices>
              <sts:Prefix>${x(config.prefijo)}</sts:Prefix>
              <sts:From>${config.rangoDesde}</sts:From>
              <sts:To>${config.rangoHasta}</sts:To>
            </sts:AuthorizedInvoices>
          </sts:InvoiceControl>
          <sts:InvoiceSource>
            <cbc:IdentificationCode listAgencyID="6"
              listAgencyName="United Nations Economic Commission for Europe"
              listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1">CO</cbc:IdentificationCode>
          </sts:InvoiceSource>
          <sts:SoftwareProvider>
            <sts:ProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">${x(config.nit)}</sts:ProviderID>
            <sts:SoftwareID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">${x(config.softwareId)}</sts:SoftwareID>
          </sts:SoftwareProvider>
          <sts:SoftwareSecurityCode schemeAgencyID="195"
            schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)"
            schemeID="SHA384">${calculateSoftwareSecurityCode(invoice.number, invoice.consecutivo, config)}</sts:SoftwareSecurityCode>
          <sts:AuthorizationProvider>
            <sts:AuthorizationProviderID schemeAgencyID="195"
              schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)"
              schemeID="4" schemeName="Colombia">800197268</sts:AuthorizationProviderID>
          </sts:AuthorizationProvider>
          <sts:QRCode>https://catalogo-vpfe${config.testingMode ? '-hab' : ''}.dian.gov.co/document/searchqr?documentkey=${cufe}</sts:QRCode>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ProfileExecutionID>${perfil}</cbc:ProfileExecutionID>
  <cbc:ID>${x(invoice.number)}</cbc:ID>
  <cbc:UUID schemeID="${perfil}" schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${fecFac}</cbc:IssueDate>
  <cbc:IssueTime>${horFac}</cbc:IssueTime>
  <cbc:DueDate>${fecVen}</cbc:DueDate>
  <cbc:InvoiceTypeCode listAgencyID="195"
    listAgencyName="DIAN (Dirección de Impuestos y Aduanas Nacionales)"
    listSchemeURI="http://www.dian.gov.co/contratos/facturaelectronica/v1/InvoiceType">01</cbc:InvoiceTypeCode>
  ${invoice.notes ? `<cbc:Note>${x(invoice.notes)}</cbc:Note>` : ''}
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${invoice.items.length}</cbc:LineCountNumeric>

  <!-- Emisor -->
  <cac:AccountingSupplierParty>
    <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName><cbc:Name>${x(config.nombre)}</cbc:Name></cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:AddressLine><cac:Line>${x(config.address)}</cac:Line></cbc:AddressLine>
          <cbc:CityName>${x(config.city)}</cbc:CityName>
          <cac:Country><cbc:IdentificationCode>CO</cbc:IdentificationCode></cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${x(config.nombre)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195"
          schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)"
          schemeID="${config.digitoVerificacion}"
          schemeName="31">${config.nit}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">O-13</cbc:TaxLevelCode>
        <cac:RegistrationAddress>
          <cbc:CityName>${x(config.city)}</cbc:CityName>
          <cac:Country><cbc:IdentificationCode>CO</cbc:IdentificationCode></cac:Country>
        </cac:RegistrationAddress>
        <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${x(config.nombre)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195"
          schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)"
          schemeID="${config.digitoVerificacion}"
          schemeName="31">${config.nit}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      ${config.email ? `<cac:Contact><cbc:ElectronicMail>${x(config.email)}</cbc:ElectronicMail></cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Adquiriente -->
  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName><cbc:Name>${x(invoice.buyer.nombre)}</cbc:Name></cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:AddressLine><cac:Line>${x(invoice.buyer.address)}</cac:Line></cbc:AddressLine>
          <cbc:CityName>${x(invoice.buyer.city)}</cbc:CityName>
          <cac:Country><cbc:IdentificationCode>CO</cbc:IdentificationCode></cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${x(invoice.buyer.nombre)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195"
          schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)"
          schemeID="0"
          schemeName="${invoice.buyer.tipoDoc ?? '31'}">${x(invoice.buyer.nit)}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">R-99-PN</cbc:TaxLevelCode>
        <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${x(invoice.buyer.nombre)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195"
          schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)"
          schemeID="0"
          schemeName="${invoice.buyer.tipoDoc ?? '31'}">${x(invoice.buyer.nit)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      ${invoice.buyer.email ? `<cac:Contact><cbc:ElectronicMail>${x(invoice.buyer.email)}</cbc:ElectronicMail></cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Medio de pago -->
  <cac:PaymentMeans>
    <cbc:ID>${invoice.paymentMeans}</cbc:ID>
    <cbc:PaymentMeansCode>${invoice.paymentMeans === '1' ? '10' : '20'}</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${fecVen}</cbc:PaymentDueDate>
  </cac:PaymentMeans>

  <!-- Totales de impuestos -->
  ${invoice.totalIVA > 0 ? taxTotal('01', 'IVA', taxPct, invoice.totalIVA, invoice.subtotal) : ''}
  ${invoice.totalINC > 0 ? taxTotal('04', 'INC', 8, invoice.totalINC, invoice.subtotal) : ''}

  <!-- Total monetario -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Líneas de detalle -->
${lines}
</Invoice>`;
}

function calculateSoftwareSecurityCode(invoiceNumber: string, consecutivo: string, config: DIANConfig): string {
  // SHA384(softwareId + pin + prefijo + consecutivo)
  const input = `${config.softwareId}${config.softwarePin}${config.prefijo}${consecutivo}`;
  return sha384(input);
}

function taxTotal(codImp: string, nombre: string, rate: number, amount: number, base: number): string {
  return `
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${amount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${base.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${amount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>${rate.toFixed(2)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>${codImp}</cbc:ID><cbc:Name>${nombre}</cbc:Name></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`;
}

function itemLine(item: DIANItem): string {
  return `  <cac:InvoiceLine>
    <cbc:ID>${item.lineNumber}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.unit}">${item.qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${item.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${x(item.description)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="${item.unit}">1</cbc:BaseQuantity>
    </cac:Price>
    ${item.taxAmount > 0 ? taxTotal('01', 'IVA', item.taxRate, item.taxAmount, item.lineTotal) : ''}
  </cac:InvoiceLine>`;
}

function x(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Guardar XML en disco ───────────────────────────────────────

export function saveUBLXML(xml: string, invoiceNumber: string, ublDir: string): string {
  if (!fs.existsSync(ublDir)) fs.mkdirSync(ublDir, { recursive: true });
  const filename = `${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.xml`;
  const filepath = path.join(ublDir, filename);
  fs.writeFileSync(filepath, xml, 'utf8');
  return filepath;
}

// ── SOAP envelope para enviar a DIAN ──────────────────────────
// El XML debe ir firmado (XAdES) y en base64 dentro de un zip.
// Fase B: implementar firma + zip. Por ahora genera el envelope stub.

export function wrapInSOAPEnvelope(ublB64: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:wcf="http://wcf.dian.colombia">
  <soapenv:Header/>
  <soapenv:Body>
    <wcf:SendBillSync>
      <wcf:fileName>invoice.zip</wcf:fileName>
      <wcf:contentFile>${ublB64}</wcf:contentFile>
    </wcf:SendBillSync>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ── Enviar a DIAN (Fase B — stub) ─────────────────────────────

export interface DIANResponse {
  success: boolean;
  isValid?: boolean;
  errorMessage?: string;
  statusCode?: string;
  statusDescription?: string;
  cufe?: string;
  raw?: string;
}

export async function sendToDIAN(soapEnvelope: string, config: DIANConfig): Promise<DIANResponse> {
  const endpoint = config.testingMode
    ? 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc'
    : 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc';

  return new Promise((resolve) => {
    const body = Buffer.from(soapEnvelope, 'utf8');
    const url = new URL(endpoint);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync',
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        // Parsear respuesta DIAN (XML SOAP)
        const isValid = data.includes('<b:IsValid>true</b:IsValid>');
        const errorMatch = data.match(/<b:ErrorMessage>([^<]*)<\/b:ErrorMessage>/);
        const statusMatch = data.match(/<b:StatusDescription>([^<]*)<\/b:StatusDescription>/);
        resolve({
          success: res.statusCode === 200,
          isValid,
          errorMessage: errorMatch?.[1],
          statusDescription: statusMatch?.[1],
          raw: data,
        });
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, errorMessage: err.message });
    });

    req.write(body);
    req.end();
  });
}

// ── Construir DIANInvoiceData desde Invoice de Prisma ─────────

export function buildDIANInvoiceData(
  invoice: {
    id: string;
    number: number;
    amount: number;
    dueDate: Date;
    createdAt: Date;
    order?: { notes?: string | null } | null;
    client: {
      name: string;
      company?: string | null;
      rut?: string | null;
      address?: string | null;
      city?: string | null;
      department?: string | null;
      phone?: string | null;
      email?: string | null;
    };
    items?: Array<{
      description: string;
      qty: number;
      unitPrice: number;
      taxRate?: number;
    }>;
  },
  config: DIANConfig,
): DIANInvoiceData {
  const consecutivo = String(invoice.number).padStart(4, '0');
  const number = `${config.prefijo}${consecutivo}`;
  const taxRate = 19; // IVA estándar Colombia — en el futuro puede venir del item

  // Si no hay items detallados (Invoice actual solo tiene amount), creamos uno sintético
  const items: DIANItem[] = invoice.items?.length
    ? invoice.items.map((it, i) => {
        const tr = it.taxRate ?? taxRate;
        const lineTotal = it.qty * it.unitPrice;
        const taxAmount = lineTotal * (tr / 100);
        return {
          lineNumber: i + 1,
          description: it.description,
          qty: it.qty,
          unit: 'EA',
          unitPrice: it.unitPrice,
          taxRate: tr,
          taxAmount,
          lineTotal,
        };
      })
    : [{
        lineNumber: 1,
        description: 'Venta de productos electrónicos — ver pedido',
        qty: 1,
        unit: 'EA',
        unitPrice: invoice.amount / (1 + taxRate / 100),
        taxRate,
        taxAmount: invoice.amount - invoice.amount / (1 + taxRate / 100),
        lineTotal: invoice.amount / (1 + taxRate / 100),
      }];

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const totalIVA = items.reduce((s, i) => s + i.taxAmount, 0);
  const total = subtotal + totalIVA;

  return {
    invoiceId: invoice.id,
    number,
    consecutivo,
    issueDate: new Date(),
    dueDate: invoice.dueDate,
    paymentMeans: '1',
    currency: 'COP',
    buyer: {
      nit: invoice.client.rut?.replace(/\D/g, '') || '222222222',
      nombre: invoice.client.company || invoice.client.name,
      address: invoice.client.address || 'Sin dirección',
      city: invoice.client.city || 'Sin ciudad',
      department: invoice.client.department || '',
      countryCode: 'CO',
      phone: invoice.client.phone ?? undefined,
      email: invoice.client.email ?? undefined,
    },
    items,
    subtotal,
    totalIVA,
    totalINC: 0,
    totalICA: 0,
    total,
    notes: invoice.order?.notes ?? undefined,
  };
}
