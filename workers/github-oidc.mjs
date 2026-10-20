const issuer = 'https://token.actions.githubusercontent.com';
const jwksUrl = `${issuer}/.well-known/jwks`;
const maxTokenBytes = 8192;
const maxLifetimeSeconds = 600;
const clockSkewSeconds = 30;
let cachedKeys;
let recentlyVerified = null;
let keysFetchedAt = 0;

function decodeBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Malformed token');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function decodeJson(value) {
  const decoded = new TextDecoder('utf-8', {fatal: true}).decode(decodeBase64Url(value));
  const result = JSON.parse(decoded);
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Malformed token');
  return result;
}

async function trustedKeys(fetchImpl, now) {
  if (cachedKeys && now - keysFetchedAt < 300) return cachedKeys;
  const response = await fetchImpl(jwksUrl, {headers: {accept: 'application/json'}, signal: AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error('OIDC key service unavailable');
  const body = await response.json();
  if (!Array.isArray(body.keys) || body.keys.length === 0 || body.keys.length > 100) throw new Error('OIDC key set invalid');
  cachedKeys = body.keys;
  keysFetchedAt = now;
  return cachedKeys;
}

/** Verify a GitHub Actions RS256 ID token against GitHub's fixed JWKS endpoint. */
export async function verifyGitHubOidc(token, options) {
  if (typeof token !== 'string' || new TextEncoder().encode(token).byteLength > maxTokenBytes) throw new Error('OIDC token invalid');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('OIDC token invalid');
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  const header = decodeJson(encodedHeader);
  const claims = decodeJson(encodedClaims);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.typ !== 'JWT' || header.crit) throw new Error('OIDC algorithm rejected');
  const now = Math.floor((options.now ?? Date.now() / 1000));
  // A validated token may be reused briefly within this isolate; never cache raw bearer credentials.
  const context = JSON.stringify([options.audience, options.repository, options.repositoryId, options.ownerId, options.ref, options.headRef, options.baseRef, options.workflowPath]);
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2,'0')).join('');
  if (recentlyVerified?.fingerprint === fingerprint && recentlyVerified.context === context && now >= recentlyVerified.checkedAt && now < Math.min(recentlyVerified.expiresAt, recentlyVerified.checkedAt + 15)) return {repository: options.repository, ref: options.ref};
  const keys = await trustedKeys(options.fetchImpl ?? fetch, now);
  const jwk = keys.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.use || key.use === 'sig') && (!key.alg || key.alg === 'RS256'));
  if (!jwk) throw new Error('OIDC signing key unavailable');
  const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
  const signed = new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64Url(encodedSignature), signed)) throw new Error('OIDC signature rejected');

  const expected = options;
  if (claims.iss !== issuer || claims.aud !== expected.audience || claims.sub !== `repo:${expected.repository.split('/')[0]}@${expected.ownerId}/${expected.repository.split('/')[1]}@${expected.repositoryId}:pull_request` || claims.repository !== expected.repository || claims.repository_id !== expected.repositoryId || claims.ref !== expected.ref || claims.head_ref !== expected.headRef || claims.base_ref !== expected.baseRef || claims.workflow_ref !== `${expected.workflowPath}@${expected.ref}` || claims.event_name !== 'pull_request') throw new Error('OIDC identity rejected');
  if (![claims.iat, claims.nbf, claims.exp].every(Number.isSafeInteger)) throw new Error('OIDC lifetime invalid');
  if (claims.exp <= now || claims.nbf > now + clockSkewSeconds || claims.iat > now + clockSkewSeconds || claims.exp <= claims.iat || claims.exp - claims.iat > maxLifetimeSeconds) throw new Error('OIDC token expired or lifetime invalid');
  recentlyVerified = {fingerprint, context, checkedAt: now, expiresAt: claims.exp};
  return {repository: claims.repository, ref: claims.ref};
}
