import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import extractHandler from './extract.ts';

let requestNumber = 0;

function createRequest(
  body: unknown,
  authorization?: string
): Request {
  requestNumber += 1;
  return {
    method: 'POST',
    body,
    headers: {
      'x-forwarded-for': `192.0.2.${requestNumber}`,
      ...(authorization ? { authorization } : {}),
    },
    socket: { remoteAddress: `192.0.2.${requestNumber}` },
  } as unknown as Request;
}

function createResponse() {
  let statusCode = 200;
  let responseBody: unknown;
  const response = {
    setHeader: () => response,
    status: (code: number) => {
      statusCode = code;
      return response;
    },
    json: (body: unknown) => {
      responseBody = body;
      return response;
    },
  };

  return {
    response: response as unknown as Response,
    status: () => statusCode,
    body: () => responseBody as { error?: string; success?: boolean },
  };
}

test('extract API requires a valid bearer token for files', async () => {
  process.env.EXTRACTION_API_TOKEN = 'test-access-token-with-at-least-32-characters';
  const response = createResponse();

  await extractHandler(
    createRequest({ fileData: { mimeType: 'application/pdf', base64: 'YQ==' } }, 'Bearer wrong'),
    response.response
  );

  assert.equal(response.status(), 401);
});

test('extract API returns a setup error when file access token is not configured', async () => {
  delete process.env.EXTRACTION_API_TOKEN;
  const response = createResponse();

  await extractHandler(
    createRequest({ fileData: { mimeType: 'application/pdf', base64: 'YQ==' } }),
    response.response
  );

  assert.equal(response.status(), 503);
  assert.match(response.body().error || '', /EXTRACTION_API_TOKEN/);
});

test('extract API rejects unsupported file types before calling Gemini', async () => {
  process.env.EXTRACTION_API_TOKEN = 'test-access-token-with-at-least-32-characters';
  const response = createResponse();

  await extractHandler(
    createRequest(
      { fileData: { mimeType: 'text/html', base64: 'YQ==' } },
      `Bearer ${process.env.EXTRACTION_API_TOKEN}`
    ),
    response.response
  );

  assert.equal(response.status(), 415);
});

test('extract API rejects malformed or empty base64 data', async () => {
  process.env.EXTRACTION_API_TOKEN = 'test-access-token-with-at-least-32-characters';
  const response = createResponse();

  await extractHandler(
    createRequest(
      { fileData: { mimeType: 'application/pdf', base64: 'not-base64!' } },
      `Bearer ${process.env.EXTRACTION_API_TOKEN}`
    ),
    response.response
  );

  assert.equal(response.status(), 413);
});

test('extract API rejects oversized text requests before processing them', async () => {
  const response = createResponse();

  await extractHandler(createRequest({ text: 'x'.repeat(4_500_000) }), response.response);

  assert.equal(response.status(), 413);
});
