import { useState, useMemo, useEffect } from "react";
import { useStats } from "@/hooks/use-stats";
import { Layout } from "@/components/Layout";
import { Loader2, TrendingUp, User, UsersRound, ChevronDown, Calendar } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import { useTransactions } from "@/hooks/use-transactions";
import { useHousehold } from "@/hooks/use-household";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { Owner } from "@shared/schema";

const DASHBOARD_FILTERS_KEY = "spendometer_dashboard_filters";

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

export default function Dashboard() {
  const { data: household } = useHousehold();
  const [viewMode, setViewMode] = useState<Owner>("combined");

  const viewOptions = useMemo(() => {
    const options: { value: Owner; label: string; icon: React.ElementType }[] = [
      { value: "combined", label: "Combined", icon: UsersRound },
      { value: "member1", label: household?.member1Name || "Member 1", icon: User },
    ];
    if (household?.member2Name) {
      options.push({ value: "member2", label: household.member2Name, icon: User });
    }
    return options;
  }, [household]);

  // All owner labels including legacy values for display purposes
  const ownerLabels: Record<Owner, string> = {
    combined: "Combined",
    member1: household?.member1Name || "Member 1",
    member2: household?.member2Name || "Member 2",
    noble: "Noble",
    maria: "Maria",
  };
  
  const months = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMM yyyy"),
    };
  }), []);

  const getSavedFilters = () => {
    try {
      const saved = localStorage.getItem(DASHBOARD_FILTERS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  };

  const savedFilters = getSavedFilters();
  const [fromMonth, setFromMonth] = useState<string>(savedFilters?.fromMonth || months[0].value);
  const [toMonth, setToMonth] = useState<string>(savedFilters?.toMonth || months[0].value);
  const [trendCategory, setTrendCategory] = useState<string>("all");
  const [hasInitialized, setHasInitialized] = useState(!!savedFilters);
  
  const normalizedRange = useMemo(() => {
    const from = parseISO(`${fromMonth}-01`);
    const to = parseISO(`${toMonth}-01`);
    if (from > to) {
      return { start: to, end: from, fromVal: toMonth, toVal: fromMonth };
    }
    return { start: from, end: to, fromVal: fromMonth, toVal: toMonth };
  }, [fromMonth, toMonth]);

  const filters = {
    monthFrom: normalizedRange.fromVal,
    monthTo: normalizedRange.toVal,
    owner: viewMode,
  };
  
  const { data: stats, isLoading: statsLoading } = useStats(filters);
  // Fetch ALL transactions (no owner filter) so we can calculate effective amounts for trend
  const { data: transactions, isLoading: txnsLoading } = useTransactions({});

  // Initialize to last month with data if no saved filters
  useEffect(() => {
    if (!hasInitialized && transactions && transactions.length > 0) {
      const transactionMonths = Array.from(new Set(
        transactions.map(t => format(new Date(t.date), "yyyy-MM"))
      )).sort().reverse();
      
      if (transactionMonths.length > 0) {
        const lastMonthWithData = transactionMonths[0];
        setFromMonth(lastMonthWithData);
        setToMonth(lastMonthWithData);
      }
      setHasInitialized(true);
    }
  }, [transactions, hasInitialized]);

  // Save filters to localStorage when they change (after initialization)
  useEffect(() => {
    if (hasInitialized) {
      localStorage.setItem(DASHBOARD_FILTERS_KEY, JSON.stringify({
        fromMonth,
        toMonth,
        viewMode
      }));
    }
  }, [fromMonth, toMonth, viewMode, hasInitialized]);

  const uniqueCategories = useMemo(() => {
    if (!transactions) return [];
    const cats = Array.from(new Set(transactions.map(t => t.category)));
    return cats.sort();
  }, [transactions]);

  const getEffectiveAmount = (t: any): number => {
    const amount = Math.abs(Number(t.amount));
    
    if (viewMode === "combined") {
      // Combined view: only show expenses tagged as "combined"
      return t.owner === "combined" ? amount : 0;
    }
    
    // Individual view
    const isNoble = viewMode === "member1" || viewMode === "noble";
    const isMaria = viewMode === "member2" || viewMode === "maria";
    
    // Check if transaction belongs to this individual
    if (isNoble && (t.owner === "member1" || t.owner === "noble")) {
      return amount;
    }
    if (isMaria && (t.owner === "member2" || t.owner === "maria")) {
      return amount;
    }
    
    // Combined expense: calculate this individual's share
    if (t.owner === "combined") {
      const member1Share = t.member1Share ?? 50;
      const member2Share = t.member2Share ?? 50;
      const sharePercent = isNoble ? member1Share : isMaria ? member2Share : 100;
      return (amount * sharePercent) / 100;
    }
    
    // Transaction belongs to the other individual: exclude
    return 0;
  };

  const trendData = useMemo(() => {
    if (!transactions) return [];
    
    const fromDate = normalizedRange.start;
    const toDate = endOfMonth(normalizedRange.end);
    const monthsInRange = eachMonthOfInterval({ start: fromDate, end: toDate });
    
    return monthsInRange.map(monthDate => {
      const monthKey = format(monthDate, "yyyy-MM");
      const monthLabel = format(monthDate, "MMM");
      
      const monthTxns = transactions.filter(t => {
        const txnDate = new Date(t.date);
        const matchesMonth = format(txnDate, "yyyy-MM") === monthKey;
        const matchesCategory = trendCategory === "all" || t.category === trendCategory;
        return matchesMonth && matchesCategory;
      });
      
      const total = monthTxns.reduce((sum, t) => sum + getEffectiveAmount(t), 0);
      
      return {
        month: monthLabel,
        amount: total,
      };
    });
  }, [transactions, normalizedRange, trendCategory, viewMode]);

  if (statsLoading || txnsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-dashboard" />
        </div>
      </Layout>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const pieData = stats?.categoryBreakdown.map(cat => ({
    ...cat,
    fill: CATEGORY_COLORS[cat.category] || "#94a3b8"
  })) || [];

  const currentView = viewOptions.find(v => v.value === viewMode) || viewOptions[0];
  const ViewIcon = currentView.icon;

  const dateRangeLabel = fromMonth === toMonth 
    ? months.find(m => m.value === fromMonth)?.label 
    : `${months.find(m => m.value === fromMonth)?.label} - ${months.find(m => m.value === toMonth)?.label}`;

  return (
    <Layout>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white" data-testid="text-dashboard-title">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your shared spending</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10" data-testid="button-view-toggle">
                  <ViewIcon className="w-4 h-4" />
                  {currentView.label}
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1e293b] border-white/10">
                {viewOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <DropdownMenuItem 
                      key={option.value}
                      onClick={() => setViewMode(option.value)}
                      className={cn(
                        "gap-2 text-white cursor-pointer",
                        viewMode === option.value && "bg-primary/20 text-primary"
                      )}
                      data-testid={`menu-item-view-${option.value}`}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-md px-2 py-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={fromMonth} onValueChange={setFromMonth}>
                <SelectTrigger className="w-[100px] border-0 bg-transparent text-white text-sm h-8 p-1" data-testid="select-from-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-white/10">
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-white">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">to</span>
              <Select value={toMonth} onValueChange={setToMonth}>
                <SelectTrigger className="w-[100px] border-0 bg-transparent text-white text-sm h-8 p-1" data-testid="select-to-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-white/10">
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-white">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <motion.div variants={item} className="glass-card rounded-3xl p-6 lg:col-span-1 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spending</p>
                <h2 className="text-4xl font-bold mt-2 text-white font-display" data-testid="text-total-spending">
                  ${Math.round(stats?.totalSpending || 0).toLocaleString()}
                </h2>
              </div>
              <div className="p-3 bg-primary/20 rounded-xl text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card rounded-3xl p-6 lg:col-span-2 min-h-[200px]">
            <h3 className="text-lg font-bold text-white mb-4">Category Distribution</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:flex-1 h-[200px] min-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={0}
                      dataKey="amount"
                      nameKey="category"
                      activeIndex={-1}
                      label={({ percent, cx, cy, midAngle, outerRadius }) => {
                        if (percent < 0.05) return null;
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 20;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="#fff"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize={11}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      cursor={false}
                      wrapperStyle={{ outline: 'none' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#1e293b] border border-white/10 rounded-xl p-3 shadow-lg">
                              <p className="text-white font-medium text-sm">{data.category}</p>
                              <p className="text-white/80 text-sm">${Math.round(data.amount).toLocaleString()}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="sm:w-[140px] overflow-y-auto max-h-[180px] scrollbar-thin pr-2">
                <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-1">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.fill }} />
                      <span className="text-white/70 truncate">{entry.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card rounded-3xl p-6 lg:col-span-2 min-h-[350px] overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4">Spending by Category</h3>
            <div className="h-[280px] w-full overflow-y-auto scrollbar-thin">
              <div style={{ height: Math.max(280, (stats?.categoryBreakdown?.length || 0) * 32) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.categoryBreakdown} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                    <XAxis 
                      type="number"
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
                    />
                    <YAxis 
                      type="category"
                      dataKey="category" 
                      stroke="#94a3b8" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      width={90}
                      tick={{ fill: '#94a3b8' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      formatter={(value: number) => [`$${Math.round(value).toLocaleString()}`, 'Amount']}
                      cursor={false}
                    />
                    <Bar 
                      dataKey="amount" 
                      radius={[0, 4, 4, 0]} 
                      fill="var(--primary)"
                      barSize={20}
                      activeBar={false}
                    >
                      {stats?.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || "#7da2a9"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card rounded-3xl p-6 lg:col-span-2 min-h-[350px]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-lg font-bold text-white">Spending Trend</h3>
              <Select value={trendCategory} onValueChange={setTrendCategory}>
                <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white text-sm h-8" data-testid="select-trend-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-white/10 max-h-[300px]">
                  <SelectItem value="all" className="text-white">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || "#94a3b8" }} />
                        {cat}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="h-[280px] w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7da2a9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#7da2a9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      formatter={(value: number) => [`$${Math.round(value).toLocaleString()}`, 'Spending']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#7da2a9" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorAmount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No trend data available
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </motion.div>
    </Layout>
  );
}
