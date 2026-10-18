import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAvailableGeminiFlashModels,
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

test('available Gemini Flash models are selected from models supported by the key', () => {
  const models = [
    { name: 'models/gemini-2.5-flash-lite', supportedActions: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-image', supportedActions: ['generateContent'] },
    { name: 'models/gemini-2.5-pro', supportedActions: ['generateContent'] },
    { name: 'models/gemini-2.5-flash', supportedActions: ['generateContent'] },
    { name: 'models/gemini-3.8-flash', supportedActions: ['generateContent'] },
    { name: 'models/gemini-3.8-flash-preview', supportedActions: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-preview-tts', supportedActions: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-not-supported', supportedActions: ['embedContent'] },
    { name: 'models/gemini-3.8-flash-live', supportedActions: ['generateContent'] },
  ];

  assert.deepEqual(getAvailableGeminiFlashModels(models), [
    'gemini-3.8-flash',
    'gemini-3.8-flash-preview',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
  ]);
  assert.deepEqual(getAvailableGeminiFlashModels(models, 'gemini-2.5-flash'), [
    'gemini-2.5-flash',
    'gemini-3.8-flash',
    'gemini-3.8-flash-preview',
    'gemini-2.5-flash-lite',
  ]);
});

test('available Gemini models can be empty when the key has no compatible Flash model', () => {
  assert.deepEqual(
    getAvailableGeminiFlashModels([
      { name: 'models/gemini-2.5-pro', supportedActions: ['generateContent'] },
      { name: 'models/gemini-3.8-flash-preview', supportedActions: ['generateContent'] },
      { name: 'models/gemini-3.8-flash-tts', supportedActions: ['generateContent'] },
      { name: 'models/embedding-001', supportedActions: ['embedContent'] },
    ]),
    ['gemini-3.8-flash-preview'],
  );
});
