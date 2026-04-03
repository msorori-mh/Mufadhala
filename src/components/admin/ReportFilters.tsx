import { format } from "date-fns";
import { CalendarIcon, X, Download, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type ExportData, exportToExcel, exportToPDF } from "@/lib/exportReport";
import type { Tables } from "@/integrations/supabase/types";

const GOVERNORATES = [
  "صنعاء", "أمانة العاصمة", "عمران", "ذمار", "إب", "الحديدة", "صعدة", "حجة",
  "المحويت", "ريمة", "تعز", "عدن", "لحج", "أبين", "الضالع", "شبوة",
  "حضرموت", "المهرة", "سقطرى", "مأرب", "الجوف", "البيضاء",
];

export interface ReportFilterValues {
  dateFrom?: Date;
  dateTo?: Date;
  universityId?: string;
  governorate?: string;
}

interface ReportFiltersProps {
  filters: ReportFilterValues;
  onChange: (filters: ReportFilterValues) => void;
  universities?: Tables<"universities">[];
  showUniversity?: boolean;
  showGovernorate?: boolean;
  showDate?: boolean;
  exportData?: ExportData;
  exportFilename?: string;
}

const ReportFilters = ({
  filters, onChange, universities = [],
  showUniversity = true, showGovernorate = true, showDate = true,
  exportData, exportFilename = "تقرير",
}: ReportFiltersProps) => {
  const hasFilters = filters.dateFrom || filters.dateTo || filters.universityId || filters.governorate;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-card border rounded-lg">
      {showDate && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs gap-1.5 h-8", !filters.dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5" />
                {filters.dateFrom ? format(filters.dateFrom, "yyyy/MM/dd") : "من تاريخ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={filters.dateFrom} onSelect={(d) => onChange({ ...filters, dateFrom: d || undefined })} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs gap-1.5 h-8", !filters.dateTo && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5" />
                {filters.dateTo ? format(filters.dateTo, "yyyy/MM/dd") : "إلى تاريخ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={filters.dateTo} onSelect={(d) => onChange({ ...filters, dateTo: d || undefined })} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </>
      )}
      {showUniversity && universities.length > 0 && (
        <Select value={filters.universityId || "__all__"} onValueChange={(v) => onChange({ ...filters, universityId: v === "__all__" ? undefined : v })}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]">
            <SelectValue placeholder="الجامعة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">كل الجامعات</SelectItem>
            {universities.map((u) => <SelectItem key={u.id} value={u.id}>{u.name_ar}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {showGovernorate && (
        <Select value={filters.governorate || "__all__"} onValueChange={(v) => onChange({ ...filters, governorate: v === "__all__" ? undefined : v })}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]">
            <SelectValue placeholder="المحافظة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">كل المحافظات</SelectItem>
            {GOVERNORATES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive gap-1" onClick={() => onChange({})}>
          <X className="w-3.5 h-3.5" /> مسح الفلاتر
        </Button>
      )}
      {exportData && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 mr-auto">
              <Download className="w-3.5 h-3.5" /> تصدير
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportToExcel(exportData, exportFilename)} className="gap-2 text-xs">
              <FileSpreadsheet className="w-4 h-4" /> تصدير Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToPDF(exportData, exportFilename)} className="gap-2 text-xs">
              <FileText className="w-4 h-4" /> تصدير PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ReportFilters;
