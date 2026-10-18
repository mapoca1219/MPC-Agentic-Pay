import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getGeminiApiErrorMessage,
  getGeminiApiErrorStatus,
} from './geminiApiError.ts';

test('Gemini API errors give safe, actionable guidance by status', () => {
  assert.match(getGeminiApiErrorMessage({ status: 403 }), /GEMINI_API_KEY/);
  assert.match(getGeminiApiErrorMessage({ status: 429 }), /cuota/);
  assert.match(getGeminiApiErrorMessage({ status: 400 }), /rechazó la solicitud/);
  assert.match(getGeminiApiErrorMessage(new Error('network failure')), /Runtime Logs/);
  assert.equal(getGeminiApiErrorStatus({ status: 403 }), 403);
  assert.equal(getGeminiApiErrorStatus(new Error('network failure')), null);
});
