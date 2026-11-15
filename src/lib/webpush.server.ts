// Standard Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) using only Web Crypto,
// so it runs on the edge worker runtime. Server-only.

const enc = new TextEncoder();

export function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(str: string): Uint8Array {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/** P-256 private JWK (with x, y, d) built from raw public point + private scalar. */
export function jwkFromRaw(publicRaw: Uint8Array, d: Uint8Array): JsonWebKey {
  return {
    kty: "EC",
    crv: "P-256",
    x: b64urlEncode(publicRaw.slice(1, 33)),
    y: b64urlEncode(publicRaw.slice(33, 65)),
    d: b64urlEncode(d),
    ext: true,
  };
}

export async function generateVapidKeys(): Promise<{ publicKey: string; privateJwk: JsonWebKey }> {
  const kp = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const raw = new Uint8Array((await crypto.subtle.exportKey("raw", kp.publicKey)) as ArrayBuffer);
  const privateJwk = (await crypto.subtle.exportKey("jwk", kp.privateKey)) as JsonWebKey;
  return { publicKey: b64urlEncode(raw), privateJwk };
}

/** RFC 8291 payload encryption. `testing` lets tests pin the sender key and salt. */
export async function encryptPayload(
  payload: Uint8Array,
  uaPublicB64: string,
  authSecretB64: string,
  testing?: { asPrivateJwk: JsonWebKey; asPublicRaw: Uint8Array; salt: Uint8Array },
): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(uaPublicB64);
  const authSecret = b64urlDecode(authSecretB64);

  let asPrivate: CryptoKey;
  let asPublic: Uint8Array;
  if (testing) {
    asPrivate = await crypto.subtle.importKey(
      "jwk",
      { ...testing.asPrivateJwk, key_ops: undefined } as JsonWebKey,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"],
    );
    asPublic = testing.asPublicRaw;
  } else {
    const kp = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ])) as CryptoKeyPair;
    asPrivate = kp.privateKey;
    asPublic = new Uint8Array((await crypto.subtle.exportKey("raw", kp.publicKey)) as ArrayBuffer);
  }
  const salt = testing?.salt ?? crypto.getRandomValues(new Uint8Array(16));

  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asPrivate, 256),
  );

  const prkKey = await hmac(authSecret, ecdhSecret);
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1]));
  const ikm = await hmac(prkKey, keyInfo);
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      concat(payload, new Uint8Array([2])),
    ),
  );

  const header = new Uint8Array(16 + 4 + 1);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

async function vapidJwt(audience: string, subject: string, privateJwk: JsonWebKey): Promise<string> {
  const head = b64urlEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64urlEncode(
    enc.encode(
      JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }),
    ),
  );
  const key = await crypto.subtle.importKey(
    "jwk",
    { ...privateJwk, key_ops: undefined } as JsonWebKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64urlEncode(sig)}`;
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type VapidKeys = { publicKey: string; privateJwk: JsonWebKey; subject: string };

/** Sends one push. Returns the push service HTTP status. */
export async function sendWebPush(
  target: PushTarget,
  data: unknown,
  vapid: VapidKeys,
  opts: { ttl?: number; urgency?: "low" | "normal" | "high"; topic?: string } = {},
): Promise<number> {
  const body = await encryptPayload(enc.encode(JSON.stringify(data)), target.p256dh, target.auth);
  const jwt = await vapidJwt(new URL(target.endpoint).origin, vapid.subject, vapid.privateJwk);
  const headers: Record<string, string> = {
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: String(opts.ttl ?? 3600),
    Urgency: opts.urgency ?? "high",
    Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
  };
  if (opts.topic) headers.Topic = opts.topic;
  const res = await fetch(target.endpoint, { method: "POST", headers, body });
  return res.status;
}
