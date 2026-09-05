export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

async function handle(res) {
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    throw new ApiError(payload.error || `Request failed (${res.status})`, res.status, payload.fields);
  }
  return payload;
}

async function request(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body instanceof FormData || body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Network error — check your connection and try again.', 0);
  }
  return handle(res);
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body ?? {}),
  patch: (url, body) => request('PATCH', url, body ?? {}),
  del: (url) => request('DELETE', url),
  upload: (url, formData) => request('POST', url, formData),
};
