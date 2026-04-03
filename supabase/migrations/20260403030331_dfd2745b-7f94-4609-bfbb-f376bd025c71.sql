
CREATE OR REPLACE FUNCTION public.notify_student_on_payment_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    IF NEW.status = 'approved' THEN
      v_title := 'تم قبول طلب الدفع';
      v_message := 'تمت الموافقة على طلب الدفع الخاص بك وتفعيل اشتراكك. يمكنك الآن الوصول إلى المحتوى.';
      v_type := 'success';
    ELSE
      v_title := 'تم رفض طلب الدفع';
      v_message := 'تم رفض طلب الدفع الخاص بك.';
      v_type := 'warning';
      IF NEW.admin_notes IS NOT NULL AND NEW.admin_notes <> '' THEN
        v_message := v_message || ' السبب: ' || NEW.admin_notes;
      END IF;
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id, v_title, v_message, v_type, '/subscription');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_student_on_payment_review
AFTER UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_on_payment_review();
