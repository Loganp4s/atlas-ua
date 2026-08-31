import { supabase } from "@/integrations/supabase/client";
import type {
  Memory,
  MemoryCategory,
  MemoryCategoryFlags,
  Preferences,
  Profile,
} from "./types";

async function requireUid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Não autenticado");
  return uid;
}

/* ---------------------------- Profile ---------------------------- */

export async function getProfile(): Promise<Profile | null> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export interface ProfileInput {
  display_name?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  occupation?: string | null;
  city?: string | null;
  birth_date?: string | null;
}

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ ...input, user_id: uid }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

/* ---------------------------- Avatar ---------------------------- */

export async function uploadAvatar(file: File): Promise<string> {
  const uid = await requireUid();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${uid}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function getAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/* -------------------------- Preferences -------------------------- */

const DEFAULT_FLAGS: MemoryCategoryFlags = {
  profile: true,
  goal: true,
  routine: true,
  habit: true,
  preference: true,
  personal: true,
};

function normalizePrefs(row: Record<string, unknown>): Preferences {
  const flags = (row.memory_categories ?? {}) as Partial<MemoryCategoryFlags>;
  return {
    ...(row as unknown as Preferences),
    memory_categories: { ...DEFAULT_FLAGS, ...flags },
  };
}

export async function getPreferences(): Promise<Preferences> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from("atlas_preferences")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  if (data) return normalizePrefs(data as Record<string, unknown>);

  const { data: created, error: createError } = await supabase
    .from("atlas_preferences")
    .insert({ user_id: uid })
    .select()
    .single();
  if (createError) throw createError;
  return normalizePrefs(created as Record<string, unknown>);
}

export async function updatePreferences(
  patch: Partial<Omit<Preferences, "id" | "user_id" | "created_at" | "updated_at">>,
): Promise<Preferences> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from("atlas_preferences")
    .upsert({ ...patch, user_id: uid }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return normalizePrefs(data as Record<string, unknown>);
}

/* ---------------------------- Memories ---------------------------- */

export async function listMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("atlas_memories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Memory[];
}

export async function createMemory(input: {
  content: string;
  category: MemoryCategory;
}): Promise<Memory> {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from("atlas_memories")
    .insert({ ...input, user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data as Memory;
}

export async function updateMemory(
  id: string,
  patch: { content?: string; category?: MemoryCategory },
): Promise<Memory> {
  const { data, error } = await supabase
    .from("atlas_memories")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Memory;
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from("atlas_memories").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------ Danger zone ------------------------ */

export async function clearPersonalData(): Promise<void> {
  const uid = await requireUid();
  const { error: memError } = await supabase
    .from("atlas_memories")
    .delete()
    .eq("user_id", uid);
  if (memError) throw memError;
  const { error: profError } = await supabase
    .from("profiles")
    .update({
      display_name: null,
      nickname: null,
      avatar_url: null,
      bio: null,
      occupation: null,
      city: null,
      birth_date: null,
    })
    .eq("user_id", uid);
  if (profError) throw profError;
}
