import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Eye, Clock, ImageIcon } from "lucide-react";

interface PaymentRequest {
  id: string; user_id: string; subscription_id: string | null;
  payment_method_id: string | null; amount: number; currency: string;
  receipt_url: string | null; status: string; admin_notes: string | null;
  reviewed_at: string | null; reviewed_by: string | null; created_at: string;
}

interface StudentInfo {
  user_id: string; first_name: string | null; second_name: string | null;
  third_name: string | null; fourth_name: string | null;
}

const AdminPayments = () => {
  const { loading: authLoading, user } = useAuth("admin");
  const { toast } = useToast();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [methods, setMethods] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("pending");

  const fetchData = async () => {
    const [{ data: r }, { data: s }, { data: m }] = await Promise.all([
      supabase.from("payment_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("students").select("user_id, first_name, second_name, third_name, fourth_name"),
      supabase.from("payment_methods").select("id, name, type"),
    ]);
    if (r) setRequests(r as PaymentRequest[]);
    if (s) setStudents(s);
    if (m) setMethods(m as { id: string; name: string; type: string }[]);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const getStudentName = (userId: string) => {
    const s = students.find((st) => st.user_id === userId);
    if (!s) return "طالب غير معروف";
    return [s.first_name, s.second_name, s.third_name, s.fourth_name].filter(Boolean).join(" ");
  };

  const getMethodName = (methodId: string | null) => methodId ? methods.find((m) => m.id === methodId)?.name || "-" : "-";

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 ml-1" />معلق</Badge>;
      case "approved": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle className="w-3 h-3 ml-1" />مقبول</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const handleReview = (req: PaymentRequest) => { setSelectedRequest(req); setAdminNotes(req.admin_notes || ""); setReviewDialog(true); };
  const handleViewReceipt = (req: PaymentRequest) => { setSelectedRequest(req); setReceiptDialog(true); };

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;
    setSaving(true);
    const { error: prError } = await supabase.from("payment_requests").update({
      status: "approved", admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(), reviewed_by: user.id,
    }).eq("id", selectedRequest.id);
    if (prError) { toast({ variant: "destructive", title: prError.message }); setSaving(false); return; }

    if (selectedRequest.subscription_id) {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
      await supabase.from("subscriptions").update({
        status: "active", starts_at: now.toISOString(), expires_at: expiresAt.toISOString(),
      }).eq("id", selectedRequest.subscription_id);
    }
    toast({ title: "تمت الموافقة على الطلب وتفعيل الاشتراك" });
    setReviewDialog(false); setSaving(false); fetchData();
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;
    if (!adminNotes) { toast({ variant: "destructive", title: "يرجى كتابة سبب الرفض" }); return; }
    setSaving(true);
    const { error } = await supabase.from("payment_requests").update({
      status: "rejected", admin_notes: adminNotes,
      reviewed_at: new Date().toISOString(), reviewed_by: user.id,
    }).eq("id", selectedRequest.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      if (selectedRequest.subscription_id) await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", selectedRequest.subscription_id);
      toast({ title: "تم رفض الطلب" }); setReviewDialog(false); fetchData();
    }
    setSaving(false);
  };

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  const filtered = requests.filter((r) => tab === "all" || r.status === tab);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">طلبات الدفع</h1>
          <p className="text-sm text-muted-foreground">{requests.length} طلب • {pendingCount} معلق</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">معلق ({pendingCount})</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">مقبول</TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1">مرفوض</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">الكل</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-2">
          {filtered.map((req) => (
            <Card key={req.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{getStudentName(req.user_id)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{req.amount.toLocaleString()} {req.currency} • {getMethodName(req.payment_method_id)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar")}</p>
                    {req.admin_notes && <p className="text-xs text-muted-foreground mt-1">ملاحظات: {req.admin_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(req.status)}
                    <div className="flex gap-1">
                      {req.receipt_url && <Button variant="ghost" size="icon" onClick={() => handleViewReceipt(req)}><ImageIcon className="w-4 h-4" /></Button>}
                      {req.status === "pending" && <Button variant="ghost" size="icon" onClick={() => handleReview(req)}><Eye className="w-4 h-4" /></Button>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>}
        </div>
      </div>

      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>مراجعة طلب الدفع</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">الطالب:</span><span className="font-medium">{getStudentName(selectedRequest.user_id)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المبلغ:</span><span className="font-medium">{selectedRequest.amount.toLocaleString()} {selectedRequest.currency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">طريقة الدفع:</span><span className="font-medium">{getMethodName(selectedRequest.payment_method_id)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">التاريخ:</span><span className="font-medium">{new Date(selectedRequest.created_at).toLocaleDateString("ar")}</span></div>
              </div>
              {selectedRequest.receipt_url && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={selectedRequest.receipt_url} alt="سند الدفع" className="w-full max-h-64 object-contain bg-muted" />
                </div>
              )}
              <div className="space-y-2"><Label>ملاحظات الإدارة</Label><Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="ملاحظات أو سبب الرفض..." /></div>
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 ml-1" /> موافقة</Button>
                <Button onClick={handleReject} disabled={saving} variant="destructive" className="flex-1"><XCircle className="w-4 h-4 ml-1" /> رفض</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>سند الدفع</DialogTitle></DialogHeader>
          {selectedRequest?.receipt_url && <img src={selectedRequest.receipt_url} alt="سند الدفع" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPayments;
