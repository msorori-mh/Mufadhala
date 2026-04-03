import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = ({ variant = "header" }: { variant?: "header" | "default" | "sidebar" }) => {
  const { theme, setTheme } = useTheme();

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  if (variant === "header") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        className="text-white hover:bg-white/20 hover:text-white"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {theme === "dark" ? "الوضع الفاتح" : "الوضع المظلم"}
      </button>
    );
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle}>
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};

export default ThemeToggle;
