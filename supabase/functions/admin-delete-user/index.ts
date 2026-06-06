import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const roleRank = ['client', 'pr', 'collaborator', 'partner', 'admin'];

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function error(message: string, status = 400) {
  return json({ success: false, error: message }, status);
}

function hasAdminRole(rawRoles: unknown) {
  const roles = String(rawRoles ?? '')
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);

  return roles.some((role) => roleRank.indexOf(role) >= roleRank.indexOf('admin'));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return error('Missing Supabase function environment variables', 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return error('Unauthorized', 401);

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('users')
    .select('id, roles')
    .eq('id', callerData.user.id)
    .maybeSingle();

  if (callerProfileError) return error(callerProfileError.message, 500);
  if (!hasAdminRole(callerProfile?.roles)) return error('Forbidden', 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const userId = String(body.user_id ?? '').trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return error('Valid auth user_id is required', 400);
  }

  if (userId === callerData.user.id) {
    return error('Cannot delete your own user', 400);
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('id, user_id, email, display_name')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) return error(profileError.message, 500);

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (authDeleteError && !/not found/i.test(authDeleteError.message)) {
    return error(authDeleteError.message, 500);
  }

  const { error: publicDeleteError } = await adminClient
    .from('users')
    .delete()
    .eq('id', userId);

  if (publicDeleteError) return error(publicDeleteError.message, 500);

  return json({
    success: true,
    message: 'Usuario eliminado de Auth y public.users.',
    user: {
      id: userId,
      user_id: profile?.user_id ?? null,
      email: profile?.email ?? null,
      display_name: profile?.display_name ?? null,
    },
  });
});
