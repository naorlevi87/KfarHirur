// supabase/functions/send-invite/index.ts
// Sends a project-invite email via Resend. Verifies the caller is an admin of the workspace
// (caller JWT + commons.my_permission). The Resend key + from-address live as function secrets:
//   supabase secrets set RESEND_API_KEY=... INVITE_FROM="כפר הירעור <noreply@your-verified-domain>"
// The copyable /join/<token> link is shown in the UI regardless, so email delivery is best-effort.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { workspaceId, email, token, hasAccount, workspaceName, origin, slug } = await req.json();

    // Authorize: caller must be an admin of this workspace.
    const { data: level } = await callerClient.schema('commons').rpc('my_permission', { wid: workspaceId });
    if (level !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const link = `${origin}/commons/${slug}/join/${token}`;
    const subject = `הזמנה למרחב ${workspaceName}`;
    const lead = hasAccount
      ? `הוזמנת להצטרף למרחב "${workspaceName}" בכפר הירעור.`
      : `הוזמנת להצטרף למרחב "${workspaceName}" בכפר הירעור. נרשמים לאתר ומאשרים את ההצטרפות:`;
    const html = `<div dir="rtl" style="font-family:sans-serif;line-height:1.6;color:#14161c">
      <h2 style="margin:0 0 8px">${workspaceName}</h2>
      <p style="margin:0 0 16px">${lead}</p>
      <p style="margin:0 0 16px"><a href="${link}" style="background:#6c8cff;color:#fff;padding:11px 20px;border-radius:9px;text-decoration:none;display:inline-block">לאישור ההצטרפות</a></p>
      <p style="color:#888;font-size:13px;margin:0">${link}</p>
    </div>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: Deno.env.get('INVITE_FROM'), to: email, subject, html }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      return new Response(JSON.stringify({ error: `Resend ${resp.status}: ${body}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
