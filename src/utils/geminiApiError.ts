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
      return 'El modelo de extracción no está disponible para esta clave o proyecto. Revisa el acceso a Gemini API.';
    case 429:
      return 'Se alcanzó el límite o cuota de Gemini API. Revisa la cuota y facturación del proyecto de Google.';
    default:
      return 'Gemini API no pudo procesar el archivo. Revisa el estado del servicio, la cuota y los Runtime Logs de Vercel.';
  }
}

export function getGeminiApiErrorStatus(error: unknown): number | null {
  return errorStatus(error);
}
