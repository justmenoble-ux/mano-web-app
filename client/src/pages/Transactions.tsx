import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useTransactions, useUpdateTransaction, useDeleteTransaction, useCreateTransaction, useDeleteMultipleTransactions } from "@/hooks/use-transactions";
import { useHousehold } from "@/hooks/use-household";
import { Loader2, Search, Plus, MoreHorizontal, Trash2, ChevronDown, User, UsersRound, CheckSquare, Square, MessageSquare, ArrowUpDown, Pencil, RefreshCw } from "lucide-react";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, Owner, RECURRENCE_FREQUENCIES, SPLIT_TYPES } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";

const CATEGORY_COLORS: Record<string, string> = {
  "Car": "#3b82f6",
  "Cellular & Wifi": "#8b5cf6",
  "Dining": "#f59e0b",
  "Entertainment": "#e879f9",
  "Fitness & Sports": "#22c55e",
  "Fuel": "#f97316",
  "Gifts & Donation": "#ec4899",
  "Groceries": "#84cc16",
  "Health & Wellness": "#14b8a6",
  "Household": "#78716c",
  "Housing": "#0d9488",
  "Learning & Development": "#6366f1",
  "Miscellaneous": "#94a3b8",
  "Parents": "#f43f5e",
  "Parking (Public)": "#64748b",
  "Self Care": "#fb7185",
  "Shopping": "#c084fc",
  "Subscriptions": "#a855f7",
  "Transportation": "#0ea5e9",
  "Travel": "#06b6d4",
  "Utilities": "#eab308",
};

export default function Transactions() {
  const { data: household } = useHousehold();
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [monthFilter, setMonthFilter] = useState<string | undefined>(undefined);
  const [ownerFilter, setOwnerFilter] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount-high" | "amount-low">("newest");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const { toast } = useToast();

  const ownerLabels = useMemo(() => {
    const labels: Record<Owner, { label: string; icon: React.ElementType }> = {
      combined: { label: "Combined", icon: UsersRound },
      member1: { label: household?.member1Name || "Member 1", icon: User },
      member2: { label: household?.member2Name || "Member 2", icon: User },
      // Legacy support
      noble: { label: "Noble", icon: User },
      maria: { label: "Maria", icon: User },
    };
    return labels;
  }, [household]);

  const ownerOptions = useMemo(() => {
    const options: Owner[] = ["combined", "member1"];
    if (household?.member2Name) {
      options.push("member2");
    }
    return options;
  }, [household]);
  
  const { data: transactions, isLoading } = useTransactions({ 
    month: monthFilter, 
    category: categoryFilter,
    owner: ownerFilter
  });
  const { mutate: update } = useUpdateTransaction();
  const { mutate: deleteTxn } = useDeleteTransaction();
  const { mutate: create, isPending: isCreating } = useCreateTransaction();
  const { mutate: deleteMultiple, isPending: isDeleting } = useDeleteMultipleTransactions();
  
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notesDialogTx, setNotesDialogTx] = useState<{ id: number; vendor: string; notes: string | null } | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [editDialogTx, setEditDialogTx] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    isRecurring: false,
    recurrenceFrequency: "monthly" as typeof RECURRENCE_FREQUENCIES[number],
    splitType: "50-50" as typeof SPLIT_TYPES[number],
    member1Share: 50,
    member2Share: 50,
  });

  const [newTxn, setNewTxn] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    vendor: "",
    amount: "",
    category: "Miscellaneous",
    owner: "combined" as Owner,
    isShared: false,
    notes: "",
    isRecurring: false,
    recurrenceFrequency: "monthly" as typeof RECURRENCE_FREQUENCIES[number],
    splitType: "50-50" as typeof SPLIT_TYPES[number],
    member1Share: 50,
    member2Share: 50,
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMM yyyy"),
    };
  });

  const filteredTransactions = useMemo(() => {
    const filtered = transactions?.filter(t => 
      t.vendor.toLowerCase().includes(searchFilter.toLowerCase()) || 
      t.category.toLowerCase().includes(searchFilter.toLowerCase())
    ) || [];
    
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-high":
          return parseFloat(b.amount) - parseFloat(a.amount);
        case "amount-low":
          return parseFloat(a.amount) - parseFloat(b.amount);
        default:
          return 0;
      }
    });
  }, [transactions, searchFilter, sortBy]);

  const handleCreate = () => {
    if (!newTxn.vendor || !newTxn.amount) {
      toast({ title: "Please fill in vendor and amount", variant: "destructive" });
      return;
    }
    create({
      date: new Date(newTxn.date),
      vendor: newTxn.vendor,
      amount: newTxn.amount,
      category: newTxn.category,
      owner: newTxn.owner,
      isShared: newTxn.isShared,
      notes: newTxn.notes || null,
      isRecurring: newTxn.isRecurring,
      recurrenceFrequency: newTxn.isRecurring ? newTxn.recurrenceFrequency : null,
      splitType: newTxn.owner === "combined" ? newTxn.splitType : null,
      member1Share: newTxn.owner === "combined" && newTxn.splitType === "custom" ? newTxn.member1Share : null,
      member2Share: newTxn.owner === "combined" && newTxn.splitType === "custom" ? newTxn.member2Share : null,
    } as any, {
      onSuccess: () => {
        toast({ title: "Transaction added successfully" });
        setIsDialogOpen(false);
        setNewTxn({
          date: format(new Date(), "yyyy-MM-dd"),
          vendor: "",
          amount: "",
          category: "Miscellaneous",
          owner: "combined",
          isShared: false,
          notes: "",
          isRecurring: false,
          recurrenceFrequency: "monthly",
          splitType: "50-50",
          member1Share: 50,
          member2Share: 50,
        });
      },
      onError: () => {
        toast({ title: "Failed to add transaction", variant: "destructive" });
      }
    });
  };

  const handleUpdateCategory = (id: number, category: string) => {
    update({ id, category }, {
      onSuccess: () => toast({ title: "Category updated" }),
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredTransactions) return;
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    deleteMultiple(Array.from(selectedIds), {
      onSuccess: () => {
        toast({ title: `${selectedIds.size} transaction(s) deleted` });
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
      },
      onError: () => {
        toast({ title: "Failed to delete transactions", variant: "destructive" });
      },
    });
  };

  const isAllSelected = filteredTransactions && filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white" data-testid="text-transactions-title">Transactions</h1>
            <p className="text-muted-foreground">Manage and categorize your spending</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-transaction">
                <Plus className="w-4 h-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1e293b] border-white/10 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Manually add a transaction to your records.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newTxn.date}
                    onChange={(e) => setNewTxn({ ...newTxn, date: e.target.value })}
                    className="bg-white/5 border-white/10"
                    data-testid="input-date"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    placeholder="e.g., Starbucks"
                    value={newTxn.vendor}
                    onChange={(e) => setNewTxn({ ...newTxn, vendor: e.target.value })}
                    className="bg-white/5 border-white/10"
                    data-testid="input-vendor"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newTxn.amount}
                    onChange={(e) => setNewTxn({ ...newTxn, amount: e.target.value })}
                    className="bg-white/5 border-white/10"
                    data-testid="input-amount"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newTxn.category} onValueChange={(v) => setNewTxn({ ...newTxn, category: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-white/10">
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat} className="text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                            {cat}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="owner">Belongs to</Label>
                  <Select value={newTxn.owner} onValueChange={(v) => setNewTxn({ ...newTxn, owner: v as Owner })}>
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-owner">
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-white/10">
                      {ownerOptions.map(owner => {
                        const { label, icon: Icon } = ownerLabels[owner];
                        return (
                          <SelectItem key={owner} value={owner} className="text-white">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {newTxn.owner === "combined" && household?.member2Name && (
                  <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <Label className="text-sm text-muted-foreground">Split Type</Label>
                    <Select 
                      value={newTxn.splitType} 
                      onValueChange={(v) => {
                        if (v === "50-50") {
                          setNewTxn({ ...newTxn, splitType: v as any, member1Share: 50, member2Share: 50 });
                        } else {
                          setNewTxn({ ...newTxn, splitType: v as any });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-split-type">
                        <SelectValue placeholder="Select split type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e293b] border-white/10">
                        <SelectItem value="50-50" className="text-white">50/50 Split</SelectItem>
                        <SelectItem value="custom" className="text-white">Custom Split</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {newTxn.splitType === "custom" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{household?.member1Name || "Member 1"} %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={newTxn.member1Share}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              setNewTxn({ ...newTxn, member1Share: val, member2Share: 100 - val });
                            }}
                            className="bg-white/5 border-white/10"
                            data-testid="input-member1-share"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{household?.member2Name || "Member 2"} %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={newTxn.member2Share}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              setNewTxn({ ...newTxn, member2Share: val, member1Share: 100 - val });
                            }}
                            className="bg-white/5 border-white/10"
                            data-testid="input-member2-share"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="recurring">Recurring Expense</Label>
                  <Switch
                    id="recurring"
                    checked={newTxn.isRecurring}
                    onCheckedChange={(v) => setNewTxn({ ...newTxn, isRecurring: v })}
                    data-testid="switch-recurring"
                  />
                </div>

                {newTxn.isRecurring && (
                  <div className="grid gap-2">
                    <Label>Frequency</Label>
                    <Select 
                      value={newTxn.recurrenceFrequency} 
                      onValueChange={(v) => setNewTxn({ ...newTxn, recurrenceFrequency: v as any })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e293b] border-white/10">
                        {RECURRENCE_FREQUENCIES.map(freq => (
                          <SelectItem key={freq} value={freq} className="text-white capitalize">
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add a note..."
                    value={newTxn.notes}
                    onChange={(e) => setNewTxn({ ...newTxn, notes: e.target.value })}
                    className="bg-white/5 border-white/10 min-h-[80px]"
                    data-testid="input-notes"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating} data-testid="button-save-transaction">
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search by vendor or category..." 
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
              data-testid="input-search"
            />
          </div>
          
          <Select value={monthFilter || "all"} onValueChange={(v) => setMonthFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10" data-testid="select-month-filter">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e293b] border-white/10">
              <SelectItem value="all" className="text-white">All Months</SelectItem>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value} className="text-white">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10" data-testid="select-category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e293b] border-white/10 max-h-[300px]">
              <SelectItem value="all" className="text-white">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat} className="text-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                    {cat}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ownerFilter || "all"} onValueChange={(v) => setOwnerFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-[150px] bg-white/5 border-white/10" data-testid="select-owner-filter">
              <SelectValue placeholder="All Owners" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e293b] border-white/10">
              <SelectItem value="all" className="text-white">All Owners</SelectItem>
              {ownerOptions.map(owner => {
                const { label, icon: Icon } = ownerLabels[owner];
                return (
                  <SelectItem key={owner} value={owner} className="text-white">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[150px] bg-white/5 border-white/10" data-testid="select-sort">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e293b] border-white/10">
              <SelectItem value="newest" className="text-white">Newest First</SelectItem>
              <SelectItem value="oldest" className="text-white">Oldest First</SelectItem>
              <SelectItem value="amount-high" className="text-white">Highest Amount</SelectItem>
              <SelectItem value="amount-low" className="text-white">Lowest Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <span className="text-sm text-white">{selectedIds.size} selected</span>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-2"
              data-testid="button-delete-selected"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedIds(new Set())}
              data-testid="button-clear-selection"
            >
              Clear Selection
            </Button>
          </div>
        )}

        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-[#1e293b] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Delete {selectedIds.size} Transaction(s)?</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                This action cannot be undone. Are you sure you want to delete these transactions?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} data-testid="button-cancel-delete">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete} 
                disabled={isDeleting}
                data-testid="button-confirm-delete"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!notesDialogTx} onOpenChange={(open) => !open && setNotesDialogTx(null)}>
          <DialogContent className="bg-[#1e293b] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Transaction Notes</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {notesDialogTx?.vendor}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Textarea
                placeholder="Add notes about this transaction..."
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                className="bg-white/5 border-white/10 min-h-[120px] text-white"
                data-testid="input-transaction-notes"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setNotesDialogTx(null)} data-testid="button-cancel-notes">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (notesDialogTx) {
                    update({ id: notesDialogTx.id, notes: editingNotes || null }, {
                      onSuccess: () => {
                        toast({ title: "Notes saved" });
                        setNotesDialogTx(null);
                      },
                      onError: () => {
                        toast({ title: "Failed to save notes", variant: "destructive" });
                      }
                    });
                  }
                }}
                data-testid="button-save-notes"
              >
                Save Notes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editDialogTx} onOpenChange={(open) => !open && setEditDialogTx(null)}>
          <DialogContent className="bg-[#1e293b] border-white/10 text-white max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-transaction">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editDialogTx?.vendor} - ${Math.abs(Number(editDialogTx?.amount || 0)).toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm">Recurring Transaction</Label>
                </div>
                <Switch
                  checked={editForm.isRecurring}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isRecurring: checked })}
                  data-testid="switch-edit-recurring"
                />
              </div>
              
              {editForm.isRecurring && (
                <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-muted-foreground">Frequency</Label>
                  <Select 
                    value={editForm.recurrenceFrequency} 
                    onValueChange={(v) => setEditForm({ ...editForm, recurrenceFrequency: v as any })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-edit-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-white/10">
                      {RECURRENCE_FREQUENCIES.map(freq => (
                        <SelectItem key={freq} value={freq} className="text-white capitalize">
                          {freq}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editDialogTx?.owner === "combined" && household?.member2Name && (
                <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <Label className="text-sm text-muted-foreground">Split Type</Label>
                  <Select 
                    value={editForm.splitType} 
                    onValueChange={(v) => {
                      if (v === "50-50") {
                        setEditForm({ ...editForm, splitType: v as any, member1Share: 50, member2Share: 50 });
                      } else {
                        setEditForm({ ...editForm, splitType: v as any });
                      }
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-edit-split-type">
                      <SelectValue placeholder="Select split type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-white/10">
                      {SPLIT_TYPES.map(type => (
                        <SelectItem key={type} value={type} className="text-white">
                          {type === "50-50" ? "50/50 Split" : "Custom Split"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {editForm.splitType === "custom" && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{household.member1Name} Share (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editForm.member1Share}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setEditForm({ ...editForm, member1Share: val, member2Share: 100 - val });
                          }}
                          className="bg-white/5 border-white/10"
                          data-testid="input-edit-member1-share"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{household.member2Name} Share (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editForm.member2Share}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setEditForm({ ...editForm, member2Share: val, member1Share: 100 - val });
                          }}
                          className="bg-white/5 border-white/10"
                          data-testid="input-edit-member2-share"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setEditDialogTx(null)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editDialogTx) {
                    update({ 
                      id: editDialogTx.id, 
                      isRecurring: editForm.isRecurring,
                      recurrenceFrequency: editForm.isRecurring ? editForm.recurrenceFrequency : null,
                      splitType: editDialogTx.owner === "combined" ? editForm.splitType : null,
                      member1Share: editDialogTx.owner === "combined" && editForm.splitType === "custom" ? editForm.member1Share : null,
                      member2Share: editDialogTx.owner === "combined" && editForm.splitType === "custom" ? editForm.member2Share : null,
                    }, {
                      onSuccess: () => {
                        toast({ title: "Transaction updated" });
                        setEditDialogTx(null);
                      },
                      onError: () => {
                        toast({ title: "Failed to update transaction", variant: "destructive" });
                      }
                    });
                  }
                }}
                data-testid="button-save-edit"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-transactions" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="w-12 py-4 px-4">
                      <button 
                        onClick={toggleSelectAll}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        data-testid="button-select-all"
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner</th>
                    <th className="text-right py-4 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredTransactions?.map((txn) => (
                      <tr 
                        key={txn.id}
                        className={cn(
                          "group hover:bg-white/5 transition-colors",
                          selectedIds.has(txn.id) && "bg-primary/10"
                        )}
                        data-testid={`row-transaction-${txn.id}`}
                      >
                        <td className="py-4 px-4">
                          <button 
                            onClick={() => toggleSelect(txn.id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            data-testid={`checkbox-transaction-${txn.id}`}
                          >
                            {selectedIds.has(txn.id) ? (
                              <CheckSquare className="w-5 h-5 text-primary" />
                            ) : (
                              <Square className="w-5 h-5 text-muted-foreground" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-sm text-white whitespace-nowrap">
                          {format(new Date(txn.date), "MMM d, yyyy")}
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-white">
                          {txn.vendor}
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: CATEGORY_COLORS[txn.category] || "#94a3b8" }} 
                                />
                                {txn.category}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#1e293b] border-white/10 max-h-[300px] overflow-y-auto">
                              {CATEGORIES.map(cat => (
                                <DropdownMenuItem 
                                  key={cat}
                                  onClick={() => handleUpdateCategory(txn.id, cat)}
                                  className={cn("gap-2 text-white cursor-pointer", txn.category === cat && "bg-primary/20")}
                                >
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                                  {cat}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors"
                                data-testid={`button-owner-${txn.id}`}
                              >
                                {(() => {
                                  const ownerKey = (txn.owner || "combined") as Owner;
                                  const { label, icon: Icon } = ownerLabels[ownerKey];
                                  return (
                                    <>
                                      <Icon className="w-3 h-3" />
                                      {label}
                                      <ChevronDown className="w-3 h-3 opacity-50" />
                                    </>
                                  );
                                })()}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#1e293b] border-white/10">
                              {ownerOptions.map(owner => {
                                const { label, icon: Icon } = ownerLabels[owner];
                                return (
                                  <DropdownMenuItem 
                                    key={owner}
                                    onClick={() => update({ id: txn.id, owner })}
                                    className={cn("gap-2 text-white cursor-pointer", txn.owner === owner && "bg-primary/20")}
                                  >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="py-4 px-6 text-sm text-white text-right font-medium">
                          <span className={Number(txn.amount) < 0 ? "text-green-400" : ""}>
                            ${Math.abs(Number(txn.amount)).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors" data-testid={`button-more-${txn.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1e293b] border-white/10 text-white">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setEditDialogTx(txn);
                                  setEditForm({
                                    isRecurring: txn.isRecurring || false,
                                    recurrenceFrequency: (txn.recurrenceFrequency as typeof RECURRENCE_FREQUENCIES[number]) || "monthly",
                                    splitType: (txn.splitType as typeof SPLIT_TYPES[number]) || "50-50",
                                    member1Share: txn.member1Share || 50,
                                    member2Share: txn.member2Share || 50,
                                  });
                                }}
                                data-testid={`button-edit-${txn.id}`}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                                {txn.isRecurring && <RefreshCw className="w-3 h-3 ml-1 text-primary" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setNotesDialogTx({ id: txn.id, vendor: txn.vendor, notes: txn.notes });
                                  setEditingNotes(txn.notes || "");
                                }}
                                data-testid={`button-notes-${txn.id}`}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                {txn.notes ? "View/Edit Notes" : "Add Notes"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-400 focus:text-red-400 focus:bg-red-900/20" 
                                onClick={() => deleteTxn(txn.id)}
                                data-testid={`button-delete-${txn.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {filteredTransactions?.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No transactions found matching your filters.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
