import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.9.6/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!projectId || !supabaseUrl || !serviceKey) {
      return json({ error: "Server configuration is incomplete" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return json({ error: "Missing Firebase ID token" }, 401);

    const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
    const { payload } = await jwtVerify(match[1], jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (!payload.sub || typeof payload.sub !== "string" || !payload.email) {
      return json({ error: "Firebase token is missing required identity claims" }, 401);
    }

    let input: Record<string, unknown>;
    try {
      const body: unknown = await req.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return json({ error: "Request body must be a JSON object" }, 400);
      }
      input = body as Record<string, unknown>;
    } catch { return json({ error: "Request body must be JSON" }, 400); }
    const accountTypes = ["buyer", "seller", "both", "learner", "worker"] as const;
    const hasAccountType = Object.prototype.hasOwnProperty.call(input, "accountType");
    if (hasAccountType && (typeof input.accountType !== "string" || !accountTypes.some((type) => type === input.accountType))) {
      return json({ error: "Invalid account type" }, 400);
    }
    const displayName = typeof input.displayName === "string" ? input.displayName.slice(0, 120) : null;
    const photoUrl = typeof input.photoUrl === "string" ? input.photoUrl.slice(0, 1000) : null;

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: existingProfile, error: lookupError } = await supabase
      .from("firebase_user_profiles")
      .select("account_type")
      .eq("firebase_uid", payload.sub)
      .maybeSingle();

    if (lookupError) {
      console.error("Profile lookup failed", lookupError.message);
      return json({ error: "Could not load profile" }, 500);
    }

    // Identity comes only from the verified token; account type is a preference, never a role.
    const { data, error } = await supabase
      .from("firebase_user_profiles")
      .upsert({
        firebase_uid: payload.sub,
        email: String(payload.email).toLowerCase(),
        display_name: displayName,
        photo_url: photoUrl,
        account_type: hasAccountType ? input.accountType : existingProfile?.account_type ?? null,
        last_sign_in_at: new Date().toISOString(),
      }, { onConflict: "firebase_uid" })
      .select("firebase_uid,email,display_name,photo_url,account_type,created_at,last_sign_in_at")
      .single();

    if (error) {
      console.error("Profile upsert failed", error.message);
      return json({ error: "Could not sync profile" }, 500);
    }
    return json({ ok: true, profile: data });
  } catch (err) {
    console.error("Profile endpoint error", err instanceof Error ? err.message : String(err));
    return json({ error: "Invalid token or profile request" }, 401);
  }
});
