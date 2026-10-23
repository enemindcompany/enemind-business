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
    const profileFieldLimits: Record<string, number> = {
      whatsapp_group_link: 2048,
      facebook_url: 2048,
      wechat_contact: 2048,
      instagram_url: 2048,
      x_url: 2048,
      paypal_email: 254,
      binance_uid: 100,
    };
    const hasProfileFields = Object.prototype.hasOwnProperty.call(input, "profileFields");
    const profileFieldsInput = input.profileFields;
    if (hasProfileFields && (!profileFieldsInput || typeof profileFieldsInput !== "object" || Array.isArray(profileFieldsInput))) {
      return json({ error: "Profile fields must be a JSON object" }, 400);
    }
    const submittedProfileFields: Record<string, string | null> = {};
    if (hasProfileFields) {
      const profileFields = profileFieldsInput as Record<string, unknown>;
      for (const [field, maxLength] of Object.entries(profileFieldLimits)) {
        if (!Object.prototype.hasOwnProperty.call(profileFields, field)) continue;
        const rawValue = profileFields[field];
        if (typeof rawValue !== "string") {
          return json({ error: `Invalid ${field}` }, 400);
        }
        const value = rawValue.trim();
        if (value.length > maxLength) return json({ error: `${field} exceeds the maximum length` }, 400);
        if (!value) {
          submittedProfileFields[field] = null;
          continue;
        }

        if (["whatsapp_group_link", "facebook_url", "instagram_url", "x_url"].includes(field)) {
          let url: URL;
          try {
            url = new URL(value);
          } catch {
            return json({ error: `Invalid URL for ${field}` }, 400);
          }
          if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password ||
              (field === "whatsapp_group_link" && url.hostname.toLowerCase() !== "chat.whatsapp.com")) {
            return json({ error: `Invalid URL for ${field}` }, 400);
          }
          submittedProfileFields[field] = url.toString();
        } else if (field === "wechat_contact") {
          const looksLikeUrl = /^https?:\/\//i.test(value) || /^www\./i.test(value);
          if (looksLikeUrl) {
            let url: URL;
            try {
              url = new URL(/^www\./i.test(value) ? `https://${value}` : value);
            } catch {
              return json({ error: "Invalid WeChat ID or profile URL" }, 400);
            }
            if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
              return json({ error: "Invalid WeChat ID or profile URL" }, 400);
            }
            submittedProfileFields[field] = url.toString();
          } else if (!/^[A-Za-z0-9_.-]{3,128}$/.test(value)) {
            return json({ error: "Invalid WeChat ID" }, 400);
          } else {
            submittedProfileFields[field] = value;
          }
        } else if (field === "paypal_email") {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return json({ error: "Invalid PayPal email address" }, 400);
          }
          submittedProfileFields[field] = value;
        } else {
          if (!/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
            return json({ error: "Invalid Binance ID/UID" }, 400);
          }
          submittedProfileFields[field] = value;
        }
      }
    }
    const displayName = typeof input.displayName === "string" ? input.displayName.slice(0, 120) : null;
    const photoUrl = typeof input.photoUrl === "string" ? input.photoUrl.slice(0, 1000) : null;

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: existingProfile, error: lookupError } = await supabase
      .from("firebase_user_profiles")
      .select("account_type,display_name,photo_url,whatsapp_group_link,facebook_url,wechat_contact,instagram_url,x_url,paypal_email,binance_uid")
      .eq("firebase_uid", payload.sub)
      .maybeSingle();

    if (lookupError) {
      console.error("Profile lookup failed", lookupError.message);
      return json({ error: "Could not load profile" }, 500);
    }

    const preservedProfileFields = Object.fromEntries(
      Object.keys(profileFieldLimits).map((field) => [
        field,
        Object.prototype.hasOwnProperty.call(submittedProfileFields, field)
          ? submittedProfileFields[field]
          : existingProfile?.[field] ?? null,
      ]),
    );

    // Identity comes only from the verified token; account type is a preference, never a role.
    const { data, error } = await supabase
      .from("firebase_user_profiles")
      .upsert({
        firebase_uid: payload.sub,
        email: String(payload.email).toLowerCase(),
        display_name: displayName?.trim() || existingProfile?.display_name || null,
        photo_url: photoUrl?.trim() || existingProfile?.photo_url || null,
        account_type: hasAccountType ? input.accountType : existingProfile?.account_type ?? null,
        last_sign_in_at: new Date().toISOString(),
        ...preservedProfileFields,
      }, { onConflict: "firebase_uid" })
      .select("firebase_uid,email,display_name,photo_url,account_type,whatsapp_group_link,facebook_url,wechat_contact,instagram_url,x_url,paypal_email,binance_uid,created_at,last_sign_in_at")
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
