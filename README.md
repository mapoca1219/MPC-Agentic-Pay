# MPC-Agentic-Pay — Blinka Sentinel AI

### Gobernanza inteligente de pagos corporativos transfronterizos

Blinka Sentinel AI convierte documentos financieros desordenados en decisiones de tesorería **explicables, auditables y sujetas a políticas**. Extrae datos de facturas, aplica reglas financieras deterministas y ayuda al equipo a priorizar qué pagar, revisar o frenar antes de que el dinero salga.

> **De documento a decisión, con control humano donde más importa.**

Diseñado para el flujo **EE. UU. → Latinoamérica**, el proyecto combina extracción asistida por IA, validaciones financieras locales y una interfaz de simulación para demostrar cómo una operación de pagos puede ser más rápida sin sacrificar controles.

## El problema

Los equipos de cuentas por pagar reciben facturas en distintos formatos y canales. Una factura puede tener montos inconsistentes, estar duplicada, vencer pronto o incluir datos bancarios que no coinciden con el historial del proveedor. Revisar cada documento manualmente hace más lento el cierre y aumenta el riesgo operativo.

## La propuesta

Un flujo que organiza la revisión financiera de extremo a extremo:

1. **Recibe** texto o documentos para analizar, o permite probar escenarios listos para la demo.
2. **Extrae** información financiera en una estructura tipada y muestra los datos faltantes.
3. **Evalúa** reglas repetibles para explicar una recomendación: `PAID`, `REJECTED` o `ESCALATED`.
4. **Presenta** los casos en un simulador, tablero Kanban y vista de conciliación.
5. **Registra y exporta** evidencia para revisión operativa y contable.

La decisión de gobernanza es una recomendación de software: **esta demo no inicia transferencias ni mueve fondos**.

## Funcionalidades

### Extracción financiera

- Procesamiento de texto o carga de documentos PDF e imágenes PNG, JPEG, WEBP, HEIC o HEIF de hasta 3 MB.
- Extracción estructurada de proveedor, cliente, factura, moneda, montos, fechas, datos bancarios y conceptos.
- El análisis de archivos requiere una clave de acceso temporal y consentimiento explícito; los documentos se envían al servidor y a Google Gemini.
- OCR local opcional con Tesseract para imágenes cuando Gemini no está configurado.
- Modo determinista local para texto cuando no hay una clave de Gemini disponible, para poder explorar el flujo sin configurar un servicio externo.
- Si un archivo no se puede leer, la aplicación informa el error y no reutiliza los datos de otro escenario ni trata el nombre del archivo como el contenido.
- Los campos no encontrados se mantienen explícitamente como faltantes; no se presentan como datos verificados.

### Motor de políticas y señales de riesgo

- Evaluación determinista separada de la extracción: el extractor identifica datos y el motor aplica reglas.
- Conversión de montos a USD para comparar valores de distintas monedas.
- Revisión de proveedor y cuenta bancaria contra la política configurada.
- Señales de posibles duplicados, vencimientos, discrepancias aritméticas, datos críticos faltantes e intentos de *prompt injection*.
- Huella SHA-256 para identificar el documento analizado.
- Explicación en español de la regla activada y de la decisión sugerida.

### Experiencia operativa para la demo

- **Simulador:** nueve escenarios de muestra, texto libre, carga de documento, vista previa y resultado de extracción.
- **Tablero Kanban:** casos pagados autónomamente, pendientes de aprobación humana y rechazados, con acciones de aprobación/rechazo simuladas para casos escalados.
- **Reglas y presupuesto:** consulta y ajuste de la política corporativa desde la interfaz.
- **Conciliación:** tarjetas contables con importes, proveedor, urgencia, decisión, cuenta destino, riel recomendado, integridad y explicación.
- **Filtros por decisión** en la conciliación, con conteos por estado.
- **Paginación:** hasta 9 documentos por página en conciliación y 5 tarjetas por columna en Kanban, para mantener las vistas manejables cuando crece el historial.
- **Exportación CSV y JSON** con conteos agregados por decisión, sin filas ni datos por documento.

## Recorrido sugerido para presentar el proyecto

1. Abre **Agente en Vivo** y selecciona uno de los escenarios.
2. Muestra cómo la extracción y la evaluación de política son etapas separadas.
3. Explica una alerta concreta: cuenta bancaria no coincidente, factura duplicada, fecha urgente o solicitud que requiere al CFO.
4. Abre **Tablero de Decisiones** para mostrar cómo se distribuyen los casos y simula una decisión humana.
5. Visita **Conciliación Mensual**, aplica un filtro y muestra el recorrido por páginas.
6. Exporta el CSV o JSON para enseñar cómo la decisión puede dejar una pista de auditoría revisable.

## Arquitectura

```text
src/
├── App.tsx                         Orquestación de vistas, estado e historial
├── components/
│   ├── DocumentInput.tsx           Texto, carga y escenarios de demostración
│   ├── ExtractionResults.tsx       Resultado y decisión explicada
│   ├── KanbanDecisionBoard.tsx     Tablero por estado con paginación
│   ├── ExtractionHistory.tsx       Conciliación, filtros, páginas y exportación
│   ├── PolicyRulesPanel.tsx        Configuración de políticas
│   └── ...                         Navegación, KPIs y vistas auxiliares
└── utils/
    ├── financialRules.ts           Reglas financieras deterministas y tipos
    └── financialRules.test.ts      Pruebas del motor de reglas

server.ts                           API Express, extracción y health check
```

**Stack:** React, TypeScript, Vite, Tailwind CSS, Express y Gemini API opcional.

## Requisitos

- Node.js compatible con las versiones actuales de Vite y TypeScript del proyecto.
- npm.
- Opcional: una clave de Gemini para usar extracción asistida por IA.

## Inicio rápido

```bash
npm install
cp .env.example .env
```

Edita `.env` para reemplazar `GEMINI_API_KEY` con tu propia clave y define `EXTRACTION_API_TOKEN` con un secreto aleatorio de al menos 32 caracteres. No publiques ese archivo ni incluyas claves en capturas, commits o demos públicas. Sin una clave válida, el servidor usa el extractor determinista para texto; para OCR local de imágenes instala Tesseract y asegúrate de que esté en `PATH` (o define `TESSERACT_BIN_PATH`). Para analizar archivos PDF se requiere Gemini.

Inicia la aplicación:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El endpoint de salud está disponible en `/api/health`.

## Despliegue en Vercel

La función de extracción para Vercel está en `api/extract.ts` y se publica en `/api/extract`. En la configuración del proyecto de Vercel agrega `GEMINI_API_KEY` y `EXTRACTION_API_TOKEN` en **Settings → Environment Variables** para los entornos que uses y vuelve a desplegar. Genera un token aleatorio largo (por ejemplo, con `openssl rand -base64 32`) y compártelo únicamente con personas autorizadas. La clave de Gemini y el token deben permanecer en los secretos del servidor; nunca los pongas en variables `VITE_*`, el código del navegador ni el repositorio.

El análisis de archivos queda desactivado si falta cualquiera de esas variables. La interfaz solicita el token y consentimiento antes de procesar el archivo; el token solo vive temporalmente en memoria del navegador, se transmite en el encabezado `Authorization` y no se escribe en el cuerpo de la solicitud ni en el almacenamiento local. El análisis de texto pegado sigue siendo determinista y no usa Gemini.

Los archivos se procesan en el servidor y se transmiten a Google Gemini; no subas documentos reales, datos personales ni información bancaria a esta demo. El extractor solicita una transcripción para buscar instrucciones maliciosas, pero OCR/IA no garantiza inspección completa; si no hay una transcripción, el resultado se escala para revisión humana. Las exportaciones disponibles contienen únicamente conteos agregados.

El rate limit de la función serverless es en memoria por instancia y es solo una protección básica, no un control global ni una defensa suficiente para producción. Para una exposición pública real, usa autenticación por usuario, límites de gasto del proveedor, monitorización y un limitador compartido. Ninguna cabecera, token compartido ni detector garantiza una aplicación invulnerable.

## Validación

```bash
npm run lint
npm run build
node --import tsx --test src/utils/financialRules.test.ts src/utils/privacySafeReport.test.ts api/extract.test.ts
```

Las pruebas cubren las reglas financieras, reportes agregados y controles de acceso/formato del endpoint.

## Alcance y consideraciones

- Las acciones CFO de la interfaz son simuladas y no envían mensajes reales a Slack o WhatsApp.
- Los rieles de pago son recomendaciones de enrutamiento; no existe integración para liquidar fondos.
- La extracción asistida por IA depende de Gemini y puede requerir revisión humana; los resultados no deben tratarse como asesoría financiera ni como autorización de pago.
- Las reglas y datos de muestra sirven para demostrar el flujo. Antes de usar cualquier sistema similar en producción, deben validarse las políticas, tasas de cambio, controles de seguridad, requisitos regulatorios y proveedores con el equipo responsable.

## Licencia

El punto de entrada de la aplicación declara la licencia Apache-2.0. Revisa el alcance de la licencia y los avisos de terceros correspondientes antes de redistribuir el proyecto.
