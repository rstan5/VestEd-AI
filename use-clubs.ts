import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ClubWithMembers {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  join_code: string;
  owner_id: string;
  member_count: number;
  avg_return: number;
}

export interface Membership {
  club_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export function useClubs() {
  const [clubs, setClubs] = useState<ClubWithMembers[]>([]);
  const [myClub, setMyClub] = useState<ClubWithMembers | null>(null);
  const [myMembership, setMyMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_club_leaderboard");

      if (error) throw error;

      const enriched: ClubWithMembers[] = (data ?? []).map((row: any) => ({
        id: row.club_id,
        name: row.club_name,
        description: row.club_description,
        image_url: row.image_url ?? null,
        join_code: row.join_code,
        owner_id: row.owner_id,
        member_count: Number(row.member_count),
        avg_return: Number(row.avg_return),
      }));

      setClubs(enriched);

      if (userId) {
        const { data: memberships } = await supabase
          .from("club_memberships")
          .select("*")
          .eq("user_id", userId);

        const mine = (memberships ?? [])[0];
        if (mine) {
          setMyMembership(mine);
          setMyClub(enriched.find((c) => c.id === mine.club_id) ?? null);
        } else {
          setMyMembership(null);
          setMyClub(null);
        }
      }
    } catch (err: any) {
      console.error("Error fetching clubs:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const createClub = async (name: string, description?: string, imageFile?: File) => {
    if (!userId) {
      toast({ title: "Sign in required", description: "Please sign in to create a club.", variant: "destructive" });
      return false;
    }

    let image_url: string | null = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("club-images")
        .upload(filePath, imageFile);

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        return false;
      }

      const { data: urlData } = supabase.storage
        .from("club-images")
        .getPublicUrl(filePath);
      image_url = urlData.publicUrl;
    }

    const { error } = await supabase
      .from("investment_clubs")
      .insert({ name, description: description ?? null, owner_id: userId, image_url });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Club created!", description: `${name} is ready to go.` });
    await fetchClubs();
    return true;
  };

  const joinClub = async (joinCode: string) => {
    if (!userId) {
      toast({ title: "Sign in required", description: "Please sign in to join a club.", variant: "destructive" });
      return false;
    }

    const { data, error } = await supabase.rpc("join_club_by_code", {
      p_code: joinCode,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    const result = data as { success: boolean; error?: string; club_name?: string };
    if (!result?.success) {
      toast({ title: "Invalid code", description: result?.error ?? "No club found with that join code.", variant: "destructive" });
      return false;
    }

    toast({ title: "Joined!", description: `Welcome to ${result.club_name}!` });
    await fetchClubs();
    return true;
  };

  const leaveClub = async () => {
    if (!userId || !myMembership) return false;

    const { error } = await supabase
      .from("club_memberships")
      .delete()
      .eq("club_id", myMembership.club_id)
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Left club", description: "You've left the club." });
    await fetchClubs();
    return true;
  };

  const updateClub = async (clubId: string, updates: { name?: string; description?: string }, imageFile?: File) => {
    if (!userId) return false;

    let image_url: string | undefined;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("club-images")
        .upload(filePath, imageFile);

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        return false;
      }

      const { data: urlData } = supabase.storage
        .from("club-images")
        .getPublicUrl(filePath);
      image_url = urlData.publicUrl;
    }

    const updatePayload: { name?: string; description?: string; image_url?: string } = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (image_url !== undefined) updatePayload.image_url = image_url;

    const { error } = await supabase
      .from("investment_clubs")
      .update(updatePayload)
      .eq("id", clubId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Club updated!" });
    await fetchClubs();
    return true;
  };

  return { clubs, myClub, myMembership, loading, userId, createClub, joinClub, leaveClub, updateClub, refresh: fetchClubs };
}
