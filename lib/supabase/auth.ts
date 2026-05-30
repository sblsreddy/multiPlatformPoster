import { createSupabaseServerClient } from "./server";
import { getSupabaseAdminClient } from "./admin";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getUserOrganizationId(userId: string, email?: string | null) {
  const supabase = await createSupabaseServerClient();

  const profileResponse = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileResponse.data?.organization_id) {
    return profileResponse.data.organization_id;
  }

  const membershipResponse = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();

  const supabaseAdmin = getSupabaseAdminClient();

  if (membershipResponse.data?.organization_id) {
    const profileUpsertResponse = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          organization_id: membershipResponse.data.organization_id,
          role: "owner",
        },
        { onConflict: "id" },
      );

    if (profileUpsertResponse.error) {
      throw profileUpsertResponse.error;
    }

    return membershipResponse.data.organization_id;
  }

  const displayName = email?.split("@")[0] || "Default organization";
  const slug = `org-${userId.slice(0, 8)}`;

  const organizationResponse = await supabaseAdmin
    .from("organizations")
    .upsert(
      {
        slug,
        name: displayName,
        owner_user_id: userId,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (organizationResponse.error || !organizationResponse.data) {
    throw organizationResponse.error ?? new Error("Unable to create organization.");
  }

  const profileUpsertResponse = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      organization_id: organizationResponse.data.id,
      role: "owner",
    },
    { onConflict: "id" },
  );

  if (profileUpsertResponse.error) {
    throw profileUpsertResponse.error;
  }

  const membershipUpsertResponse = await supabaseAdmin.from("organization_members").upsert(
    {
      organization_id: organizationResponse.data.id,
      user_id: userId,
      role: "owner",
    },
    { onConflict: "organization_id,user_id" },
  );

  if (membershipUpsertResponse.error) {
    throw membershipUpsertResponse.error;
  }

  return organizationResponse.data.id;
}
