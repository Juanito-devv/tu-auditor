// Autenticación con Google Service Account usando WebCrypto (fetch nativo).
// Funciona en Cloudflare Workers (no usa node:crypto ni googleapis).

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function b64url(input) {
  let base64 = btoa(
    new TextEncoder().encode(input).reduce((acc, b) => acc + String.fromCharCode(b), "")
  );
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Firma el payload del JWT con WebCrypto (RS256).
function signRSA(keyData, base64Input) {
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  ).then((key) =>
    crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(base64Input)
    )
  ).then((sig) => {
    const buf = new Uint8Array(sig);
    return btoa(String.fromCharCode(...buf))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  });
}

// Convierte la private_key de formato PEM a los bytes DER.
function pemToDer(pem) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Obtiene un access token a partir del JSON de la service account.
export async function getAccessToken(credsJson) {
  const { client_email, private_key } = credsJson;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${payload}`;
  const signature = await signRSA(pemToDer(private_key), signingInput);
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Fallo OAuth de Google: ${data.error || res.status} ${data.error_description || ""}`);
  }
  return data.access_token;
}
