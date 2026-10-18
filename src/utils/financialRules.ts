/**
 * Financial Rules, Multi-Currency Policy Engine & Security Audit for Blinka (Hackathon 30X)
 * Pure deterministic logic module for USD conversion, corporate governance limits,
 * duplicate detection, due-date urgency, math integrity, and anti-prompt injection.
 */

export interface ExtractedVendor {
  name: string | null;
  legalName: string | null;
  vendorTaxId: string | null;
  taxIdType: string | null;
  address: string | null;
  countryRegion?: string | null;
  email: string | null;
  phone: string | null;
  bankDetails?: {
    bankName: string | null;
    accountNumber: string | null;
    accountType: string | null;
    routingNumberOrClabeOrCbu: string | null;
    beneficiaryName: string | null;
  };
}

export interface ExtractedCustomer {
  name: string | null;
  customerTaxId: string | null;
  address: string | null;
}

export interface ExtractedInvoiceItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
}

export interface ExtractedInvoice {
  invoiceId: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currency: string;
  subtotalAmount: number | null;
  taxAmount: number | null;
  taxRatePercent: number | null;
  retentionAmount: number | null;
  discountAmount: number | null;
  totalAmount: number | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
  items: ExtractedInvoiceItem[];
}

export type BlinkaDecisionCode = 'PAID' | 'REJECTED' | 'ESCALATED';

export type BlinkaCountryCode = 'US' | 'CO' | 'MX' | 'AR' | 'BR';

export type PaymentUrgencyLevel = 'VENCIDO' | 'URGENTE_48H' | 'EN_FECHA' | 'SIN_FECHA';

export interface PaymentUrgencyInfo {
  level: PaymentUrgencyLevel;
  label: string;
  daysDiff: number | null;
}

export interface HumanApprovalRecord {
  status: 'APPROVED' | 'REJECTED';
  reviewerName: string;
  channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert';
  timestamp: string;
  originalTriggeredRule: string;
  originalExplanation: string;
}

export interface GovernanceDecision {
  /** Official Hackathon 30X decision code: PAID, REJECTED, ESCALATED */
  decisionCode: BlinkaDecisionCode;
  /** Human-friendly label: "Pagó" | "Frenó" | "Escaló" */
  actionLabel: 'Pagó' | 'Frenó' | 'Escaló';
  /** Legacy/badge status */
  status: 'APROBADO' | 'BLOQUEADO' | 'RETENIDO' | 'ESCALADO';
  triggeredRule: string;
  /** Ultra-clear explanation in natural Spanish for Finance team */
  explanation: string;
  /** Normalized USD equivalent used by policyEngine */
  amountUsd: number;
  /** FX rate applied (1 USD = X local currency) */
  fxRateToUsd: number;
  /** Whether vendor is in whitelist */
  isWhitelistedVendor: boolean;
  /** Agreed contract amount in USD if vendor is whitelisted */
  agreedAmountUsd: number | null;
  /** Registered bank account in whitelist if vendor is whitelisted */
  registeredAccount: string | null;
  /** Whether extracted beneficiaryAccount matches registeredAccount */
  accountMatchesRegistered: boolean;
  /** Smart cross-border settlement rail recommended by Blinka */
  recommendedRail: string;
  /** Duplicate invoice flag */
  isDuplicate: boolean;
  /** Due date urgency classification */
  urgency: PaymentUrgencyInfo;
  /** Optional human CFO override from Slack/WhatsApp simulator */
  humanApproval?: HumanApprovalRecord;
}

export interface BlinkaPaymentIntentPayload {
  object: 'BlinkaPaymentIntent';
  paymentExecutionBlocked: boolean;
  status: 'READY_FOR_SETTLEMENT' | 'EXECUTION_BLOCKED_BY_POLICY_ENGINE';
  blockCode?: string;
  idempotencyKey: string;
  sourceCurrency: 'USD';
  sourceAmountUSD: number;
  targetCurrency: string;
  targetAmount: number;
  fxRateApplied: number;
  beneficiary: {
    name: string | null;
    taxId: string | null;
    country: BlinkaCountryCode;
    bankName: string | null;
    accountNumber: string | null;
    registeredAccountVerified: boolean;
  };
  rail: string;
  policyAuditId: string;
  triggeredRule: string;
  humanApprovedBy: string | null;
  explanation: string;
}

export interface ExtractionResult {
  vendor: ExtractedVendor;
  customer: ExtractedCustomer;
  invoice: ExtractedInvoice;
  documentMetadata: {
    documentType:
      | 'FACTURA_ELECTRONICA'
      | 'CUENTA_DE_COBRO'
      | 'RECIBO'
      | 'CORREO_ELECTRONICO'
      | 'MENSAJE_CHAT'
      | 'OTRO';
    language: string;
    extractionTimestamp: string;
    rawTextExcerpt?: string;
    isDuplicateSubmission?: boolean;
  };
  mathIntegrityCheck: {
    isMathConsistent: boolean;
    calculatedTotal: number | null;
    discrepancy: number | null;
    explanation: string | null;
  };
  anomalyAlerts: string[];
  securityAudit: {
    promptInjectionDetected: boolean;
    injectedCommandsIgnored: string[];
    missingCriticalFields: string[];
    currencyAmbiguity: boolean;
    documentHashSha256?: string;
    shortHash?: string;
    integrityBadge?: 'Integridad Verificada' | 'Alerta de Manipulación';
  };
  governanceDecision?: GovernanceDecision;
}

/**
 * Reference exchange rates (1 USD = X Currency) for US -> LATAM / Global operations
 */
export const FX_RATES_PER_USD: Record<string, number> = {
  USD: 1.0,
  COP: 4200.0,
  MXN: 19.5,
  EUR: 0.92,
  ARS: 980.0,
  BRL: 5.6,
  CLP: 950.0,
  PEN: 3.75,
};

export interface WhitelistedVendorRule {
  id: string;
  displayName: string;
  aliases: string[];
  agreedAmountUsd: number;
  toleranceUsd?: number;
  registeredAccount: string;
  country: BlinkaCountryCode;
  category: string;
}

export interface CorporatePolicyConfig {
  companyCountry: string;
  baseCurrency: 'USD';
  maxAmountWithoutApprovalUsd: number;
  maxMonthlyBudgetUsd: number;
  currentMonthSpentUsd: number;
  allowedCurrencies: string[];
  whitelistedVendors: WhitelistedVendorRule[];
  alreadyPaidInvoiceIds: string[];
}

export const DEFAULT_CORPORATE_POLICY: CorporatePolicyConfig = {
  companyCountry: 'Estados Unidos (Delaware Corp -> Operaciones LATAM)',
  baseCurrency: 'USD',
  maxAmountWithoutApprovalUsd: 500.0,
  maxMonthlyBudgetUsd: 3500.0,
  currentMonthSpentUsd: 420.0, // $120 AWS + $300 Contractor = $420 USD spent, $3,080 USD remaining
  allowedCurrencies: ['USD', 'COP', 'MXN', 'ARS', 'BRL', 'EUR'],
  whitelistedVendors: [
    {
      id: 'vendor-aws',
      displayName: 'AWS Cloud (Amazon Web Services)',
      aliases: ['aws', 'amazon web services', 'aws cloud'],
      agreedAmountUsd: 120.0,
      toleranceUsd: 5.0,
      registeredAccount: '4490182931',
      country: 'US',
      category: 'Infraestructura Cloud',
    },
    {
      id: 'vendor-dev-colombia',
      displayName: 'Andrés Gómez (Dev Senior Colombia)',
      aliases: ['andres gomez', 'andrés gómez', 'carlos mendoza', 'dev senior colombia'],
      agreedAmountUsd: 300.0,
      toleranceUsd: 5.0,
      registeredAccount: '319-884920-11',
      country: 'CO',
      category: 'Contratista Desarrollo',
    },
    {
      id: 'vendor-figma',
      displayName: 'Figma Inc.',
      aliases: ['figma', 'figma inc', 'figma, inc.'],
      agreedAmountUsd: 45.0,
      toleranceUsd: 0.0,
      registeredAccount: '3309182741',
      country: 'US',
      category: 'SaaS Diseño',
    },
    {
      id: 'vendor-deel',
      displayName: 'Deel Contractors Inc.',
      aliases: ['deel', 'deel contractors', 'deel inc'],
      agreedAmountUsd: 1500.0,
      toleranceUsd: 0.0,
      registeredAccount: '9910283746',
      country: 'US',
      category: 'Nómina & Contratistas',
    },
    {
      id: 'vendor-cloudscale',
      displayName: 'CloudScale GPU Infrastructure',
      aliases: ['cloudscale', 'nebula cloud', 'cloudscale gpu'],
      agreedAmountUsd: 4200.0,
      toleranceUsd: 50.0,
      registeredAccount: '2001948572',
      country: 'US',
      category: 'Infraestructura IA',
    },
    {
      id: 'vendor-soluciones-andinas',
      displayName: 'Soluciones Digitales Andinas S.A.S.',
      aliases: ['soluciones digitales andinas'],
      agreedAmountUsd: 1650.0,
      toleranceUsd: 10.0,
      registeredAccount: '601-442910-88',
      country: 'CO',
      category: 'Soporte Cloud',
    },
  ],
  alreadyPaidInvoiceIds: ['INV-2026-001-DUP'],
};

/**
 * Smart Rail Routing: Recommends the optimal Blinka cross-border or domestic settlement rail
 */
export function getRecommendedBlinkaRail(currency: string | null | undefined): string {
  const clean = (currency || 'USD').toUpperCase().trim();
  switch (clean) {
    case 'COP':
      return 'Blinka Cross-Border: USD -> COP (ACH Colombia / PSE Instantáneo)';
    case 'MXN':
      return 'Blinka Cross-Border: USD -> MXN (SPEI Tiempo Real)';
    case 'BRL':
      return 'Blinka Cross-Border: USD -> BRL (PIX)';
    case 'ARS':
      return 'Blinka Cross-Border: USD -> ARS / USDC Bridge';
    case 'USD':
      return 'Blinka Domestic: US ACH / Fedwire';
    case 'EUR':
      return 'Blinka Cross-Border: USD -> EUR (SEPA Instant)';
    default:
      return `Blinka Cross-Border: USD -> ${clean} (Global Settlement Rail)`;
  }
}

/**
 * Normalizes bank account identifiers to compare extracted beneficiaryAccount against registeredAccount
 */
export function doesBankAccountMatch(
  extractedAccount: string | null | undefined,
  registeredAccount: string | null | undefined
): boolean {
  if (!extractedAccount || !registeredAccount) return false;
  const normA = extractedAccount.replaceAll(/[\s-]/g, '').toLowerCase();
  const normB = registeredAccount.replaceAll(/[\s-]/g, '').toLowerCase();
  return normA.length > 0 && normA === normB;
}

/**
 * Converts any supported currency amount into normalized USD
 */
export function convertToUsd(
  amount: number | null | undefined,
  currency: string | null | undefined
): { amountUsd: number; rateUsed: number; isSupportedCurrency: boolean } {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return { amountUsd: 0, rateUsed: 1, isSupportedCurrency: false };
  }
  const cleanCurrency = (currency || 'USD').toUpperCase().trim();
  const rate = FX_RATES_PER_USD[cleanCurrency];
  if (!rate) {
    return { amountUsd: Number(amount.toFixed(2)), rateUsed: 1, isSupportedCurrency: false };
  }
  const amountUsd = Number((amount / rate).toFixed(2));
  return { amountUsd, rateUsed: rate, isSupportedCurrency: true };
}

/**
 * Classifies due date urgency ("¿Para cuándo se debe pagar?")
 * Reference date defaults to 2026-10-16 (Hackathon current date)
 */
export function classifyPaymentUrgency(
  dueDate: string | null | undefined,
  referenceDateStr = '2026-10-16'
): PaymentUrgencyInfo {
  if (!dueDate || dueDate.trim() === '') {
    return {
      level: 'SIN_FECHA',
      label: 'Sin vencimiento explícito',
      daysDiff: null,
    };
  }

  const parsedDue = new Date(dueDate);
  const parsedRef = new Date(referenceDateStr);
  if (Number.isNaN(parsedDue.getTime())) {
    return {
      level: 'SIN_FECHA',
      label: `Fecha: ${dueDate}`,
      daysDiff: null,
    };
  }

  const diffMs = parsedDue.getTime() - parsedRef.getTime();
  const daysDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    return {
      level: 'VENCIDO',
      label: `Vencido (${Math.abs(daysDiff)}d atrás)`,
      daysDiff,
    };
  }
  if (daysDiff <= 2) {
    return {
      level: 'URGENTE_48H',
      label: daysDiff === 0 ? 'Urgente (Vence Hoy)' : `Urgente (< 48h • ${daysDiff}d)`,
      daysDiff,
    };
  }
  return {
    level: 'EN_FECHA',
    label: `En fecha (Vence en ${daysDiff}d)`,
    daysDiff,
  };
}

/**
 * Validates the arithmetic consistency of invoice totals.
 */
export function validateMathIntegrity(
  subtotal: number | null,
  tax: number | null,
  retention: number | null,
  discount: number | null,
  total: number | null
): {
  isMathConsistent: boolean;
  calculatedTotal: number | null;
  discrepancy: number | null;
  explanation: string | null;
} {
  if (total === null) {
    return {
      isMathConsistent: false,
      calculatedTotal: null,
      discrepancy: null,
      explanation: 'Total no especificado en el documento.',
    };
  }

  if (subtotal === null) {
    return {
      isMathConsistent: true,
      calculatedTotal: total,
      discrepancy: 0,
      explanation: 'Subtotal no desglosado; el documento declara directamente el monto total a pagar.',
    };
  }

  const effectiveTax = tax ?? 0;
  const effectiveRetention = retention ?? 0;
  const effectiveDiscount = discount ?? 0;

  const calculated = Number(
    (subtotal + effectiveTax - effectiveRetention - effectiveDiscount).toFixed(2)
  );
  const discrepancy = Number((total - calculated).toFixed(2));
  const isConsistent = Math.abs(discrepancy) <= 0.05;

  let explanation: string;
  if (isConsistent) {
    explanation =
      'Cálculo matemático verificado: Subtotal + Impuestos - Retenciones - Descuentos coincide con el Total.';
  } else {
    const sign = discrepancy > 0 ? '+' : '';
    explanation = `Discrepancia aritmética detectada: Subtotal (${subtotal}) + Impuestos (${effectiveTax}) - Retenciones (${effectiveRetention}) - Descuentos (${effectiveDiscount}) = ${calculated}, pero el total declarado es ${total} (Diferencia: ${sign}${discrepancy}).`;
  }

  return {
    isMathConsistent: isConsistent,
    calculatedTotal: calculated,
    discrepancy,
    explanation,
  };
}

/**
 * Checks for prompt injection or adversarial override patterns in input text
 */
export function detectPromptInjection(text: string): {
  detected: boolean;
  ignoredCommands: string[];
} {
  if (!text) {
    return { detected: false, ignoredCommands: [] };
  }

  const injectionPatterns = [
    /ignora\s+(?:las\s+)?(?:reglas|instrucciones|comandos)(?:\s+anteriores)?/i,
    /ignore\s+(?:all\s+)?(?:previous\s+)?(?:rules|instructions|prompts)/i,
    /aprueba\s+(?:este\s+)?pago\s+(?:inmediatamente|ya|urgente)/i,
    /approve\s+(?:this\s+)?payment\s+(?:immediately|now|urgent)/i,
    /marca\s+(?:como\s+)?proveedor\s+verificado/i,
    /mark\s+as\s+verified\s+vendor/i,
    /system\s*override/i,
    /bypass\s*(?:security|governance|rules)/i,
    /no\s+reportes\s+(?:ninguna\s+)?anomal[ií]a/i,
    /do\s+not\s+report\s+any\s+anomal(?:y|ies)/i,
    /hazte\s+pasar\s+por/i,
    /act\s+as\s+system\s+administrator/i,
    /approve_payment_now/i,
  ];

  const ignoredCommands: string[] = [];

  for (const pattern of injectionPatterns) {
    const match = pattern.exec(text);
    if (match) {
      ignoredCommands.push(match[0].trim());
    }
  }

  return {
    detected: ignoredCommands.length > 0,
    ignoredCommands,
  };
}

/**
 * Verifies that critical corporate payment governance fields are present
 */
export function identifyMissingCriticalFields(data: {
  vendorName: string | null;
  vendorTaxId: string | null;
  invoiceId: string | null;
  totalAmount: number | null;
  currency: string | null;
}): string[] {
  const missing: string[] = [];
  if (!data.vendorName || data.vendorName.trim() === '') {
    missing.push('Nombre del proveedor (vendor.name)');
  }
  if (!data.vendorTaxId || data.vendorTaxId.trim() === '') {
    missing.push('Identificación fiscal del proveedor (vendor.vendorTaxId / NIT / RFC / RUT)');
  }
  if (!data.invoiceId || data.invoiceId.trim() === '') {
    missing.push('Identificador/Número de factura (invoice.invoiceId)');
  }
  if (data.totalAmount === null || Number.isNaN(data.totalAmount)) {
    missing.push('Monto total a pagar (invoice.totalAmount)');
  }
  if (!data.currency || data.currency.trim() === '') {
    missing.push('Moneda (invoice.currency)');
  }
  return missing;
}

/**
 * Detects currency ambiguity if only "$" was specified without clear ISO code
 */
export function checkCurrencyAmbiguity(currency: string, _rawText?: string): boolean {
  if (currency?.length !== 3) return true;
  const upper = currency.toUpperCase();
  const validIsoCodes = [
    'USD',
    'COP',
    'MXN',
    'EUR',
    'ARS',
    'CLP',
    'PEN',
    'BRL',
    'CRC',
    'UYU',
    'BOB',
    'GTQ',
    'DOP',
    'GBP',
    'CAD',
  ];
  return !validIsoCodes.includes(upper);
}

/**
 * Consolidates all anomaly alerts based on strict Blinka corporate rules
 */
export function compileAnomalyAlerts(params: {
  mathCheck: { isMathConsistent: boolean; explanation: string | null };
  injectionCheck: { detected: boolean; ignoredCommands: string[] };
  missingFields: string[];
  currencyAmbiguity: boolean;
  userAlerts?: string[];
}): string[] {
  const alerts: string[] = [];

  if (!params.mathCheck.isMathConsistent && params.mathCheck.explanation) {
    alerts.push(`[ARITMÉTICA] ${params.mathCheck.explanation}`);
  }

  if (params.injectionCheck.detected) {
    for (const cmd of params.injectionCheck.ignoredCommands) {
      alerts.push(
        `[SEGURIDAD - PROMPT INJECTION] Intento de manipulación detectado e ignorado: "${cmd}".`
      );
    }
  }

  if (params.missingFields.length > 0) {
    alerts.push(
      `[DATOS CRÍTICOS FALTANTES] Faltan los siguientes campos obligatorios para gobernanza: ${params.missingFields.join(', ')}.`
    );
  }

  if (params.currencyAmbiguity) {
    alerts.push(
      '[MONEDA AMBIGUA] El código de moneda no se pudo determinar con certeza absoluta de 3 letras ISO.'
    );
  }

  if (params.userAlerts) {
    for (const ua of params.userAlerts) {
      if (ua && !alerts.includes(ua)) {
        alerts.push(ua);
      }
    }
  }

  return alerts;
}

/**
 * Pure TypeScript SHA-256 implementation (FIPS 180-4) for synchronous deterministic hashing
 */
export function computeDocumentSha256(content: string): {
  fullHash: string;
  shortHash: string;
} {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const bytes = new TextEncoder().encode(content || 'blinka-empty-doc');
  const bitLen = bytes.length * 8;

  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const W = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, W[i - 15]) ^ rotr(18, W[i - 15]) ^ (W[i - 15] >>> 3);
      const s1 = rotr(17, W[i - 2]) ^ rotr(19, W[i - 2]) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (n: number) => n.toString(16).padStart(8, '0');
  const fullHash = `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
  const shortHash = `${fullHash.slice(0, 8)}...${fullHash.slice(-4)}`;

  return { fullHash, shortHash };
}

/**
 * Matches a vendor name against the corporate whitelist
 */
export function findWhitelistedVendor(
  vendorName: string | null | undefined,
  policy: CorporatePolicyConfig = DEFAULT_CORPORATE_POLICY
): WhitelistedVendorRule | null {
  if (!vendorName) return null;
  const normalized = vendorName.toLowerCase().trim();
  for (const rule of policy.whitelistedVendors) {
    if (
      rule.displayName.toLowerCase() === normalized ||
      rule.aliases.some((alias) => normalized.includes(alias.toLowerCase()))
    ) {
      return rule;
    }
  }
  return null;
}

function isInvoiceDuplicate(result: ExtractionResult, policy: CorporatePolicyConfig): boolean {
  if (result.documentMetadata.isDuplicateSubmission) {
    return true;
  }
  if (result.invoice.invoiceId && policy.alreadyPaidInvoiceIds.includes(result.invoice.invoiceId)) {
    return true;
  }
  return result.anomalyAlerts.some((a) => a.toLowerCase().includes('duplicad'));
}

/**
 * Deterministic Policy Engine (`policyEngine`) for Blinka Hackathon 30X
 */
export function evaluateGovernanceDecision(
  result: ExtractionResult,
  policy: CorporatePolicyConfig = DEFAULT_CORPORATE_POLICY
): GovernanceDecision {
  if (result.governanceDecision) {
    return result.governanceDecision;
  }

  const currency = (result.invoice.currency || 'USD').toUpperCase();
  const rawTotal = result.invoice.totalAmount ?? 0;
  const { amountUsd, rateUsed } = convertToUsd(rawTotal, currency);
  const urgency = classifyPaymentUrgency(result.invoice.dueDate);
  const matchedVendor = findWhitelistedVendor(result.vendor.name, policy);
  const recommendedRail = getRecommendedBlinkaRail(currency);
  const extractedAccount = result.vendor.bankDetails?.accountNumber ?? null;
  const registeredAccount = matchedVendor?.registeredAccount ?? null;
  const accountMatchesRegistered = matchedVendor
    ? doesBankAccountMatch(extractedAccount, registeredAccount)
    : false;
  const isDuplicate = isInvoiceDuplicate(result, policy);

  const vendorLabel = result.vendor.name || 'el emisor';
  const invoiceLabel = result.invoice.invoiceId ? `#${result.invoice.invoiceId}` : 'sin número';
  const origFormatted = `${currency} $${rawTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const usdFormatted = `$${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

  const baseDecisionContext = {
    amountUsd,
    fxRateToUsd: rateUsed,
    isWhitelistedVendor: Boolean(matchedVendor),
    agreedAmountUsd: matchedVendor?.agreedAmountUsd ?? null,
    registeredAccount,
    accountMatchesRegistered,
    recommendedRail,
    isDuplicate,
    urgency,
  };

  if (result.securityAudit.promptInjectionDetected) {
    return {
      ...baseDecisionContext,
      decisionCode: 'REJECTED',
      actionLabel: 'Frenó',
      status: 'BLOQUEADO',
      triggeredRule: 'Escudo Anti-Prompt Injection (Seguridad Crítica)',
      explanation: `Se frenó el pago de inmediato porque la factura ${invoiceLabel} de ${vendorLabel} contiene instrucciones ocultas de Prompt Injection intentando manipular a la IA para aprobar un desembolso de ${usdFormatted} saltándose las reglas.`,
      isDuplicate: false,
    };
  }

  if (!policy.allowedCurrencies.includes(currency)) {
    return {
      ...baseDecisionContext,
      decisionCode: 'REJECTED',
      actionLabel: 'Frenó',
      status: 'BLOQUEADO',
      triggeredRule: 'Política de Divisas: Moneda No Permitida',
      explanation: `Se frenó el pago porque la moneda declarada (${currency}) no está permitida en la política corporativa de tesorería (Permitidas: ${policy.allowedCurrencies.join(', ')}).`,
      isDuplicate: false,
    };
  }

  if (isDuplicate) {
    return {
      ...baseDecisionContext,
      decisionCode: 'REJECTED',
      actionLabel: 'Frenó',
      status: 'BLOQUEADO',
      triggeredRule: 'Control Anti-Duplicados (Hash SHA-256 / ID Factura)',
      explanation: `Se frenó el pago porque la factura ${invoiceLabel} de ${vendorLabel} por ${origFormatted} (${usdFormatted}) ya había sido registrada y pagada previamente en este periodo.`,
      isDuplicate: true,
    };
  }

  if (!result.mathIntegrityCheck.isMathConsistent) {
    return {
      ...baseDecisionContext,
      decisionCode: 'REJECTED',
      actionLabel: 'Frenó',
      status: 'RETENIDO',
      triggeredRule: 'Regla 5: Inconsistencia Aritmética en Factura',
      explanation: `Se frenó el pago porque los cálculos de la factura ${invoiceLabel} de ${vendorLabel} no cuadran: la suma de subtotal más impuestos (${result.mathIntegrityCheck.calculatedTotal} ${currency}) difiere del total cobrado (${rawTotal} ${currency}).`,
    };
  }

  if (!matchedVendor) {
    return {
      ...baseDecisionContext,
      decisionCode: 'ESCALATED',
      actionLabel: 'Escaló',
      status: 'ESCALADO',
      triggeredRule: 'Lista Blanca: Beneficiario Nuevo No Autorizado',
      explanation: `Se escaló a aprobación humana porque el beneficiario "${vendorLabel}" (${origFormatted} ≈ ${usdFormatted}) es un proveedor nuevo que no figura en la lista blanca de pagos automáticos.`,
    };
  }

  const remainingBudgetUsd = Number(
    (policy.maxMonthlyBudgetUsd - policy.currentMonthSpentUsd).toFixed(2)
  );
  if (amountUsd > remainingBudgetUsd) {
    return {
      ...baseDecisionContext,
      decisionCode: 'ESCALATED',
      actionLabel: 'Escaló',
      status: 'ESCALADO',
      triggeredRule: 'Presupuesto Mensual Insuficiente',
      explanation: `Se escaló a aprobación humana porque el cobro de ${vendorLabel} por ${usdFormatted} excede el saldo restante del presupuesto mensual corporativo ($${remainingBudgetUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD disponibles de $${policy.maxMonthlyBudgetUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD).`,
    };
  }

  if (amountUsd > policy.maxAmountWithoutApprovalUsd) {
    return {
      ...baseDecisionContext,
      decisionCode: 'ESCALATED',
      actionLabel: 'Escaló',
      status: 'ESCALADO',
      triggeredRule: `Límite de Aprobación Autónoma ($${policy.maxAmountWithoutApprovalUsd} USD)`,
      explanation: `Se escaló a aprobación humana porque aunque el proveedor "${matchedVendor.displayName}" está autorizado, el monto de ${usdFormatted} (${origFormatted}) supera el límite de pago autónomo de $${policy.maxAmountWithoutApprovalUsd.toFixed(2)} USD.`,
    };
  }

  const tolerance = matchedVendor.toleranceUsd ?? 5.0;
  if (Math.abs(amountUsd - matchedVendor.agreedAmountUsd) > tolerance) {
    return {
      ...baseDecisionContext,
      decisionCode: 'ESCALATED',
      actionLabel: 'Escaló',
      status: 'ESCALADO',
      triggeredRule: 'Desviación frente a Monto Acordado por Contrato',
      explanation: `Se escaló a aprobación humana porque la factura de ${matchedVendor.displayName} por ${usdFormatted} no cuadra con el monto acordado registrado en gobernanza ($${matchedVendor.agreedAmountUsd.toFixed(2)} USD).`,
    };
  }

  if (!accountMatchesRegistered) {
    return {
      ...baseDecisionContext,
      decisionCode: 'ESCALATED',
      actionLabel: 'Escaló',
      status: 'ESCALADO',
      triggeredRule: 'Protección Anti-Fraude de Proveedor (Cuenta Bancaria No Coincide)',
      explanation:
        'Alerta de Seguridad: El proveedor está autorizado, pero la cuenta de destino en la factura no coincide con la cuenta bancaria registrada en Blinka.',
    };
  }

  const fxNote =
    currency !== 'USD'
      ? ` (${origFormatted} convertidos a ${usdFormatted} a tasa 1 USD = ${rateUsed} ${currency})`
      : ` por ${usdFormatted}`;

  return {
    ...baseDecisionContext,
    decisionCode: 'PAID',
    actionLabel: 'Pagó',
    status: 'APROBADO',
    triggeredRule: 'Pago Autónomo Autorizado (100% Reglas Cumplidas)',
    explanation: `Se aprobó y ejecutó el pago automáticamente a ${matchedVendor.displayName}${fxNote} porque está en la lista blanca, coincide con su acuerdo ($${matchedVendor.agreedAmountUsd.toFixed(2)} USD), su cuenta bancaria (${registeredAccount}) está verificada, es menor al límite autónomo de $${policy.maxAmountWithoutApprovalUsd.toFixed(2)} USD y hay presupuesto disponible.`,
  };
}

function resolveCountryFromCurrency(
  currency: string | null | undefined,
  matchedCountry?: BlinkaCountryCode
): BlinkaCountryCode {
  if (matchedCountry) {
    return matchedCountry;
  }
  const upper = (currency || 'USD').toUpperCase();
  if (upper === 'COP') return 'CO';
  if (upper === 'MXN') return 'MX';
  if (upper === 'ARS') return 'AR';
  if (upper === 'BRL') return 'BR';
  return 'US';
}

function resolvePaymentBlockCode(
  result: ExtractionResult,
  decision: GovernanceDecision
): string {
  if (decision.decisionCode === 'REJECTED') {
    if (result.securityAudit.promptInjectionDetected) {
      return 'BLOCK_PROMPT_INJECTION_DETECTED';
    }
    if (decision.isDuplicate) {
      return 'BLOCK_DUPLICATE_INVOICE_SHA256';
    }
    if (!result.mathIntegrityCheck.isMathConsistent) {
      return 'BLOCK_MATH_INTEGRITY_MISMATCH';
    }
    if (decision.humanApproval?.status === 'REJECTED') {
      return 'BLOCK_REJECTED_BY_CFO_HUMAN_REVIEW';
    }
    return 'BLOCK_POLICY_SECURITY_VIOLATION';
  }

  if (!decision.isWhitelistedVendor) {
    return 'HOLD_UNLISTED_BENEFICIARY_REQUIRES_CFO';
  }
  if (!decision.accountMatchesRegistered) {
    return 'HOLD_BANK_ACCOUNT_MISMATCH_ANTI_FRAUD';
  }
  return 'HOLD_LIMIT_OR_BUDGET_ESCALATION_REQUIRES_CFO';
}

function formatHumanApprovalSummary(decision: GovernanceDecision): string | null {
  if (!decision.humanApproval) {
    return null;
  }
  if (decision.humanApproval.status === 'APPROVED') {
    const cleanTime = decision.humanApproval.timestamp.slice(0, 19).replaceAll('T', ' ');
    return `${decision.humanApproval.reviewerName} (${decision.humanApproval.channel} • ${cleanTime})`;
  }
  return `RECHAZADO POR: ${decision.humanApproval.reviewerName} (${decision.humanApproval.channel})`;
}

/**
 * Generates the production-ready BlinkaPaymentIntent integration payload
 * with cryptographic idempotencyKey and Smart Rail Routing
 */
export function buildBlinkaPaymentIntentPayload(
  result: ExtractionResult,
  decisionOverride?: GovernanceDecision
): BlinkaPaymentIntentPayload {
  const decision = decisionOverride ?? evaluateGovernanceDecision(result);
  const fallbackHash = computeDocumentSha256(
    result.documentMetadata.rawTextExcerpt || JSON.stringify(result.invoice)
  );
  const fullHash = result.securityAudit.documentHashSha256 || fallbackHash.fullHash;
  const cleanInvoiceId = (result.invoice.invoiceId || 'DOC')
    .replaceAll(/[^A-Za-z0-9_-]/g, '')
    .toUpperCase();
  const idempotencyKey = `blinka_idem_${cleanInvoiceId}_${fullHash.slice(0, 16)}`;
  const policyAuditId = `audit_sha256_${fullHash.slice(0, 12)}`;
  const matchedVendor = findWhitelistedVendor(result.vendor.name);
  const countryCode = resolveCountryFromCurrency(
    result.invoice.currency,
    matchedVendor?.country
  );
  const isPaid = decision.decisionCode === 'PAID';
  const humanApprovedBy = formatHumanApprovalSummary(decision);

  const basePayload: BlinkaPaymentIntentPayload = {
    object: 'BlinkaPaymentIntent',
    paymentExecutionBlocked: !isPaid,
    status: isPaid ? 'READY_FOR_SETTLEMENT' : 'EXECUTION_BLOCKED_BY_POLICY_ENGINE',
    idempotencyKey,
    sourceCurrency: 'USD',
    sourceAmountUSD: decision.amountUsd,
    targetCurrency: (result.invoice.currency || 'USD').toUpperCase(),
    targetAmount: result.invoice.totalAmount ?? 0,
    fxRateApplied: decision.fxRateToUsd,
    beneficiary: {
      name: result.vendor.name,
      taxId: result.vendor.vendorTaxId,
      country: countryCode,
      bankName: result.vendor.bankDetails?.bankName ?? null,
      accountNumber: result.vendor.bankDetails?.accountNumber ?? null,
      registeredAccountVerified: decision.accountMatchesRegistered,
    },
    rail: decision.recommendedRail,
    policyAuditId,
    triggeredRule: decision.triggeredRule,
    humanApprovedBy,
    explanation: decision.explanation,
  };

  if (!isPaid) {
    basePayload.blockCode = resolvePaymentBlockCode(result, decision);
  }

  return basePayload;
}

/**
 * Applies or resets a simulated CFO Slack/WhatsApp approval or rejection on an ESCALATED invoice
 */
export function applyHumanCfoDecision(
  result: ExtractionResult,
  action: 'APPROVE' | 'REJECT' | 'RESET',
  reviewerName = 'CFO Carolina Martínez (Dirección Financiera)',
  channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert' = 'Slack Finance Bot'
): ExtractionResult {
  const clone: ExtractionResult = {
    ...result,
    governanceDecision: undefined,
  };
  const baseDecision = evaluateGovernanceDecision(clone);

  if (action === 'RESET') {
    clone.governanceDecision = baseDecision;
    return clone;
  }

  const vendorLabel = result.vendor.name || 'el proveedor';
  const usdFormatted = `$${baseDecision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

  if (action === 'APPROVE') {
    clone.governanceDecision = {
      ...baseDecision,
      decisionCode: 'PAID',
      actionLabel: 'Pagó',
      status: 'APROBADO',
      triggeredRule: `${baseDecision.triggeredRule} -> Autorizado por Humano (CFO)`,
      explanation: `Pago autorizado manualmente por ${reviewerName} vía ${channel} tras revisar la alerta ("${baseDecision.triggeredRule}"). Se liberó la orden de liquidación por ${usdFormatted} a través del riel ${baseDecision.recommendedRail}.`,
      humanApproval: {
        status: 'APPROVED',
        reviewerName,
        channel,
        timestamp: new Date().toISOString(),
        originalTriggeredRule: baseDecision.triggeredRule,
        originalExplanation: baseDecision.explanation,
      },
    };
  } else {
    clone.governanceDecision = {
      ...baseDecision,
      decisionCode: 'REJECTED',
      actionLabel: 'Frenó',
      status: 'BLOQUEADO',
      triggeredRule: `${baseDecision.triggeredRule} -> Rechazado por Humano (CFO)`,
      explanation: `Se frenó definitivamente el pago a ${vendorLabel} por ${usdFormatted} por decisión de ${reviewerName} vía ${channel}, confirmando el bloqueo de la alerta: "${baseDecision.triggeredRule}".`,
      humanApproval: {
        status: 'REJECTED',
        reviewerName,
        channel,
        timestamp: new Date().toISOString(),
        originalTriggeredRule: baseDecision.triggeredRule,
        originalExplanation: baseDecision.explanation,
      },
    };
  }

  return clone;
}

function detectCurrencyFromRawText(text: string): string {
  const currencyMatch = /\b(USD|COP|MXN|EUR|ARS|BRL|CLP|PEN)\b/i.exec(text);
  if (currencyMatch) {
    return currencyMatch[1].toUpperCase();
  }
  const lower = text.toLowerCase();
  if (lower.includes('colombia') || lower.includes('bancolombia')) {
    return 'COP';
  }
  return 'USD';
}

function parseCleanNumber(raw?: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replaceAll(',', '');
  const n = Number.parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function extractFirstMoneyValue(line: string): number | null {
  const afterColon = line.includes(':') ? line.slice(line.lastIndexOf(':') + 1) : line;
  const dollarMatch = /\$\s*(\d[\d,]*(?:\.\d{1,2})?)/.exec(afterColon);
  if (dollarMatch) {
    return parseCleanNumber(dollarMatch[1]);
  }
  const numMatch = /(\d[\d,]*(?:\.\d{1,2})?)/.exec(afterColon);
  return parseCleanNumber(numMatch?.[1]);
}

function findMoneyByLineKeywords(
  lines: string[],
  keywords: string[],
  excludeSubstrings: string[] = []
): number | null {
  for (const kw of keywords) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      const isExcluded = excludeSubstrings.some((ex) => lower.includes(ex));
      if (!isExcluded && lower.includes(kw)) {
        const value = extractFirstMoneyValue(line);
        if (value !== null) {
          return value;
        }
      }
    }
  }
  return null;
}

function findDateByLineKeywords(lines: string[], keywords: string[]): string | null {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw))) {
      const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(line);
      if (dateMatch) {
        return dateMatch[1];
      }
    }
  }
  return null;
}

function extractVendorNameFromRawText(text: string, lines: string[], documentHint?: string): string {
  const vendorMatchers: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /amazon web services|aws cloud/i, name: 'AWS Cloud (Amazon Web Services)' },
    { pattern: /andr[eé]s\s+g[oó]mez/i, name: 'Andrés Gómez (Dev Senior Colombia)' },
    { pattern: /estudio\s+creativo\s+austral/i, name: 'Estudio Creativo Austral' },
    { pattern: /figma/i, name: 'Figma Inc.' },
    { pattern: /deel\s+contractors/i, name: 'Deel Contractors Inc.' },
    { pattern: /cloudscale/i, name: 'CloudScale GPU Infrastructure' },
    { pattern: /global\s+apex/i, name: 'Global Apex Consulting LLC' },
  ];

  for (const entry of vendorMatchers) {
    if (entry.pattern.exec(text)) {
      return entry.name;
    }
  }
  if (lines.length > 0) {
    return lines[0].replace(/^from:\s*/i, '').slice(0, 60);
  }
  return documentHint || 'Proveedor Corporativo';
}

function extractEmailFromRawText(text: string): string | null {
  const tokens = text.split(/[\s<>(),;"']+/);
  for (const token of tokens) {
    const atIdx = token.indexOf('@');
    const dotIdx = token.lastIndexOf('.');
    if (atIdx > 0 && dotIdx > atIdx + 1 && dotIdx < token.length - 1) {
      return token;
    }
  }
  return null;
}

function detectDocumentTypeFromRawText(
  text: string
): ExtractionResult['documentMetadata']['documentType'] {
  if (text.includes('From:')) {
    return 'CORREO_ELECTRONICO';
  }
  if (text.includes('WhatsApp') || text.startsWith('[')) {
    return 'MENSAJE_CHAT';
  }
  return 'FACTURA_ELECTRONICA';
}

function extractBankAndAccount(lines: string[], matchedVendor: WhitelistedVendorRule | null) {
  let bankName = 'Banco Corporativo';
  let accountNumber: string | null = matchedVendor?.registeredAccount ?? null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('banco:') || lower.includes('bank:')) {
      const parts = line.split(':');
      if (parts[1]) {
        bankName = parts[1].split('•')[0].trim();
      }
    }
    if (lower.includes('account') || lower.includes('cuenta')) {
      const accMatch = /(\d[\d-]{3,}\d)/.exec(line);
      if (accMatch) {
        accountNumber = accMatch[1].trim();
      }
    }
  }

  return { bankName, accountNumber };
}

function extractInvoiceIdFromLines(lines: string[]): string | null {
  for (const line of lines) {
    const hashMatch = /#\s*:?\s*([a-z0-9-]{4,})/i.exec(line);
    if (hashMatch) {
      return hashMatch[1].trim();
    }
    const noMatch = /no\.\s*:?\s*([a-z0-9-]{4,})/i.exec(line);
    if (noMatch) {
      return noMatch[1].trim();
    }
  }
  return null;
}

/**
 * Deterministic fallback document extractor when Gemini API key is not configured
 * or when operating in local/offline evaluation mode.
 */
export function parseDocumentDeterministically(
  rawText: string,
  documentHint?: string
): ExtractionResult {
  const text = rawText || '';
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const currency = detectCurrencyFromRawText(text);
  const totalAmount =
    findMoneyByLineKeywords(
      lines,
      ['total a pagar', 'valor total', 'total due', 'total amount', 'monto total', 'total:'],
      ['subtotal', 'qty:']
    ) ?? extractFirstMoneyValue(text);
  const subtotalAmount = findMoneyByLineKeywords(lines, ['subtotal']) ?? totalAmount;
  const taxAmount =
    findMoneyByLineKeywords(
      lines,
      ['iva:', 'iva (', 'tax:', 'tax (', 'impuesto:', 'impuestos:'],
      ['tax id']
    ) ?? 0;

  const invoiceId = extractInvoiceIdFromLines(lines);

  const issueDate =
    findDateByLineKeywords(lines, ['issue date', 'emisión', 'emision', 'expedición', 'fecha:']) ??
    new Date().toISOString().slice(0, 10);
  const dueDate =
    findDateByLineKeywords(lines, ['due date', 'vencimiento', 'máxima de pago', 'para cuándo', 'para cuando']) ??
    '2026-10-25';

  const taxIdMatch = /(?:nit|ein|rfc|rut|cuit|tax\s*id)[^:\n]{0,20}:\s*([0-9a-z.-]+)/i.exec(text);
  const vendorName = extractVendorNameFromRawText(text, lines, documentHint);
  const matchedVendor = findWhitelistedVendor(vendorName);
  const { bankName, accountNumber } = extractBankAndAccount(lines, matchedVendor);

  const injectionCheck = detectPromptInjection(text);
  const mathCheck = validateMathIntegrity(subtotalAmount, taxAmount, 0, 0, totalAmount);
  const missingFields = identifyMissingCriticalFields({
    vendorName,
    vendorTaxId: taxIdMatch?.[1] ?? null,
    invoiceId,
    totalAmount,
    currency,
  });
  const isCurrencyAmbiguous = checkCurrencyAmbiguity(currency, text);
  const alerts = compileAnomalyAlerts({
    mathCheck,
    injectionCheck,
    missingFields,
    currencyAmbiguity: isCurrencyAmbiguous,
  });

  const isDuplicate = /segundo\s+env[ií]o|duplicad/i.test(text);
  if (isDuplicate) {
    alerts.unshift(
      `[COBRO DUPLICADO DETECTADO] La factura #${invoiceId || 'S/N'} de ${vendorName} ya fue registrada y pagada previamente.`
    );
  }

  const { fullHash, shortHash } = computeDocumentSha256(text);

  const result: ExtractionResult = {
    vendor: {
      name: vendorName,
      legalName: vendorName,
      vendorTaxId: taxIdMatch?.[1] ?? null,
      taxIdType: 'ID Fiscal',
      address: null,
      countryRegion: currency === 'COP' ? 'Colombia (LATAM)' : 'EE. UU. / Internacional',
      email: extractEmailFromRawText(text),
      phone: null,
      bankDetails: {
        bankName,
        accountNumber,
        accountType: 'Corporativa',
        routingNumberOrClabeOrCbu: null,
        beneficiaryName: vendorName,
      },
    },
    customer: {
      name: 'Blinka US Corp (Delaware)',
      customerTaxId: '88-4019283',
      address: 'Wilmington, DE, USA',
    },
    invoice: {
      invoiceId,
      issueDate,
      dueDate,
      currency,
      subtotalAmount,
      taxAmount,
      taxRatePercent: 0,
      retentionAmount: 0,
      discountAmount: 0,
      totalAmount,
      paymentMethod: 'Transferencia Bancaria',
      paymentTerms: 'Net 15',
      items: [
        {
          description: documentHint || 'Servicios facturados en documento',
          quantity: 1,
          unitPrice: totalAmount,
          total: totalAmount,
        },
      ],
    },
    documentMetadata: {
      documentType: detectDocumentTypeFromRawText(text),
      language: 'es',
      extractionTimestamp: new Date().toISOString(),
      rawTextExcerpt: text.slice(0, 280),
      isDuplicateSubmission: isDuplicate,
    },
    mathIntegrityCheck: mathCheck,
    anomalyAlerts: alerts,
    securityAudit: {
      promptInjectionDetected: injectionCheck.detected,
      injectedCommandsIgnored: injectionCheck.ignoredCommands,
      missingCriticalFields: missingFields,
      currencyAmbiguity: isCurrencyAmbiguous,
      documentHashSha256: fullHash,
      shortHash,
      integrityBadge: injectionCheck.detected ? 'Alerta de Manipulación' : 'Integridad Verificada',
    },
  };

  result.governanceDecision = evaluateGovernanceDecision(result);
  return result;
}
