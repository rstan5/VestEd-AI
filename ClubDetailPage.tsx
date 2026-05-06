import { useParams, useNavigate } from "react-router-dom";
import { useClubs } from "@/hooks/use-clubs";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, TrendingUp, Copy, Edit2, ImagePlus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useStockPrices } from "@/hooks/use-stock-prices";
import { DEFAULT_TICKERS } from "@/lib/stock-prices";

interface MemberProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  return_pct: number;
}

const ClubDetailPage = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { clubs, myMembership, userId, updateClub, loading } = useClubs();
  const { toast } = useToast();
  const { priceMap } = useStockPrices(DEFAULT_TICKERS);

  const club = clubs.find((c) => c.id === clubId);
  const isMember = myMembership?.club_id === clubId;

  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clubId) return;
    // Wait for live prices before computing returns
    if (Object.keys(priceMap).length === 0) return;

    const fetchMembers = async () => {
      setMembersLoading(true);
      try {
        const { data: memberships } = await supabase
          .from("club_memberships")
          .select("user_id")
          .eq("club_id", clubId);

        if (!memberships?.length) {
          setMembers([]);
          return;
        }

        const userIds = memberships.map((m) => m.user_id);

        const [profilesRes, portfoliosRes, positionsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", userIds),
          supabase
            .from("portfolios")
            .select("user_id, cash_balance")
            .in("user_id", userIds),
          supabase
            .from("positions")
            .select("user_id, ticker, shares, average_cost")
            .in("user_id", userIds),
        ]);

        const profileMap = new Map(
          (profilesRes.data ?? []).map((p) => [p.user_id, p])
        );
        const cashMap = new Map(
          (portfoliosRes.data ?? []).map((p) => [p.user_id, Number(p.cash_balance)])
        );
        const positionsByUser = new Map<string, { ticker: string; shares: number; average_cost: number }[]>();
        for (const pos of positionsRes.data ?? []) {
          const list = positionsByUser.get(pos.user_id) ?? [];
          list.push({
            ticker: pos.ticker,
            shares: Number(pos.shares),
            average_cost: Number(pos.average_cost),
          });
          positionsByUser.set(pos.user_id, list);
        }

        const STARTING_CASH = 100000;

        const memberProfiles: MemberProfile[] = userIds.map((uid) => {
          const profile = profileMap.get(uid);
          const cash = cashMap.get(uid) ?? STARTING_CASH;
          const positions = positionsByUser.get(uid) ?? [];
          const positionsValue = positions.reduce((sum, p) => {
            const price = priceMap[p.ticker] ?? p.average_cost;
            return sum + p.shares * price;
          }, 0);
          const returnPct = ((cash + positionsValue - STARTING_CASH) / STARTING_CASH) * 100;
          return {
            user_id: uid,
            display_name: profile?.display_name ?? "Unknown",
            avatar_url: profile?.avatar_url ?? null,
            return_pct: Math.round(returnPct * 100) / 100,
          };
        });

        // Sort by return desc
        memberProfiles.sort((a, b) => b.return_pct - a.return_pct);

        setMembers(memberProfiles);
      } catch (err) {
        console.error("Error fetching members:", err);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembers();
  }, [clubId, priceMap]);

  const startEditing = () => {
    if (!club) return;
    setEditName(club.name);
    setEditDesc(club.description ?? "");
    setEditImage(null);
    setEditImagePreview(club.image_url);
    setEditing(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!clubId || !editName.trim()) return;
    setSaving(true);
    const ok = await updateClub(
      clubId,
      { name: editName.trim(), description: editDesc.trim() || undefined },
      editImage ?? undefined
    );
    if (ok) setEditing(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <p className="text-muted-foreground text-lg mb-4">Club not found</p>
          <Button variant="outline" onClick={() => navigate("/compete")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Arena
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/compete")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Arena
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 mb-6">
          {editing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center overflow-hidden shrink-0"
                >
                  {editImagePreview ? (
                    <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <div className="flex-1 space-y-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Club name" />
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" rows={3} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button variant="hero" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-6">
              <Avatar className="w-20 h-20 shrink-0">
                {club.image_url ? <AvatarImage src={club.image_url} alt={club.name} /> : null}
                <AvatarFallback className="text-2xl">{club.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-display text-2xl md:text-3xl font-bold">{club.name}</h1>
                  {isMember && (
                    <Button variant="ghost" size="sm" onClick={startEditing}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {club.description && (
                  <p className="text-muted-foreground mb-3">{club.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-4 h-4" /> {club.member_count} member{club.member_count !== 1 ? "s" : ""}
                  </span>
                  <span className={`font-display font-bold flex items-center gap-1 ${club.avg_return >= 0 ? "text-gain" : "text-loss"}`}>
                    <TrendingUp className="w-4 h-4" /> {club.avg_return >= 0 ? "+" : ""}{club.avg_return}% Avg Return
                  </span>
                  {club.owner_id === userId && club.join_code && (
                    <button
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => { navigator.clipboard.writeText(club.join_code); toast({ title: "Copied!", description: `Join code: ${club.join_code}` }); }}
                    >
                      <Copy className="w-3 h-3" /> {club.join_code}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Members list */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border/30">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Members
            </h3>
          </div>

          {membersLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No members yet.</div>
          ) : (
            <div className="divide-y divide-border/20">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  onClick={() => navigate(`/users/${member.user_id}`)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  <Avatar className="w-10 h-10">
                    {member.avatar_url ? <AvatarImage src={member.avatar_url} alt={member.display_name ?? ""} /> : null}
                    <AvatarFallback>{(member.display_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{member.display_name ?? "Unknown"}</div>
                  </div>
                  {member.user_id === club.owner_id && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Owner</span>
                  )}
                  <span className={`font-display font-bold text-sm flex items-center gap-1 ${member.return_pct >= 0 ? "text-gain" : "text-loss"}`}>
                    <TrendingUp className="w-4 h-4" />
                    {member.return_pct >= 0 ? "+" : ""}{member.return_pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ClubDetailPage;
