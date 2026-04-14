import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Search, X, ChevronRight, Loader2, BookOpen, HelpCircle,
  GraduationCap, Building2, Filter,
} from "lucide-react";

interface University { id: string; name_ar: string; }
interface College { id: string; name_ar: string; university_id: string; }
interface Major { id: string; name_ar: string; college_id: string; }
interface LessonResult {
  id: string; title: string; summary: string;
  major_id: string | null; college_id: string | null;
  major_name: string; college_name: string;
}
interface QuestionResult {
  id: string; question_text: string; lesson_id: string;
  lesson_title: string; major_name: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
}

const fetchReferenceData = async () => {
  const [{ data: unis }, { data: cols }, { data: majs }] = await Promise.all([
    supabase.from("universities").select("id, name_ar").eq("is_active", true).order("display_order"),
    supabase.from("colleges").select("id, name_ar, university_id").eq("is_active", true).order("display_order"),
    supabase.from("majors").select("id, name_ar, college_id").eq("is_active", true).order("display_order"),
  ]);
  return {
    universities: (unis || []) as University[],
    colleges: (cols || []) as College[],
    majors: (majs || []) as Major[],
  };
};

const fetchSearchContent = async () => {
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, summary, major_id, college_id, majors(name_ar), colleges(name_ar)")
    .eq("is_published", true)
    .order("display_order");

  if (!lessons) return { lessons: [] as LessonResult[], questions: [] as QuestionResult[] };

  const mappedLessons: LessonResult[] = lessons.map((l: any) => ({
    id: l.id, title: l.title, summary: l.summary,
    major_id: l.major_id, college_id: l.college_id,
    major_name: l.majors?.name_ar || "", college_name: l.colleges?.name_ar || "",
  }));

  const lessonIds = lessons.map((l: any) => l.id);
  let mappedQuestions: QuestionResult[] = [];

  if (lessonIds.length > 0) {
    const { data: qs } = await supabase
      .from("questions")
      .select("id, question_text, lesson_id, option_a, option_b, option_c, option_d")
      .in("lesson_id", lessonIds);
    if (qs) {
      const lessonMap = new Map(lessons.map((l: any) => [l.id, { title: l.title, major_name: l.majors?.name_ar || "" }]));
      mappedQuestions = qs.map((q: any) => {
        const info = lessonMap.get(q.lesson_id) || { title: "", major_name: "" };
        return { ...q, lesson_title: info.title, major_name: info.major_name };
      });
    }
  }

  return { lessons: mappedLessons, questions: mappedQuestions };
};

const SearchContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedUni, setSelectedUni] = useState<string>("all");
  const [selectedCollege, setSelectedCollege] = useState<string>("all");
  const [selectedMajor, setSelectedMajor] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("lessons");

  const { data: refData, isLoading: refLoading } = useQuery({
    queryKey: ["search-reference-data"],
    queryFn: fetchReferenceData,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ["search-content"],
    queryFn: fetchSearchContent,
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const universities = refData?.universities || [];
  const colleges = refData?.colleges || [];
  const majors = refData?.majors || [];
  const allLessons = contentData?.lessons || [];
  const allQuestions = contentData?.questions || [];

  const loading = refLoading || contentLoading;

  // Filter colleges/majors based on selection
  const filteredColleges = useMemo(() =>
    selectedUni === "all" ? colleges : colleges.filter(c => c.university_id === selectedUni),
    [colleges, selectedUni]
  );

  const filteredMajors = useMemo(() =>
    selectedCollege === "all" ? majors : majors.filter(m => m.college_id === selectedCollege),
    [majors, selectedCollege]
  );

  // Build allowed IDs for filtering — supports both major and college
  const filterCriteria = useMemo(() => {
    if (selectedMajor !== "all") return { majorIds: new Set([selectedMajor]), collegeIds: null as Set<string> | null };
    if (selectedCollege !== "all") {
      const majorIds = new Set(majors.filter(m => m.college_id === selectedCollege).map(m => m.id));
      return { majorIds, collegeIds: new Set([selectedCollege]) };
    }
    if (selectedUni !== "all") {
      const collegeIds = new Set(colleges.filter(c => c.university_id === selectedUni).map(c => c.id));
      const majorIds = new Set(majors.filter(m => collegeIds.has(m.college_id)).map(m => m.id));
      return { majorIds, collegeIds };
    }
    return null; // no filter
  }, [selectedUni, selectedCollege, selectedMajor, colleges, majors]);

  const matchesQuery = useCallback((text: string) => {
    if (!query.trim()) return true;
    return text.toLowerCase().includes(query.trim().toLowerCase());
  }, [query]);

  const filteredLessons = useMemo(() => {
    return allLessons.filter(l => {
      if (filterCriteria) {
        const matchesMajor = l.major_id && filterCriteria.majorIds.has(l.major_id);
        const matchesCollege = l.college_id && filterCriteria.collegeIds?.has(l.college_id);
        if (!matchesMajor && !matchesCollege) return false;
      }
      if (!query.trim()) return true;
      return matchesQuery(l.title) || matchesQuery(l.summary);
    });
  }, [allLessons, filterCriteria, query, matchesQuery]);

  const filteredQuestions = useMemo(() => {
    const lessonLookup = new Map(allLessons.map(l => [l.id, l]));
    return allQuestions.filter(q => {
      if (filterCriteria) {
        const lesson = lessonLookup.get(q.lesson_id);
        if (!lesson) return false;
        const matchesMajor = lesson.major_id && filterCriteria.majorIds.has(lesson.major_id);
        const matchesCollege = lesson.college_id && filterCriteria.collegeIds?.has(lesson.college_id);
        if (!matchesMajor && !matchesCollege) return false;
      }
      if (!query.trim()) return true;
      return matchesQuery(q.question_text) || matchesQuery(q.option_a) || matchesQuery(q.option_b) || matchesQuery(q.option_c) || matchesQuery(q.option_d);
    });
  }, [allQuestions, allLessons, filterCriteria, query, matchesQuery]);

  const handleResetFilters = () => {
    setSelectedUni("all");
    setSelectedCollege("all");
    setSelectedMajor("all");
  };

  const hasActiveFilter = selectedUni !== "all" || selectedCollege !== "all" || selectedMajor !== "all";

  const highlightText = (text: string) => {
    if (!query.trim()) return text;
    const q = query.trim();
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            <span className="font-bold text-sm">البحث المتقدم</span>
          </div>
          <div className="flex gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard"><ChevronRight className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 md:pb-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في الدروس والأسئلة..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-9 pl-9"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            فلترة
            {hasActiveFilter && <Badge className="text-xs h-4 px-1.5 mr-1">{[selectedUni !== "all", selectedCollege !== "all", selectedMajor !== "all"].filter(Boolean).length}</Badge>}
          </Button>
          {hasActiveFilter && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-muted-foreground">
              إزالة الفلاتر
            </Button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> الجامعة
                </label>
                <Select value={selectedUni} onValueChange={(v) => { setSelectedUni(v); setSelectedCollege("all"); setSelectedMajor("all"); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الجامعات</SelectItem>
                    {universities.map(u => <SelectItem key={u.id} value={u.id}>{u.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> الكلية
                </label>
                <Select value={selectedCollege} onValueChange={(v) => { setSelectedCollege(v); setSelectedMajor("all"); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الكليات</SelectItem>
                    {filteredColleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> التخصص
                </label>
                <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التخصصات</SelectItem>
                    {filteredMajors.map(m => <SelectItem key={m.id} value={m.id}>{m.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="lessons" className="gap-1.5 text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              الدروس ({filteredLessons.length})
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-1.5 text-xs">
              <HelpCircle className="w-3.5 h-3.5" />
              الأسئلة ({filteredQuestions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="space-y-2 mt-3">
            {filteredLessons.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {query ? `لا توجد نتائج لـ "${query}"` : "لا توجد دروس"}
                </p>
              </div>
            ) : (
              filteredLessons.map(l => (
                <Link key={l.id} to={`/lessons/${l.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-3">
                      <p className="font-semibold text-sm text-foreground">{highlightText(l.title)}</p>
                      {l.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{highlightText(l.summary)}</p>}
                      <Badge variant="outline" className="text-xs mt-2">{l.major_name || l.college_name}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="questions" className="space-y-2 mt-3">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {query ? `لا توجد نتائج لـ "${query}"` : "لا توجد أسئلة"}
                </p>
              </div>
            ) : (
              filteredQuestions.slice(0, 50).map(q => (
                <Link key={q.id} to={`/lessons/${q.lesson_id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-3">
                      <p className="text-sm text-foreground font-medium">{highlightText(q.question_text)}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {[q.option_a, q.option_b, q.option_c, q.option_d].map((opt, i) => (
                          <p key={i} className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 truncate">
                            {String.fromCharCode(65 + i)}) {highlightText(opt)}
                          </p>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{q.lesson_title}</Badge>
                        <Badge variant="secondary" className="text-xs">{q.major_name}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
            {filteredQuestions.length > 50 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                يتم عرض أول 50 نتيجة من {filteredQuestions.length}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SearchContent;
