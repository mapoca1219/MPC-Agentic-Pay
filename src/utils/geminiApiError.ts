function errorStatus(error: unknown): number | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }
  return null;
}

export function getGeminiApiErrorMessage(error: unknown): string {
  switch (errorStatus(error)) {
    case 400:
      return 'Gemini rechazó la solicitud. Verifica que el archivo sea válido y que la clave tenga acceso a Gemini API.';
    case 401:
    case 403:
      return 'Google rechazó GEMINI_API_KEY. Confirma que sea una clave de Gemini API vigente, habilitada y sin restricciones incompatibles.';
    case 404:
      return 'Gemini API no encuentra un modelo de extracción disponible para esta clave/proyecto. Revisa que GEMINI_API_KEY sea una clave de Gemini Developer API de Google AI Studio y que el proyecto tenga acceso a los modelos Gemini.';
    case 429:
      return 'Se alcanzó el límite o cuota de Gemini API. Revisa la cuota y facturación del proyecto de Google.';
    default:
      return 'Gemini API no pudo procesar el archivo. Revisa el estado del servicio, la cuota y los Runtime Logs de Vercel.';
  }
}

export function getGeminiApiErrorStatus(error: unknown): number | null {
  return errorStatus(error);
}

export function getGeminiFallbackModel(model: string): string {
  return model === 'gemini-2.5-flash-lite' ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite';
}
