const TIMEOUT_MS = 20_000;

function getConfig() {
  return window.__APP_CONFIG__ || {};
}

export async function createCase(payload) {
  const { VITE_FLOW_URL: flowUrl, VITE_FLOW_KEY: flowKey } = getConfig();

  if (!flowUrl) {
    throw new Error('VITE_FLOW_URL is not configured. Add it to your .env file.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (flowKey) headers['x-api-key'] = flowKey;

    const response = await fetch(flowUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const responseBody = isJson ? await response.json() : null;

    if (!response.ok) {
      const error = new Error(
        responseBody?.message || `Request failed with status ${response.status} ${response.statusText}`
      );

      error.correlationId =
        response.headers.get('x-correlation-id') ||
        response.headers.get('x-ms-correlation-request-id') ||
        response.headers.get('x-request-id') ||
        responseBody?.correlationId ||
        responseBody?.requestId ||
        null;
      error.responseBody = responseBody;
      throw error;
    }

    return responseBody || {};
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 20 seconds. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
