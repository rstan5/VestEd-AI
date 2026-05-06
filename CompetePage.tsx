import { motion } from "framer-motion";
import { Trophy, Users, Medal, Crown, ChevronRight, School, TrendingUp, Plus, LogIn, LogOut, Copy, ImagePlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState, useRef, useEffect } from "react";
import { useClubs } from "@/hooks/use-clubs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IndividualEntry {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  return_pct: number;
}

const rankColors: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-gray-300",
  3: "text-amber-600",
};

const CompetePage = () => {
  const { clubs, myClub, myMembership, loading, userId, createClub, joinClub, leaveClub } = useClubs();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [clubImage, setClubImage] = useState<File | null>(null);
  const [clubImagePreview, setClubImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leaderboardType, setLeaderboardType] = useState<"clubs" | "individuals">("clubs");
  const [individuals, setIndividuals] = useState<IndividualEntry[]>([]);
  const [individualsLoading, setIndividualsLoading] = useState(false);

  useEffect(() => {
    if (leaderboardType !== "individuals") return;
    let cancelled = false;
    setIndividualsLoading(true);
    supabase.rpc("get_individual_leaderboard").then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data) {
        setIndividuals(data.map((r: any) => ({
          user_id: r.user_id,
          display_name: r.display_name,
          username: r.username,
          avatar_url: r.avatar_url,
          return_pct: Number(r.return_pct),
        })));
      }
      setIndividualsLoading(false);
    });
    return () => { cancelled = true; };
  }, [leaderboardType]);

  const handleCreate = async () => {
    if (!clubName.trim()) return;
    setSubmitting(true);
    const ok = await createClub(clubName.trim(), clubDesc.trim() || undefined, clubImage ?? undefined);
    if (ok) { setShowCreate(false); setClubName(""); setClubDesc(""); setClubImage(null); setClubImagePreview(null); }
    setSubmitting(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setClubImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setClubImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setSubmitting(true);
    const ok = await joinClub(joinCode.trim());
    if (ok) { setShowJoin(false); setJoinCode(""); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="font-display text-3xl md:text-4xl font-bold">College Arena</h1>
          </div>
          <p className="text-muted-foreground text-lg mb-8">
            Compete with your school's investment club against other universities.
          </p>
        </motion.div>

        {/* Not logged in */}
        {!userId && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-8 mb-8 neon-border flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shrink-0">
              <LogIn className="w-8 h-8 text-accent-foreground" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-display text-xl font-semibold mb-1">Sign In to Compete</h3>
              <p className="text-muted-foreground text-sm">Create an account or sign in to join or create an investment club.</p>
            </div>
            <Button variant="hero" onClick={() => navigate("/auth")}>
              <LogIn className="w-4 h-4 mr-1" /> Sign In
            </Button>
          </motion.div>
        )}

        {/* Logged in but no club */}
        {userId && !myClub && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-8 mb-8 neon-border">
            {!showCreate && !showJoin && (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shrink-0">
                  <School className="w-8 h-8 text-accent-foreground" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-display text-xl font-semibold mb-1">Join or Create a Club</h3>
                  <p className="text-muted-foreground text-sm">Enter a join code or start your own investment club.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowJoin(true)}>Enter Code</Button>
                  <Button variant="hero" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Create Club
                  </Button>
                </div>
              </div>
            )}

            {showJoin && (
              <div className="space-y-4">
                <h3 className="font-display text-lg font-semibold">Join with Code</h3>
                <Input placeholder="Enter 6-character join code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} maxLength={6} />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowJoin(false)}>Cancel</Button>
                  <Button variant="hero" onClick={handleJoin} disabled={submitting}>{submitting ? "Joining..." : "Join"}</Button>
                </div>
              </div>
            )}

            {showCreate && (
              <div className="space-y-4">
                <h3 className="font-display text-lg font-semibold">Create a Club</h3>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-16 h-16 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center overflow-hidden shrink-0"
                  >
                    {clubImagePreview ? (
                      <img src={clubImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <div className="flex-1 space-y-2">
                    <Input placeholder="Club name (e.g. MIT Investment Club)" value={clubName} onChange={(e) => setClubName(e.target.value)} />
                    <Input placeholder="Description (optional)" value={clubDesc} onChange={(e) => setClubDesc(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button variant="hero" onClick={handleCreate} disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* My club card */}
        {userId && myClub && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 mb-8 border border-primary/30">
            <div className="flex items-center gap-4 flex-wrap">
              <Avatar className="w-12 h-12">
                {myClub.image_url ? <AvatarImage src={myClub.image_url} alt={myClub.name} /> : null}
                <AvatarFallback className="text-lg">{myClub.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg font-semibold">{myClub.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> {myClub.member_count} member{myClub.member_count !== 1 ? "s" : ""} ·
                  Rank #{clubs.findIndex((c) => c.id === myClub.id) + 1}
                </div>
                {myClub.owner_id === userId && myClub.join_code && (
                  <button
                    className="text-xs text-muted-foreground mt-1 flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => { navigator.clipboard.writeText(myClub.join_code); toast({ title: "Copied!", description: `Join code: ${myClub.join_code}` }); }}
                  >
                    <Copy className="w-3 h-3" /> Code: {myClub.join_code}
                  </button>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Avg Return</div>
                <div className={`font-display text-xl font-bold flex items-center gap-1 ${myClub.avg_return >= 0 ? "text-gain" : "text-loss"}`}>
                  <TrendingUp className="w-5 h-5" /> {myClub.avg_return >= 0 ? "+" : ""}{myClub.avg_return}%
                </div>
              </div>
              {myMembership?.role !== "owner" && (
                <Button variant="outline" size="sm" onClick={leaveClub}>
                  <LogOut className="w-4 h-4 mr-1" /> Leave
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Leaderboard</h3>
            </div>
            <Tabs value={leaderboardType} onValueChange={(v) => setLeaderboardType(v as "clubs" | "individuals")}>
              <TabsList>
                <TabsTrigger value="clubs" className="gap-1.5">
                  <School className="w-4 h-4" /> Clubs
                </TabsTrigger>
                <TabsTrigger value="individuals" className="gap-1.5">
                  <User className="w-4 h-4" /> Individuals
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {leaderboardType === "clubs" && (
            <>
              {loading && (
                <div className="p-12 text-center text-muted-foreground">Loading...</div>
              )}
              {!loading && clubs.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">No clubs yet. Be the first to create one!</div>
              )}
              <div className="divide-y divide-border/20">
                {clubs.map((club, i) => {
                  const rank = i + 1;
                  return (
                    <motion.div key={club.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      onClick={() => navigate(`/compete/${club.id}`)}
                      className={`flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors cursor-pointer ${myClub?.id === club.id ? "bg-primary/5" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className={`font-display text-xl font-bold w-8 text-center ${rankColors[rank] || "text-muted-foreground"}`}>
                          {rank <= 3 ? <Medal className={`w-6 h-6 mx-auto ${rankColors[rank]}`} /> : `#${rank}`}
                        </div>
                        <Avatar className="w-9 h-9">
                          {club.image_url ? <AvatarImage src={club.image_url} alt={club.name} /> : null}
                          <AvatarFallback className="text-sm">{club.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{club.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {club.member_count} member{club.member_count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`font-display font-bold ${club.avg_return >= 0 ? "text-gain" : "text-loss"}`}>
                            {club.avg_return >= 0 ? "+" : ""}{club.avg_return}%
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Return</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {leaderboardType === "individuals" && (
            <>
              {individualsLoading && (
                <div className="p-12 text-center text-muted-foreground">Loading...</div>
              )}
              {!individualsLoading && individuals.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">No traders yet.</div>
              )}
              <div className="divide-y divide-border/20">
                {individuals.map((u, i) => {
                  const rank = i + 1;
                  const name = u.display_name || u.username || "Anonymous";
                  return (
                    <motion.div key={u.user_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.03 }}
                      onClick={() => navigate(`/users/${u.user_id}`)}
                      className={`flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors cursor-pointer ${u.user_id === userId ? "bg-primary/5" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className={`font-display text-xl font-bold w-8 text-center ${rankColors[rank] || "text-muted-foreground"}`}>
                          {rank <= 3 ? <Medal className={`w-6 h-6 mx-auto ${rankColors[rank]}`} /> : `#${rank}`}
                        </div>
                        <Avatar className="w-9 h-9">
                          {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={name} /> : null}
                          <AvatarFallback className="text-sm">{name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{name}{u.user_id === userId ? " (you)" : ""}</div>
                          {u.username && u.display_name && (
                            <div className="text-sm text-muted-foreground">@{u.username}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-display font-bold flex items-center gap-1 justify-end ${u.return_pct >= 0 ? "text-gain" : "text-loss"}`}>
                          <TrendingUp className="w-4 h-4" /> {u.return_pct >= 0 ? "+" : ""}{u.return_pct}%
                        </div>
                        <div className="text-xs text-muted-foreground">Return</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CompetePage;
