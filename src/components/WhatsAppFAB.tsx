import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

const WhatsAppFAB = () => {
  const { user } = useAuthContext();
  const { pathname } = useLocation();

  const hiddenRoutes = ["/", "/login", "/register", "/admin-login", "/privacy-policy", "/terms-of-service"];
  if (!user || hiddenRoutes.includes(pathname)) return null;

  const message = encodeURIComponent("السلام عليكم، أحتاج مساعدة من فريق الدعم الفني لتطبيق مُفَاضَلَة 🎓");

  return (
    <a
      href={`https://wa.me/967780060056?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل عبر واتساب"
      className="fixed bottom-20 left-4 z-50 w-12 h-12 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform md:bottom-6"
    >
      <MessageCircle className="w-6 h-6" />
    </a>
  );
};

export default WhatsAppFAB;
