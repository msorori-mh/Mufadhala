import { useEffect, useState, useCallback } from "react";
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
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Eye, Clock, ImageIcon, AlertTriangle, ScanSearch, ShieldAlert, ShieldCheck, ShieldQuestion, Copy } from "lucide-react";

interface PaymentRequest {
  id: string; user_id: string; subscription_id: string | null;
  payment_method_id: string | null; amount: number; currency: string;
  receipt_url: string | null; status: string; admin_notes: string | null;
  reviewed_at: string | null; reviewed_by: string | null; created_at: string;
  fraud_status: string; duplicate_count: number;
  extracted_amount: number | null; extracted_reference: string | null;
  extracted_date: string | null; receipt_hash: string | null;
}

interface StudentInfo {
  user_id: string; first_name: string | null; second_name: string | null;
  third_name: string | null; fourth_name: string | null;
}

interface PaymentMethod {
  id: string; name: string; type: string; account_name: string | null;
}

interface ReceiptAnalysis {
  sender_name: string | null;
  recipient_name: string | null;
  amount: string | null;
  transaction_id: string | null;
  is_match: boolean;
  error?: string;
}

const AdminPayments = () => {
  const { loading: authLoading, user } = useAuth("moderator");
  const { toast } = useToast();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("pending");
  const [fraudFilter, setFraudFilter] = useState<string>("all");
  const [signedReceiptUrl, setSignedReceiptUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = async () => {
    const [{ data: r }, { data: s }, { data: m }] = await Promise.all([
      supabase.from("payment_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("students").select("user_id, first_name, second_name, third_name, fourth_name"),
      supabase.from("payment_methods").select("id, name, type, account_name"),
    ]);
    if (r) setRequests(r as PaymentRequest[]);
    if (s) setStudents(s);
    if (m) setMethods(m as PaymentMethod[]);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const getStudentName = (userId: string) => {
    const s = students.find((st) => st.user_id === userId);
    if (!s) return "طالب غير معروف";
    return [s.first_name, s.second_name, s.third_name, s.fourth_name].filter(Boolean).join(" ");
  };

  const getMethodName = (methodId: string | null) => methodId ? methods.find((m) => m.id === methodId)?.name || "-" : "-";
  const getMethodAccountName = (methodId: string | null) => methodId ? methods.find((m) => m.id === methodId)?.account_name || null : null;

  const statusStyles = (status: string) => {
    switch (status) {
      case "approved":
        return {
          cardBorder: "border-green-300 dark:border-green-800",
          cardBg: "bg-green-50/40 dark:bg-green-950/20",
          accentBar: "bg-green-500",
          badgeClass: "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300",
          headerBar: "bg-green-500",
          tabActive: "data-[state=active]:bg-green-100 data-[state=active]:text-green-700 dark:data-[state=active]:bg-green-950/40 dark:data-[state=active]:text-green-300",
        };
      case "rejected":
        return {
          cardBorder: "border-red-300 dark:border-red-800",
          cardBg: "bg-red-50/40 dark:bg-red-950/20",
          accentBar: "bg-red-500",
          badgeClass: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300",
          headerBar: "bg-red-500",
          tabActive: "data-[state=active]:bg-red-100 data-[state=active]:text-red-700 dark:data-[state=active]:bg-red-950/40 dark:data-[state=active]:text-red-300",
        };
      case "pending":
      default:
        return {
          cardBorder: "border-yellow-300 dark:border-yellow-800",
          cardBg: "bg-yellow-50/40 dark:bg-yellow-950/20",
          accentBar: "bg-yellow-500",
          badgeClass: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300",
          headerBar: "bg-yellow-500",
          tabActive: "data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700 dark:data-[state=active]:bg-yellow-950/40 dark:data-[state=active]:text-yellow-300",
        };
    }
  };

  const statusBadge = (status: string) => {
    const s = statusStyles(status);
    switch (status) {
      case "pending": return <Badge className={s.badgeClass}><Clock className="w-3 h-3 ml-1" />معلق</Badge>;
      case "approved": return <Badge className={s.badgeClass}><CheckCircle className="w-3 h-3 ml-1" />مقبول</Badge>;
      case "rejected": return <Badge className={s.badgeClass}><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const fraudBadge = (fraudStatus: string, duplicateCount: number) => {
    switch (fraudStatus) {
      case "suspicious":
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <ShieldAlert className="w-3 h-3" />مشبوه {duplicateCount > 0 && `(${duplicateCount}x)`}
          </Badge>
        );
      case "review":
        return (
          <Badge variant="outline" className="text-xs gap-1 text-yellow-600 border-yellow-400">
            <ShieldQuestion className="w-3 h-3" />مراجعة
          </Badge>
        );
      case "clean":
        return (
          <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-300">
            <ShieldCheck className="w-3 h-3" />سليم
          </Badge>
        );
      default: return null;
    }
  };

  const analyzeReceipt = useCallback(async (receiptSignedUrl: string, expectedAccountName: string | null) => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-receipt", {
        body: { receipt_url: receiptSignedUrl, expected_account_name: expectedAccountName },
      });
      if (error) throw error;
      if (data?.error === "parse_failed") {
        setAnalysis({ sender_name: null, recipient_name: null, amount: null, transaction_id: null, is_match: false, error: "لم يتمكن النظام من قراءة السند. يرجى التحقق يدوياً." });
      } else if (data?.error) {
        setAnalysis({ sender_name: null, recipient_name: null, amount: null, transaction_id: null, is_match: false, error: data.error });
      } else {
        setAnalysis(data as ReceiptAnalysis);
        if (data && !data.is_match) {
          const extractedName = data.recipient_name || "غير واضح";
          const expectedName = getMethodAccountName(selectedRequest?.payment_method_id ?? null) || "غير محدد";
          setAdminNotes(
            `تم رفض طلب الدفع: بيانات المستلم غير مطابقة.\nاسم المستلم في السند: ${extractedName}\nاسم المستلم المتوقع: ${expectedName}\nيرجى التأكد من التحويل إلى الحساب الصحيح وإعادة المحاولة.`
          );
        }
      }
    } catch (e: any) {
      console.error("Receipt analysis failed:", e);
      setAnalysis({ sender_name: null, recipient_name: null, amount: null, transaction_id: null, is_match: false, error: "فشل في تحليل السند" });
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleReview = async (req: PaymentRequest) => {
    setSelectedRequest(req);
    setAdminNotes(req.admin_notes || "");
    setAnalysis(null);
    setAnalyzing(false);
    let url: string | null = null;
    if (req.receipt_url) {
      const { data } = await supabase.storage.from("receipts").createSignedUrl(req.receipt_url, 3600);
      url = data?.signedUrl || null;
      setSignedReceiptUrl(url);
    } else {
      setSignedReceiptUrl(null);
    }
    setReviewDialog(true);

    if (url && req.status === "pending") {
      const accountName = getMethodAccountName(req.payment_method_id);
      analyzeReceipt(url, accountName);
    }
  };

  const handleViewReceipt = async (req: PaymentRequest) => {
    setSelectedRequest(req);
    if (req.receipt_url) {
      const { data } = await supabase.storage.from("receipts").createSignedUrl(req.receipt_url, 3600);
      setSignedReceiptUrl(data?.signedUrl || null);
    } else {
      setSignedReceiptUrl(null);
    }
    setReceiptDialog(true);
  };

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
      await supabase.from("subscriptions").update({
        status: "active", starts_at: now.toISOString(),
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

  const suspiciousCount = requests.filter((r) => r.fraud_status === "suspicious").length;
  const reviewCount = requests.filter((r) => r.fraud_status === "review").length;

  let filtered = requests.filter((r) => tab === "all" || r.status === tab);
  if (fraudFilter !== "all") {
    filtered = filtered.filter((r) => r.fraud_status === fraudFilter);
  }
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <AdminLayout>
      <PermissionGate permission="payments">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">طلبات الدفع</h1>
          <p className="text-sm text-muted-foreground">{requests.length} طلب • {pendingCount} معلق</p>
        </div>

        {/* Fraud summary */}
        {(suspiciousCount > 0 || reviewCount > 0) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
            <div>
              {suspiciousCount > 0 && <span className="text-destructive font-semibold">{suspiciousCount} طلب مشبوه</span>}
              {suspiciousCount > 0 && reviewCount > 0 && <span className="text-muted-foreground mx-1">•</span>}
              {reviewCount > 0 && <span className="text-yellow-600 font-semibold">{reviewCount} يحتاج مراجعة</span>}
            </div>
          </div>
        )}

        {/* Status summary bar */}
        <div className="flex items-center gap-3 text-xs flex-wrap rounded-lg border bg-muted/30 px-3 py-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
            <span className="text-muted-foreground">معلق</span>
            <span className="font-semibold">{pendingCount}</span>
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span className="text-muted-foreground">مقبول</span>
            <span className="font-semibold">{approvedCount}</span>
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="text-muted-foreground">مرفوض</span>
            <span className="font-semibold">{rejectedCount}</span>
          </span>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className={`flex-1 ${statusStyles("pending").tabActive}`}>معلق ({pendingCount})</TabsTrigger>
            <TabsTrigger value="approved" className={`flex-1 ${statusStyles("approved").tabActive}`}>مقبول ({approvedCount})</TabsTrigger>
            <TabsTrigger value="rejected" className={`flex-1 ${statusStyles("rejected").tabActive}`}>مرفوض ({rejectedCount})</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">الكل ({requests.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Fraud filter */}
        <div className="flex gap-2 flex-wrap">
          {["all", "suspicious", "review", "clean"].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={fraudFilter === f ? "default" : "outline"}
              onClick={() => setFraudFilter(f)}
              className="text-xs"
            >
              {f === "all" ? "الكل" : f === "suspicious" ? "🔴 مشبوه" : f === "review" ? "🟡 مراجعة" : "🟢 سليم"}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((req) => {
            const s = statusStyles(req.status);
            const fraudOverride = req.fraud_status === "suspicious"
              ? "border-destructive/60 bg-destructive/5"
              : req.fraud_status === "review"
              ? "border-orange-400/60 bg-orange-50/30 dark:bg-orange-950/10"
              : "";
            const cardCls = fraudOverride || `${s.cardBorder} ${s.cardBg}`;
            return (
            <Card key={req.id} className={`relative overflow-hidden ${cardCls}`}>
              <span className={`absolute top-0 bottom-0 right-0 w-1 ${s.accentBar}`} aria-hidden="true" />
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{getStudentName(req.user_id)}</p>
                    <p className="text-xs text-muted-foreground">{req.amount.toLocaleString()} {req.currency} • {getMethodName(req.payment_method_id)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar")}</p>
                    {req.admin_notes && <p className="text-xs text-muted-foreground">ملاحظات: {req.admin_notes}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      {fraudBadge(req.fraud_status, req.duplicate_count)}
                      {req.duplicate_count > 0 && (
                        <span className="text-xs text-destructive font-medium">⚠️ هذا السند تم استخدامه {req.duplicate_count} مرات</span>
                      )}
                      {req.extracted_reference && (
                        <span className="text-xs text-muted-foreground">مرجع: {req.extracted_reference}</span>
                      )}
                    </div>
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
            );
          })}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>مراجعة طلب الدفع</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">الطالب:</span><span className="font-medium">{getStudentName(selectedRequest.user_id)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المبلغ:</span><span className="font-medium">{selectedRequest.amount.toLocaleString()} {selectedRequest.currency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">طريقة الدفع:</span><span className="font-medium">{getMethodName(selectedRequest.payment_method_id)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">التاريخ:</span><span className="font-medium">{new Date(selectedRequest.created_at).toLocaleDateString("ar")}</span></div>
              </div>

              {/* Fraud Status Section */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4" /> حالة الاحتيال
                  </span>
                  {fraudBadge(selectedRequest.fraud_status, selectedRequest.duplicate_count)}
                </div>
                {selectedRequest.duplicate_count > 0 && (
                  <div className="bg-destructive/10 rounded p-2 text-xs text-destructive">
                    ⚠️ هذا السند تم استخدامه {selectedRequest.duplicate_count} مرات
                  </div>
                )}
                {(selectedRequest.extracted_amount || selectedRequest.extracted_reference || selectedRequest.extracted_date) && (
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-muted-foreground">بيانات مستخرجة من السند:</p>
                    {selectedRequest.extracted_amount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ المستخرج:</span>
                        <span className="font-medium">{selectedRequest.extracted_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedRequest.extracted_reference && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رقم المرجع:</span>
                        <span className="font-medium">{selectedRequest.extracted_reference}</span>
                      </div>
                    )}
                    {selectedRequest.extracted_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">التاريخ:</span>
                        <span className="font-medium">{selectedRequest.extracted_date}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {signedReceiptUrl && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={signedReceiptUrl} alt="سند الدفع" className="w-full max-h-64 object-contain bg-muted" />
                </div>
              )}

              {/* Receipt Analysis Section */}
              {(analyzing || analysis) && (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ScanSearch className="w-4 h-4 text-primary" />
                    <span>نتائج تحليل السند</span>
                  </div>

                  {analyzing && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري تحليل السند...</span>
                    </div>
                  )}

                  {analysis && !analysis.error && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">اسم المرسل:</span>
                        <span className="font-medium">{analysis.sender_name || "غير متوفر"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">اسم المستلم (من السند):</span>
                        <span className="font-medium">{analysis.recipient_name || "غير متوفر"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">اسم المستلم المتوقع:</span>
                        <span className="font-medium">{getMethodAccountName(selectedRequest.payment_method_id) || "-"}</span>
                      </div>
                      {analysis.amount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المبلغ (من السند):</span>
                          <span className="font-medium">{analysis.amount}</span>
                        </div>
                      )}
                      {analysis.transaction_id && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رقم العملية:</span>
                          <span className="font-medium">{analysis.transaction_id}</span>
                        </div>
                      )}
                      <div className="pt-1">
                        {analysis.is_match ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle className="w-3 h-3 ml-1" />بيانات المستلم مطابقة
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 ml-1" />بيانات المستلم غير مطابقة
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {analysis?.error && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{analysis.error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Auto-fill reject reason for suspicious */}
              {selectedRequest.fraud_status === "suspicious" && !adminNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setAdminNotes("تم رفض طلب الدفع بسبب تكرار السند. يرجى رفع سند جديد غير مستخدم مسبقاً.")}
                >
                  <Copy className="w-3 h-3 ml-1" /> تعبئة سبب الرفض تلقائياً (سند مكرر)
                </Button>
              )}

              <div className="space-y-2">
                <Label>ملاحظات الإدارة</Label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="ملاحظات أو سبب الرفض..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 ml-1" /> اعتماد وتفعيل
                </Button>
                <Button onClick={handleReject} disabled={saving} variant="destructive" className="flex-1">
                  <XCircle className="w-4 h-4 ml-1" /> رفض
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt View Dialog */}
      <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>سند الدفع</DialogTitle></DialogHeader>
          {signedReceiptUrl && <img src={signedReceiptUrl} alt="سند الدفع" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminPayments;
