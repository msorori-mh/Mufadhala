import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface NativeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
  className?: string;
}

/**
 * A native HTML <select> styled to match the design system.
 * Used on mobile / Capacitor to avoid Radix portal issues
 * that cause parent component remounts and state loss.
 */
const NativeSelect = ({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  options,
  className,
}: NativeSelectProps) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  );
};

export default NativeSelect;
