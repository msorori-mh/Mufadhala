import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, ArrowRight, Crown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

interface LeaderboardEntry {
  rank: number;
  student_id: string;
  first_name: string;
  fourth_name: string;
  college_name: string;
  major_name: string;
  avg_score: number;
  total_exams: number;
  best_score: number;
}

interface Major {
  id: string;
  name_ar: string;
}

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
};

const rankBg = (rank: number) => {
  if (rank === 1) return "bg-yellow-500/10 border-yellow-500/30";
  if (rank === 2) return "bg-gray-400/10 border-gray-400/30";
  if (rank === 3) return "bg-amber-600/10 border-amber-600/30";
  return "";
};

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [selectedMajor, setSelectedMajor] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("majors").select("id, name_ar").eq("is_active", true).order("name_ar")
      .then(({ data }) => { if (data) setMajors(data); });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: s } = await supabase.from("students").select("id").eq("user_id", session.user.id).maybeSingle();
        if (s) setCurrentStudentId(s.id);
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const majorId = selectedMajor === "all" ? null : selectedMajor;

    supabase.rpc("get_leaderboard", {
      _limit: 50,
      _major_id: majorId,
    }).then(({ data, error }) => {
      if (data && !error) setEntries(data as LeaderboardEntry[]);
      setLoading(false);
    });
  }, [selectedMajor]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="gradient-primary text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">لوحة المتصدرين</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard"><ArrowRight className="w-4 h-4 ml-1" />الرئيسية</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select value={selectedMajor} onValueChange={setSelectedMajor}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="جميع التخصصات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التخصصات</SelectItem>
              {majors.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">لا توجد بيانات كافية بعد</p>
              <p className="text-xs text-muted-foreground mt-1">يجب إكمال اختبارين على الأقل للظهور هنا</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isCurrentUser = entry.student_id === currentStudentId;
              return (
                <Card
                  key={entry.student_id}
                  className={`transition-shadow ${rankBg(entry.rank)} ${isCurrentUser ? "ring-2 ring-primary" : ""}`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0 border">
                        {rankIcon(entry.rank)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {entry.first_name} {entry.fourth_name}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">أنت</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.college_name && (
                            <span className="text-[10px] text-muted-foreground truncate">{entry.college_name}</span>
                          )}
                          {entry.major_name && (
                            <>
                              <span className="text-muted-foreground text-[10px]">•</span>
                              <span className="text-[10px] text-muted-foreground truncate">{entry.major_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-left shrink-0">
                        <div className="text-lg font-bold text-primary">{entry.avg_score}%</div>
                        <div className="text-[10px] text-muted-foreground">{entry.total_exams} اختبار</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
