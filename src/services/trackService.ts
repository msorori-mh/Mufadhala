import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────
export interface Track {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrackSubject {
  id: string;
  track_id: string;
  subject_id: string;
}

export interface CollegeWithTrack {
  id: string;
  name_ar: string;
  code: string;
  is_active: boolean;
  admission_track_id: string | null;
  university_id: string;
}

// ── Track CRUD ─────────────────────────────────────────────

export async function getTracks(): Promise<Track[]> {
  const { data, error } = await supabase
    .from("admission_tracks")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as Track[];
}

export async function createTrack(payload: {
  name_ar: string;
  name_en?: string | null;
  slug: string;
  is_active?: boolean;
  display_order?: number;
}): Promise<Track> {
  const { data, error } = await supabase
    .from("admission_tracks")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Track;
}

export async function updateTrack(
  id: string,
  payload: Partial<Pick<Track, "name_ar" | "name_en" | "slug" | "is_active" | "display_order">>,
): Promise<void> {
  const { error } = await supabase
    .from("admission_tracks")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTrack(id: string): Promise<void> {
  const { error } = await supabase
    .from("admission_tracks")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Track ↔ Subjects ───────────────────────────────────────

export async function getTrackSubjects(): Promise<TrackSubject[]> {
  const { data, error } = await supabase
    .from("track_subjects")
    .select("*");
  if (error) throw error;
  return (data ?? []) as TrackSubject[];
}

export async function addSubjectToTrack(trackId: string, subjectId: string): Promise<void> {
  const { error } = await supabase
    .from("track_subjects")
    .insert({ track_id: trackId, subject_id: subjectId });
  if (error) throw error;
}

export async function removeSubjectFromTrack(trackSubjectId: string): Promise<void> {
  const { error } = await supabase
    .from("track_subjects")
    .delete()
    .eq("id", trackSubjectId);
  if (error) throw error;
}

// ── College → Track Assignment ─────────────────────────────

export async function getCollegesWithTracks(): Promise<CollegeWithTrack[]> {
  const { data, error } = await supabase
    .from("colleges")
    .select("id, name_ar, code, is_active, admission_track_id, university_id")
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as CollegeWithTrack[];
}

export async function assignTrackToCollege(collegeId: string, trackId: string | null): Promise<void> {
  const { error } = await supabase
    .from("colleges")
    .update({ admission_track_id: trackId, updated_at: new Date().toISOString() })
    .eq("id", collegeId);
  if (error) throw error;
}
