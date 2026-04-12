import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

import ThemeToggle from "@/components/ThemeToggle";
import {
  GraduationCap, ChevronLeft, Loader2, Search, MapPin, FileText,
  Calendar, TrendingUp, Star, Download, BookOpen,
} from "lucide-react";

const CollegeGuide = () => {
  const [universities, setUniversities] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUni, setFilterUni] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: u }, { data: c }] = await Promise.all([
        supabase.from("universities").select("*").eq("is_active", true).order("display_order"),
        supabase.from("colleges").select("*").eq("is_active", true).order("display_order"),
      ]);
      if (u) setUniversities(u);
      if (c) setColleges(c);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = colleges
    .filter((c) => !filterUni || c.university_id === filterUni)
    .filter((c) =>
      !searchText ||
      c.name_ar?.includes(searchText) ||
      c.name_en?.toLowerCase().includes(searchText.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchText.toLowerCase())
    );

  const getUniName = (id: string) => universities.find((u) => u.id === id)?.name_ar || "";
  const getUniGuideUrl = (id: string) => universities.find((u) => u.id === id)?.guide_url;

  const exportGuideAsPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    // Group filtered colleges by university
    const grouped: Record<string, { uniName: string; colleges: any[] }> = {};
    filtered.forEach((c) => {
      const uniId = c.university_id;
      if (!grouped[uniId]) grouped[uniId] = { uniName: getUniName(uniId), colleges: [] };
      grouped[uniId].colleges.push(c);
    });

    const groupsHtml = Object.values(grouped).map((g) => {
      const rows = g.colleges.map((c: any) =>
        `<tr>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${c.name_ar}</td>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${c.min_gpa != null ? c.min_gpa + "%" : "—"}</td>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${c.acceptance_rate != null ? c.acceptance_rate + "%" : "—"}</td>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${c.registration_deadline || "—"}</td>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-size:11px">${c.required_documents?.join("، ") || "—"}</td>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-size:11px">${c.notes || "—"}</td>
        </tr>`
      ).join("");

      return `<tr><td colspan="6" style="background:#e5e7eb;padding:8px;font-weight:bold;border:1px solid #ddd">${g.uniName}</td></tr>${rows}`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>دليل الكليات والمتطلبات</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;direction:rtl}h1{font-size:20px;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
      th{border:1px solid #ddd;padding:8px;background:#f3f4f6;text-align:right}
      @media print{body{padding:0}}</style></head><body>
      <h1>دليل الكليات والمتطلبات</h1>
      <p style="color:#666;font-size:12px;margin-bottom:8px">${new Date().toLocaleDateString("ar")} — ${filtered.length} كلية</p>
      <table>
        <thead><tr>
          <th>الكلية</th><th style="text-align:center">الحد الأدنى</th><th style="text-align:center">الطاقة الاستيعابية</th>
          <th>موعد التنسيق</th><th>الوثائق المطلوبة</th><th>ملاحظات</th>
        </tr></thead>
        <tbody>${groupsHtml}</tbody>
      </table>
      <script>setTimeout(()=>{window.print()},500)</script></body></html>`);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Universities that have guides
  const universityGuides = universities.filter((u) => u.guide_url);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="font-bold text-lg">دليل الكليات</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard"><ChevronLeft className="w-4 h-4 ml-1" />الرئيسية</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">دليل الكليات والمتطلبات</h1>
          <p className="text-sm text-muted-foreground mt-1">تعرّف على متطلبات القبول ونسب القبول لكل كلية</p>
        </div>

        {/* University Guides Section */}
        {universityGuides.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                أدلة التنسيق والتسجيل
              </p>
              <div className="flex flex-wrap gap-2">
                {universityGuides.map((u) => (
                  <Button
                    key={u.id}
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1.5 text-xs"
                  >
                    <a href={u.guide_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-3.5 h-3.5" />
                      {u.name_ar}
                    </a>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن كلية..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pr-9"
            />
          </div>
          <select
            value={filterUni}
            onChange={(e) => setFilterUni(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="">جميع الجامعات</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>{u.name_ar}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={exportGuideAsPDF} className="h-10 gap-1.5">
            <Download className="w-4 h-4" /> تصدير PDF
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} كلية</p>

        {/* College Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((c) => {
            const uniGuide = getUniGuideUrl(c.university_id);
            return (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-foreground">{c.name_ar}</h3>
                    {c.name_en && <p className="text-xs text-muted-foreground" dir="ltr">{c.name_en}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{getUniName(c.university_id)}</span>
                      {uniGuide && (
                        <a href={uniGuide} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs mr-1 flex items-center gap-0.5">
                          <FileText className="w-3 h-3" /> الدليل
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-2 flex-wrap">
                    {c.min_gpa != null && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Star className="w-3 h-3" />
                        الحد الأدنى: {c.min_gpa}%
                      </Badge>
                    )}
                    {c.acceptance_rate != null && (
                      <Badge variant="outline" className="text-xs gap-1">
                         <TrendingUp className="w-3 h-3" />
                         الطاقة الاستيعابية: {c.acceptance_rate}
                      </Badge>
                    )}
                  </div>

                  {c.registration_deadline && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>موعد التنسيق: {c.registration_deadline}</span>
                    </div>
                  )}

                  {c.required_documents && c.required_documents.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" /> الوثائق المطلوبة:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 pr-4">
                        {c.required_documents.map((doc: string, i: number) => (
                          <li key={i} className="list-disc">{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {c.notes && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{c.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد كليات مطابقة</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CollegeGuide;
