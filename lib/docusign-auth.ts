import jwt from "jsonwebtoken";

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cache: CachedToken | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function normalizePrivateKey(raw: string): string {
  if (raw.includes("\\n") && !raw.includes("\n")) {
    return raw.replace(/\\n/g, "\n");
  }
  return raw;
}

export async function getDocusignAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cache && cache.expiresAt > now + 60) {
    return cache.accessToken;
  }

  const integrationKey = requireEnv("DOCUSIGN_INTEGRATION_KEY");
  const userId = requireEnv("DOCUSIGN_USER_ID");
  const authServer = requireEnv("DOCUSIGN_AUTH_SERVER");
  const privateKey = normalizePrivateKey(requireEnv("DOCUSIGN_PRIVATE_KEY"));

  const assertion = jwt.sign(
    {
      iss: integrationKey,
      sub: userId,
      aud: authServer,
      iat: now,
      exp: now + 3600,
      scope: "signature impersonation",
    },
    privateKey,
    { algorithm: "RS256" }
  );

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetch(`https://${authServer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes("consent_required")) {
      throw new Error(
        "DocuSign consent_required. Grant impersonation consent once at: " +
          `https://${authServer}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=https://www.docusign.com`
      );
    }
    throw new Error(`DocuSign token request failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in,
  };
  return data.access_token;
}
