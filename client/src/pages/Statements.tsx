import { Layout } from "@/components/Layout";
import { UploadZone } from "@/components/UploadZone";
import { useStatements, useProcessStatement, useDeleteStatement } from "@/hooks/use-statements";
import { Loader2, FileText, PlayCircle, Trash2, MoreHorizontal, AlertCircle, User, UsersRound } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/hooks/use-household";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function Statements() {
  const { data: statements, isLoading } = useStatements();
  const { data: household } = useHousehold();
  const { mutate: process, isPending: isProcessing } = useProcessStatement();
  const { mutate: deleteStatement, isPending: isDeleting } = useDeleteStatement();
  const { toast } = useToast();

  const getOwnerLabel = (owner: string | null | undefined) => {
    if (!owner || owner === "combined") {
      return { label: "Combined", icon: UsersRound };
    }
    if (household) {
      if (owner === "member1" || owner.toLowerCase() === household.member1Name?.toLowerCase() || owner === "noble") {
        return { label: household.member1Name || "Member 1", icon: User };
      }
      if (owner === "member2" || owner.toLowerCase() === household.member2Name?.toLowerCase() || owner === "maria") {
        return { label: household.member2Name || "Member 2", icon: User };
      }
    }
    return { label: owner, icon: User };
  };

  const handleProcess = (id: number) => {
    process(id, {
      onSuccess: () => toast({ title: "Statement processed successfully" }),
      onError: () => toast({ title: "Processing failed", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    deleteStatement(id, {
      onSuccess: () => toast({ title: "Statement deleted" }),
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-white" data-testid="text-statements-title">Statements</h1>
          <p className="text-muted-foreground">Upload and process your bank statements</p>
        </div>

        <UploadZone />

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Upload History</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-statements" />
            </div>
          ) : (
            <div className="grid gap-4">
              {statements?.map((statement, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={statement.id}
                  className="glass-card p-4 rounded-xl group"
                  data-testid={`card-statement-${statement.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white text-sm sm:text-base truncate max-w-[180px] sm:max-w-none">{statement.filename}</p>
                          {(() => {
                            const { label, icon: Icon } = getOwnerLabel(statement.owner);
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/70 flex-shrink-0">
                                <Icon className="w-3 h-3" />
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Uploaded on {format(new Date(statement.createdAt || new Date()), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-auto sm:ml-0">
                      <div className={cn(
                        "px-2 sm:px-3 py-1 rounded-full text-xs font-medium border",
                        statement.status === "processed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        statement.status === "processing" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        statement.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      )}>
                        {statement.status.charAt(0).toUpperCase() + statement.status.slice(1)}
                      </div>

                      {statement.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleProcess(statement.id)}
                          disabled={isProcessing}
                          className="gap-1 sm:gap-2 px-2 sm:px-3"
                          data-testid={`button-process-${statement.id}`}
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                          <span className="hidden sm:inline">Process</span>
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white flex-shrink-0" data-testid={`button-more-${statement.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1e293b] border-white/10">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-red-400 focus:text-red-400 focus:bg-red-900/20 cursor-pointer"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#1e293b] border-white/10 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertCircle className="w-5 h-5 text-red-400" />
                                  Delete Statement?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  This will permanently delete "{statement.filename}" and all its associated transactions. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDelete(statement.id)}
                                  disabled={isDeleting}
                                  data-testid={`button-confirm-delete-${statement.id}`}
                                >
                                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              ))}

              {statements?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground glass-panel rounded-xl">
                  No statements uploaded yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
