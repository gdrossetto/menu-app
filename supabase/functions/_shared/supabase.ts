import { createClient } from "npm:@supabase/supabase-js@2";

export function createUserClient(request: Request) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: {
          Authorization: request.headers.get("Authorization") ?? "",
        },
      },
    },
  );
}

export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

export async function requireAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing authorization header.");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createUserClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Unauthorized.");
  }

  return user;
}
