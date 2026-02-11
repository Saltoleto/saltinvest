import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  PieChart, 
  PlusCircle, 
  TrendingUp, 
  Award, 
  Zap, 
  ShieldCheck, 
  Star, 
  RefreshCw, 
  Sparkles, 
  Trash2, 
  Edit2, 
  X, 
  PieChart as PieIcon, 
  Building2, 
  Calendar, 
  Clock, 
  Layers, 
  Search, 
  Filter, 
  Eraser, 
  Info, 
  Trophy, 
  User, 
  Medal, 
  Crown, 
  Eye, 
  EyeOff, 
  ArrowDownRight, 
  ArrowUp, 
  Wallet, 
  LogOut, 
  Mail, 
  Lock, 
  ArrowRight, 
  ChevronLeft, 
  History, 
  ShieldAlert, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  Milestone,
  SlidersHorizontal
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from './lib/supabase';

// --- Instância Global do Supabase ---
const supabaseClient = supabase;

// --- Componentes de Utilidade ---
type CardProps = React.PropsWithChildren<{ className?: string }>;
const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-xl ${className}`}>
    {children}
  </div>
);

type ProgressBarProps = { progress: number; color?: string; size?: string };
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, color = "bg-emerald-500", size = "h-2" }) => (
  <div className={`w-full bg-slate-800/50 rounded-full ${size} overflow-hidden border border-slate-700/30`}>
    <div 
      className={`h-full ${color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.2)]`} 
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

// --- Componente de Autenticação ---
function AuthView() {
  const [mode, setMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (mode === 'login') {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'register') {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: 'Conta criada! Verifique o seu e-mail para confirmar.', type: 'success' });
      } else if (mode === 'recovery') {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage({ text: 'E-mail de recuperação enviado!', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mx-auto mb-6 rotate-3">
            <TrendingUp className="text-white w-10 h-10 -rotate-3" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">SaltInvest</h1>
        </div>

        <Card className="shadow-2xl border-slate-800/40 bg-slate-900/60 p-8">
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-white">
                {mode === 'login' ? 'Bem-vindo' : mode === 'register' ? 'Criar Conta' : 'Recuperação'}
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                {mode === 'login' ? 'Aceda à sua carteira premium.' : mode === 'register' ? 'Comece a sua evolução financeira.' : 'Insira o seu e-mail registado.'}
              </p>
            </div>

            {message.text && (
              <div className={`p-4 rounded-2xl text-[11px] font-bold uppercase tracking-wider border animate-in zoom-in-95 ${
                message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="flex gap-3 items-center">
                  <span className="shrink-0"><Info size={16} /></span>
                  <span>{message.text}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="group space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest group-focus-within:text-emerald-500 transition-colors">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input 
                    type="email" required
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 pl-12 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm text-white placeholder:text-slate-700"
                    placeholder="seu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {mode !== 'recovery' && (
                <div className="group space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-focus-within:text-emerald-500 transition-colors">Senha</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => setMode('recovery')} className="text-[10px] text-emerald-500/80 hover:text-emerald-400 font-bold uppercase tracking-widest">Esqueceu?</button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} required
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 pl-12 pr-12 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm text-white placeholder:text-slate-700"
                      placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-emerald-500/10"
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                <>
                  <span className="uppercase tracking-widest text-xs">
                    {mode === 'login' ? 'Entrar na Plataforma' : mode === 'register' ? 'Criar Conta Premium' : 'Recuperar Acesso'}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <button 
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage({text:'', type:''}); }}
              className="w-full text-[11px] text-slate-500 hover:text-emerald-400 transition-colors text-center font-bold uppercase tracking-widest"
            >
              {mode === 'login' ? 'Ainda não é membro? Registe-se' : 'Já possui conta? Faça o Login'}
            </button>
          </div>
        </Card>
        
        {mode === 'recovery' && (
          <button onClick={() => setMode('login')} className="w-full mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-500 hover:text-white uppercase font-black tracking-widest transition-all">
            <ChevronLeft size={14} /> Voltar para o Login
          </button>
        )}
      </div>
    </div>
  );
}

  // --- Tela de configuração do Supabase (quando .env não está configurado) ---
  function SupabaseConfigView() {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="text-amber-400" size={22} />
              <h1 className="text-lg font-semibold">Configuração do Supabase</h1>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Para rodar o SaltInvest localmente, defina as variáveis <span className="font-mono text-slate-200">VITE_SUPABASE_URL</span> e{" "}
              <span className="font-mono text-slate-200">VITE_SUPABASE_ANON_KEY</span> no arquivo <span className="font-mono text-slate-200">.env</span>.
            </p>

            <div className="mt-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl p-4">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest">Exemplo</p>
              <pre className="text-xs text-slate-200 whitespace-pre-wrap font-mono">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_...`}
              </pre>
            </div>

            <div className="mt-4 text-xs text-slate-400">
              Depois disso, execute <span className="font-mono text-slate-200">npm install</span> e <span className="font-mono text-slate-200">npm run dev</span>.
            </div>
          </div>
        </div>
      </div>
    );
  }

// --- Componente Principal ---
export default function App() {
  const [supabaseReady, setSupabaseReady] = useState(isSupabaseConfigured);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const [goals, setGoals] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [assetClasses, setAssetClasses] = useState([]);
  const [allocation, setAllocation] = useState<Record<string, number>>({});
  const [userStats, setUserStats] = useState({ xp: 0, level: 1 });
  const [aiInsights, setAiInsights] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // --- PWA: instalação + atualização ---
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [showUpdateHint, setShowUpdateHint] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateRemindTimerRef = useRef<number | null>(null);

  // --- Supabase pronto via env (.env) ---
  useEffect(() => {
    // Evita spinner infinito se o projeto estiver sem configuração do Supabase
    if (!isSupabaseConfigured) setLoading(false);
  }, []);

  // --- PWA: captura prompt de instalação (Chrome/Edge) + dica para iOS ---
  useEffect(() => {
    const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || Boolean(navigator.standalone);
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem('saltinvest_install_dismissed_at') || '0');
    const dismissedRecently = dismissedAt > 0 && (Date.now() - dismissedAt) < 7 * 24 * 60 * 60 * 1000;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafariIOS = isIOS && /^((?!crios|fxios|opios|edgios|chrome|android).)*safari/i.test(navigator.userAgent);

    const onBeforeInstallPrompt = (e: Event) => {
      // Permite mostrar o botão "Instalar" dentro do app
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      if (!dismissedRecently) setShowInstallHint(true);
    };

    const onAppInstalled = () => {
      setInstallPromptEvent(null);
      setShowInstallHint(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // Em alguns navegadores (ou dependendo do engajamento), o evento pode demorar.
    // Para garantir que o usuário receba a sugestão, mostramos uma dica leve após alguns segundos.
    let fallbackTimer: number | undefined;
    if (!dismissedRecently && !isSafariIOS) {
      fallbackTimer = window.setTimeout(() => setShowInstallHint(true), 4000);
    }

    // iOS não dispara beforeinstallprompt: mostramos uma dica de instalação.
    if (isSafariIOS && !dismissedRecently) {
      setShowInstallHint(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, []);

  // --- PWA: atualização disponível / offline pronto (eventos disparados em src/main.tsx) ---
  useEffect(() => {
    const onNeedRefresh = () => setShowUpdateHint(true);
    const onOfflineReady = () => setOfflineReady(true);

    window.addEventListener('pwa:needRefresh', onNeedRefresh as EventListener);
    window.addEventListener('pwa:offlineReady', onOfflineReady as EventListener);

    return () => {
      window.removeEventListener('pwa:needRefresh', onNeedRefresh as EventListener);
      window.removeEventListener('pwa:offlineReady', onOfflineReady as EventListener);
    };
  }, []);

  const dismissInstallHint = () => {
    localStorage.setItem('saltinvest_install_dismissed_at', String(Date.now()));
    setShowInstallHint(false);
  };

  const triggerInstall = async () => {
    if (!installPromptEvent) {
      dismissInstallHint();
      return;
    }
    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPromptEvent(null);
        setShowInstallHint(false);
      } else {
        dismissInstallHint();
      }
    } catch {
      dismissInstallHint();
    }
  };

  const dismissUpdateHint = () => {
    setShowUpdateHint(false);
    if (updateRemindTimerRef.current) window.clearTimeout(updateRemindTimerRef.current);
    // Lembrete suave: reexibe depois de 30 minutos se o usuário não atualizar.
    updateRemindTimerRef.current = window.setTimeout(() => setShowUpdateHint(true), 30 * 60 * 1000);
  };

  const applyUpdate = async () => {
    try {
      if (updateRemindTimerRef.current) window.clearTimeout(updateRemindTimerRef.current);
      if (window.__PWA_UPDATE_SW__) {
        await window.__PWA_UPDATE_SW__(true);
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  // --- Gestão de Sessão ---
  useEffect(() => {
    if (!supabaseReady || !supabaseClient) return;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          setUser(session.user);
        } else {
          const { data, error } = await supabaseClient.auth.signInAnonymously();
          if (!error) setUser(data.user);
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabaseReady]);

  // --- Sincronização de Dados ---
  const fetchData = async () => {
    if (!user || !supabaseClient) return;
    
    try {
        const [
          { data: gData }, 
          { data: iData }, 
          { data: instData }, 
          { data: cData }, 
          { data: config },
          { data: insightsData }
        ] = await Promise.all([
          supabaseClient.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabaseClient.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabaseClient.from('institutions').select('*').eq('user_id', user.id),
          supabaseClient.from('asset_classes').select('*').eq('user_id', user.id),
          supabaseClient.from('user_config').select('*').eq('user_id', user.id).maybeSingle(),
          supabaseClient.from('ai_insights').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ]);

        setGoals(gData || []);
        setInvestments(iData || []);
        setInstitutions(instData || []);
        setAssetClasses(cData || []);
        
        if (config) {
          setAllocation(Object.fromEntries(Object.entries((config.allocation as Record<string, unknown>) || {}).map(([k, v]) => [k, Number(v) || 0])) as Record<string, number>);
          setUserStats({ xp: config.xp || 0, level: config.level || 1 });
        }

        if (insightsData && insightsData.length > 0) {
          setAiInsights(insightsData);
        } else {
          setAiInsights([{ type: 'Info', text: 'Clique em gerar insights para uma análise personalizada.' }]);
        }
    } catch (err) {
        console.error("Data fetch error:", err);
    }
  };

  useEffect(() => {
    if (!user || !supabaseReady || !supabaseClient) return;
    fetchData();

    const channel = supabaseClient.channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData())
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [user, supabaseReady]);

  // --- Lógica de Insights de IA ---
  const generateAIInsights = async () => {
    if (!user || isAiLoading) return;
    setIsAiLoading(true);
    setAiError(null);

    // 🔐 A chave do Gemini NÃO deve ficar hardcoded.
    // Para desenvolvimento local, configure em .env:
    //   VITE_GEMINI_API_KEY=...
    // Opcional:
    //   VITE_GEMINI_MODEL=gemini-flash-latest
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      setAiError("Chave da IA não configurada. Defina VITE_GEMINI_API_KEY no arquivo .env e reinicie o servidor.");
      setIsAiLoading(false);
      return;
    }

    const model = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.5-flash-preview-09-2025";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const contextData = {
      patrimonioTotal: totalPatrimony,
      quantidadeMetas: goals.length,
      investimentos: investments.map(i => ({
        ativo: i.asset,
        valor: i.amount,
        banco: i.institution,
        categoria: i.category,
        fgc: i.fgc_covered
      })),
      alocacaoDesejada: allocation
    };

    const systemPrompt = `Você é o consultor financeiro SaltInvest. Analise os dados reais do portfólio do usuário e forneça 3 insights estratégicos, motivadores e práticos. 
    Responda EXCLUSIVAMENTE em formato JSON puro, sem blocos de código Markdown, seguindo esta estrutura: 
    { "insights": [{ "type": "Oportunidade" | "Dica" | "Alerta", "text": "texto curto e impactante" }] }`;

    const userPrompt = `Aqui estão meus dados financeiros atuais: ${JSON.stringify(contextData)}. Gere insights baseados na minha carteira.`;

    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { 
              responseMimeType: "application/json",
              temperature: 0.7 
            }
          })
        });

        if (!response.ok) {
          // Tenta extrair a mensagem real da API para facilitar o diagnóstico.
          let details = '';
          try {
            const errJson = await response.json();
            details = errJson?.error?.message ? String(errJson.error.message) : JSON.stringify(errJson);
          } catch {
            try { details = await response.text(); } catch { /* noop */ }
          }

          const hint403 = response.status === 403
            ? " (403: verifique se a API key está correta/ativa e se o Gemini API está habilitado no projeto; se houver restrições de origem, inclua localhost)."
            : "";

          throw new Error(`IA: ${response.status} ${response.statusText}${hint403}${details ? ` | ${details}` : ''}`);
        }
        
        const result = await response.json();
        let rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const content = JSON.parse(rawText);
        
        if (content.insights && content.insights.length > 0) {
          const { error: delError } = await supabaseClient
            .from('ai_insights')
            .delete()
            .eq('user_id', user.id);
          if (delError) throw delError;

          const rows = content.insights.map(i => ({ ...i, user_id: user.id }));
          const { error: insError } = await supabaseClient
            .from('ai_insights')
            .insert(rows);
          if (insError) throw insError;

          await fetchData();
        } else {
          throw new Error("Formato de resposta inválido.");
        }
      } catch (e) {
        if (retries > 0) {
          await new Promise(r => setTimeout(r, delay));
          return fetchWithRetry(retries - 1, delay * 2);
        }
        const msg = e instanceof Error ? e.message : "Não foi possível gerar insights no momento.";
        setAiError(msg);
      }
    };

    await fetchWithRetry();
    setIsAiLoading(false);
  };

  // --- Handlers ---
  const handleAddGoal = async (goalData) => {
    const { error } = await supabaseClient.from('goals').insert([{ ...goalData, user_id: user.id, target: Number(goalData.target) }]);
    if (!error) await fetchData();
    return { error };
  };

  const handleUpdateGoal = async (id, goalData) => {
    const { error } = await supabaseClient.from('goals').update({ ...goalData, target: Number(goalData.target) }).eq('id', id);
    if (!error) await fetchData();
    return { error };
  };

  const handleDeleteGoal = async (id) => {
    const { error } = await supabaseClient.from('goals').delete().eq('id', id);
    if (!error) await fetchData();
    return { error };
  };

  const handleAddInvestment = async (data) => {
    const { error } = await supabaseClient.from('investments').insert([{ ...data, user_id: user.id }]);
    if (!error) {
      const newXp = userStats.xp + Math.floor(data.amount / 10);
      await supabaseClient.from('user_config').upsert({ user_id: user.id, xp: newXp });
      await fetchData();
    }
    return { error };
  };

  const handleUpdateInvestment = async (id, data) => {
    const { error } = await supabaseClient.from('investments').update(data).eq('id', id);
    if (!error) await fetchData();
    return { error };
  };

  const handleDeleteInvestment = async (id, amount) => {
    const { error } = await supabaseClient.from('investments').delete().eq('id', id);
    if (!error) {
      const newXp = Math.max(0, userStats.xp - Math.floor(amount / 10));
      await supabaseClient.from('user_config').upsert({ user_id: user.id, xp: newXp });
      await fetchData();
    }
    return { error };
  };

  const handleSaveAllocation = async (data) => {
    const { error } = await supabaseClient.from('user_config').upsert({ user_id: user.id, allocation: data });
    if (!error) await fetchData();
    return { error };
  };

  const handleAddInstitution = async (name) => {
    const { error } = await supabaseClient.from('institutions').insert([{ name, user_id: user.id }]);
    if (!error) await fetchData();
    return { error };
  };

  const handleDeleteInstitution = async (id) => {
    const { error } = await supabaseClient.from('institutions').delete().eq('id', id);
    if (!error) await fetchData();
    return { error };
  };

  const handleAddAssetClass = async (name) => {
    const { error } = await supabaseClient.from('asset_classes').insert([{ name, user_id: user.id }]);
    if (!error) await fetchData();
    return { error };
  };

  const handleDeleteAssetClass = async (id) => {
    const { error } = await supabaseClient.from('asset_classes').delete().eq('id', id);
    if (!error) await fetchData();
    return { error };
  };

  // --- Stats ---
  const totalPatrimony = useMemo(() => investments.reduce((acc, curr) => acc + Number(curr.amount), 0), [investments]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currMonth = investments
      .filter(i => {
        const d = new Date(i.date || i.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, i) => s + Number(i.amount), 0);

    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = investments
      .filter(i => {
        const d = new Date(i.date || i.created_at);
        return d.getMonth() === lastDate.getMonth() && d.getFullYear() === lastDate.getFullYear();
      })
      .reduce((s, i) => s + Number(i.amount), 0);

    const trend = lastMonth === 0 ? 0 : ((currMonth - lastMonth) / lastMonth) * 100;
    return { current: currMonth, trend };
  }, [investments]);

  const levelData = useMemo(() => {
    const xpPerLevel = 1000;
    const currentLevel = Math.floor(userStats.xp / xpPerLevel) + 1;
    const progress = ((userStats.xp % xpPerLevel) / xpPerLevel) * 100;
    let title = "Iniciante";
    if (currentLevel >= 10) title = "Investidor Focado";
    if (currentLevel >= 25) title = "Estrategista Pleno";
    if (currentLevel >= 50) title = "Mestre dos Ativos";
    if (currentLevel >= 100) title = "Magnata SaltInvest";
    return { currentLevel, progress, nextLevelXp: xpPerLevel - (userStats.xp % xpPerLevel), title };
  }, [userStats.xp]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setActiveTab('dashboard');
  };

  if (!isSupabaseConfigured) return <SupabaseConfigView />;

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 gap-4">
      <RefreshCw className="animate-spin text-emerald-500" size={32} />
      <p className="animate-pulse font-medium text-xs uppercase tracking-widest">Sincronizando SaltInvest...</p>
    </div>
  );

  if (!user) return <AuthView />;

  const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || Boolean(navigator.standalone);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafariIOS = isIOS && /^((?!crios|fxios|opios|edgios|chrome|android).)*safari/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/40 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">SaltInvest</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsPrivate(!isPrivate)}
              className={`p-2 rounded-full border transition-all ${isPrivate ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
            >
              {isPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <div className="bg-slate-800/50 p-2 rounded-full border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => setActiveTab('profile')}>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-32">
        {activeTab === 'dashboard' && (
          <DashboardView 
            stats={userStats} level={levelData} total={totalPatrimony} 
            goals={goals} investments={investments} 
            isPrivate={isPrivate} monthStats={monthlyStats}
            aiInsights={aiInsights}
            isAiLoading={isAiLoading}
            onRefreshAi={generateAIInsights}
            aiError={aiError}
          />
        )}
        {activeTab === 'goals' && (
          <GoalsView 
            goals={goals} investments={investments}
            onAdd={handleAddGoal} 
            onUpdate={handleUpdateGoal} 
            onDelete={handleDeleteGoal}
          />
        )}
        {activeTab === 'invest' && (
          <InvestView 
            investments={investments}
            onAdd={handleAddInvestment} 
            onUpdate={handleUpdateInvestment}
            onDelete={handleDeleteInvestment} 
            goals={goals} institutions={institutions} assetClasses={assetClasses}
            isPrivate={isPrivate}
          />
        )}
        {activeTab === 'allocation' && (
          <SettingsView 
            allocation={allocation} 
            saveAlloc={handleSaveAllocation}
            institutions={institutions}
            onAddInst={handleAddInstitution}
            onDeleteInst={handleDeleteInstitution}
            assetClasses={assetClasses}
            onAddClass={handleAddAssetClass}
            onDeleteClass={handleDeleteAssetClass}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileView stats={userStats} level={levelData} patrimony={totalPatrimony} user={user} onLogout={handleLogout} />
        )}
      </main>

      <PwaNudges
        disabled={isStandalone}
        showInstallHint={showInstallHint}
        canInstall={Boolean(installPromptEvent)}
        isIOSInstallHint={isSafariIOS}
        onInstall={triggerInstall}
        onDismissInstall={dismissInstallHint}
        showUpdateHint={showUpdateHint}
        onUpdate={applyUpdate}
        onDismissUpdate={dismissUpdateHint}
        offlineReady={offlineReady}
        onDismissOffline={() => setOfflineReady(false)}
      />

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800/40 rounded-3xl p-2 shadow-2xl z-50">
        <ul className="flex justify-around items-center">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Início" />
          <NavItem active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target />} label="Metas" />
          <div className="relative -top-6">
            <button onClick={() => setActiveTab('invest')} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
              <PlusCircle className="w-7 h-7" />
            </button>
          </div>
          <NavItem active={activeTab === 'allocation'} onClick={() => setActiveTab('allocation')} icon={<PieChart />} label="Config" />
          <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Award />} label="Rank" />
        </ul>
      </nav>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }) {
  return (
    <li onClick={onClick} className={`flex flex-col items-center gap-1 cursor-pointer transition-colors p-2 px-4 rounded-xl ${active ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}>
      {React.cloneElement(icon, { size: 20 })}
      <span className="text-[10px] font-medium uppercase tracking-tighter">{label}</span>
    </li>
  );
}

type PwaNudgesProps = {
  disabled?: boolean;
  showInstallHint: boolean;
  canInstall: boolean;
  isIOSInstallHint: boolean;
  onInstall: () => void;
  onDismissInstall: () => void;
  showUpdateHint: boolean;
  onUpdate: () => void;
  onDismissUpdate: () => void;
  offlineReady: boolean;
  onDismissOffline: () => void;
};

function PwaNudges({
  disabled,
  showInstallHint,
  canInstall,
  isIOSInstallHint,
  onInstall,
  onDismissInstall,
  showUpdateHint,
  onUpdate,
  onDismissUpdate,
  offlineReady,
  onDismissOffline,
}: PwaNudgesProps) {
  if (disabled) return null;
  if (!showInstallHint && !showUpdateHint && !offlineReady) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-28 w-[92%] max-w-md z-[60] space-y-3 pb-[env(safe-area-inset-bottom)]">
      {showUpdateHint && (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <RefreshCw size={18} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-white">Nova versão disponível</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Atualize para receber melhorias, correções e a melhor experiência.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onUpdate}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl text-[11px] uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  Atualizar
                </button>
                <button
                  onClick={onDismissUpdate}
                  className="px-4 py-3 rounded-2xl bg-slate-800/70 border border-slate-700 text-slate-300 text-[11px] font-black uppercase tracking-widest"
                >
                  Depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showUpdateHint && offlineReady && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-white">Modo offline pronto</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Você pode abrir o SaltInvest mesmo sem internet.
              </p>
              <button
                onClick={onDismissOffline}
                className="mt-3 w-full bg-slate-800/70 border border-slate-700 text-slate-200 font-black py-3 rounded-2xl text-[11px] uppercase tracking-widest"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      {!showUpdateHint && showInstallHint && (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-white">Instale o SaltInvest</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {canInstall
                  ? 'Acesso rápido, tela cheia e melhor performance — como um app de verdade.'
                  : isIOSInstallHint
                    ? 'No iPhone/iPad: toque em “Compartilhar” e escolha “Adicionar à Tela de Início”.'
                    : 'Instale para acessar em 1 toque e com experiência imersiva.'}
              </p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={canInstall ? onInstall : onDismissInstall}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl text-[11px] uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  {canInstall ? 'Instalar' : 'Entendi'}
                </button>
                <button
                  onClick={onDismissInstall}
                  className="px-4 py-3 rounded-2xl bg-slate-800/70 border border-slate-700 text-slate-300 text-[11px] font-black uppercase tracking-widest"
                >
                  Agora não
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({ stats, level, total, goals, investments, isPrivate, monthStats, aiInsights, isAiLoading, onRefreshAi, aiError }) {
  const formatVal = (v) => isPrivate ? "••••••" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-emerald-500/20 shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Patrimônio Total</p>
            <h2 className="text-4xl font-black mt-2 tracking-tight text-white">{formatVal(total)}</h2>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-2xl border border-emerald-500/20">
             <Wallet size={24} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/50">
            <p className="text-[9px] uppercase text-slate-500 font-black tracking-widest mb-1">XP Acumulado</p>
            <p className="text-xl font-black text-emerald-400">{isPrivate ? '••••' : stats.xp.toLocaleString()} <span className="text-[10px] font-bold">XP</span></p>
          </div>
          <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/50">
            <p className="text-[9px] uppercase text-slate-500 font-black tracking-widest mb-1">Nível Atual</p>
            <p className="text-xl font-black text-white">Nv. {level.currentLevel}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="py-5 flex items-center justify-between border-slate-800/40 shadow-lg">
          <div>
            <p className="text-[9px] uppercase text-slate-500 font-black tracking-widest">Aporte Mensal</p>
            <p className="text-2xl font-black text-white mt-1">{formatVal(monthStats.current)}</p>
          </div>
          <div className="text-right">
             <div className={`flex items-center gap-1 font-black text-xs ${monthStats.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {monthStats.trend >= 0 ? <ArrowUp size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(Math.round(monthStats.trend))}%
             </div>
             <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">evolução</p>
          </div>
        </Card>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4 ml-1">
          <h3 className="font-black text-[11px] uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
             <Sparkles size={14} className="text-emerald-500" /> Smart AI Insights
          </h3>
          <button 
            onClick={onRefreshAi} 
            disabled={isAiLoading}
            className={`p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-500 hover:bg-slate-800 transition-all ${isAiLoading ? 'animate-spin opacity-50' : ''}`}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {aiError && (
          <div className="p-4 mb-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold">
            {aiError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isAiLoading ? (
            <div className="col-span-full text-center p-12 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
              <RefreshCw className="animate-spin text-emerald-500 mx-auto mb-3" size={24} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">A processar a sua carteira...</p>
            </div>
          ) : aiInsights.length > 0 ? aiInsights.map((insight, idx) => (
            <div key={idx} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 animate-in fade-in slide-in-from-right-2 duration-500 shadow-sm group hover:border-emerald-500/20 transition-all">
              <p className="text-[9px] font-black uppercase mb-1.5 text-emerald-400 tracking-widest">{insight.type || 'Insight'}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{insight.text}</p>
            </div>
          )) : (
            <div className="col-span-full text-center p-6 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-slate-600 text-[10px] uppercase font-bold tracking-widest">
              Nenhuma recomendação gerada.
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-black text-[11px] uppercase text-slate-500 tracking-[0.2em] mb-4 flex justify-between items-center ml-1">
          <span>Próximas Metas</span>
          <Target size={14} className="text-slate-600" />
        </h3>
        <div className="space-y-3">
	          {goals.length > 0 ? goals
	            .slice()
	            .sort((a, b) => {
	              const ta = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
	              const tb = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
	              return ta - tb;
	            })
	            .slice(0, 3)
	            .map(goal => {
            const current = investments.reduce((sum, inv) => sum + Number(inv.distributions?.[goal.id] || 0), 0);
            const prog = Math.min(100, (current / goal.target) * 100);
            return (
              <div key={goal.id} className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/40 group hover:border-emerald-500/20 transition-all shadow-md">
                <div className="flex justify-between mb-3 items-center">
                  <span className="text-sm font-bold text-slate-200">{goal.title}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black ${prog >= 100 ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {Math.round(prog)}%
                    </span>
                    <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                      <Calendar size={12} /> {goal.due_date ? new Date(goal.due_date).toLocaleDateString() : 'Sem prazo'}
                    </div>
                  </div>
                </div>
                <ProgressBar progress={prog} color={prog >= 100 ? "bg-emerald-500" : "bg-blue-500"} />
              </div>
            );
	          }) : <div className="text-center p-10 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl text-slate-500 text-[10px] uppercase font-bold tracking-widest">Sem metas ativas.</div>}
        </div>
      </section>
    </div>
  );
}

function GoalsView({ goals, investments, onAdd, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const [form, setForm] = useState({ title: '', target: '', due_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const filteredGoals = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return goals.filter((g) => {
      const matchSearch = (g.title || '').toLowerCase().includes(q);

      // Filtro de Data (vencimento)
      if (dateStart || dateEnd) {
        if (!g.due_date) return false;
        const gDate = new Date(g.due_date);
        if (dateStart && gDate < new Date(dateStart)) return false;
        if (dateEnd && gDate > new Date(dateEnd)) return false;
      }

      return matchSearch;
    });
  }, [goals, searchTerm, dateStart, dateEnd]);

  const clearFilters = () => {
    setSearchTerm('');
    setDateStart('');
    setDateEnd('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title: form.title,
      target: Number(form.target || 0),
      due_date: form.due_date || null,
    };

    try {
      if (editingId) {
        const { error: e1 } = await onUpdate(editingId, payload);
        if (e1) throw e1;
      } else {
        const { error: e2 } = await onAdd(payload);
        if (e2) throw e2;
      }
      setEditingId(null);
      setShowAdd(false);
      setForm({ title: '', target: '', due_date: '' });
    } catch (err) {
      setError(err?.message || 'Erro ao salvar meta.');
    } finally {
      setLoading(false);
    }
  };

  const showFilterPanel = showFilters || !!searchTerm || !!dateStart || !!dateEnd;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Metas</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl border transition-all ${
              showFilterPanel
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                : 'bg-slate-900/40 border-slate-800 text-slate-500'
            }`}
            title="Filtros"
            type="button"
          >
            <SlidersHorizontal size={20} />
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-emerald-500 text-slate-950 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/10"
            type="button"
          >
            Nova Meta
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      {showFilterPanel && (
        <Card className="border-slate-800/40 bg-slate-900/20 space-y-4 animate-in slide-in-from-top-2">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors"
              size={16}
            />
            <input
              type="text"
              placeholder="Pesquisar meta pelo nome..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 pl-11 outline-none focus:border-emerald-500/40 text-xs text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                Vencimento Após
              </p>
              <input
                type="date"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-300 outline-none"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                Vencimento Antes
              </p>
              <input
                type="date"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-300 outline-none"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={clearFilters}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
            type="button"
          >
            <Eraser size={14} /> Limpar Filtros
          </button>
        </Card>
      )}

      {/* Form */}
      {(showAdd || editingId) && (
        <Card className="border-emerald-500/30 animate-in zoom-in-95">
          {error && (
            <div className="p-4 mb-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">
                Título
              </label>
              <input
                type="text"
                placeholder="Ex: Reserva de emergência"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 outline-none text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">
                  Alvo (R$)
                </label>
                <input
                  type="number"
                  placeholder="0,00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 outline-none text-sm"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">
                  Vencimento
                </label>
                <input
                  type="date"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 outline-none text-sm text-slate-400"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-500 text-slate-950 font-black p-4 rounded-2xl text-xs uppercase tracking-widest disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setShowAdd(false);
                  setForm({ title: '', target: '', due_date: '' });
                }}
                className="bg-slate-800 p-4 rounded-2xl"
              >
                <X size={20} />
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista */}
      <div className="grid gap-4">
        {filteredGoals.length > 0 ? (
          filteredGoals.map((goal) => {
            const current = investments.reduce(
              (sum, inv) => sum + Number(inv.distributions?.[goal.id] || 0),
              0
            );
            const prog = goal.target ? (current / Number(goal.target)) * 100 : 0;

            return (
              <Card key={goal.id} className="relative group border-slate-800/40">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">{goal.title}</h3>
                      {goal.due_date && (
                        <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 bg-slate-800/50 px-2 py-0.5 rounded-md">
                          <Calendar size={10} />{' '}
                          {new Date(goal.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-medium">
                      R$ {current.toLocaleString('pt-BR')} de R${' '}
                      {Number(goal.target || 0).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(goal.id);
                        setShowAdd(false);
                        setForm({
                          title: goal.title || '',
                          target: String(goal.target ?? ''),
                          due_date: goal.due_date || '',
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-2.5 bg-slate-800 rounded-xl"
                      type="button"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(goal.id)}
                      className="p-2.5 bg-slate-800 rounded-xl hover:text-red-500"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <ProgressBar
                  progress={prog}
                  color={prog >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}
                />
              </Card>
            );
          })
        ) : (
          <div className="text-center p-12 bg-slate-900/10 border border-dashed border-slate-800 rounded-[2rem] text-slate-600 text-xs font-bold uppercase tracking-widest">
            {showFilterPanel ? 'Nenhuma meta encontrada no período' : 'Crie sua primeira meta.'}
          </div>
        )}
      </div>
    </div>
  );
}

function InvestView({ onAdd, onUpdate, onDelete, goals, institutions, assetClasses, investments, isPrivate }) {
  const [form, setForm] = useState({ asset: '', amount: '', category: '', institution: '', liquidity: '', asset_due_date: '', fgc_covered: false, distributions: {} });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterInstitution, setFilterInstitution] = useState('Todas');
  const [showFgcDetail, setShowFgcDetail] = useState(false);
  
  const FGC_LIMIT = 250000;
  const liquidityOptions = ['Diária', 'D+1', 'D+2', 'D+3', 'D+30', 'D+60', 'D+90', 'No Vencimento'];

  const fgcByInstitution = useMemo(() => {
    const instMap = {};
    investments.forEach(inv => {
      if (inv.fgc_covered) {
        const instName = inv.institution || 'Instituição Não Informada';
        instMap[instName] = (instMap[instName] || 0) + Number(inv.amount);
      }
    });

	    return Object.entries(instMap)
	      .map(([name, total]) => {
	        const t = Number(total) || 0;
	        return {
	          name,
	          total: t,
	          covered: Math.min(t, FGC_LIMIT),
	          atRisk: Math.max(0, t - FGC_LIMIT),
	          perc: (t / FGC_LIMIT) * 100
	        };
	      })
	      .sort((a, b) => b.total - a.total);
  }, [investments]);

  const fgcAnalysis = useMemo(() => {
    const totalCovered = fgcByInstitution.reduce((acc, inst) => acc + inst.covered, 0);
    const totalInvested = investments.reduce((acc, inv) => acc + Number(inv.amount), 0);
    const totalInFgcAssets = fgcByInstitution.reduce((acc, inst) => acc + inst.total, 0);
    const totalExceeding = fgcByInstitution.reduce((acc, inst) => acc + inst.atRisk, 0);
    const totalMarketRisk = totalInvested - totalInFgcAssets;

    return {
      covered: totalCovered,
      exceeding: totalExceeding,
      marketRisk: totalMarketRisk,
      perc: totalInvested > 0 ? (totalCovered / totalInvested) * 100 : 0
    };
  }, [fgcByInstitution, investments]);

  const filteredInvestments = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return investments.filter((inv) => {
      const asset = (inv.asset || '').toLowerCase();
      const inst = (inv.institution || '').toLowerCase();

      const matchSearch = !q || asset.includes(q) || inst.includes(q);
      const matchCategory = filterCategory === 'Todas' || (inv.category || '') === filterCategory;
      const matchInstitution = filterInstitution === 'Todas' || (inv.institution || '') === filterInstitution;

      return matchSearch && matchCategory && matchInstitution;
    });
  }, [investments, searchTerm, filterCategory, filterInstitution]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('Todas');
    setFilterInstitution('Todas');
  };


  const handleConfirm = async () => {
    if (!form.asset || !form.amount) return;
    setLoading(true);
    setError(null);

    const cleanData = {
      ...form,
      amount: Number(form.amount),
      asset_due_date: (form.liquidity !== 'No Vencimento' || form.asset_due_date === "") ? null : form.asset_due_date,
      distributions: Object.fromEntries(
        Object.entries(form.distributions).map(([key, val]) => [key, val === "" ? 0 : Number(val)])
      )
    };

    const result = editingId ? await onUpdate(editingId, cleanData) : await onAdd(cleanData);
    
    if (result.error) {
      setError(result.error.message || "Erro ao guardar aporte.");
    } else {
      setForm({ asset: '', amount: '', category: '', institution: '', liquidity: '', asset_due_date: '', fgc_covered: false, distributions: {} });
      setEditingId(null);
    }
    setLoading(false);
  };

  const handleStartEdit = (inv) => {
    setEditingId(inv.id);
    setForm({
      asset: inv.asset,
      amount: inv.amount,
      category: inv.category,
      institution: inv.institution || '',
      liquidity: inv.liquidity || '',
      asset_due_date: inv.asset_due_date || '',
      fgc_covered: inv.fgc_covered || false,
      distributions: inv.distributions || {}
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatVal = (v) => isPrivate ? "••••" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const showFilterPanel = showFilters || !!searchTerm || filterCategory !== 'Todas' || filterInstitution !== 'Todas';

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      
      <Card className="bg-gradient-to-br from-slate-900 to-indigo-950/20 border-indigo-500/20 relative overflow-hidden">
         <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400">
                  <ShieldCheck size={24} />
               </div>
               <div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-300">Garantia FGC</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Limite de R$ 250k por Banco</p>
               </div>
            </div>
            <button 
              onClick={() => setShowFgcDetail(!showFgcDetail)}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-all"
            >
              {showFgcDetail ? 'Ocultar Detalhes' : 'Ver por Banco'}
              <Layers size={14} />
            </button>
         </div>

         <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-slate-950/30 p-3 rounded-2xl border border-slate-800/50">
               <p className="text-[8px] font-black uppercase text-emerald-500/80 mb-1">Real Seguro</p>
               <p className="text-xs font-black text-white">{formatVal(fgcAnalysis.covered)}</p>
            </div>
            <div className="bg-slate-950/30 p-3 rounded-2xl border border-slate-800/50">
               <p className="text-[8px] font-black uppercase text-amber-500/80 mb-1">Acima do Teto</p>
               <p className="text-xs font-black text-white">{formatVal(fgcAnalysis.exceeding)}</p>
            </div>
            <div className="bg-slate-950/30 p-3 rounded-2xl border border-slate-800/50">
               <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Risco Mercado</p>
               <p className="text-xs font-black text-white">{formatVal(fgcAnalysis.marketRisk)}</p>
            </div>
         </div>

         {showFgcDetail && (
           <div className="space-y-4 mb-6 animate-in slide-in-from-top-4 duration-500">
             <div className="border-t border-slate-800 pt-4">
                <p className="text-[9px] font-black uppercase text-slate-500 mb-4 tracking-widest text-center">Concentração de Crédito</p>
                {fgcByInstitution.length > 0 ? fgcByInstitution.map(inst => (
                   <div key={inst.name} className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                         <span className="text-slate-300 truncate max-w-[150px]">{inst.name}</span>
                         <span className={inst.total > FGC_LIMIT ? 'text-red-400' : 'text-slate-400'}>
                            {formatVal(inst.total)} / {formatVal(FGC_LIMIT)}
                         </span>
                      </div>
                      <ProgressBar 
                        progress={inst.perc} 
                        color={inst.total > FGC_LIMIT ? "bg-red-500" : inst.total > FGC_LIMIT * 0.8 ? "bg-amber-500" : "bg-indigo-500"} 
                        size="h-1.5"
                      />
                      {inst.total > FGC_LIMIT && (
                        <p className="text-[8px] font-black text-red-500 flex items-center gap-1 uppercase">
                           <AlertTriangle size={10} /> {formatVal(inst.atRisk)} sem cobertura nesta instituição
                        </p>
                      )}
                   </div>
                )) : (
                  <p className="text-[10px] text-slate-600 text-center italic">Nenhum ativo com FGC registrado.</p>
                )}
             </div>
           </div>
         )}

         <ProgressBar progress={fgcAnalysis.perc} color="bg-indigo-500" size="h-2" />
      </Card>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black">{editingId ? 'Editar Aporte' : 'Novo Aporte'}</h2>
          {editingId && (
            <button 
              onClick={() => { setEditingId(null); setForm({ asset: '', amount: '', category: '', institution: '', liquidity: '', asset_due_date: '', fgc_covered: false, distributions: {} }); }}
              className="text-xs font-black uppercase text-slate-500 hover:text-white flex items-center gap-1"
            >
              <X size={14} /> Cancelar Edição
            </button>
          )}
        </div>
        <Card className={editingId ? 'border-amber-500/40' : ''}>
          <div className="space-y-5">
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Ativo</label>
                <input type="text" placeholder="Ex: CDB PAN" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 uppercase outline-none focus:border-emerald-500 text-sm text-white" value={form.asset} onChange={e => setForm({...form, asset: e.target.value})} disabled={loading} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Instituição</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-400 outline-none text-sm" value={form.institution} onChange={e => setForm({...form, institution: e.target.value})} disabled={loading}>
                    <option value="">SELECIONE</option>
                    {institutions.map(inst => <option key={inst.id} value={inst.name}>{inst.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor (R$)</label>
                <input type="number" placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 outline-none text-sm text-white" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} disabled={loading} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Liquidez</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-400 outline-none text-sm" value={form.liquidity} onChange={e => setForm({...form, liquidity: e.target.value})} disabled={loading}>
                    <option value="">SELECIONE</option>
                    {liquidityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-4">
               {form.liquidity === 'No Vencimento' && (
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Vencimento</label>
                    <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-400 outline-none text-sm" value={form.asset_due_date} onChange={e => setForm({...form, asset_due_date: e.target.value})} disabled={loading} />
                  </div>
               )}
               <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Garantia FGC</label>
                  <button 
                    type="button"
                    onClick={() => setForm({...form, fgc_covered: !form.fgc_covered})}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${form.fgc_covered ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-600'}`}
                  >
                     <span className="text-xs font-bold uppercase tracking-widest">{form.fgc_covered ? 'Coberto' : 'Não Coberto'}</span>
                     {form.fgc_covered ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                  </button>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {assetClasses.map(cat => (
                  <button key={cat.id} type="button" disabled={loading} onClick={() => setForm({...form, category: cat.name})} className={`px-4 py-2 rounded-xl text-[11px] font-black border transition-all uppercase ${form.category === cat.name ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>{cat.name}</button>
                ))}
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800/60">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Alocar Metas</p>
              <div className="space-y-3 max-h-52 overflow-y-auto pr-2">
                {goals.map(goal => (
                  <div key={goal.id} className={`p-4 rounded-2xl border ${form.distributions[goal.id] !== undefined ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-slate-950/40 border-slate-800'}`}>
                    <div className="flex justify-between items-center">
                      <button type="button" disabled={loading} onClick={() => { const d = {...form.distributions}; d[goal.id] !== undefined ? delete d[goal.id] : d[goal.id] = ''; setForm({...form, distributions: d}); }} className="text-xs font-bold flex items-center gap-3 text-left">
                        <div className={`w-4 h-4 rounded-lg border flex-shrink-0 ${form.distributions[goal.id] !== undefined ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'}`} />
                        {goal.title}
                      </button>
                      {form.distributions[goal.id] !== undefined && (
                        <input type="number" disabled={loading} className="w-28 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-right text-white" placeholder="R$" value={form.distributions[goal.id]} onChange={(e) => setForm({...form, distributions: {...form.distributions, [goal.id]: e.target.value}})} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button 
              disabled={loading || !form.asset || !form.amount} 
              onClick={handleConfirm} 
              className={`w-full font-black p-4 rounded-2xl shadow-xl disabled:opacity-30 uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${editingId ? 'bg-amber-500 text-slate-950 shadow-amber-500/10' : 'bg-emerald-500 text-slate-950 shadow-emerald-500/10'}`}
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : (editingId ? 'Confirmar Edição' : 'Confirmar Aporte')}
            </button>
          </div>
        </Card>
      </section>

      <section>
                <div className="flex items-center justify-between gap-4 mb-6 px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800/50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
              <History size={20} />
            </div>
            <h2 className="text-2xl font-black">Histórico</h2>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl border transition-all ${
              showFilterPanel
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                : 'bg-slate-900/40 border-slate-800 text-slate-500'
            }`}
            title="Filtros"
            type="button"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {showFilterPanel && (
          <Card className="border-slate-800/40 bg-slate-900/20 space-y-4 animate-in slide-in-from-top-2 mb-6">
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Pesquisar por ativo ou banco..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 pl-11 outline-none focus:border-emerald-500/40 text-xs text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                Categorias
              </p>
              <div className="flex flex-wrap gap-2">
                {['Todas', ...assetClasses.map((c) => c.name)].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all uppercase ${
                      filterCategory === cat
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                    type="button"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  Instituição
                </p>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-300 outline-none uppercase font-bold"
                  value={filterInstitution}
                  onChange={(e) => setFilterInstitution(e.target.value)}
                >
                  <option value="Todas">TODAS</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.name}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={clearFilters}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 h-[46px]"
                type="button"
              >
                <Eraser size={14} /> Limpar
              </button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Listando {filteredInvestments.length} aportes
            </p>
          </div>
          {filteredInvestments.length > 0 ? filteredInvestments.map(inv => (
            <div key={inv.id} className={`bg-slate-900/30 border p-5 rounded-[2rem] hover:border-emerald-500/20 transition-all group shadow-sm overflow-hidden relative ${editingId === inv.id ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800/40'}`}>
              
              {inv.fgc_covered && (
                <div className="absolute -top-1 -right-1 p-3 bg-indigo-500/10 rounded-bl-[2rem] text-indigo-400 shadow-[inset_0_0_15px_rgba(99,102,241,0.1)]">
                   <ShieldCheck size={18} className="animate-pulse" />
                </div>
              )}

              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4">
                   <div className="w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center text-emerald-500 border border-slate-700/50">
                      <Layers size={22} />
                   </div>
                   <div>
                      <h4 className="font-black text-slate-100 uppercase tracking-tight text-sm">{inv.asset}</h4>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-800/40 px-2 py-0.5 rounded-md border border-slate-700/30">{inv.institution}</span>
                         <span className="text-[10px] font-bold text-emerald-500/80 uppercase">{inv.category}</span>
                      </div>
                   </div>
                </div>
                <div className="text-right flex flex-col items-end">
                   <p className="font-black text-white text-base tracking-tighter">{formatVal(inv.amount)}</p>
                   <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleStartEdit(inv)}
                      className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(inv.id, inv.amount)}
                      className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                   </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-800/40 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                 <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-slate-600" />
                    <span>Aporte: {new Date(inv.date || inv.created_at).toLocaleDateString()}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    {inv.fgc_covered && (
                       <div className="flex items-center gap-1 text-indigo-400/80">
                          <Shield size={12} />
                          <span>FGC OK</span>
                       </div>
                    )}
                    {inv.liquidity && (
                       <div className="flex items-center gap-1">
                          <Zap size={12} className="text-yellow-500/60" />
                          <span>{inv.liquidity}</span>
                       </div>
                    )}
                 </div>
              </div>
            </div>
          )) : (
            <div className="text-center p-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-[3rem]">
               <div className="w-16 h-16 bg-slate-800/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                  <TrendingUp className="text-slate-700" size={24} />
               </div>
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Nenhum investimento encontrado</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsView({ allocation, saveAlloc, institutions, onAddInst, onDeleteInst, assetClasses, onAddClass, onDeleteClass }) {
  const [localAlloc, setLocalAlloc] = useState<Record<string, number>>((allocation as Record<string, number>) || {});
  const [newInst, setNewInst] = useState('');
  const [newClass, setNewClass] = useState('');
  const [loading, setLoading] = useState({ inst: false, cls: false, alloc: false });
  const [error, setError] = useState({ inst: null, cls: null, alloc: null });

  useEffect(() => {
    if (Object.keys(allocation).length > 0) setLocalAlloc(allocation);
    else setLocalAlloc(Object.fromEntries(assetClasses.map((cat: any) => [cat.name, 0])) as Record<string, number>);
  }, [allocation, assetClasses]);

  const total = Object.values(localAlloc).reduce<number>((a, b) => a + Number(b), 0);

  const handleAddInst = async () => {
    if (!newInst) return;
    setLoading(prev => ({...prev, inst: true}));
    const { error } = await onAddInst(newInst);
    if (!error) setNewInst('');
    setError(prev => ({...prev, inst: error ? error.message : null}));
    setLoading(prev => ({...prev, inst: false}));
  };

  const handleAddClass = async () => {
    if (!newClass) return;
    setLoading(prev => ({...prev, cls: true}));
    const { error } = await onAddClass(newClass);
    if (!error) setNewClass('');
    setError(prev => ({...prev, cls: error ? error.message : null}));
    setLoading(prev => ({...prev, cls: false}));
  };

  const handleAllocSave = async () => {
    setLoading(prev => ({...prev, alloc: true}));
    const { error } = await saveAlloc(localAlloc);
    setError(prev => ({...prev, alloc: error ? error.message : null}));
    setLoading(prev => ({...prev, alloc: false}));
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-10">
      <section>
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><PieIcon className="text-emerald-500" /> Estratégia Ideal</h2>
        <Card>
          <div className="space-y-8">
            {error.alloc && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold tracking-wider">{error.alloc}</div>}
            {assetClasses.map(cat => (
              <div key={cat.id} className="space-y-3">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                  <span>{cat.name}</span>
                  <span className="text-emerald-400">{localAlloc[cat.name] || 0}%</span>
                </div>
                <input type="range" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" value={localAlloc[cat.name] || 0} onChange={e => setLocalAlloc({...localAlloc, [cat.name]: Number(e.target.value)})} />
              </div>
            ))}
            <div className={`p-5 rounded-3xl border text-center font-black tracking-[0.2em] text-xs ${total === 100 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
              TOTAL: {total}%
            </div>
            <button onClick={handleAllocSave} disabled={loading.alloc || total !== 100} className="w-full bg-emerald-500 text-slate-950 font-black p-4 rounded-2xl disabled:opacity-30 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              {loading.alloc ? <RefreshCw className="animate-spin" size={16} /> : 'Atualizar Estratégia'}
            </button>
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-black mb-4 uppercase text-slate-500 tracking-widest">Classes</h2>
          <Card>
            <div className="flex gap-2 mb-6">
              <input type="text" placeholder="Ex: Cripto" className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs outline-none" value={newClass} onChange={e => setNewClass(e.target.value)} disabled={loading.cls} />
              <button onClick={handleAddClass} disabled={loading.cls || !newClass} className="bg-emerald-500 text-slate-950 p-3 rounded-2xl disabled:opacity-50">
                {loading.cls ? <RefreshCw className="animate-spin" size={18} /> : <PlusCircle size={18} />}
              </button>
            </div>
            {error.cls && <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold tracking-wider">{error.cls}</div>}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {assetClasses.map(cls => (
                <div key={cls.id} className="flex justify-between items-center bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 group">
                  <span className="text-xs font-bold text-slate-300">{cls.name}</span>
                  <button onClick={() => onDeleteClass(cls.id)} className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div>
          <h2 className="text-lg font-black mb-4 uppercase text-slate-500 tracking-widest">Instituições</h2>
          <Card>
            <div className="flex gap-2 mb-6">
              <input type="text" placeholder="Ex: NuInvest" className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs outline-none" value={newInst} onChange={e => setNewInst(e.target.value)} disabled={loading.inst} />
              <button onClick={handleAddInst} disabled={loading.inst || !newInst} className="bg-emerald-500 text-slate-950 p-3 rounded-2xl disabled:opacity-50">
                {loading.inst ? <RefreshCw className="animate-spin" size={18} /> : <PlusCircle size={18} />}
              </button>
            </div>
            {error.inst && <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold tracking-wider">{error.inst}</div>}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {institutions.map(inst => (
                <div key={inst.id} className="flex justify-between items-center bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 group">
                  <span className="text-xs font-bold text-slate-300">{inst.name}</span>
                  <button onClick={() => onDeleteInst(inst.id)} className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ stats, level, patrimony, user, onLogout }) { 
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Header do Perfil */}
      <div className="flex flex-col items-center text-center p-10 bg-gradient-to-br from-slate-900 to-slate-950 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="w-28 h-28 bg-slate-800/50 rounded-[2rem] flex items-center justify-center border-4 border-emerald-500/20 mb-6 relative">
          <Trophy className="text-yellow-500 w-14 h-14" />
          <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-slate-950 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border-4 border-slate-950">
             {level.currentLevel}
          </div>
        </div>
        <h2 className="text-3xl font-black text-white">{level.title}</h2>
        <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.3em] font-black">Patente SaltInvest</p>
        <div className="w-full mt-10">
           <ProgressBar progress={level.progress} color="bg-gradient-to-r from-emerald-500 to-teal-500" size="h-3" />
           <p className="text-[10px] text-slate-500 text-right mt-2 font-bold italic">Progressão: {Math.round(level.progress)}%</p>
        </div>
      </div>

      {/* Manual de Evolução (Restaurado) */}
      <Card className="border-emerald-500/10 bg-emerald-500/5">
        <div className="flex items-center gap-3 mb-4">
           <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <BookOpen size={20} />
           </div>
           <h3 className="font-black text-xs uppercase tracking-widest text-emerald-400">Manual de Evolução</h3>
        </div>
        <div className="space-y-4">
           <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 font-black text-xs">1</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                 <span className="font-black text-white uppercase">Ganho de XP:</span> Cada R$ 10,00 investidos geram automaticamente <strong>1 XP</strong> para sua conta. Investir regularmente é a única forma de subir no rank.
              </p>
           </div>
           <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 font-black text-xs">2</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                 <span className="font-black text-white uppercase">Níveis:</span> Cada <strong>1.000 XP</strong> você sobe um nível. Novos níveis desbloqueiam patentes mais prestigiosas.
              </p>
           </div>
           <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 font-black text-xs">3</div>
              <div className="space-y-2">
                 <p className="text-[11px] text-slate-300 font-black uppercase text-white">Hierarquia de Patentes:</p>
                 <div className="grid grid-cols-1 gap-1.5">
                    <div className="flex items-center gap-2 text-[10px] bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                       <Shield size={12} className="text-slate-500" /> <span className="text-slate-500">Nv. 01-09:</span> <strong>Iniciante</strong>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                       <Zap size={12} className="text-blue-400" /> <span className="text-slate-500">Nv. 10-24:</span> <strong>Investidor Focado</strong>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                       <Milestone size={12} className="text-purple-400" /> <span className="text-slate-500">Nv. 25-49:</span> <strong>Estrategista Pleno</strong>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                       <Star size={12} className="text-yellow-500" /> <span className="text-slate-500">Nv. 50-99:</span> <strong>Mestre dos Ativos</strong>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                       <Crown size={12} className="text-emerald-500" /> <span className="text-emerald-500">Nv. 100+:</span> <strong>Magnata SaltInvest</strong>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </Card>

      {/* Status da Conta */}
      <Card className="text-center py-5 border-slate-800/40">
         <p className="text-[9px] uppercase text-slate-500 font-black mb-2 tracking-widest">Utilizador Conectado</p>
         <p className="text-[11px] font-black text-slate-200 truncate px-2">{user?.email || 'MODO ANÓNIMO'}</p>
      </Card>

      {/* Logout */}
      <div className="pt-4">
        {!showLogoutConfirm ? (
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-3 p-5 rounded-[1.5rem] bg-slate-900/40 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-400/20 transition-all font-black text-[11px] uppercase tracking-[0.2em]"><LogOut size={18} />Encerrar Sessão</button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[1.5rem] p-6 animate-in zoom-in-95 text-center">
            <p className="text-sm font-bold text-red-400 mb-6">Deseja realmente sair?</p>
            <div className="flex gap-4">
              <button onClick={onLogout} className="flex-1 bg-red-500 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Sair</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-slate-800 text-slate-300 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
