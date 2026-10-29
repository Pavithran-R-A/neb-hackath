// Render is the TLS terminator. Trust only the configured Host and the
// single exact HTTPS scheme header; forwarded host/client IP never set origin.
export function trustedPublicRequest(request, canonicalOrigin, {renderProxy = false} = {}) {
  const expected = new URL(canonicalOrigin);
  if (request.headers.host !== expected.host) return false;
  if (request.headers.origin && request.headers.origin !== canonicalOrigin) return false;
  if (renderProxy) return request.headers['x-forwarded-proto'] === 'https';
  return !['forwarded','x-forwarded-host','x-forwarded-proto'].some(name=>request.headers[name]);
}
