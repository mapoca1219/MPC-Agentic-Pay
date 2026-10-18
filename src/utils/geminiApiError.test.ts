import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getGeminiFallbackModel,
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

test('Gemini model fallback selects the other supported Flash model', () => {
  assert.equal(getGeminiFallbackModel('gemini-2.5-flash'), 'gemini-2.5-flash-lite');
  assert.equal(getGeminiFallbackModel('gemini-2.5-flash-lite'), 'gemini-2.5-flash');
});
