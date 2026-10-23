import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.9.6/index.ts";

const projectId = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const scriptUrl = Deno.env.get("ENERMIND_APPS_SCRIPT_URL") ?? "";
const scriptSecret = Deno.env.get("ENERMIND_APPS_SCRIPT_SECRET") ?? "";
const allowedOrigin = Deno.env.get("ENERMIND_ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const accountTypes = new Set(["buyer", "seller", "both", "learner", "worker"]);
const permissions: Record<string, Set<string>> = {
  listSellers: new Set(["buyer", "both"]),
  listBuyerActivity: new Set(["buyer", "both"]),
  listBuyerSocialContacts: new Set(["buyer", "both"]),
  addBuyerSocialContact: new Set(["buyer", "both"]),
  createWorkRequest: new Set(["buyer", "both"]),
  recordBuyerActivity: new Set(["buyer", "both"]),
  submitSeller: new Set(["seller", "both"]),
  listMyListings: new Set(["seller", "both"]),
  listWorkRequests: new Set(["worker", "learner"]),
  applyToTask: new Set(["worker", "learner"]),
  listMyTasks: new Set(["worker", "learner"]),
  submitDeliverable: new Set(["worker", "learner"]),
  health: new Set(["buyer", "seller", "both", "learner", "worker"]),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!projectId || !supabaseUrl || !serviceKey || !scriptUrl || !scriptSecret) {
    return json({ error: "Workspace integration is not configured" }, 503);
  }

  try {
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
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Request body must be an object" }, 400);
      input = body as Record<string, unknown>;
    } catch { return json({ error: "Request body must be JSON" }, 400); }

    const action = typeof input.action === "string" ? input.action : "";
    if (!Object.prototype.hasOwnProperty.call(permissions, action)) return json({ error: "Unsupported action" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: profile, error: profileError } = await admin
      .from("firebase_user_profiles")
      .select("firebase_uid,account_type")
      .eq("firebase_uid", payload.sub)
      .maybeSingle();
    if (profileError) {
      console.error("Workspace profile lookup failed", profileError.message);
      return json({ error: "Could not verify workspace permissions" }, 500);
    }
    const accountType = typeof profile?.account_type === "string" ? profile.account_type : "";
    if (!accountTypes.has(accountType)) return json({ error: "Choose an account type before using the workspace" }, 403);
    if (!permissions[action].has(accountType)) return json({ error: "Your account type cannot perform this action" }, 403);

    const record = (input.record && typeof input.record === "object" && !Array.isArray(input.record))
      ? input.record as Record<string, unknown> : {};
    const filters = (input.filters && typeof input.filters === "object" && !Array.isArray(input.filters))
      ? input.filters as Record<string, unknown> : {};

    // Never accept a caller-supplied UID, role, approval state, or private integration secret.
    const safeFilters: Record<string, string> = {};
    for (const key of ["country", "category", "query"]) {
      if (typeof filters[key] === "string") safeFilters[key] = filters[key].slice(0, 120);
    }
    let safeRecord: Record<string, unknown>;
    try {
      safeRecord = sanitizeRecord(action, record);
    } catch (validationError) {
      return json({ error: validationError instanceof Error ? validationError.message : "Invalid record" }, 400);
    }
    let response: Response;
    try {
      response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: scriptSecret,
          action,
          actorUid: payload.sub,
          ...(action.startsWith("list") ? { filters: safeFilters } : {}),
          ...(action !== "health" && !action.startsWith("list") ? { record: safeRecord } : {}),
        }),
        redirect: "follow",
      });
    } catch {
      return json({ error: "Seller/workspace service is temporarily unavailable" }, 502);
    }
    if (!response.ok) {
      console.error("Apps Script returned HTTP status", response.status);
      return json({ error: "Seller/workspace service is temporarily unavailable" }, 502);
    }
    let result: unknown;
    try { result = await response.json(); }
    catch { return json({ error: "Seller/workspace service returned an invalid response" }, 502); }
    const output = result as { ok?: boolean; data?: unknown; error?: string };
    if (!output.ok) return json({ error: output.error || "Workspace operation failed" }, 400);
    return json({ ok: true, data: output.data ?? null });
  } catch (err) {
    console.error("Workspace endpoint error", err instanceof Error ? err.message : String(err));
    return json({ error: "Invalid token or workspace request" }, 401);
  }
});

function sanitizeRecord(action: string, record: Record<string, unknown>): Record<string, unknown> {
  const allowed: Record<string, string[]> = {
    submitSeller: ["displayName","country","serviceCategory","title","description","priceAmount","currency","whatsappPhone","whatsappGroupLink","publicContactConsent"],
    createWorkRequest: ["title","workCategory","description","requiredTools","dataSensitivity","deadline","budgetAmount","budgetCurrency","safeDataConfirmation"],
    applyToTask: ["requestId","proposal","bidAmount","currency"],
    submitDeliverable: ["requestId","googleDocUrl","googleSheetUrl","notes"],
    recordBuyerActivity: ["listingId","requestId","activityType","completionStatus"],
    addBuyerSocialContact: ["contactLabel","country","platform","profileUrl","consentOrPublicBasisConfirmed"],
  };
  const output: Record<string, unknown> = {};
  for (const key of allowed[action] ?? []) {
    if (typeof record[key] === "string" || typeof record[key] === "number" || typeof record[key] === "boolean") {
      output[key] = typeof record[key] === "string" ? record[key].slice(0, 4000) : record[key];
    }
  }
  if (action === "createWorkRequest" && !["sample", "deidentified"].includes(String(output.dataSensitivity))) {
    throw new Error("Only sample or de-identified datasets are accepted at this stage.");
  }
  if (action === "createWorkRequest" && output.safeDataConfirmation !== true && output.safeDataConfirmation !== "true") {
    throw new Error("Confirm that the request contains no restricted health or finance data.");
  }
  if (action === "submitSeller" && output.publicContactConsent !== true && output.publicContactConsent !== "true") {
    throw new Error("Seller contact display requires consent.");
  }
  if (action === "addBuyerSocialContact" && output.consentOrPublicBasisConfirmed !== true && output.consentOrPublicBasisConfirmed !== "true") {
    throw new Error("A public profile and consent/public-basis confirmation are required.");
  }
  return output;
}
