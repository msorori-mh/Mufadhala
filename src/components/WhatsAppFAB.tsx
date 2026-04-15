import { MessageCircle } from "lucide-react";

const WhatsAppFAB = () => (
  <a
    href="https://wa.me/967780060056"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="تواصل عبر واتساب"
    className="fixed bottom-20 left-4 z-50 w-12 h-12 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform md:bottom-6"
  >
    <MessageCircle className="w-6 h-6" />
  </a>
);

export default WhatsAppFAB;
