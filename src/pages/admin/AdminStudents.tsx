import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Loader2, Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const AdminStudents = () => {
  const { loading: authLoading } = useAuth("moderator");
  const [students, setStudents] = useState<Tables<"students">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    const fetch = async () => {
      const [{ data: s }, { data: u }, { data: m }] = await Promise.all([
        supabase.from("students").select("*").order("created_at", { ascending: false }),
        supabase.from("universities").select("*"),
        supabase.from("majors").select("*"),
      ]);
      if (s) setStudents(s);
      if (u) setUniversities(u);
      if (m) setMajors(m);
      setLoading(false);
    };
    fetch();
  }, [authLoading]);

  const getUniName = (id: string | null) => id ? universities.find((u) => u.id === id)?.name_ar || "-" : "-";
  const getMajorName = (id: string | null) => id ? majors.find((m) => m.id === id)?.name_ar || "-" : "-";
  const getFullName = (s: Tables<"students">) => [s.first_name, s.second_name, s.third_name, s.fourth_name].filter(Boolean).join(" ");

  const filtered = students.filter((s) => {
    if (!search) return true;
    const name = getFullName(s).toLowerCase();
    return name.includes(search.toLowerCase()) || s.coordination_number?.includes(search);
  });

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">الطلاب</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} طالب</p>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو رقم التنسيق..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>

        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{getFullName(s)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getUniName(s.university_id)} • {getMajorName(s.major_id)}
                    </p>
                    {s.governorate && <p className="text-xs text-muted-foreground">{s.governorate}</p>}
                  </div>
                  <div className="text-left">
                    {s.gpa && <Badge variant="secondary" className="text-xs">{s.gpa}%</Badge>}
                    {s.coordination_number && <p className="text-[10px] text-muted-foreground mt-1">#{s.coordination_number}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStudents;
