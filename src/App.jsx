import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { 
  LayoutDashboard, 
  Target, 
  Wallet, 
  Plus, 
  TrendingUp, 
  ChevronRight, 
  AlertCircle, 
  PieChart, 
  X, 
  Settings, 
  ShieldCheck, 
  ChevronLeft, 
  Trash2, 
  Banknote, 
  Edit3, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Droplets, 
  Clock, 
  LogOut, 
  Sparkles, 
  Lightbulb, 
  Zap, 
  Building2, 
  Layers,
  Mail,
  Lock,
  ArrowLeft,
  Loader2,
  CalendarDays,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Hourglass,
  CalendarCheck,
  ShieldAlert,
  Shield,
  ArrowUpRight,
  Info
} from 'lucide-react';

// --- Supabase ---
// (config em src/lib/supabaseClient.js)

// --- Utilitários ---
const formatCurrency = (value) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

const calculateMonthsInclusive = (start, end) => {
  const d1 = start?.toDate ? start.toDate() : (start ? new Date(start) : new Date());
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
  return months <= 0 ? 1 : months;
};

const getDaysRemaining = (dateStr) => {
  if (!dateStr) return 0;
  const today = new Date();
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 0;
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const getMonthsRemaining = (dateStr) => {
  if (!dateStr) return 0;
  const today = new Date();
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 0;
  const diffMonths = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  return Math.max(0, diffMonths);
};

const isWithinNext30Days = (dateStr) => {
  if (!dateStr) return false;
  const days = getDaysRemaining(dateStr);
  return days >= 0 && days <= 30;
};

// --- Sub-componentes de UI Premium ---
const Card = ({ children, className = "", variant = "default" }) => {
  const styles = {
    default: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl shadow-slate-200/20 dark:shadow-none",
    primary: "bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-500/30 border-none",
    highlight: "bg-slate-900 dark:bg-slate-800 text-white shadow-2xl border border-slate-700/50"
  };
  return (
    <div className={`rounded-[2.5rem] p-7 transition-all duration-500 hover:translate-y-[-2px] ${styles[variant]} ${className}`}>
      {children}
    </div>
  );
};

const ProgressBar = ({ progress, color = "bg-indigo-600", trackColor = "bg-slate-100 dark:bg-slate-800/50" }) => {
  const roundedProgress = Math.round(Number(progress) || 0);
  return (
    <div className={`w-full ${trackColor} rounded-full h-2.5 overflow-hidden relative`}>
      <div 
        style={{ width: `${Math.min(roundedProgress, 100)}%` }} 
        className={`h-full transition-all duration-1000 ease-in-out ${color} shadow-[0_0_10px_rgba(79,70,229,0.4)]`}
      />
    </div>
  );
};

const NavButton = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-500'}`}>
    <div className={`p-3 rounded-[1.25rem] transition-all duration-300 ${active ? 'bg-indigo-50 dark:bg-indigo-900/30 shadow-inner' : ''}`}>
      {icon && React.cloneElement(icon, { size: active ? 24 : 22, strokeWidth: active ? 2.5 : 2 })}
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in duration-700">
    <div className="w-24 h-24 bg-gradient-to-tr from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-[3rem] shadow-inner flex items-center justify-center mb-8 text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
      <Icon size={44} strokeWidth={1.5} />
    </div>
    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white uppercase tracking-tight mb-3">{title}</h3>
    <p className="text-slate-500 text-sm max-w-[260px] leading-relaxed mb-10 font-medium">{description}</p>
    {actionLabel && (
      <button onClick={onAction} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 transition-all text-xs uppercase tracking-[0.2em]">
        <Plus size={18} /> {actionLabel}
      </button>
    )}
  </div>
);

// --- Componente Principal ---
function SaltInvestCore() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [bootLoading, setBootLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Estados de Dados
  const [view, setView] = useState('dashboard');
  const [settingsSubView, setSettingsSubView] = useState(null); 
  const [goals, setGoals] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [userInsights, setUserInsights] = useState(null);

  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showMaturityCard, setShowMaturityCard] = useState(false);
  const [showGoalsEvolution, setShowGoalsEvolution] = useState(false);
  const [showFGCCard, setShowFGCCard] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); 
  const [modalErrorMessage, setModalErrorMessage] = useState('');
  
  // Edição
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [newInv, setNewInv] = useState({ name: '', value: '', classId: '', institutionId: '', dueDate: '', liquidityType: 'diaria', is_fgc_covered: false, contributionsMap: {} });

  
  // --- Roteamento (URL -> estado) ---
  useEffect(() => {
    const p = location.pathname || '/';

    // Auth views
    if (p.startsWith('/auth/signup')) setAuthView('signup');
    else if (p.startsWith('/auth/reset')) setAuthView('reset');
    else if (p.startsWith('/auth')) setAuthView('login');

    // App views
    if (p === '/' || p.startsWith('/dashboard')) {
      setView('dashboard');
      setSettingsSubView(null);
    } else if (p.startsWith('/investments')) {
      setView('investments');
      setSettingsSubView(null);
    } else if (p.startsWith('/goals')) {
      setView('goals');
      setSettingsSubView(null);
    } else if (p.startsWith('/settings/targets')) {
      setView('settings');
      setSettingsSubView('targets');
    } else if (p.startsWith('/settings/classes')) {
      setView('settings');
      setSettingsSubView('classes');
    } else if (p.startsWith('/settings/institutions')) {
      setView('settings');
      setSettingsSubView('institutions');
    } else if (p.startsWith('/settings')) {
      setView('settings');
      setSettingsSubView(null);
    }
  }, [location.pathname]);

  // --- Proteção de rotas e deep links ---
  useEffect(() => {
    if (bootLoading) return;

    const p = location.pathname || '/';
    const isAuth = p.startsWith('/auth');

    const known =
      p === '/' ||
      isAuth ||
      p === '/dashboard' ||
      p === '/investments' ||
      p === '/goals' ||
      p === '/settings' ||
      p === '/settings/targets' ||
      p === '/settings/classes' ||
      p === '/settings/institutions';

    if (!known) {
      navigate(user ? '/dashboard' : '/auth/login', { replace: true });
      return;
    }

    if (!user) {
      if (p === '/' || !isAuth) navigate('/auth/login', { replace: true });
      return;
    }

    // user logado: não permitir rotas /auth
    if (p === '/' || isAuth) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, bootLoading, location.pathname, navigate]);

// 1. Autenticação e Onboarding (Supabase)
  useEffect(() => {
    let mounted = true;

    // evita tela travada caso o Supabase esteja mal configurado ou offline
    const fallback = setTimeout(() => {
      if (mounted) setBootLoading(false);
    }, 2000);

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) console.error('getSession error', error);
        const u = data?.session?.user ?? null;
        setUser(u);
        if (u) await setupInitialMocks(u.id);
      } catch (e) {
        console.error('Auth init error', e);
      } finally {
        if (mounted) {
          clearTimeout(fallback);
          setBootLoading(false);
        }
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await setupInitialMocks(u.id);
      } catch (e) {
        console.error('Auth state error', e);
      } finally {
        setBootLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(fallback);
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const setupInitialMocks = async (userId) => {
    try {
      const { data: existing, error: exErr } = await supabase.from('classes').select('id').eq('user_id', userId).limit(1);
      if (exErr) throw exErr;
      if (!existing || existing.length === 0) {
        await supabase.from('classes').insert([
          { user_id: userId, name: 'Renda Fixa', target_percent: 60 },
          { user_id: userId, name: 'Ações', target_percent: 40 }
        ]);
        await supabase.from('institutions').insert([{ user_id: userId, name: 'NuBank' }]);
        await supabase.from('goals').insert([{
          user_id: userId,
          name: 'Reserva de Emergência',
          target_value: 10000,
          target_date: '2025-12-31',
          is_monthly_plan: true
        }]);
      }
    } catch (e) {
      console.error('Onboarding error', e);
    }
  };

  // 2. Sincronização em Tempo Real (Supabase Realtime + refetch)
  useEffect(() => {
    if (!user) return;

    let isCancelled = false;

    const fetchAll = async () => {
      const userId = user.id;

      const [goalsRes, invRes, classesRes, instRes, insightsRes] = await Promise.all([
        supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('investments')
          .select('*, investment_allocations(goal_id, amount)')
          .eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('classes').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('institutions').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('insights').select('*').eq('user_id', userId).order('insight_date', { ascending: false }).limit(1)
      ]);

      if (isCancelled) return;

      if (!goalsRes.error) setGoals(goalsRes.data || []);
      if (!classesRes.error) setClasses(classesRes.data || []);
      if (!instRes.error) setInstitutions(instRes.data || []);

      if (!invRes.error) {
        const mapped = (invRes.data || []).map((inv) => ({
          ...inv,
          contributions: (inv.investment_allocations || []).map((a) => ({ goal_id: a.goal_id, amount: a.amount })),
        }));
        setInvestments(mapped);
      }

      if (!insightsRes.error) setUserInsights((insightsRes.data && insightsRes.data[0]) ? insightsRes.data[0] : null);
    };

    fetchAll();

    const channel = supabase
      .channel(`saltinvest:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${user.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes', filter: `user_id=eq.${user.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions', filter: `user_id=eq.${user.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${user.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investment_allocations' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insights', filter: `user_id=eq.${user.id}` }, fetchAll)
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 3. Cálculos Dinâmicos
  const stats = useMemo(() => {
    const activeInv = investments.filter(i => !i.is_redeemed);
    const planningData = goals.map(g => {
            const createdAtDate = g.created_at ? new Date(g.created_at) : new Date();
      const monthsTotal = calculateMonthsInclusive(createdAtDate, g.target_date);
      const targetVal = Number(g.target_value) || 0;
      const contributed = activeInv.flatMap(i => i.contributions || []).filter(c => c.goal_id === g.id).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const suggested = Math.max(0, (targetVal - contributed) / Math.max(1, getMonthsRemaining(g.target_date)));
      
      return { 
        ...g, 
        suggestedMonthly: suggested, 
        currentContributed: contributed, 
        percent: targetVal > 0 ? (contributed / targetVal) * 100 : 0, 
        remaining: Math.max(0, targetVal - contributed), 
        daysRemaining: getDaysRemaining(g.target_date),
        monthsRemaining: getMonthsRemaining(g.target_date)
      };
    });

    const totalEquity = activeInv.reduce((sum, i) => sum + (Number(i.total_value) || 0), 0);
    const liquidEquity = activeInv.filter(i => i.liquidity_type === 'diaria').reduce((sum, i) => sum + (Number(i.total_value) || 0), 0);
    
    const monthlyGoals = planningData.filter(g => g.is_monthly_plan);
    const totalSuggested = monthlyGoals.reduce((s, i) => s + (i.suggestedMonthly || 0), 0);
    const totalContributed = monthlyGoals.reduce((s, i) => s + (i.currentContributed || 0), 0);

    const fgcByInstitution = activeInv.reduce((acc, inv) => {
      const instId = inv.institution_id;
      if (!instId) return acc;
      if (!acc[instId]) acc[instId] = { covered: 0, uncovered: 0 };
      if (inv.is_fgc_covered) acc[instId].covered += Number(inv.total_value || 0);
      else acc[instId].uncovered += Number(inv.total_value || 0);
      return acc;
    }, {});

    return { 
      planningData, totalEquity, liquidEquity, totalSuggested, totalContributed, fgcByInstitution,
      overallPercent: totalSuggested > 0 ? (totalContributed / totalSuggested) * 100 : 0, 
      upcomingMaturities: activeInv.filter(i => i.due_date && isWithinNext30Days(i.due_date)), 
      totalTargetPercent: classes.reduce((s, c) => s + (Number(c.target_percent) || 0), 0) 
    };
  }, [goals, investments, classes]);

  // CÁLCULO DE ALOCAÇÃO EM TEMPO REAL (Para o Modal)
  const allocationStats = useMemo(() => {
    const currentObj = editingInvestment || newInv;
    const totalValue = Number(currentObj.total_value || currentObj.value || 0);
    const currentAllocatedSum = Object.values(currentObj.contributionsMap || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    const remainingToAllocate = totalValue - currentAllocatedSum;
    const isExceeded = currentAllocatedSum > totalValue;

    return { totalValue, currentAllocatedSum, remainingToAllocate, isExceeded };
  }, [editingInvestment, newInv]);

  // 4. Gemini Insights
  useEffect(() => {
    if (!user || view !== 'dashboard' || stats.totalEquity === 0) return;
    const generateInsights = async () => {
      const todayDate = new Date().toISOString().split('T')[0];
      if (userInsights?.insight_date === todayDate) return;
      setLoadingInsights(true);
      const apiKey = "";
      const portfolioSummary = { patrimonio: stats.totalEquity, liquidez: stats.liquidEquity, metas: stats.planningData.map(p => ({ nome: p.name, progresso: Math.round(p.percent) })) };
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Analise meu portfólio SaltInvest: ${JSON.stringify(portfolioSummary)}` }] }],
            systemInstruction: { parts: [{ text: `Você é o consultor SaltInvest. Forneça 3 insights práticos de investimento. JSON: { "insights": [{ "type": "Alerta" | "Dica" | "Oportunidade", "text": "impactante e breve" }] }` }] },
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        const result = await res.json();
        const content = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || '{"insights": []}');
                await supabase.from('insights').upsert({ user_id: user.id, content: content.insights, insight_date: todayDate }, { onConflict: 'user_id,insight_date' });
      } catch (e) { console.error(e); }
      finally { setLoadingInsights(false); }
    };
    generateInsights();
  }, [view, user, stats.totalEquity, userInsights]);

  // --- Funções CRUD ---
  const triggerConfirmation = (title, message, onConfirm) => setConfirmAction({ title, message, onConfirm });

  const deleteItem = async (col, id) => {
    if (!user) return;
        await supabase.from(col).delete().eq('id', id).eq('user_id', user.id);
    setConfirmAction(null);
  };

  const redeemInvestment = async (id) => {
    if (!user) return;
        await supabase.from('investments').update({ is_redeemed: true }).eq('id', id).eq('user_id', user.id);
    setConfirmAction(null);
  };

  const saveGoal = async (g) => {
    if (!user) return;
    const data = {
      user_id: user.id,
      name: g.name,
      target_value: g.target_value,
      target_date: g.target_date,
      is_monthly_plan: !!g.is_monthly_plan,
      updated_at: new Date().toISOString()
    };
    if (g.id) await supabase.from('goals').update(data).eq('id', g.id).eq('user_id', user.id);
    else await supabase.from('goals').insert([data]);
    setEditingGoal(null);
  };

  const saveInvestment = async (inv) => {
    if (!user) return;

    const totalValue = Number(inv.total_value || inv.value);
    const contributions = Object.entries(inv.contributionsMap || {})
      .filter(([_, v]) => Number(v) > 0)
      .map(([gid, v]) => ({ goal_id: gid, amount: Number(v) }));

    const totalAllocated = contributions.reduce((s, c) => s + c.amount, 0);
    if (totalAllocated > totalValue) {
      setModalErrorMessage(`Limite ultrapassado em ${formatCurrency(totalAllocated - totalValue)}! Reduza os aportes nas metas.`);
      return;
    }

    const liquidityType = inv.liquidity_type || inv.liquidityType;
    const dueDate = (liquidityType === 'vencimento') ? (inv.due_date || inv.dueDate) : null;

    const data = {
      user_id: user.id,
      name: String(inv.name),
      total_value: totalValue,
      class_id: inv.class_id || inv.classId || null,
      institution_id: inv.institution_id || inv.institutionId || null,
      liquidity_type: liquidityType,
      is_fgc_covered: !!inv.is_fgc_covered,
      due_date: dueDate,
      is_redeemed: !!inv.is_redeemed,
      updated_at: new Date().toISOString()
    };

    let investmentId = inv.id;

    if (inv.id) {
      await supabase.from('investments').update(data).eq('id', inv.id).eq('user_id', user.id);
      await supabase.from('investment_allocations').delete().eq('investment_id', inv.id);
    } else {
      const ins = await supabase.from('investments').insert([data]).select('id').single();
      investmentId = ins.data?.id;
    }

    if (investmentId && contributions.length > 0) {
      await supabase.from('investment_allocations').insert(contributions.map((c) => ({
        investment_id: investmentId,
        goal_id: c.goal_id,
        amount: c.amount
      })));
    }

    setEditingInvestment(null);
    setIsModalOpen(false);
    setModalErrorMessage('');
  };

  const saveConfig = async (sub, item) => {
    if (!user) return;
    const table = sub;
    const payload = { ...item, user_id: user.id, updated_at: new Date().toISOString() };
    if (item.id) await supabase.from(table).update(payload).eq('id', item.id).eq('user_id', user.id);
    else await supabase.from(table).insert([payload]);
    setEditingClass(null);
    setEditingInstitution(null);
  };

  const handleLogout = async () => {
        await supabase.auth.signOut();
    navigate('/auth/login');
    setView('dashboard');
    setSettingsSubView(null);
  };

  // --- Rendering ---
  if (bootLoading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-10 text-center animate-pulse">
      <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/40">
        <TrendingUp className="text-white w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">SaltInvest</h2>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 relative overflow-hidden">
      {/* Premium Web (sem afetar mobile): elementos decorativos só em telas grandes */}
      <div className="hidden lg:block absolute -left-40 -top-40 w-[520px] h-[520px] bg-indigo-600/10 rounded-full blur-[90px]" />
      <div className="hidden lg:block absolute -right-48 -bottom-48 w-[620px] h-[620px] bg-violet-600/10 rounded-full blur-[110px]" />

      {/*
        Premium Web (sem afetar mobile):
        - Mobile mantém o fluxo vertical original
        - Desktop vira 2 colunas (brand + formulário) e limita largura
      */}
      <div className="w-full max-w-md mx-auto space-y-10 md:max-w-lg lg:max-w-5xl lg:grid lg:grid-cols-2 lg:gap-14 lg:items-center lg:space-y-0">
        <div className="text-center lg:text-left relative z-10">
          <div className="inline-flex w-20 h-20 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] shadow-2xl items-center justify-center mb-8 border border-white/20">
            <TrendingUp className="text-white w-10 h-10" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase mb-2">SaltInvest</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] italic">Wealth Management</p>

          {/* Destaques premium apenas no web */}
          <div className="hidden lg:block mt-10 space-y-4">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center text-indigo-600">
                <ShieldCheck size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">Segurança de ponta</p>
                <p className="text-[11px] font-bold text-slate-400">Autenticação e dados no Supabase</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center text-indigo-600">
                <CheckCircle2 size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">Experiência premium</p>
                <p className="text-[11px] font-bold text-slate-400">Interface limpa, rápida e responsiva</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="p-10 md:p-12 border-none shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md relative z-10">
          <form className="space-y-6" onSubmit={async (e) => {
            e.preventDefault(); setAuthSubmitting(true); setAuthError('');
            try {
              if (authView === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate('/dashboard', { replace: true });
              } else if (authView === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                navigate('/dashboard', { replace: true });
              } else {
                const { error } = await supabase.auth.resetPasswordForEmail(email);
                if (error) throw error;
                setAuthSuccess('E-mail enviado!');
              }
            } catch (err) { setAuthError('Falha na autenticação.'); } finally { setAuthSubmitting(false); }
          }}>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">E-mail Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-600 transition-colors" />
                <input type="email" required placeholder="nome@exemplo.com" className="w-full bg-slate-100 dark:bg-slate-800/50 border border-transparent focus:border-indigo-500 rounded-2xl p-5 pl-12 font-bold focus:ring-4 ring-indigo-500/10 outline-none transition-all" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            {authView !== 'reset' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Chave de Segurança</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-600 transition-colors" />
                  <input type="password" required placeholder="••••••••" className="w-full bg-slate-100 dark:bg-slate-800/50 border border-transparent focus:border-indigo-500 rounded-2xl p-5 pl-12 font-bold focus:ring-4 ring-indigo-500/10 outline-none transition-all" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>
            )}
            {authError && <div className="text-red-500 bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl text-[10px] font-bold uppercase text-center tracking-widest border border-red-100 dark:border-red-900/40">{authError}</div>}
            {authSuccess && <div className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-[10px] font-bold uppercase text-center tracking-widest border border-emerald-100 dark:border-emerald-900/40">{authSuccess}</div>}
            <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98] uppercase tracking-[0.2em] text-xs transition-all">
              {authView === 'login' ? 'Entrar no Sistema' : authView === 'signup' ? 'Abrir Conta' : 'Recuperar Acesso'}
            </button>
          </form>
          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4 text-center">
            {authView === 'login' ? (
              <button onClick={() => navigate('/auth/signup')} className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors">Ainda não é cliente? <span className="text-indigo-600 underline underline-offset-4">Registrar-se</span></button>
            ) : (
              <button onClick={() => navigate('/auth/login')} className="text-slate-500 text-[10px] font-black uppercase flex items-center justify-center gap-3 mx-auto tracking-widest"><ArrowLeft size={14}/> Voltar ao Login</button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  const isWideEditor = Boolean(isModalOpen || editingInvestment);
  const modalWidthClass = isWideEditor ? 'md:max-w-5xl lg:max-w-6xl xl:max-w-6xl' : 'md:max-w-2xl lg:max-w-3xl';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans antialiased pb-40 lg:pb-28">
      {/*
        Web UX (sem afetar mobile):
        - Mantém layout mobile (max-w-md)
        - Em telas maiores, permite mais largura para reduzir espaços vazios
      */}
      <main className="max-w-md mx-auto px-6 pt-12 lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl lg:px-10">
        
        {view === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <header className="flex justify-between items-center px-2">
              <div>
                <h1 className="text-3xl font-black tracking-tighter leading-none mb-1">SaltInvest</h1>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                  {user.email ? String(user.email).split('@')[0] : 'Convidado'}
                </p>
              </div>
              <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-indigo-600 ring-4 ring-indigo-50 dark:ring-indigo-900/20">
                <ShieldCheck size={26} strokeWidth={2.5} />
              </div>
            </header>

            {/*
              Web UX (sem afetar mobile):
              - Em desktop, os dois cards principais ficam lado a lado.
              - Em mobile, mantém empilhado (layout original).
            */}
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-10">
              <Card variant="highlight" className="relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-10">
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                      <Layers size={14} className="text-indigo-500" /> Patrimônio Líquido
                    </p>
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                      <ArrowUpRight size={20} />
                    </div>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight mb-12 tabular-nums">
                    {formatCurrency(stats.totalEquity)}
                  </h2>
                  <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                    <div className="space-y-1">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Disponibilidade</p>
                      <p className="text-lg font-extrabold text-white">{formatCurrency(stats.liquidEquity)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Meta Acumulada</p>
                      <p className="text-lg font-extrabold text-indigo-400">{formatCurrency(stats.totalContributed)}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] group-hover:bg-indigo-600/20 transition-all duration-700"></div>
                <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-violet-600/5 rounded-full blur-[60px]"></div>
              </Card>

              <Card variant="primary" className="py-7 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-5 text-[10px] font-black uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-2">
                      <CalendarCheck size={14} /> 
                      <span>Plano Mensal Sugerido: {formatCurrency(stats.totalSuggested)}</span>
                    </div>
                    <span className="text-base font-black">{Math.round(stats.overallPercent)}%</span>
                  </div>
                  <ProgressBar progress={stats.overallPercent} color="bg-white" trackColor="bg-indigo-400/30" />
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <TrendingUp size={80} strokeWidth={1} />
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              {/* Evolução dos Planos */}
              <button onClick={() => setShowGoalsEvolution(!showGoalsEvolution)} className="w-full flex items-center justify-between px-8 py-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                    <Target size={22} strokeWidth={2.5} />
                  </div>
                  <div className="text-left font-black uppercase tracking-[0.2em] text-[11px] text-slate-800 dark:text-slate-100">Evolução Estratégica</div>
                </div>
                {showGoalsEvolution ? <ChevronUp size={20} /> : <ChevronDown size={20} className="text-slate-300" />}
              </button>
              {showGoalsEvolution && (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                  {stats.planningData.map(item => (
                    <Card key={item.id} className="py-6 px-8 border-none bg-white/50 dark:bg-slate-900/50">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold text-sm uppercase tracking-tight">{String(item.name)}</span>
                          {!item.is_monthly_plan && (
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block w-fit">Fora do Fluxo</span>
                          )}
                        </div>
                        <span className="text-indigo-600 font-black text-sm">{Math.round(item.percent)}%</span>
                      </div>
                      <ProgressBar progress={item.percent} color={item.percent >= 100 ? "bg-emerald-500" : "bg-indigo-600"} />
                    </Card>
                  ))}
                </div>
              )}

              {/* FGC Exposure */}
              <button onClick={() => setShowFGCCard(!showFGCCard)} className="w-full flex items-center justify-between px-8 py-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/50 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={22} strokeWidth={2.5} />
                  </div>
                  <div className="text-left font-black uppercase tracking-[0.2em] text-[11px] text-slate-800 dark:text-slate-100">Segurança do Sistema</div>
                </div>
                {showFGCCard ? <ChevronUp size={20} /> : <ChevronDown size={20} className="text-slate-300" />}
              </button>
              {showFGCCard && (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                  {Object.entries(stats.fgcByInstitution).map(([instId, data]) => (
                    <Card key={instId} className="py-6 px-8 border-none bg-white/50 dark:bg-slate-900/50">
                      <div className="flex justify-between items-center mb-5">
                        <span className="font-black text-[12px] uppercase tracking-wider">{institutions.find(i => i.id === instId)?.name || 'Custodiante'}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{formatCurrency(data.covered + data.uncovered)}</span>
                      </div>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <div className="flex items-center gap-2 text-emerald-600">
                               <Shield size={14} strokeWidth={3}/> Coberto FGC
                            </div>
                            <span className="tabular-nums">{formatCurrency(data.covered)}</span>
                         </div>
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <div className="flex items-center gap-2 text-red-500">
                               <ShieldAlert size={14} strokeWidth={3}/> Risco Direto
                            </div>
                            <span className="tabular-nums">{formatCurrency(data.uncovered)}</span>
                         </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Vencimentos */}
              <button onClick={() => setShowMaturityCard(!showMaturityCard)} className={`w-full flex items-center justify-between px-8 py-6 rounded-[2.5rem] border transition-all group ${stats.upcomingMaturities.length > 0 ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10' : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'} shadow-sm hover:shadow-xl`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${stats.upcomingMaturities.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                    <Clock size={22} strokeWidth={2.5} />
                  </div>
                  <div className="text-left font-black uppercase tracking-[0.2em] text-[11px]">Agenda de Maturidade</div>
                </div>
                {showMaturityCard ? <ChevronUp size={20} /> : <ChevronDown size={20} className="text-slate-300" />}
              </button>
              {showMaturityCard && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                  {stats.upcomingMaturities.length === 0 ? (
                    <p className="text-center text-[10px] text-slate-400 py-6 uppercase font-black tracking-widest italic">Janela de 30 dias limpa.</p>
                  ) : (
                    stats.upcomingMaturities.map(inv => (
                      <div key={inv.id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-3xl flex justify-between items-center border border-slate-100 dark:border-slate-800 shadow-sm">
                        <span className="text-[12px] font-black uppercase tracking-tight">{String(inv.name)}</span>
                        <div className="flex items-center gap-2 text-amber-600 font-black text-[11px] bg-amber-50 px-3 py-1 rounded-full">
                          <History size={12}/> {new Date(inv.due_date).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <section className="space-y-6 pb-12">
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase text-[12px] tracking-[0.3em]">IA Insights</h3>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2">
                {loadingInsights ? (
                  [1,2].map(i => <div key={i} className="min-w-[280px] h-40 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-[3rem]"></div>)
                ) : (
                  userInsights?.content?.map((ins, i) => (
                    <div key={i} className={`min-w-[280px] rounded-[3rem] p-8 border backdrop-blur-md transition-all hover:scale-[1.02] ${ins.type === 'Alerta' ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10' : ins.type === 'Dica' ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10' : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-xl ${ins.type === 'Alerta' ? 'bg-red-500 text-white' : ins.type === 'Dica' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'}`}>
                          {ins.type === 'Alerta' ? <AlertCircle size={16}/> : ins.type === 'Dica' ? <Lightbulb size={16}/> : <Zap size={16}/>}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{String(ins.type)}</span>
                      </div>
                      <p className="text-[13px] font-bold leading-relaxed text-slate-700 dark:text-slate-300">{String(ins.text)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {view === 'investments' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
             <div className="flex justify-between items-end px-2">
              <div>
                <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Portfólio</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Gestão de Ativos Reais</p>
              </div>
              <button onClick={() => {
                if (classes.length === 0 || institutions.length === 0) {
                  alert("Configure as Bases do Sistema em 'Ajustes' antes de continuar.");
                  return;
                }
                setNewInv({ name: '', value: '', classId: classes[0]?.id || '', institutionId: institutions[0]?.id || '', dueDate: '', liquidityType: 'diaria', is_fgc_covered: false, contributionsMap: {} });
                setIsModalOpen(true);
                setModalErrorMessage('');
              }} className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-[1.5rem] shadow-2xl shadow-indigo-500/30 active:scale-90 transition-all"><Plus size={28} strokeWidth={3}/></button>
            </div>
            
            <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
              {investments.length === 0 ? (
                <EmptyState icon={Wallet} title="Base de Ativos" description="Registre seus investimentos para monitoramento." actionLabel="Adicionar Ativo" onAction={() => setIsModalOpen(true)} />
              ) : (
                investments.map(inv => (
                  <Card key={inv.id} className={inv.is_redeemed ? "opacity-30 grayscale saturate-0" : "hover:border-indigo-500/30"}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-3">
                          <h4 className="font-extrabold text-base uppercase tracking-tight">{String(inv.name)}</h4>
                          {inv.is_fgc_covered && (
                            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg" title="Proteção FGC Ativa">
                               <ShieldCheck size={14} strokeWidth={3}/>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-[9px] font-black uppercase px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 tracking-wider border border-slate-200/50 dark:border-slate-700/50">{institutions.find(i => i.id === inv.institution_id)?.name || 'Outros'}</span>
                          <span className="text-[9px] font-black uppercase px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-lg tracking-wider border border-indigo-100/50 dark:border-indigo-800/50">{classes.find(c => c.id === inv.class_id)?.name || 'Geral'}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-lg block tabular-nums">{formatCurrency(inv.total_value)}</span>
                        {!inv.is_redeemed && (
                          <div className="flex gap-2 mt-4 justify-end">
                            <button onClick={() => {
                              const contributionsMap = {};
                              inv.contributions?.forEach(c => contributionsMap[c.goal_id] = c.amount);
                              setEditingInvestment({ ...inv, contributionsMap });
                              setModalErrorMessage('');
                            }} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={18} /></button>
                            <button onClick={() => triggerConfirmation(
                              "Confirmar Liquidação", 
                              `Deseja marcar "${inv.name}" como resgatado?`,
                              () => redeemInvestment(inv.id)
                            )} className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-indigo-100 transition-all">Liquidar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'goals' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
            <div className="flex justify-between items-end px-2">
              <div>
                <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Objetivos</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Direcionamento de Capital</p>
              </div>
              <button onClick={() => setEditingGoal({ name: '', target_value: 0, target_date: '', is_monthly_plan: true })} className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-[1.5rem] shadow-2xl active:scale-90 transition-all"><Plus size={28} strokeWidth={3}/></button>
            </div>

            <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
              {stats.planningData.length === 0 ? (
                <EmptyState icon={Target} title="Metas" description="Defina seus objetivos financeiros." actionLabel="Nova Meta" onAction={() => setEditingGoal({ name: '', target_value: 0, target_date: '', is_monthly_plan: true })} />
              ) : (
                stats.planningData.map(goal => (
                  <Card key={goal.id} className="group relative border-none hover:shadow-2xl">
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex-1 pr-10">
                        <div className="flex items-center gap-3">
                          <h4 className="font-black text-lg uppercase tracking-tight leading-none">{String(goal.name)}</h4>
                          <div className={`p-1.5 rounded-lg ${goal.is_monthly_plan ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                            {goal.is_monthly_plan ? <CalendarCheck size={16} strokeWidth={2.5}/> : <History size={16}/>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 mt-5">
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 w-fit px-3 py-1 rounded-full">
                            <Hourglass size={12} className="text-indigo-500" /> 
                            <span>{goal.monthsRemaining} ciclos restantes</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-black text-indigo-600 leading-none">{Math.round(goal.percent)}%</span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-tighter">Concluído</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Valuation</p>
                        <p className="font-black text-base tabular-nums">{formatCurrency(goal.target_value)}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equity Alloc.</p>
                        <p className="font-black text-base text-indigo-600 tabular-nums">{formatCurrency(goal.currentContributed)}</p>
                      </div>
                    </div>

                    <ProgressBar progress={goal.percent} color={goal.percent >= 100 ? "bg-emerald-500" : "bg-indigo-600"} />
                    
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <button onClick={() => setEditingGoal(goal)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => triggerConfirmation(
                        "Remover Objetivo",
                        `Deseja apagar "${goal.name}"?`,
                        () => deleteItem('goals', goal.id)
                      )} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'settings' && !settingsSubView && (
          <div className="space-y-8 animate-in slide-in-from-right-6 duration-700">
            <div className="px-2">
              <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Console</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Configurações de Core</p>
            </div>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden border-none">
              <div onClick={() => setSettingsSubView('alvos')} className="p-7 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group transition-all">
                <div className="flex items-center gap-5 text-[13px] font-black uppercase tracking-widest"><div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600"><PieChart size={20} /></div> Alocação Alvo (%)</div>
                <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </div>
              <div onClick={() => navigate('/settings/institutions')} className="p-7 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group transition-all">
                <div className="flex items-center gap-5 text-[13px] font-black uppercase tracking-widest"><div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600"><Building2 size={20} /></div> Instituições</div>
                <ChevronRight size={20} />
              </div>
              <div onClick={() => navigate('/settings/classes')} className="p-7 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group transition-all">
                <div className="flex items-center gap-5 text-[13px] font-black uppercase tracking-widest"><div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600"><Layers size={20} /></div> Classes de Ativo</div>
                <ChevronRight size={20} />
              </div>
              <div onClick={handleLogout} className="p-7 flex justify-between items-center hover:bg-red-50/50 dark:hover:bg-red-900/10 cursor-pointer group transition-all text-red-500">
                <div className="flex items-center gap-5 text-[13px] font-black uppercase tracking-widest"><div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl"><LogOut size={20} /></div> Encerrar Console</div>
                <ChevronRight size={20} />
              </div>
            </Card>
          </div>
        )}

        {/* Sub-Views */}
        {(settingsSubView === 'institutions' || settingsSubView === 'classes') && (
          <div className="space-y-8 animate-in slide-in-from-left-6 duration-500">
             <button onClick={() => navigate('/settings')} className="flex items-center gap-3 text-indigo-600 font-black uppercase text-[11px] tracking-[0.3em] mb-4 hover:gap-4 transition-all"><ChevronLeft size={18} strokeWidth={3} /> Console</button>
             <div className="flex justify-between items-center px-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">
                  {settingsSubView === 'institutions' ? 'Bancos' : 'Ativos'}
                </h2>
                <button onClick={() => {
                  if(settingsSubView === 'institutions') setEditingInstitution({ name: '' });
                  if(settingsSubView === 'classes') setEditingClass({ name: '', target_percent: 0 });
                }} className="bg-indigo-600 text-white p-4 rounded-2xl active:scale-95 shadow-xl"><Plus size={22} strokeWidth={3}/></button>
             </div>
             <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
               {(settingsSubView === 'institutions' ? institutions : classes).map(item => (
                 <Card key={item.id} className="flex justify-between items-center py-6 px-8 border-none bg-white/50 dark:bg-slate-900/50">
                    <div className="flex flex-col gap-1">
                      <h4 className="font-extrabold text-[13px] uppercase tracking-wide">{String(item.name)}</h4>
                      {item.target_percent !== undefined && (
                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 w-fit px-2 py-0.5 rounded-md uppercase tracking-widest">Alvo: {item.target_percent}%</span>
                      )}
                    </div>
                    <div className="flex gap-4">
                       <button onClick={() => {
                          if(settingsSubView === 'institutions') setEditingInstitution(item);
                          if(settingsSubView === 'classes') setEditingClass(item);
                       }} className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={18}/></button>
                       <button onClick={() => triggerConfirmation(
                          "Remover Registro",
                          `Deseja apagar "${item.name}"?`,
                          () => deleteItem(settingsSubView, item.id)
                       )} className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                    </div>
                 </Card>
               ))}
             </div>
          </div>
        )}

        {settingsSubView === 'alvos' && (
           <div className="space-y-8 animate-in slide-in-from-left-6 duration-500">
             <button onClick={() => navigate('/settings')} className="flex items-center gap-3 text-indigo-600 font-black uppercase text-[11px] tracking-[0.3em] mb-4 hover:gap-4 transition-all"><ChevronLeft size={18} strokeWidth={3} /> Console</button>
             <h2 className="text-3xl font-black uppercase tracking-tighter px-2">Estratégia</h2>
             <Card className="space-y-10 border-none">
                {classes.map(c => (
                  <div key={c.id} className="space-y-5">
                     <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                        <span>{String(c.name)}</span>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 shadow-inner">
                           <input type="number" className="w-12 bg-transparent rounded p-1 text-right text-indigo-600 font-black outline-none" value={c.target_percent} onChange={e => saveConfig('classes', {...c, target_percent: Number(e.target.value)})} />
                           <span className="opacity-40">%</span>
                        </div>
                     </div>
                     <input type="range" className="w-full accent-indigo-600 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer" value={c.target_percent} onChange={e => saveConfig('classes', {...c, target_percent: Number(e.target.value)})} />
                  </div>
                ))}
                <div className={`p-6 rounded-[2rem] text-center font-black text-[11px] tracking-[0.3em] uppercase transition-all duration-500 ${stats.totalTargetPercent === 100 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-inner' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                   Consistência: {stats.totalTargetPercent}%
                </div>
             </Card>
           </div>
        )}
      </main>

      {/* CONFIRMAÇÃO MODAL */}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[60] flex items-center justify-center p-10 animate-in fade-in duration-300">
          <Card className="w-full max-w-xs border-none shadow-3xl bg-white dark:bg-slate-900 overflow-hidden text-center">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-amber-100 dark:border-amber-800/50">
              <AlertTriangle size={32} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-xl uppercase tracking-tight mb-3">Requer Atenção</h3>
            <p className="text-slate-500 text-[13px] leading-relaxed mb-10 font-medium px-2">{String(confirmAction.message)}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmAction(null)} className="py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:bg-slate-100">Abortar</button>
              <button onClick={confirmAction.onConfirm} className="py-4 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 transition-all active:scale-95">Executar</button>
            </div>
          </Card>
        </div>
      )}

      {/* GLOBAL EDITOR MODAL */}
      {(isModalOpen || editingInvestment || editingGoal || editingInstitution || editingClass) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-2xl z-50 flex items-end md:items-center justify-center p-0 md:p-10">
          <div className={`bg-white dark:bg-slate-900 w-full max-w-md ${modalWidthClass} rounded-t-[4rem] md:rounded-[4rem] p-12 shadow-3xl max-h-[92vh] md:max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-700 border-t border-white/5 md:border md:border-slate-200/50 dark:md:border-slate-800/50 md:border-t-0`}>
             <div className="flex justify-between items-center mb-10">
                <h3 className="font-black text-2xl tracking-tighter uppercase leading-none">Editor de Console</h3>
                <button onClick={() => { setIsModalOpen(false); setEditingInvestment(null); setEditingGoal(null); setEditingInstitution(null); setEditingClass(null); setModalErrorMessage(''); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:rotate-90 transition-all duration-300 active:scale-90"><X size={24} strokeWidth={3}/></button>
             </div>
             
             <div className="space-y-8 md:space-y-10">
                {editingInstitution ? (
                  <div className="space-y-8">
                    <input type="text" placeholder="Designação da Instituição" className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 font-bold outline-none focus:ring-4 ring-indigo-500/10 focus:border-indigo-500 transition-all" value={editingInstitution.name} onChange={e => setEditingInstitution({...editingInstitution, name: e.target.value})} />
                    <button onClick={() => saveConfig('institutions', editingInstitution)} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl active:scale-95">Salvar Registro</button>
                  </div>
                ) : editingClass ? (
                  <div className="space-y-8">
                    <input type="text" placeholder="Designação da Classe" className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 font-bold outline-none focus:ring-4 ring-indigo-500/10 focus:border-indigo-500 transition-all" value={editingClass.name} onChange={e => setEditingClass({...editingClass, name: e.target.value})} />
                    <button onClick={() => saveConfig('classes', editingClass)} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl active:scale-95">Salvar Registro</button>
                  </div>
                ) : editingGoal ? (
                  <div className="space-y-8">
                    <input type="text" placeholder="Título Estratégico" className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 font-bold outline-none" value={editingGoal.name} onChange={e => setEditingGoal({...editingGoal, name: e.target.value})} />
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">Alvo R$</label>
                        <input type="number" placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border-none font-bold" value={editingGoal.target_value} onChange={e => setEditingGoal({...editingGoal, target_value: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-3 tracking-widest">Maturidade</label>
                        <input type="date" className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border-none font-bold" value={editingGoal.target_date} onChange={e => setEditingGoal({...editingGoal, target_date: e.target.value})} />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <input type="checkbox" id="is_monthly_plan" className="w-6 h-6 accent-indigo-600 rounded-xl" checked={editingGoal.is_monthly_plan} onChange={e => setEditingGoal({...editingGoal, is_monthly_plan: e.target.checked})} />
                      <label htmlFor="is_monthly_plan" className="text-[11px] font-black uppercase tracking-widest cursor-pointer select-none">Incluir no Fluxo Mensal</label>
                    </div>

                    <button onClick={() => saveGoal(editingGoal)} className="w-full bg-indigo-600 text-white p-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl active:scale-95">Confirmar Objetivo</button>
                  </div>
                ) : (
                  <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-12">
                    <div className="space-y-6">
                      {modalErrorMessage && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                          <AlertCircle className="text-red-600 shrink-0" size={18} />
                          <p className="text-red-700 dark:text-red-400 text-xs font-bold leading-tight">{modalErrorMessage}</p>
                        </div>
                      )}

                      <input type="text" placeholder="Designação do Ativo" className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 font-bold outline-none" value={editingInvestment?.name || newInv.name} onChange={e => editingInvestment ? setEditingInvestment({...editingInvestment, name: e.target.value}) : setNewInv({...newInv, name: e.target.value})} />

                      <div className="grid grid-cols-2 gap-5">
                         <select className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border-none font-bold appearance-none" value={editingInvestment?.class_id || newInv.classId} onChange={e => editingInvestment ? setEditingInvestment({...editingInvestment, class_id: e.target.value}) : setNewInv({...newInv, classId: e.target.value})}>
                            <option value="">Classe...</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                         <select className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border-none font-bold appearance-none" value={editingInvestment?.institution_id || newInv.institutionId} onChange={e => editingInvestment ? setEditingInvestment({...editingInvestment, institution_id: e.target.value}) : setNewInv({...newInv, institutionId: e.target.value})}>
                            <option value="">Instituição...</option>
                            {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                         </select>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                         <input type="number" placeholder="Valor Total R$" className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border-none font-bold" value={editingInvestment?.total_value || newInv.value} onChange={e => editingInvestment ? setEditingInvestment({...editingInvestment, total_value: e.target.value}) : setNewInv({...newInv, value: e.target.value})} />
                         <select className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border-none font-bold appearance-none" value={editingInvestment?.liquidity_type || newInv.liquidityType} onChange={e => editingInvestment ? setEditingInvestment({...editingInvestment, liquidity_type: e.target.value}) : setNewInv({...newInv, liquidityType: e.target.value})}>
                            <option value="diaria">Liquidez Diária</option>
                            <option value="vencimento">Maturidade</option>
                         </select>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <input type="checkbox" id="is_fgc_covered" className="w-6 h-6 accent-emerald-500 rounded-xl" checked={editingInvestment ? !!editingInvestment.is_fgc_covered : !!newInv.is_fgc_covered} onChange={e => {
                          const val = e.target.checked;
                          if(editingInvestment) setEditingInvestment({...editingInvestment, is_fgc_covered: val});
                          else setNewInv({...newInv, is_fgc_covered: val});
                        }} />
                        <label htmlFor="is_fgc_covered" className="text-[11px] font-black uppercase tracking-widest cursor-pointer select-none flex items-center gap-3 text-emerald-600"><ShieldCheck size={16}/> Proteção FGC</label>
                      </div>

                      {(editingInvestment?.liquidity_type === 'vencimento' || newInv.liquidityType === 'vencimento') && (
                        <div className="space-y-2 animate-in zoom-in-95 duration-300">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-[0.2em]">Data de Maturidade</label>
                          <input type="date" className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-indigo-200/50 dark:border-indigo-900/30 font-bold text-indigo-600 outline-none" value={editingInvestment?.due_date || newInv.dueDate} onChange={e => editingInvestment ? setEditingInvestment({...editingInvestment, due_date: e.target.value}) : setNewInv({...newInv, dueDate: e.target.value})} />
                        </div>
                      )}
                    </div>

                    <div className="pt-10 border-t border-slate-100 dark:border-slate-800 md:pt-0 md:border-t-0 md:border-l md:pl-10">
                       <div className="flex justify-between items-end mb-6 px-2">
                          <div className="space-y-1">
                            <h4 className="font-black text-[11px] text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2"><Target size={14}/> Alocação por Meta</h4>
                            <p className={`text-[10px] font-bold ${allocationStats.isExceeded ? 'text-red-500' : 'text-slate-400'}`}>
                               Disponível: {formatCurrency(allocationStats.remainingToAllocate)}
                            </p>
                          </div>
                          <div className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full flex items-center gap-2">
                             <Info size={10}/> Planejamento Mensal
                          </div>
                       </div>

                       <div className="md:max-h-[52vh] md:overflow-y-auto md:pr-2">
                         {stats.planningData.filter(g => g.is_monthly_plan).map(g => (
                           <div key={g.id} className="flex flex-col gap-2 mb-4 bg-slate-100 dark:bg-slate-800/40 p-5 rounded-[2.5rem] border border-transparent hover:border-indigo-500/20 transition-all group">
                              <div className="flex items-center justify-between">
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-tight truncate pr-6 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600">{String(g.name)}</span>
                                    <span className="text-[9px] font-bold text-slate-400 lowercase tracking-wide">Sugerido: {formatCurrency(g.suggestedMonthly)}</span>
                                 </div>
                                 <div className="relative">
                                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 text-[10px] font-black">R$</span>
                                   <input 
                                     type="number" 
                                     placeholder="0" 
                                     className={`w-32 bg-white dark:bg-slate-800 p-3 pl-10 rounded-2xl text-right font-black border outline-none shadow-sm focus:ring-4 ring-indigo-500/10 transition-all ${allocationStats.isExceeded ? 'border-red-300 text-red-600' : 'border-slate-200 dark:border-slate-700 text-indigo-600'}`} 
                                     value={editingInvestment?.contributionsMap?.[g.id] || newInv.contributionsMap?.[g.id] || ''} 
                                     onChange={e => {
                                       const v = e.target.value;
                                       if(editingInvestment) {
                                         setEditingInvestment({...editingInvestment, contributionsMap: {...editingInvestment.contributionsMap, [g.id]: v}});
                                       } else {
                                         setNewInv({...newInv, contributionsMap: {...newInv.contributionsMap, [g.id]: v}});
                                       }

                                       // Validação em tempo de digitação para a mensagem de erro superior
                                       const tempMap = editingInvestment ? {...editingInvestment.contributionsMap, [g.id]: v} : {...newInv.contributionsMap, [g.id]: v};
                                       const tempSum = Object.values(tempMap).reduce((s, val) => s + (Number(val) || 0), 0);
                                       const limit = Number(editingInvestment?.total_value || newInv.value || 0);

                                       if (tempSum > limit) {
                                         setModalErrorMessage(`Alocação excedida em ${formatCurrency(tempSum - limit)}!`);
                                       } else {
                                         setModalErrorMessage('');
                                       }
                                     }} 
                                   />
                                 </div>
                              </div>
                           </div>
                         ))}
                         {stats.planningData.filter(g => g.is_monthly_plan).length === 0 && (
                           <p className="text-center text-[10px] text-slate-400 py-6 font-black uppercase tracking-widest">Nenhuma meta ativa no plano mensal.</p>
                         )}
                       </div>

                      <button 
                        onClick={() => saveInvestment(editingInvestment || newInv)} 
                        disabled={allocationStats.isExceeded}
                        className={`w-full p-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl active:scale-95 transition-all mt-6 ${allocationStats.isExceeded ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white'}`}
                      >
                        {allocationStats.isExceeded ? 'Ajuste os Valores' : 'Confirmar Alocação'}
                      </button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* LUXURY NAVIGATION */}
      <nav className="fixed bottom-10 left-8 right-8 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[640px] lg:w-[768px] xl:w-[896px] 2xl:w-[1024px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-none rounded-[3rem] px-8 py-5 flex justify-between items-center z-40 transition-all">
        <NavButton
          active={view === 'dashboard'}
          onClick={() => { setView('dashboard'); setSettingsSubView(null); navigate('/dashboard'); }}
          icon={<LayoutDashboard />}
          label="Painel"
        />
        <NavButton
          active={view === 'investments'}
          onClick={() => { setView('investments'); setSettingsSubView(null); navigate('/investments'); }}
          icon={<Wallet />}
          label="Ativos"
        />
        <NavButton
          active={view === 'goals'}
          onClick={() => { setView('goals'); setSettingsSubView(null); navigate('/goals'); }}
          icon={<Target />}
          label="Metas"
        />
        <NavButton
          active={view === 'settings'}
          onClick={() => { setView('settings'); navigate('/settings'); }}
          icon={<Settings />}
          label="Ajustes"
        />
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<SaltInvestCore />} />
    </Routes>
  );
}
