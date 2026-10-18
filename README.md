# MPC-Agentic-Pay — Blinka Corporate Payment Governance & Financial Extractor (Hackathon 30X)

Agente de extracción financiera estructurada y motor determinista de gobernanza de pagos corporativos transfronterizos (**EE. UU. → Latinoamérica y el mundo**) diseñado para **Blinka**.

## Características Principales

1. **Extracción Multimodal Estructurada + Reglas Deterministas (`policyEngine`)**:
   - Extrae facturas en PDF, imágenes, correos electrónicos y mensajes de WhatsApp/Slack hacia un esquema JSON estricto sin inventar datos (`null` explícito).
   - Evalúa de forma 100% determinista lista blanca de proveedores, acuerdos contractuales, límite de aprobación autónoma (`$500 USD`) y presupuesto mensual corporativo (`$3,500 USD`).
2. **Conversión Multimoneda Realista (EE. UU. → LATAM)**:
   - Normaliza automáticamente cobros en `COP`, `MXN`, `BRL`, `ARS`, `EUR` y `USD` a su equivalente en `USD` antes de evaluar límites financieros.
3. **Protección Anti-Fraude de Cuenta Bancaria Histórica (BEC) & Escudo Anti-Prompt Injection**:
   - Verifica criptográficamente el documento con **SHA-256**, neutraliza intentos de *Prompt Injection* y bloquea/escala facturas donde la cuenta bancaria de destino (`beneficiaryAccount`) no coincide con la cuenta oficial registrada (`registeredAccount`).
4. **Smart Rail Routing & Generador `BlinkaPaymentIntent`**:
   - Recomienda automáticamente el riel transfronterizo óptimo (`ACH Colombia / PSE`, `SPEI Tiempo Real`, `PIX`, `USDC Bridge`, `US ACH / Fedwire`) y genera el payload de integración con `idempotencyKey`.
5. **Simulador de Aprobación Humana CFO (Slack / WhatsApp) & Exportación Contable (CSV / JSON)**:
   - Permite aprobar o rechazar facturas en estado `ESCALATED` en tiempo real y exportar la conciliación mensual lista para contabilidad.

## Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Configurar variable de entorno (opcional para extracción en vivo con Gemini AI; incluye motor local determinista):
   ```bash
   cp .env.example .env
   ```
3. Iniciar servidor de desarrollo (`http://localhost:3000`):
   ```bash
   npm run dev
   ```
4. Ejecutar pruebas unitarias y validación de tipos:
   ```bash
   node --test src/utils/financialRules.test.ts
   npm run lint && npm run build
   ```
