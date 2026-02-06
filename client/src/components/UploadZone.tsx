import { useCallback, useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileType, Loader2, User, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadStatement } from "@/hooks/use-statements";
import { useHousehold } from "@/hooks/use-household";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Owner } from "@shared/schema";

export function UploadZone() {
  const { data: household } = useHousehold();
  const [selectedOwner, setSelectedOwner] = useState<Owner>("combined");
  const { mutate: upload, isPending } = useUploadStatement();
  const { toast } = useToast();

  const ownerOptions = useMemo(() => {
    const options: { value: Owner; label: string; icon: React.ElementType }[] = [
      { value: "combined", label: "Combined", icon: UsersRound },
      { value: "member1", label: household?.member1Name || "Member 1", icon: User },
    ];
    if (household?.member2Name) {
      options.push({ value: "member2", label: household.member2Name, icon: User });
    }
    return options;
  }, [household]);

  const allOwnerLabels: Record<Owner, string> = {
    combined: "Combined",
    member1: household?.member1Name || "Member 1",
    member2: household?.member2Name || "Member 2",
    noble: "Noble",
    maria: "Maria",
  };

  const getOwnerLabel = (owner: Owner) => {
    const option = ownerOptions.find(o => o.value === owner);
    return option?.label || "Combined";
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("owner", selectedOwner);

    upload(formData, {
      onSuccess: () => {
        toast({
          title: "Upload Successful",
          description: `Statement uploaded for ${getOwnerLabel(selectedOwner)} and queued for processing.`,
        });
      },
      onError: (error) => {
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }, [upload, toast, selectedOwner, ownerOptions]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isPending,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground sm:mr-2">Expenses belong to:</span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {ownerOptions.map(option => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={selectedOwner === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedOwner(option.value)}
                className={cn(
                  "gap-2",
                  selectedOwner !== option.value && "bg-white/5 border-white/10 text-white hover:bg-white/10"
                )}
                data-testid={`button-owner-${option.value}`}
              >
                <Icon className="w-4 h-4" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-white/5 transition-all duration-300 cursor-pointer hover:border-primary/50 hover:bg-white/10",
          isDragActive && "border-primary bg-primary/10",
          isPending && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} data-testid="input-file-upload" />
        <div className="p-6 sm:p-12 flex flex-col items-center justify-center text-center">
          <div className={cn(
            "w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 transition-transform duration-300",
            isDragActive && "scale-110"
          )}>
            {isPending ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-primary" />
            )}
          </div>
          
          <h3 className="text-xl font-display font-bold text-white mb-2">
            {isPending ? "Uploading..." : "Upload Statement"}
          </h3>
          
          <p className="text-muted-foreground max-w-sm mx-auto">
            {isDragActive 
              ? "Drop the file here to upload"
              : "Drag & drop CSV or Excel bank statements here, or click to browse"
            }
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">
            <span className="flex items-center gap-1.5">
              <FileType className="w-3 h-3" /> CSV
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="flex items-center gap-1.5">
              <FileType className="w-3 h-3" /> Excel
            </span>
          </div>
        </div>
        
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 blur-3xl pointer-events-none rounded-full" />
      </div>
    </div>
  );
}
