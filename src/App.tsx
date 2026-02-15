import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  PieChart, 
  PlusCircle, 
  TrendingUp, 
  Award, 
  Rocket,
  Gem,
  Mountain,
  Sprout,
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
  MinusCircle,
  Lock, 
  ArrowRight, 
  ChevronLeft, 
  ChevronDown,
  ChevronUp,
  History, 
  ShieldAlert, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  Milestone,
  SlidersHorizontal,
  Bell
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from './lib/supabase';

// --- Instância Global do Supabase ---
const supabaseClient = supabase;

// --- Componentes de Utilidade ---
type CardProps = React.PropsWithChildren<{ className?: string }>;
const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`card-nocopy bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-xl ${className}`}>
    {children}
  </div>
);

// --- Máscara / parsing de moeda (pt-BR) ---
const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Formata um valor (em reais) para BRL garantindo arredondamento em 2 casas.
// Evita glitches de ponto flutuante (ex.: 166.666666666 -> "R$ 166,67").
function formatBRLFromNumber(value: unknown): string {
  const num = typeof value === 'number'
    ? value
    : Number(String(value ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.'));

  if (!Number.isFinite(num)) return brlFormatter.format(0);
  const rounded = Math.round(num * 100) / 100;
  return brlFormatter.format(rounded);
}

function parseBRL(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const s = String(value).trim();
  if (!s) return 0;

  // Suporta entrada pt-BR (1.234,56) e também entrada com ponto decimal (1500.43)
  // Heurística:
  // - Se houver "," e ".", o ÚLTIMO separador é o decimal.
  // - Se houver só um tipo de separador, ele é decimal apenas se houver 1-2 dígitos depois dele
  //   (ou se estiver no final, durante digitação). Caso contrário, tratamos como separador de milhar.
  let cleaned = s
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/[^0-9,\.\-]/g, '');

  if (!cleaned) return 0;

  const isNegative = cleaned.includes('-');
  cleaned = cleaned.replace(/-/g, '');

  // ✅ Regra "digits-as-cents" (máscara monetária clássica):
  // Se vier apenas números (ex: "150043"), interpretamos como centavos => 1500.43.
  // Isso garante que digitar "150043" resulte em "1.500,43" no padrão pt-BR.
  if (/^\d+$/.test(cleaned)) {
    const n = Number(cleaned) / 100;
    if (!Number.isFinite(n)) return 0;
    return isNegative ? -n : n;
  }

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;

  const countAfter = (idx: number) => Math.max(0, cleaned.length - idx - 1);

  let decIdx = -1;
  if (hasComma && hasDot) {
    decIdx = Math.max(lastComma, lastDot);
  } else if (hasComma) {
    const after = countAfter(lastComma);
    if (after === 0 || after <= 2) decIdx = lastComma;
  } else if (hasDot) {
    const after = countAfter(lastDot);
    if (after === 0 || after <= 2) decIdx = lastDot;
  }

  let intPart = cleaned;
  let decPart = '';
  if (decIdx >= 0) {
    intPart = cleaned.slice(0, decIdx);
    decPart = cleaned.slice(decIdx + 1);
  }

  intPart = intPart.replace(/[\.,]/g, '');
  decPart = decPart.replace(/[\.,]/g, '').slice(0, 2);

  const numStr = `${intPart || '0'}${decIdx >= 0 ? `.${decPart.padEnd(2, '0')}` : ''}`;
  const n = Number(numStr);
  if (!Number.isFinite(n)) return 0;
  return isNegative ? -n : n;
}

// Normaliza o JSONB `investments.distributions` vindo do Supabase.
// Motivo: os valores podem vir como number, string com ponto ("155.56"),
// ou string pt-BR ("155,56" / "R$ 155,56").
// Também pode vir como JSON serializado (string), dependendo de como foi persistido.
function normalizeDistributions(raw: unknown): Record<string, number> {
  if (!raw) return {};

  let obj: any = raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return {};
    try {
      obj = JSON.parse(s);
    } catch {
      // Não é JSON; não dá pra normalizar com segurança
      return {};
    }
  }

  if (typeof obj !== 'object' || Array.isArray(obj)) return {};

  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    const gid = String(k);
    const num = parseBRL(v);
    if (num > 0) out[gid] = (out[gid] || 0) + num;
  }
  return out;
}

// Converte chaves de distribuição para goal_id quando dados legados foram salvos usando o título da meta.
// Ex.: {"IPVA": 150} => {"<uuid-da-meta>": 150}
// Mantém as chaves já válidas (uuid) e também tolera variações de caixa/acentos/espaços.
function remapDistributionsToGoalIds(dist: Record<string, number>, goals: any[]): Record<string, number> {
  if (!dist || Object.keys(dist).length === 0) return {};

  const byId = new Set((goals || []).map((g: any) => String(g?.id)).filter(Boolean));
  const normalizeKey = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const titleToId = new Map<string, string>();
  for (const g of goals || []) {
    const t = normalizeKey(String(g?.title || ''));
    if (t) titleToId.set(t, String(g.id));
  }

  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(dist)) {
    const key = String(k);
    const num = Number(v) || 0;
    if (num <= 0) continue;

    // Caso 1: já é um goal_id válido
    if (byId.has(key)) {
      out[key] = (out[key] || 0) + num;
      continue;
    }

    // Caso 2: dado legado: chave era o título
    const mapped = titleToId.get(normalizeKey(key));
    if (mapped) {
      out[mapped] = (out[mapped] || 0) + num;
      continue;
    }

    // Caso 3: chave desconhecida — mantém para não perder dados, mas isolado
    out[key] = (out[key] || 0) + num;
  }

  return out;
}

function maskBRL(input: string): string {
  // Máscara pt-BR "digits-as-cents":
  // - Digitar "150043" => "R$ 1.500,43"
  // - Funciona também com colar "1.500,43" ou "1500.43" (pegamos só os dígitos)
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const n = Number(digits) / 100;
  if (!Number.isFinite(n)) return '';
  return brlFormatter.format(n);
}

function formatBRLInputValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  // IMPORTANT:
  // - Para valores NUMÉRICOS vindos do banco (ex.: 2400), NÃO podemos usar parseBRL em cima do
  //   `String(2400)` porque o parseBRL tem a regra "digits-as-cents" ("2400" => 24,00).
  //   Isso quebrava edição/reatribuição de valores e causava a redução (R$ 2.400,00 -> R$ 24,00).
  if (typeof value === 'number') {
    return formatBRLFromNumber(value);
  }

  const s = String(value);
  if (!s.trim()) return '';
  return brlFormatter.format(parseBRL(s));
}

// Converte "YYYY-MM-DD" (date do Postgres/Supabase) para Date LOCAL (evita shift por timezone).
// Sem isso, `new Date('2026-03-01')` é interpretado como UTC e pode virar o dia anterior em -03,
// gerando meses incorretos nas sugestões.
function parseDateLocal(dateStr: string): Date {
  const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(dateStr || '');
  if (!m) return new Date(dateStr);
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  return new Date(year, month, day);
}

// Formata uma data (YYYY-MM-DD) sem sofrer shift de timezone.
function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = parseDateLocal(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

// Sugestão mensal (mesma regra usada no Plano do Mês e no pré-preenchimento ao vincular metas)
function calcSuggestedMonthly(remaining: number, dueDate?: string | null): number | null {
  if (!Number.isFinite(remaining) || remaining <= 0) return 0;
  if (!dueDate) return null;
  const now = new Date();
  const due = parseDateLocal(dueDate);
  // Se já venceu, sugerimos aportar tudo (ou zero se já atingiu)
  if (Number.isNaN(due.getTime())) return null;
  if (due < new Date(new Date().toDateString())) return remaining;

  // Meses até o vencimento (inclusivo do mês atual), com ajuste por dia do mês
  const months =
    (due.getFullYear() - now.getFullYear()) * 12 +
    (due.getMonth() - now.getMonth()) +
    (due.getDate() >= now.getDate() ? 1 : 0);
  const m = Math.max(1, months);
  return remaining / m;
}

type ProgressBarProps = { progress: number; color?: string; size?: string };
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, color = "bg-emerald-500", size = "h-2" }) => (
  <div className={`w-full bg-slate-800/50 rounded-full ${size} overflow-hidden border border-slate-700/30`}>
    <div 
      className={`h-full ${color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.2)]`} 
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);



// --- Confirmação (Modal Premium) ---
type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />

      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900/70 border border-red-500/20 rounded-[2rem] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-white leading-tight">{title}</h3>
                {description && (
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{description}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!loading) onCancel();
              }}
              className="p-2 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                if (!loading) onCancel();
              }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 bg-red-500 hover:bg-red-400 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Processando
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
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
        // Após criar conta, redireciona para login (UX: fluxo fechado e claro)
        setMode('login');
        setPassword('');
        setShowPassword(false);
        setMessage({ text: 'Conta criada! Verifique seu e-mail para confirmar e faça login.', type: 'success' });
      } else if (mode === 'recovery') {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
        // Após solicitar recuperação, volta para login (UX)
        setMode('login');
        setPassword('');
        setShowPassword(false);
        setMessage({ text: 'E-mail de recuperação enviado! Verifique sua caixa de entrada e depois faça login.', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-nocopy flex items-center justify-center p-6 bg-slate-950 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent">
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
      <div className="min-h-screen app-nocopy bg-slate-950 text-slate-100 flex items-center justify-center p-6">
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
  // Progresso consolidado das metas (preferencialmente via view v_goal_progress)
  const [goalProgress, setGoalProgress] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState([]);
  const [assetClasses, setAssetClasses] = useState([]);
  const [allocation, setAllocation] = useState<Record<string, number>>({});
  const [userStats, setUserStats] = useState({ xp: 0, level: 1 });
  const [aiInsights, setAiInsights] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  // Garante que o auto-trigger rode apenas uma vez por sessão (além do controle diário via localStorage)
  const [aiAutoTriggered, setAiAutoTriggered] = useState(false);

  // --- PWA: instalação + atualização ---
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [showUpdateHint, setShowUpdateHint] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateRemindTimerRef = useRef<number | null>(null);
  // --- Guard: sessão obrigatória (protege navegação e operações) ---
  const redirectToLogin = () => {
    setActiveTab('dashboard');
    setUser(null);
  };

  const getSessionOrRedirect = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        redirectToLogin();
        return null;
      }
      // Evita UI "stale" quando a sessão expira e o state ainda tem um user antigo
      if (!user || (user as any).id !== session.user.id) {
        setUser(session.user as any);
      }
      return session;
    } catch (e) {
      redirectToLogin();
      return null;
    }
  };

  const navigateTo = async (tab: string) => {
    const session = await getSessionOrRedirect();
    if (!session) return;
    setActiveTab(tab);
  };


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
          setUser(session.user as any);
        } else {
          // Sem sessão -> exige login
          setUser(null);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user as any);
      } else {
        redirectToLogin();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabaseReady]);

  const computeGoalProgressFallback = (gList: any[], invList: any[]) => {
    const invByGoal: Record<string, number> = {};
    for (const inv of invList || []) {
      const dist = normalizeDistributions(inv?.distributions);
      for (const [goalId, val] of Object.entries(dist)) {
        invByGoal[String(goalId)] = (invByGoal[String(goalId)] || 0) + (Number(val) || 0);
      }
    }

    const today = new Date();
    const result = (gList || []).map((g) => {
      const invested_amount = invByGoal[String(g.id)] || 0;
      const target = Number(g.target || 0);
      const progress_percent = target > 0 ? (invested_amount / target) * 100 : 0;
      const remaining_amount = Math.max(0, target - invested_amount);
      const due = g.due_date ? parseDateLocal(g.due_date) : null;
      const status = target > 0 && invested_amount >= target
        ? 'Concluída'
        : (due && due < new Date(today.toDateString()) ? 'Atrasada' : 'Ativa');
      return {
        user_id: g.user_id,
        goal_id: g.id,
        title: g.title,
        target,
        due_date: g.due_date,
        created_at: g.created_at,
        invested_amount,
        remaining_amount,
        progress_percent,
        status,
      };
    });

    return result;
  };


  // Revalida a sessão ao voltar para o app ou trocar o foco (evita operar sem JWT)
  useEffect(() => {
    if (!supabaseReady) return;
    const check = () => { void getSessionOrRedirect(); };
    const onFocus = () => check();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [supabaseReady]);

  // --- Sincronização de Dados ---
  const fetchData = async () => {
    const session = await getSessionOrRedirect();
    if (!session) return;
    const uid = session.user.id;

    try {
        const [
          { data: gData }, 
          { data: iData }, 
          { data: instData }, 
          { data: cData }, 
          { data: config },
          { data: insightsData }
        ] = await Promise.all([
          supabaseClient.from('goals').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
          supabaseClient.from('investments').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
          supabaseClient.from('institutions').select('*').eq('user_id', uid),
          supabaseClient.from('asset_classes').select('*').eq('user_id', uid),
          supabaseClient.from('user_config').select('*').eq('user_id', uid).maybeSingle(),
          supabaseClient.from('ai_insights').select('*').eq('user_id', uid).order('created_at', { ascending: false })
        ]);

        const goalsArr = gData || [];
        const investmentsArr = (iData || []).map((inv: any) => {
          // Normaliza + remapeia distribuições (compatível com dados legados por título)
          const normalized = normalizeDistributions(inv?.distributions);
          const remapped = remapDistributionsToGoalIds(normalized, goalsArr);
          return { ...inv, distributions: remapped };
        });

        setGoals(goalsArr);
        setInvestments(investmentsArr);
        setInstitutions(instData || []);
        setAssetClasses(cData || []);
        
        if (config) {
          // Normaliza e poda o allocation para evitar chaves órfãs quando classes são removidas.
          const validNames = new Set((cData || []).map((c: any) => String(c?.name || '')).filter(Boolean));
          const rawAlloc = (config.allocation as Record<string, unknown>) || {};
          const normalizedAlloc = Object.fromEntries(
            Object.entries(rawAlloc).map(([k, v]) => [k, Number(v) || 0])
          ) as Record<string, number>;

          const prunedAlloc = Object.fromEntries(
            Object.entries(normalizedAlloc).filter(([k]) => validNames.size === 0 ? false : validNames.has(k))
          ) as Record<string, number>;

          const hasAnyClass = validNames.size > 0;
          const hasAnyAlloc = Object.keys(prunedAlloc).length > 0;

          // Regra: se allocation ficar nulo/vazio, removemos o registro do user_config.
          if (!hasAnyAlloc) {
            if (!hasAnyClass) {
              // Não há classes — garante que o user_config não permaneça com allocation órfão.
              await supabaseClient.from('user_config').delete().eq('user_id', uid);
              setAllocation({});
              setUserStats({ xp: 0, level: 1 });
            } else {
              // Há classes, mas allocation vazio (ainda não configurado).
              setAllocation({});
              setUserStats({ xp: config.xp || 0, level: config.level || 1 });
            }
          } else {
            // Se houve poda (existiam chaves inválidas), persiste a versão limpa.
            const before = JSON.stringify(normalizedAlloc);
            const after = JSON.stringify(prunedAlloc);
            if (before !== after) {
              await supabaseClient.from('user_config').update({ allocation: prunedAlloc }).eq('user_id', uid);
            }
            setAllocation(prunedAlloc);
            setUserStats({ xp: config.xp || 0, level: config.level || 1 });
          }
        } else {
          // Sem config — mantém estado coerente.
          setAllocation({});
          setUserStats({ xp: 0, level: 1 });
        }

        if (insightsData && insightsData.length > 0) {
          setAiInsights(insightsData);
        } else {
          setAiInsights([{ type: 'Info', text: 'Os insights serão gerados automaticamente uma vez por dia no seu primeiro acesso.' }]);
        }

        // Progresso de metas (via view) - com fallback local para ambientes sem a view.
        try {
          const { data: pg, error: pgErr } = await supabaseClient
            .from('v_goal_progress')
            .select('*')
            .eq('user_id', uid)
            .order('due_date', { ascending: true, nullsFirst: false });

          if (pgErr) throw pgErr;
          setGoalProgress(pg || []);
        } catch {
          setGoalProgress(computeGoalProgressFallback(gData || [], iData || []));
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
    if (isAiLoading) return;
    const session = await getSessionOrRedirect();
    if (!session) return;
    const uid = session.user.id;
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
            .eq('user_id', uid);
          if (delError) throw delError;

          const rows = content.insights.map(i => ({ ...i, user_id: uid }));
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

  // Gera insights automaticamente 1x por dia (preferencialmente no primeiro acesso do dia).
  // Estratégia: localStorage por usuário (simples, offline-friendly, evita duplicidade entre abas quando o valor já foi setado).
  const getLocalISODate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    if (!user || !supabaseReady || !supabaseClient) return;
    if (loading) return;
    if (aiAutoTriggered) return;

    const uid = (user as any).id;
    const key = `saltinvest_ai_last_run_${uid}`;
    const today = getLocalISODate();
    const last = localStorage.getItem(key);

    // Já executou hoje
    if (last === today) {
      setAiAutoTriggered(true);
      return;
    }

    // Marca já na largada para evitar múltiplos triggers no mesmo dia (mesmo que haja erro).
    localStorage.setItem(key, today);
    setAiAutoTriggered(true);
    void generateAIInsights();
  }, [user, supabaseReady, loading, aiAutoTriggered]);

  // --- Handlers ---
  const handleAddGoal = async (goalData: any) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient.from('goals').insert([{ ...goalData, include_in_plan: (goalData?.include_in_plan ?? true), user_id: uid }]);
    if (error) return { error };
    await fetchData();
    return { error: null };
  };

  const handleUpdateGoal = async (goalId: string, goalData: any) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient.from('goals').update(goalData).eq('id', goalId).eq('user_id', uid);
    if (error) return { error };
    await fetchData();
    return { error: null };
  };


  const handleSetGoalInPlan = async (goalId: string, include: boolean) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient
      .from('goals')
      .update({ include_in_plan: include })
      .eq('id', goalId)
      .eq('user_id', uid);

    if (error) return { error };
    await fetchData();
    return { error: null };
  };

  const handleDeleteGoal = async (goalId: string) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient.from('goals').delete().eq('id', goalId).eq('user_id', uid);
    if (error) return { error };
    await fetchData();
    return { error: null };
  };

  const handleAddInvestment = async (investmentData: any) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    // 1) Insere o investimento e captura o id (precisamos dele para gravar as alocações)
    const { data: inserted, error } = await supabaseClient
      .from('investments')
      .insert([{ ...investmentData, user_id: uid }])
      .select('id')
      .single();
    if (error) return { error };

    // 2) Grava a tabela associativa investment_allocations a partir do JSONB distributions
    //    (mantemos distributions no investments por retrocompatibilidade / leitura rápida)
    const invId = (inserted as any)?.id as string | undefined;
    const dist = (investmentData?.distributions && typeof investmentData.distributions === 'object')
      ? investmentData.distributions
      : {};
    if (invId) {
      const rows = Object.entries(dist)
        .map(([goalId, v]: any) => ({
          user_id: uid,
          investment_id: invId,
          goal_id: goalId,
          amount: Number(v) || 0,
        }))
        .filter((r) => !!r.goal_id && (Number(r.amount) || 0) > 0);

      if (rows.length > 0) {
        const { error: allocErr } = await supabaseClient
          .from('investment_allocations')
          .insert(rows);
        if (allocErr) return { error: allocErr };
      }
    }

    const amount = Number(investmentData.amount) || 0;
    const nxp = userStats.xp + Math.floor(amount / 10);
    await supabaseClient.from('user_config').upsert({ user_id: uid, xp: nxp });

    await fetchData();
    return { error: null };
  };

  const handleUpdateInvestment = async (investmentId: string, investmentData: any) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient.from('investments').update(investmentData).eq('id', investmentId).eq('user_id', uid);
    if (error) return { error };

    // Atualiza allocations: remove as antigas e insere as novas (idempotente)
    // Obs.: a FK com ON DELETE CASCADE já cobre o delete do investimento,
    // mas no update precisamos sincronizar as alocações.
    const { error: delAllocErr } = await supabaseClient
      .from('investment_allocations')
      .delete()
      .eq('investment_id', investmentId)
      .eq('user_id', uid);
    if (delAllocErr) return { error: delAllocErr };

    const dist = (investmentData?.distributions && typeof investmentData.distributions === 'object')
      ? investmentData.distributions
      : {};
    const rows = Object.entries(dist)
      .map(([goalId, v]: any) => ({
        user_id: uid,
        investment_id: investmentId,
        goal_id: goalId,
        amount: Number(v) || 0,
      }))
      .filter((r) => !!r.goal_id && (Number(r.amount) || 0) > 0);
    if (rows.length > 0) {
      const { error: allocErr } = await supabaseClient
        .from('investment_allocations')
        .insert(rows);
      if (allocErr) return { error: allocErr };
    }
    await fetchData();
    return { error: null };
  };

  const handleDeleteInvestment = async (investmentId: string, amount: number) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient.from('investments').delete().eq('id', investmentId).eq('user_id', uid);
    if (error) return { error };

    const nxp = Math.max(0, userStats.xp - Math.floor((Number(amount) || 0) / 10));
    await supabaseClient.from('user_config').upsert({ user_id: uid, xp: nxp });

    await fetchData();
    return { error: null };
  };

  const handleSaveAllocation = async (allocationData: any) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient.from('user_config').upsert({ user_id: uid, allocation: allocationData });
    if (error) return { error };
    await fetchData();
    return { error: null };
  };

  const handleAddInstitution = async (name: string) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient.from('institutions').insert([{ name, user_id: uid }]);
    if (error) return { error };
    await fetchData();
    return { error: null };
  };

  const handleDeleteInstitution = async (id: string) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient.from('institutions').delete().eq('id', id).eq('user_id', uid);
    if (error) return { error };
    await fetchData();
    return { error: null };
  };

  const handleAddAssetClass = async (name: string) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    const { error } = await supabaseClient.from('asset_classes').insert([{ name, user_id: uid }]);
    if (error) return { error };
    await fetchData();
    return { error: null };
  };

  const handleDeleteAssetClass = async (id: string, className: string) => {
    const session = await getSessionOrRedirect();
    if (!session) return { error: { message: 'Sessão expirada. Faça login novamente.' } };
    const uid = session.user.id;

    // Remove a classe
    const { error } = await supabaseClient.from('asset_classes').delete().eq('id', id).eq('user_id', uid);
    if (error) return { error };

    // Remove também do allocation (user_config)
    const { data: conf } = await supabaseClient
      .from('user_config')
      .select('allocation')
      .eq('user_id', uid)
      .maybeSingle();

    const currentAllocation = (conf as any)?.allocation || {};
    if (currentAllocation && typeof currentAllocation === 'object') {
      const nextAllocation: Record<string, any> = { ...currentAllocation };
      delete nextAllocation[className];

      const hasAnyKey = Object.keys(nextAllocation).length > 0;
      if (!hasAnyKey) {
        // se allocation ficou vazia (ou nula), remove o registro do user_config
        await supabaseClient.from('user_config').delete().eq('user_id', uid);
      } else {
        await supabaseClient.from('user_config').upsert({ user_id: uid, allocation: nextAllocation });
      }
    }

    await fetchData();
    return { error: null };
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

  // XP (mantido como gamificação): 1 XP a cada R$ 10,00 investidos.
  // Usamos isso para feedback rápido, mas o Rank (Evolução) é baseado no Patrimônio total.
  const xpLevelData = useMemo(() => {
    const xpPerLevel = 1000;
    const currentLevel = Math.floor(userStats.xp / xpPerLevel) + 1;
    const progress = ((userStats.xp % xpPerLevel) / xpPerLevel) * 100;
    return { currentLevel, progress, nextLevelXp: xpPerLevel - (userStats.xp % xpPerLevel) };
  }, [userStats.xp]);

  // Rank (Evolução) por Patrimônio: faixas de 100 em 100 mil até 1 milhão.
  const rankData = useMemo(() => {
    const step = 100_000;
    const p = Number(totalPatrimony) || 0;
    const tiers = [
      { min: 0, max: 99_999, title: 'Sementeiro', icon: Sprout, accent: 'text-emerald-400', hint: 'Começo consciente' },
      { min: 100_000, max: 199_999, title: 'Pioneiro', icon: Rocket, accent: 'text-blue-400', hint: 'Primeiro salto' },
      { min: 200_000, max: 299_999, title: 'Construtor', icon: Layers, accent: 'text-slate-300', hint: 'Base sólida' },
      { min: 300_000, max: 399_999, title: 'Estrategista', icon: Target, accent: 'text-purple-400', hint: 'Plano em ação' },
      { min: 400_000, max: 499_999, title: 'Alpinista', icon: Mountain, accent: 'text-amber-400', hint: 'Subindo com foco' },
      { min: 500_000, max: 599_999, title: 'Visionário', icon: TrendingUp, accent: 'text-emerald-400', hint: 'Crescimento consistente' },
      { min: 600_000, max: 699_999, title: 'Guardião', icon: ShieldCheck, accent: 'text-cyan-400', hint: 'Protege e diversifica' },
      { min: 700_000, max: 799_999, title: 'Mestre de Carteira', icon: Star, accent: 'text-yellow-400', hint: 'Equilíbrio e disciplina' },
      { min: 800_000, max: 899_999, title: 'Lenda', icon: Trophy, accent: 'text-yellow-500', hint: 'Performance acima da média' },
      { min: 900_000, max: 999_999, title: 'Pré-Milhão', icon: Gem, accent: 'text-pink-400', hint: 'Última milha' },
      { min: 1_000_000, max: Number.POSITIVE_INFINITY, title: 'Ícone do Milhão', icon: Crown, accent: 'text-emerald-500', hint: 'Marco histórico' },
    ];

    const idx = Math.max(0, Math.min(tiers.length - 1, Math.floor(p / step)));
    const tier = tiers[idx];
    const start = tier.min;
    const end = tier.max === Number.POSITIVE_INFINITY ? Math.max(start + step, p) : tier.max;
    const denom = Math.max(1, end - start);
    const progress = tier.max === Number.POSITIVE_INFINITY ? 100 : ((p - start) / denom) * 100;
    const nextTarget = tier.max === Number.POSITIVE_INFINITY ? null : tier.max + 1;
    return {
      currentLevel: idx + 1,
      title: tier.title,
      hint: tier.hint,
      accent: tier.accent,
      Icon: tier.icon,
      progress: Math.max(0, Math.min(100, progress)),
      rangeLabel: tier.max === Number.POSITIVE_INFINITY ? 'R$ 1.000.000+' : `${formatBRLFromNumber(tier.min)} — ${formatBRLFromNumber(tier.max)}`,
      nextTarget,
    };
  }, [totalPatrimony]);

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
    <div className="min-h-screen app-nocopy bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
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
            <div className="bg-slate-800/50 p-2 rounded-full border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => void navigateTo('profile')}>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-32">
        {activeTab === 'dashboard' && (
          <DashboardView 
            stats={userStats} level={rankData} xpLevel={xpLevelData} total={totalPatrimony} 
            goals={goals} investments={investments} 
            goalProgress={goalProgress}
            isPrivate={isPrivate} monthStats={monthlyStats}
            aiInsights={aiInsights}
            isAiLoading={isAiLoading}
            onRefreshAi={generateAIInsights}
            aiError={aiError}
            onSetGoalInPlan={handleSetGoalInPlan}
          />
        )}
        {activeTab === 'goals' && (
          <GoalsView 
            goals={goals} investments={investments} goalProgress={goalProgress}
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
            goals={goals}
            goalProgress={goalProgress}
            institutions={institutions}
            assetClasses={assetClasses}
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
          <ProfileView stats={userStats} level={rankData} xpLevel={xpLevelData} patrimony={totalPatrimony} user={user} onLogout={handleLogout} />
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
          <NavItem active={activeTab === 'dashboard'} onClick={() => void navigateTo('dashboard')} icon={<LayoutDashboard />} label="Início" />
          <NavItem active={activeTab === 'goals'} onClick={() => void navigateTo('goals')} icon={<Target />} label="Metas" />
          <div className="relative -top-6">
            <button onClick={() => void navigateTo('invest')} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
              <PlusCircle className="w-7 h-7" />
            </button>
          </div>
          <NavItem active={activeTab === 'allocation'} onClick={() => void navigateTo('allocation')} icon={<PieChart />} label="Config" />
          <NavItem active={activeTab === 'profile'} onClick={() => void navigateTo('profile')} icon={<Award />} label="Evolução" />
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

function DashboardView({ stats, level, xpLevel, total, goals, investments, goalProgress, isPrivate, monthStats, aiInsights, isAiLoading, onRefreshAi, aiError, onSetGoalInPlan }) {
  const formatVal = (v) => isPrivate ? "••••••" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Colapsáveis por padrão (reduz ruído e aumenta foco no essencial)
  const [monthPlanOpen, setMonthPlanOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  // UX: removidos toggles "Ver todas/Ver menos" na Home para manter leitura direta e consistente.


  const goalMetaById = useMemo(() => {
    const m = new Map<string, any>();
    (goals || []).forEach((g: any) => m.set(String(g.id), g));
    return m;
  }, [goals]);

  const goalsData = useMemo(() => {
    const list = Array.isArray(goalProgress) && goalProgress.length ? goalProgress : [];
    // Normaliza campos (para o caso do fallback local)
    return list
      .map((g) => ({
        ...g,
        // IMPORTANT:
        // A view `v_goal_progress` retorna o identificador como `goal_id` (UUID).
        // Já no fallback local usamos `id`.
        // Para evitar mismatch em toda a aplicação (Plano do Mês, ordenações, etc.),
        // padronizamos `id` sempre como o UUID da meta.
        id: (g as any).goal_id ?? (g as any).id,
        include_in_plan: (goalMetaById.get(String((g as any).goal_id ?? (g as any).id))?.include_in_plan ?? (g as any).include_in_plan ?? true),
        target: Number(g.target || 0),
        invested_amount: Number((g as any).invested_amount ?? (g as any).invested_total ?? 0),
        progress_percent: Number((g as any).progress_percent ?? 0),
        remaining_amount: Number((g as any).remaining_amount ?? Math.max(0, Number(g.target || 0) - Number((g as any).invested_amount ?? 0))),
      }))
      .sort((a, b) => {
        const ta = a.due_date ? parseDateLocal(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.due_date ? parseDateLocal(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        if (ta !== tb) return ta - tb;
        return (b.progress_percent || 0) - (a.progress_percent || 0);
      });
  }, [goalProgress]);

  const activeGoals = useMemo(() => goalsData.filter((g) => (g.status || '').toLowerCase() !== 'concluída' && (g.status || '').toLowerCase() !== 'concluida'), [goalsData]);
  // Priorização usada na Home: metas com vencimento mais próximo primeiro; em empate, maior valor faltante.
  const activeGoalsSorted = useMemo(() => {
    return [...activeGoals].sort((a: any, b: any) => {
      const ta = a.due_date ? parseDateLocal(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.due_date ? parseDateLocal(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      const ra = Number(a.remaining_amount ?? 0);
      const rb = Number(b.remaining_amount ?? 0);
      return rb - ra;
    });
  }, [activeGoals]);
  const completedGoals = useMemo(() => goalsData.filter((g) => (g.status || '').toLowerCase().startsWith('conclu')), [goalsData]);

  const suggestedMonthly = (remaining: number, dueDate?: string | null) => calcSuggestedMonthly(remaining, dueDate);

  // Plano do mês (UX): planejamento ANUAL, distribuindo aportes por meta para cumprir no prazo.
  // Regras:
  // - Considera TODAS as metas ativas marcadas como "no planejamento mensal" (include_in_plan=true)
  // - Metas sem vencimento (ou fora do planejamento) ficam na seção "Fora do plano"
  // - Para cada meta: sugestão = valor restante / meses até o vencimento (mínimo 1)
  const monthPlan = useMemo(() => {
    const included = activeGoalsSorted
      .filter((g: any) => (Number(g.remaining_amount) || 0) > 0)
      .filter((g: any) => Boolean(g.include_in_plan))
      .filter((g: any) => Boolean(g.due_date))
      .map((g: any) => {
        const remaining = Number(g.remaining_amount) || 0;
        const required = Number((g as any).required_per_month);
        const sm = Number.isFinite(required) && required > 0 ? required : suggestedMonthly(remaining, g.due_date);
        const monthly = sm != null ? sm : remaining / 12;
        return {
          id: g.id,
          title: g.title,
          due_date: g.due_date,
          remaining,
          monthly,
        };
      })
      .sort((a: any, b: any) => {
        const ta = a.due_date ? parseDateLocal(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.due_date ? parseDateLocal(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        if (ta !== tb) return ta - tb;
        return b.remaining - a.remaining;
      });

    const excluded = activeGoalsSorted
      .filter((g: any) => (Number(g.remaining_amount) || 0) > 0)
      .filter((g: any) => !g.include_in_plan || !g.due_date)
      .map((g: any) => ({
        id: g.id,
        title: g.title,
        due_date: g.due_date,
        include_in_plan: Boolean(g.include_in_plan),
      }))
      .sort((a: any, b: any) => {
        const ta = a.due_date ? parseDateLocal(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.due_date ? parseDateLocal(b.due_date).getTime() : Number.POSITIVE_INFINITY;
        if (ta !== tb) return ta - tb;
        return a.title.localeCompare(b.title);
      });

    const totalSuggested = included.reduce((acc: number, it: any) => acc + (Number(it.monthly) || 0), 0);
    return { items: included, excluded, total: totalSuggested };
  }, [activeGoalsSorted]);
  // Cores determinísticas por meta (consistência visual) com contraste maior entre si.
  // Usamos um par (from/to) para criar um gradiente premium e ajudar a diferenciar barras.
  const goalColor = (goalId: string) => {
    const palette = [
      { from: '#22c55e', to: '#10b981' }, // green
      { from: '#60a5fa', to: '#3b82f6' }, // blue
      { from: '#a78bfa', to: '#8b5cf6' }, // violet
      { from: '#fbbf24', to: '#f59e0b' }, // amber
      { from: '#fb7185', to: '#ec4899' }, // rose
      { from: '#f87171', to: '#ef4444' }, // red
      { from: '#2dd4bf', to: '#06b6d4' }, // teal/cyan
      { from: '#c084fc', to: '#a855f7' }, // purple
    ];
    let h = 0;
    for (let i = 0; i < goalId.length; i++) h = (h * 31 + goalId.charCodeAt(i)) >>> 0;
    const c = palette[h % palette.length];
    return {
      ...c,
      solid: c.from,
      gradient: `linear-gradient(90deg, ${c.from} 0%, ${c.to} 100%)`,
    };
  };

  const monthPlanColored = useMemo(() => {
    const enriched = (monthPlan.items || []).map((it: any) => {
      const monthlyNum = parseBRL(it.monthly);
      const id = it.id ?? it.goal_id;
      const c = goalColor(String(id));
      return { ...it, id, monthlyNum, color: c.solid, gradient: c.gradient };
    });

    const ordered = [...enriched].sort((a, b) => (b.monthlyNum || 0) - (a.monthlyNum || 0));
    const total = ordered.reduce((s, it) => s + (it.monthlyNum || 0), 0);

    const items = ordered.map((it: any) => ({
      ...it,
      pct: total > 0 ? ((it.monthlyNum || 0) / total) * 100 : 0,
    }));

    const segments = items.map((it: any) => ({
      id: it.id,
      title: it.title,
      color: it.color,
      gradient: it.gradient,
      pct: it.pct,
    }));

    return { ...monthPlan, total, items, segments };
  }, [monthPlan]);

  // Distribuição REAL do mês (aportes -> metas) para mostrar ao usuário quanto foi para cada meta
  // e se atingiu o objetivo sugerido para aquele mês.
  const monthPlanActuals = useMemo(() => {
    const now = new Date();
    const nowMonth = now.getMonth();
    const nowYear = now.getFullYear();

    const isInCurrentMonth = (inv: any) => {
      const raw = inv?.date || inv?.created_at;
      if (!raw) return false;
      // 'date' costuma ser YYYY-MM-DD; evitar UTC shift
      const d = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? parseDateLocal(raw)
        : new Date(raw);
      return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
    };

    const monthInvestments = (investments || []).filter(isInCurrentMonth);

    // Total distribuído para metas (soma das distribuições em todos os aportes do mês)
    const totalDistributedAllGoals = monthInvestments.reduce((sum: number, inv: any) => {
      const dist = normalizeDistributions(inv?.distributions);
      const s = Object.values(dist).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
      return sum + s;
    }, 0);

    // Mapa goalId -> total distribuído no mês
    const byGoal: Record<string, number> = {};
    for (const inv of monthInvestments) {
      const dist = normalizeDistributions(inv?.distributions);
      for (const [gid, val] of Object.entries(dist)) {
        byGoal[String(gid)] = (byGoal[String(gid)] || 0) + (Number(val) || 0);
      }
    }

    // Para o Plano do Mês, calculamos status atingido/faltante e também um "sugerido efetivo".
    // Regra UX: se a meta já atingiu o objetivo do mês corrente, o sugerido do mês deve aparecer zerado
    // (será recalculado no próximo mês).
    const planItems = (monthPlanColored?.items || []).map((it: any) => {
      const gid = String(it?.id);
      const suggestedBase = Number(it?.monthlyNum ?? parseBRL(it?.monthly)) || 0;
      const distributed = Number(byGoal[gid] || 0);
      const achieved = suggestedBase <= 0 ? false : distributed + 0.0001 >= suggestedBase;
      const missing = Math.max(0, suggestedBase - distributed);
      const suggestedEffective = achieved ? 0 : suggestedBase;
      // do aporte do mês, quanto isso representa
      const pctOfMonthDeposit = (monthStats?.current || 0) > 0 ? (distributed / (monthStats.current || 1)) * 100 : 0;
      return { ...it, suggestedBase, suggestedEffective, distributed, achieved, missing, pctOfMonthDeposit };
    });

    // Total sugerido efetivo do mês (metas já atingidas não entram neste mês)
    const totalSuggestedEffective = planItems.reduce((s: number, it: any) => s + (Number(it?.suggestedEffective) || 0), 0);

    const planDistributedTotal = planItems.reduce((s: number, it: any) => s + (Number(it.distributed) || 0), 0);

    return {
      totalDistributedAllGoals,
      byGoal,
      planItems,
      planDistributedTotal,
      totalSuggestedEffective,
    };
  }, [investments, monthPlanColored, monthStats?.current]);

  // Status do TOTAL sugerido vs. aporte realizado no mês
  // - completo: aportado >= total sugerido
  // - zero: aportado == 0
  // - parcial: 0 < aportado < total sugerido
  const monthPlanSuggestedStatus = useMemo(() => {
    const suggested = Number(monthPlanColored?.total ?? 0);
    const current = Number(monthStats?.current || 0);
    if (suggested <= 0 && current <= 0) return 'zero' as const;
    if (current <= 0) return 'zero' as const;
    if (current + 0.0001 >= suggested) return 'complete' as const;
    return 'partial' as const;
  }, [monthPlanColored?.total, monthStats?.current]);

  // Alertas de vencimento (investimentos com "No Vencimento") - janela padrão: 30 dias
  const upcomingMaturities = useMemo(() => {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 30);

    const list = (investments || [])
      .filter((inv: any) => inv?.asset_due_date)
      .map((inv: any) => {
        const d = parseDateLocal(inv.asset_due_date);
        return { inv, time: d.getTime(), date: d };
      })
      .filter((x: any) => Number.isFinite(x.time) && x.date >= now && x.date <= horizon)
      .sort((a: any, b: any) => a.time - b.time)
      .slice(0, 5)
      .map((x: any) => x.inv);

    return list;
  }, [investments]);

  // Liquidez do patrimônio (visão rápida)
  const liquiditySummary = useMemo(() => {
    const total = (investments || []).reduce((acc: number, inv: any) => acc + (Number(inv.amount) || 0), 0);
    const isDaily = (liq?: string) => {
      const v = String(liq || '').toLowerCase();
      return v.includes('diária') || v.includes('diaria');
    };
    const daily = (investments || []).filter((i: any) => isDaily(i.liquidity)).reduce((acc: number, inv: any) => acc + (Number(inv.amount) || 0), 0);
    const locked = Math.max(0, total - daily);
    return { total, daily, locked };
  }, [investments]);



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
            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1">Nv. XP {xpLevel?.currentLevel ?? 1}</p>
          </div>
          <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/50">
            <p className="text-[9px] uppercase text-slate-500 font-black tracking-widest mb-1">Rank (Patrimônio)</p>
            <p className="text-sm font-black text-white truncate">{level.title}</p>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${level.accent || 'text-slate-400'}`}>Nv. {level.currentLevel} • {level.rangeLabel}</p>
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

      <section className="space-y-4">
        <div className="flex items-center justify-between ml-1">
          <h3 className="font-black text-[11px] uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
            <Target size={14} className="text-blue-500" /> Metas em foco
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            {activeGoalsSorted.length} ativas · {completedGoals.length} concluídas
          </span>
        </div>

        {/* Card de Ação (a meta que mais precisa de atenção) */}
        {activeGoalsSorted.length > 0 ? (() => {
          const g = activeGoalsSorted[0];
          const prog = Math.min(100, Math.max(0, g.progress_percent || 0));
          const remaining = Math.max(0, g.remaining_amount || 0);
          const monthly = suggestedMonthly(remaining, g.due_date);
          return (
            <Card className="border-blue-500/20 bg-gradient-to-br from-slate-900/50 to-blue-500/5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Próxima ação</p>
                  <h4 className="text-base font-black text-white truncate mt-1">{g.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-950/40 border border-slate-800/60 px-2 py-1 rounded-xl">
                      <Calendar size={12} className="inline mr-1" /> {g.due_date ? formatDateBR(g.due_date) : 'Sem prazo'}
                    </span>
                    <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-950/40 border border-slate-800/60 px-2 py-1 rounded-xl">
                      Falta {formatVal(remaining)}
                    </span>
                    {monthly !== null && remaining > 0 && (
                      <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-xl">
                        Sugestão: {formatVal(monthly)}/mês
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 bg-blue-500/10 text-blue-400 p-3 rounded-2xl border border-blue-500/20">
                  <Milestone size={20} />
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Progresso</span>
                <span className="text-[11px] font-black text-blue-400">{Math.round(prog)}%</span>
              </div>
              <ProgressBar progress={prog} color={prog >= 100 ? "bg-emerald-500" : "bg-blue-500"} />
            </Card>
          );
        })() : (
          <div className="text-center p-10 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl text-slate-500 text-[10px] uppercase font-bold tracking-widest">
            Cadastre uma meta para começar o planejamento.
          </div>
        )}

        {/* Plano do mês (recomendação de aportes por meta) */}
        {monthPlanColored.items.length > 0 && (
          <>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/20 border-slate-800/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Wallet size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Liquidez do patrimônio</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Visão rápida: disponível x travado</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/30 border border-slate-800/50 rounded-2xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80">Disponível (Diária)</p>
              <p className="text-sm font-black text-white mt-1">{formatVal(liquiditySummary.daily)}</p>
            </div>
            <div className="bg-slate-950/30 border border-slate-800/50 rounded-2xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/80">Travado</p>
              <p className="text-sm font-black text-white mt-1">{formatVal(liquiditySummary.locked)}</p>
            </div>
          </div>

          <div className="mt-4">
            <ProgressBar
              progress={liquiditySummary.total > 0 ? (liquiditySummary.daily / liquiditySummary.total) * 100 : 0}
              color="bg-emerald-500"
              size="h-2"
            />
            <p className="mt-2 text-[10px] text-slate-600">
              {liquiditySummary.total > 0
                ? `${Math.round((liquiditySummary.daily / liquiditySummary.total) * 100)}% do patrimônio com liquidez diária.`
                : 'Sem investimentos registrados.'}
            </p>
          </div>
        </Card>

        <Card className="bg-slate-900/20 border-slate-800/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-400">
                <Bell size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximos vencimentos</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Investimentos vencendo em até 30 dias</p>
              </div>
            </div>
          </div>

          {upcomingMaturities.length > 0 ? (
            <div className="space-y-2">
              {upcomingMaturities.map((inv: any) => {
                const due = inv.asset_due_date ? parseDateLocal(inv.asset_due_date) : null;
                const today = new Date(new Date().toDateString());
                const daysLeft = due ? Math.ceil((due.getTime() - today.getTime()) / 86400000) : null;

                const badgeClass =
                  daysLeft != null && daysLeft <= 7
                    ? 'bg-red-500/10 border-red-500/20 text-red-300'
                    : daysLeft != null && daysLeft <= 15
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-300';

                const badgeLabel =
                  daysLeft == null ? null : daysLeft <= 0 ? 'Vence hoje' : `${daysLeft}d`;

                return (
                  <div key={inv.id} className="flex items-center justify-between gap-3 bg-slate-950/30 border border-slate-800/50 rounded-2xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-white truncate">{inv.asset}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-500">Vence em {formatDateBR(inv.asset_due_date)}</p>
                        {badgeLabel && (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black text-white">{formatVal(Number(inv.amount || 0))}</p>
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-600 mt-1">
                Dica: verifique a renovação/resgate com antecedência para evitar surpresas.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/30 border border-slate-800/50 text-[10px] text-slate-600">
              Nenhum vencimento nos próximos 30 dias.
            </div>
          )}
        </Card>
      </div>

<Card className="border-emerald-500/10 bg-emerald-500/5">
            <button
              type="button"
              onClick={() => setMonthPlanOpen(v => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <Target size={14} /> Plano do Mês
                </h4>
                {/* removido: etiqueta "colapsável" */}
              
<div
  className={`h-7 w-7 flex items-center justify-center rounded-xl border ${
    (monthStats.current || 0) > 0
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
  }`}
  title={(monthStats.current || 0) > 0 ? 'Aporte do mês realizado' : 'Aporte do mês pendente'}
  aria-label={(monthStats.current || 0) > 0 ? 'Aporte do mês realizado' : 'Aporte do mês pendente'}
>
  {(monthStats.current || 0) > 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
</div>
</div>
              <div className="flex items-center gap-4">
                <div className="text-right">
	                  <div className="flex items-center justify-end gap-2">
	                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total sugerido</p>
	                    <span
	                      className={`inline-flex items-center justify-center rounded-lg border h-6 w-6 ${
	                        monthPlanSuggestedStatus === 'complete'
	                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
	                          : monthPlanSuggestedStatus === 'partial'
	                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
	                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
	                      }`}
	                      title={
	                        monthPlanSuggestedStatus === 'complete'
	                          ? 'Total sugerido do mês: aportado completamente'
	                          : monthPlanSuggestedStatus === 'partial'
	                            ? 'Total sugerido do mês: aportado parcialmente'
	                            : 'Total sugerido do mês: aporte zerado'
	                      }
	                      aria-label={
	                        monthPlanSuggestedStatus === 'complete'
	                          ? 'Total sugerido do mês: aportado completamente'
	                          : monthPlanSuggestedStatus === 'partial'
	                            ? 'Total sugerido do mês: aportado parcialmente'
	                            : 'Total sugerido do mês: aporte zerado'
	                      }
	                    >
	                      {monthPlanSuggestedStatus === 'complete' ? (
	                        <CheckCircle2 size={14} />
	                      ) : monthPlanSuggestedStatus === 'partial' ? (
	                        <AlertTriangle size={14} />
	                      ) : (
	                        <MinusCircle size={14} />
	                      )}
	                    </span>
	                  </div>
	                  {/*
	                    Regra UX (definitiva):
	                    - "Total Sugerido" deve ser SEMPRE a soma da sugestão base (required_per_month) de cada meta do plano.
	                    - Ele não deve variar por metas já atingidas no mês (sugestão exibida pode zerar) nem por aportes/distribuições.
	                  */}
	                  <p className="text-sm font-black text-white">{formatVal(monthPlanColored.total)}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/60 text-slate-400">
                  {monthPlanOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </button>

            {monthPlanOpen && (
              <div className="mt-5 animate-in fade-in slide-in-from-top-2">
                
<div className="mb-5 space-y-3">
  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resumo do mês</p>
  <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-300">
    <span>Você aportou <span className="text-white font-black">{formatVal(monthStats.current || 0)}</span></span>
    <span>•</span>
    <span>Distribuído em metas <span className="text-white font-black">{formatVal(monthPlanActuals.totalDistributedAllGoals || 0)}</span></span>
    {(monthStats.current || 0) > 0 && (monthPlanActuals.totalDistributedAllGoals || 0) < (monthStats.current || 0) ? (
      <>
        <span>•</span>
        <span className="text-amber-400">Não distribuído <span className="text-amber-300 font-black">{formatVal(Math.max(0, (monthStats.current || 0) - (monthPlanActuals.totalDistributedAllGoals || 0)))}</span></span>
      </>
    ) : null}
    {(() => {
      // "Falta para sugerido" deve refletir quanto ainda falta distribuir para cumprir o TOTAL SUGERIDO (base)
      // no mês, e não quanto falta aportar no mês (o usuário pode aportar e não distribuir, ou vice-versa).
      const suggestedBase = monthPlanColored.total || 0;
      const missingToSuggested = Math.max(0, suggestedBase - (monthPlanActuals.totalDistributedAllGoals || 0));
      if (!suggestedBase || missingToSuggested <= 0) return null;
      return (
        <>
          <span>•</span>
          <span className="text-amber-400">Falta para sugerido <span className="text-amber-300 font-black">{formatVal(missingToSuggested)}</span></span>
        </>
      );
    })()}
  </div>

  {(() => {
    const distributedPct = Math.min(
      100,
      Math.max(0, ((monthPlanActuals.totalDistributedAllGoals || 0) / (monthStats.current || 1)) * 100)
    );
    return (
      <div className="w-full h-3 rounded-full overflow-hidden border border-slate-800/60 bg-slate-950/40 flex">
        <div className="h-full bg-emerald-500" style={{ width: `${distributedPct}%` }} />
        <div className="h-full bg-amber-500/70" style={{ width: `${Math.max(0, 100 - distributedPct)}%` }} />
      </div>
    );
  })()}
</div>

<div className="space-y-3">

                                    {(() => {
                    const planItems = Array.isArray(monthPlanActuals.planItems) ? monthPlanActuals.planItems : [];
                    return (
                      <>
                  {planItems.map((it: any) => {
	                    // Percentual correto = participação da sugestão desta meta no Total Sugerido do Mês.
	                    // (Mantemos o cálculo na própria `monthPlanColored.items` para evitar qualquer mismatch de ids.)
                    const pct = typeof it.pct === 'number' ? it.pct : 0;
                    // `suggestedBase`: sugerido calculado do mês (para métricas/percentuais)
                    // `suggestedEffective`: regra UX -> se já atingiu no mês, exibir sugerido 0 (recalcula no próximo mês)
                    const suggestedBase = Number(it.suggestedBase ?? it.suggested ?? it.monthlyNum ?? parseBRL(it.monthly)) || 0;
                    const suggestedEffective = Number(it.suggestedEffective ?? (Boolean(it.achieved) ? 0 : suggestedBase)) || 0;
                    const distributed = Number(it.distributed || 0);
                    const achieved = Boolean(it.achieved);
                    const missing = Number(it.missing || 0);
                    return (
	                      <div key={String(it.id)} className="bg-slate-950/40 border border-slate-800/60 rounded-3xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-black text-white">{it.title}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Sugestão do mês:{' '}
                              <span className="font-black text-emerald-400">{formatVal(suggestedEffective)}</span>
                              {it.due_date ? (
                                <span className="text-slate-600"> • vence em {formatDateBR(it.due_date)}</span>
                              ) : (
                                <span className="text-slate-600"> • sem vencimento</span>
                              )}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-950/40 border border-slate-800/60 px-2 py-1 rounded-xl">
								Distribuído no mês: <span className="text-slate-200">{formatVal(distributed)}</span>
								{suggestedBase > 0 ? (
								  <span className="text-slate-600"> • {Math.min(100, Math.round((distributed / suggestedBase) * 100))}%</span>
                                ) : null}
                              </span>

                              {suggestedBase > 0 && achieved ? (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                                  Objetivo do mês atingido
                                </span>
                              ) : suggestedBase > 0 ? (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-400">
                                  Falta {formatVal(missing)}
                                </span>
                              ) : null}
                            </div>
                          </div>
	                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{pct.toFixed(0)}%</span>
                        </div>
                        {/* Barra: distribuído vs sugerido */}
                        {suggestedBase > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Progresso do mês</span>
	                              <span className={`text-[10px] font-black ${achieved ? 'text-emerald-400' : 'text-amber-400'}`}>{Math.min(100, Math.round((distributed / suggestedBase) * 100))}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden border border-slate-800/60 bg-slate-950/40">
	                              <div className={`h-full ${achieved ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (distributed / suggestedBase) * 100)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                      </>
                    );
                  })()}

                  
                  {Array.isArray((monthPlan as any).excluded) && (monthPlan as any).excluded.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fora do plano</p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                          {(monthPlan as any).excluded.length}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {(monthPlan as any).excluded.slice(0, 6).map((g: any) => (
                          <div key={String(g.id)} className="flex items-center justify-between gap-3 bg-slate-950/30 border border-slate-800/60 rounded-2xl px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-white truncate">{g.title}</p>
                              <p className="text-[10px] text-slate-500">
                                {g.due_date ? `Vence em ${formatDateBR(g.due_date)}` : 'Sem vencimento definido'}
                              </p>
                            </div>

                            {!g.include_in_plan ? (
                              <button
                                type="button"
                                onClick={() => onSetGoalInPlan?.(String(g.id), true)}
                                className="shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15"
                              >
                                Incluir
                              </button>
                            ) : !g.due_date ? (
                              <span className="shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                                Defina vencimento
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSetGoalInPlan?.(String(g.id), false)}
                                className="shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800/60 text-slate-300 hover:bg-slate-900/60"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {(monthPlan as any).excluded.length > 6 && (
                        <p className="mt-3 text-[10px] text-slate-600">
                          + {(monthPlan as any).excluded.length - 6} outras metas fora do plano.
                        </p>
                      )}
                    </div>
                  )}

<p className="text-[10px] text-slate-500 leading-relaxed">
                    Dica: use o total como referência do seu aporte mensal e distribua conforme as metas mais próximas do prazo.
                  </p>
                </div>
              </div>
            )}
          </Card>
          </>
        )}

        {/* Timeline (próximas metas por prazo) */}
        {activeGoalsSorted.length > 0 && (
          <Card className="border-slate-800/40 bg-slate-900/20">
            <button
              type="button"
              onClick={() => setTimelineOpen(v => !v)}
              className="w-full flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <History size={14} className="text-slate-500" />
                <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500">Timeline</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">próximos 6</span>
                {timelineOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
              </div>
            </button>

            {timelineOpen && (
              <div className="space-y-4 mt-5 animate-in slide-in-from-top-1">
              {activeGoalsSorted.slice(0, 6).map((g, idx) => {
                const prog = Math.min(100, Math.max(0, g.progress_percent || 0));
                const remaining = Math.max(0, g.remaining_amount || 0);
                const dueLabel = g.due_date ? formatDateBR(g.due_date) : 'Sem prazo';
                const isOverdue = g.due_date ? parseDateLocal(g.due_date) < new Date(new Date().toDateString()) && prog < 100 : false;
                return (
                  <div key={g.goal_id || g.id || idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border ${isOverdue ? 'bg-red-500/20 border-red-500/40' : 'bg-emerald-500/20 border-emerald-500/30'}`} />
                      {idx < Math.min(5, activeGoalsSorted.length - 1) && <div className="w-px flex-1 bg-slate-800/70 my-1" />}
                    </div>
                    <div className="flex-1 min-w-0 bg-slate-950/30 border border-slate-800/60 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{dueLabel}</p>
                          <p className="text-sm font-black text-white truncate mt-1">{g.title}</p>
                        </div>
                        <span className={`text-[11px] font-black ${isOverdue ? 'text-red-400' : prog >= 100 ? 'text-emerald-400' : 'text-blue-400'}`}>{Math.round(prog)}%</span>
                      </div>
                      <div className="flex items-center justify-between mt-3 mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Falta</span>
                        <span className="text-[10px] font-black text-slate-300">{formatVal(remaining)}</span>
                      </div>
                      <ProgressBar progress={prog} color={isOverdue ? "bg-red-500" : prog >= 100 ? "bg-emerald-500" : "bg-blue-500"} />
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </Card>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 ml-1">
          <h3 className="font-black text-[11px] uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
             <Sparkles size={14} className="text-emerald-500" /> INSIGHTS DO DIA SALTINVEST
          </h3>

          {/* UX: removido "Ver todos/Ver menos" para manter a Home mais limpa no mobile */}
        </div>

        {aiError && (
          <div className="p-4 mb-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold">
            {aiError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isAiLoading ? (
            <div className="col-span-full p-10 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
              <div className="flex items-center justify-center gap-3">
                <RefreshCw className="animate-spin text-emerald-500" size={20} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">A processar a sua carteira...</p>
              </div>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
                <div className="h-20 rounded-2xl bg-slate-950/30 border border-slate-800/50" />
                <div className="h-20 rounded-2xl bg-slate-950/30 border border-slate-800/50" />
              </div>
            </div>
          ) : Array.isArray(aiInsights) && aiInsights.length > 0 ? (
            (() => {
              const sorted = [...aiInsights].sort((a: any, b: any) => {
                const order: Record<string, number> = { 'Alerta': 0, 'Dica': 1, 'Oportunidade': 2 };
                const oa = order[String(a?.type || '')] ?? 9;
                const ob = order[String(b?.type || '')] ?? 9;
                return oa - ob;
              });

              const featured = sorted[0];
              const rest = sorted.slice(1);
              const visible = rest;

              const metaByType = (t: string) => {
                if (t === 'Alerta') return { icon: <AlertTriangle size={18} />, cls: 'text-red-300 bg-red-500/10 border-red-500/20', tag: 'ALERTA' };
                if (t === 'Oportunidade') return { icon: <TrendingUp size={18} />, cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20', tag: 'OPORTUNIDADE' };
                return { icon: <BookOpen size={18} />, cls: 'text-blue-300 bg-blue-500/10 border-blue-500/20', tag: 'DICA' };
              };

              const FeaturedCard = ({ insight }: any) => {
                const t = String(insight?.type || 'Insight');
                const meta = metaByType(t);
                return (
                  <div className="md:col-span-2 bg-slate-900/40 p-5 rounded-3xl border border-slate-800/60 shadow-sm hover:border-emerald-500/20 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${meta.cls}`}>
                          {meta.icon}
                          {meta.tag}
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed mt-3">
                          {insight?.text}
                        </p>
                      </div>
                      <div className="shrink-0 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-slate-300">
                        <Sparkles size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-[10px] text-slate-500">
                      Dica: aplique este insight no próximo aporte para sentir evolução mais rápido.
                    </p>
                  </div>
                );
              };

              const SmallCard = ({ insight }: any) => {
                const t = String(insight?.type || 'Insight');
                const meta = metaByType(t);
                return (
                  <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 animate-in fade-in slide-in-from-right-2 duration-500 shadow-sm group hover:border-emerald-500/20 transition-all">
                    <div className={`inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${meta.cls}`}>
                      {meta.icon}
                      {meta.tag}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-3">{insight?.text}</p>
                  </div>
                );
              };

              return (
                <>
                  <FeaturedCard insight={featured} />
                  {visible.map((insight: any, idx: number) => (
                    <SmallCard key={idx} insight={insight} />
                  ))}
                  {/* UX: exibimos todos os insights restantes para evitar toggle na Home */}
                </>
              );
            })()
          ) : (
            <div className="col-span-full text-center p-6 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-slate-600 text-[10px] uppercase font-bold tracking-widest">
              Nenhuma recomendação gerada.
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

function GoalsView({ goals, investments, goalProgress, onAdd, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  // Filtros
  const [showFilters, setShowFilters] = useState(false);

  const [goalPickSearch, setGoalPickSearch] = useState('');
  const [goalPickFilter, setGoalPickFilter] = useState<'ativas' | 'concluidas' | 'todas'>('ativas');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const [form, setForm] = useState({ title: '', target: '', due_date: '', include_in_plan: true });

  const [statusFilter, setStatusFilter] = useState<'ativas' | 'concluidas' | 'todas'>('ativas');

  const progressById = useMemo(() => {
    const m = new Map<string, any>();
    (goalProgress || []).forEach((gp: any) => m.set(String(gp.goal_id), gp));
    return m;
  }, [goalProgress]);

  const statusCounts = useMemo(() => {
    let active = 0;
    let completed = 0;
    goals.forEach((g: any) => {
      const gp = progressById.get(String(g.id));
      const isCompleted = Boolean(gp?.is_completed);
      if (isCompleted) completed += 1;
      else active += 1;
    });
    return { active, completed, total: goals.length };
  }, [goals, progressById]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState(null as null | { id: string; title: string });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null as string | null);

  const filteredGoals = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return goals.filter((g) => {
      const matchSearch = (g.title || '').toLowerCase().includes(q);

      // Filtro de Data (vencimento)
      if (dateStart || dateEnd) {
        if (!g.due_date) return false;
        const gDate = parseDateLocal(g.due_date);
        if (dateStart && gDate < parseDateLocal(dateStart)) return false;
        if (dateEnd && gDate > parseDateLocal(dateEnd)) return false;
      }

      const gp = progressById.get(String(g.id));
      const isCompleted = Boolean(gp?.is_completed);
      const matchStatus =
        statusFilter === 'todas' ||
        (statusFilter === 'concluidas' ? isCompleted : !isCompleted);

      return matchSearch && matchStatus;
    });
  }, [goals, searchTerm, dateStart, dateEnd, progressById, statusFilter]);

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
      target: parseBRL(form.target),
      due_date: form.due_date || null,
      include_in_plan: Boolean((form as any).include_in_plan),
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
      setForm({ title: '', target: '', due_date: '', include_in_plan: true });
    } catch (err) {
      setError(err?.message || 'Erro ao salvar meta.');
    } finally {
      setLoading(false);
    }
  };

  const showFilterPanel = showFilters || !!searchTerm || !!dateStart || !!dateEnd;

  return (
    <div className="space-y-6 animate-in fade-in">

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Excluir meta"
        description={deleteConfirm ? `Você está prestes a excluir a meta "${deleteConfirm.title}". Esta ação não pode ser desfeita.` : undefined}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={deleteLoading}
        onCancel={() => { if (!deleteLoading) setDeleteConfirm(null); }}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          setDeleteLoading(true);
          setDeleteError(null);
          try {
            const res: any = await onDelete(deleteConfirm.id);
            if (res?.error) {
              setDeleteError(res.error.message || 'Não foi possível excluir a meta.');
            } else {
              setDeleteConfirm(null);
            }
          } catch (e: any) {
            setDeleteError(e?.message || 'Não foi possível excluir a meta.');
          } finally {
            setDeleteLoading(false);
          }
        }}
      />

      {deleteError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-in zoom-in-95">
          {deleteError}
        </div>
      )}

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
            className="bg-emerald-500 text-slate-950 px-5 py-2.5 rounded-2xl text-2xl font-black leading-none shadow-xl shadow-emerald-500/10"
            type="button"
                      aria-label="Nova meta"
            title="Nova meta"
          >
            +
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
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 outline-none text-sm"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: maskBRL(e.target.value) })}
                    onBlur={(e) => setForm({ ...form, target: formatBRLInputValue(e.target.value) })}
                    onFocus={(e) => e.currentTarget.select()}
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

            <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plano Mes</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, include_in_plan: !(form as any).include_in_plan })}
                className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  (form as any).include_in_plan
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-900/30 border-slate-800 text-slate-400'
                }`}
              >
                {(form as any).include_in_plan ? 'Ativo' : 'Inativo'}
              </button>
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
                  setForm({ title: '', target: '', due_date: '', include_in_plan: true });
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
                          {formatDateBR(goal.due_date)}
                        </span>
                      )}
                      {(goal as any).include_in_plan === false && (
                        <span className="text-[9px] font-black uppercase text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          Fora do plano
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
                          target: formatBRLInputValue(goal.target),
                          due_date: goal.due_date || '',
                          include_in_plan: (goal as any).include_in_plan ?? true,
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-2.5 bg-slate-800 rounded-xl"
                      type="button"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { setDeleteError(null); setDeleteConfirm({ id: goal.id, title: goal.title }); }}
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

function InvestView({ onAdd, onUpdate, onDelete, goals, goalProgress, institutions, assetClasses, investments, isPrivate }) {
  const [form, setForm] = useState({ asset: '', amount: '', category: '', institution: '', liquidity: '', asset_due_date: '', fgc_covered: false, distributions: {} });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterInstitution, setFilterInstitution] = useState('Todas');
  const [filterGoal, setFilterGoal] = useState('Todas');
  // Filtros para seleção de metas ao vincular no investimento (escala bem com muitas metas)
  const [goalPickSearch, setGoalPickSearch] = useState('');  const [showFgcDetail, setShowFgcDetail] = useState(false);
  
  const FGC_LIMIT = 250000;
  const liquidityOptions = ['Diária', 'D+1', 'D+2', 'D+3', 'D+30', 'D+60', 'D+90', 'No Vencimento'];

  // Sugestão mensal por meta (usada para pré-preencher ao vincular meta no novo investimento)
  const suggestedByGoalId = useMemo(() => {
    const map: Record<string, number> = {};
    (goalProgress || []).forEach((gp: any) => {
      const goalId = String(gp.goal_id ?? gp.id ?? '');
      if (!goalId) return;
      const remaining = Number(gp.remaining_amount ?? 0);
      if (!Number.isFinite(remaining) || remaining <= 0) {
        map[goalId] = 0;
        return;
      }

      // Usa a MESMA regra do "Plano do Mês" para evitar divergência de valores.
      // - Se tiver vencimento: divide pelo número de meses até o vencimento (com ajuste pelo dia do mês)
      // - Se não tiver vencimento: divide em 12 meses
      const withDue = calcSuggestedMonthly(remaining, gp.due_date);
      const monthly = withDue === null ? remaining / 12 : withDue;
      map[goalId] = Math.max(0, monthly);
    });
    return map;
  }, [goalProgress]);

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
      const matchGoal = filterGoal === 'Todas' || Object.prototype.hasOwnProperty.call((inv as any).distributions || {}, filterGoal);

      return matchSearch && matchCategory && matchInstitution && matchGoal;
    });
  }, [investments, searchTerm, filterCategory, filterInstitution, filterGoal]);

  const goalProgressById = useMemo(() => {
    const m = new Map<string, any>();
    (goalProgress || []).forEach((gp: any) => m.set(String(gp.goal_id), gp));
    return m;
  }, [goalProgress]);

  
const goalsForAllocation = useMemo(() => {
  const q = (goalPickSearch || '').toLowerCase().trim();
  return goals
    .filter((g: any) => (g.title || '').toLowerCase().includes(q))
    .sort((a: any, b: any) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'));
}, [goals, goalPickSearch]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('Todas');
    setFilterInstitution('Todas');
    setFilterGoal('Todas');
  };


  const handleConfirm = async () => {
    if (!form.asset || !form.amount) return;
    setLoading(true);
    setError(null);

    const cleanData = {
      ...form,
      amount: parseBRL(form.amount),
      asset_due_date: (form.liquidity !== 'No Vencimento' || form.asset_due_date === "") ? null : form.asset_due_date,
      distributions: Object.fromEntries(
        Object.entries(form.distributions).map(([key, val]) => [key, parseBRL(String(val))])
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
      amount: formatBRLInputValue(inv.amount),
      category: inv.category,
      institution: inv.institution || '',
      liquidity: inv.liquidity || '',
      asset_due_date: inv.asset_due_date || '',
      fgc_covered: inv.fgc_covered || false,
      distributions: Object.fromEntries(
        Object.entries((inv.distributions ?? {}) as Record<string, string | number | null | undefined>).map(([k, v]) => [k, formatBRLInputValue(v)])
      )
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatVal = (v) => isPrivate ? "••••" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  // Tipos explícitos para evitar inferência como `unknown` em alguns cenários do TS
  const amountNumber = useMemo<number>(() => parseBRL(form.amount), [form.amount]);
  const distTotal = useMemo<number>(
    () => (Object.values(form.distributions ?? {}) as unknown[]).reduce<number>((sum, v) => sum + parseBRL(v), 0),
    [form.distributions]
  );
  const distOver = useMemo<boolean>(() => amountNumber > 0 && distTotal > amountNumber, [amountNumber, distTotal]);

  const showFilterPanel = showFilters || !!searchTerm || filterCategory !== 'Todas' || filterInstitution !== 'Todas' || filterGoal !== 'Todas';

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Excluir aporte"
        description={deleteConfirm ? `Você está prestes a excluir o aporte "${deleteConfirm.asset}" (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(deleteConfirm.amount || 0))}). Esta ação não pode ser desfeita.` : undefined}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={deleteLoading}
        onCancel={() => {
          if (deleteLoading) return;
          setDeleteConfirm(null);
        }}
        onConfirm={async () => {
          if (!deleteConfirm || deleteLoading) return;
          setDeleteLoading(true);
          setDeleteError(null);
          const res = await onDelete(deleteConfirm.id, deleteConfirm.amount);
          if (res?.error) {
            setDeleteError(res.error.message || 'Não foi possível excluir o aporte.');
            setDeleteLoading(false);
            return;
          }
          setDeleteConfirm(null);
          setDeleteLoading(false);
        }}
      />
      {deleteError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-in fade-in">
          {deleteError}
        </div>
      )}
      
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
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 outline-none text-sm text-white"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: maskBRL(e.target.value) })}
                  onBlur={(e) => setForm({ ...form, amount: formatBRLInputValue(e.target.value) })}
                  onFocus={(e) => e.currentTarget.select()}
                  disabled={loading}
                />
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
          <div className="space-y-3 mb-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Filtrar metas..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 pl-11 outline-none focus:border-emerald-500/40 text-xs text-white"
                value={goalPickSearch}
                onChange={(e) => setGoalPickSearch(e.target.value)}
              />
            </div>
          </div>

              <div className="space-y-3 max-h-52 overflow-y-auto pr-2">
                {goalsForAllocation.map(goal => (
                  <div key={goal.id} className={`p-4 rounded-2xl border ${form.distributions[goal.id] !== undefined ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-slate-950/40 border-slate-800'}`}>
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          const d: Record<string, any> = { ...form.distributions };
                          if (d[goal.id] !== undefined) {
                            delete d[goal.id];
                          } else {
                            const suggested = suggestedByGoalId?.[goal.id];
                            // Pré-preenche com a sugestão mensal (se existir) ao vincular a meta
                            d[goal.id] = suggested && Number.isFinite(suggested) && suggested > 0
                              ? formatBRLFromNumber(suggested)
                              : '';
                          }
                          setForm({ ...form, distributions: d });
                        }}
                        className="text-xs font-bold flex items-center gap-3 text-left"
                      >
                        <div className={`w-4 h-4 rounded-lg border flex-shrink-0 ${form.distributions[goal.id] !== undefined ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'}`} />
                        {goal.title}
                      </button>
                      {form.distributions[goal.id] !== undefined && (
                        <input
                          type="text"
                          inputMode="decimal"
                          disabled={loading}
                          className="w-32 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-right text-white"
                          placeholder="R$ 0,00"
                          value={form.distributions[goal.id]}
                          onChange={(e) => {
                            const nextMasked = maskBRL(e.target.value);
                            const nextNumber = parseBRL(nextMasked);

                            const otherSum = Object.entries(form.distributions || {}).reduce((sum: number, [gid, val]: any) => {
                              return String(gid) === String(goal.id) ? sum : sum + parseBRL(val);
                            }, 0);

                            const maxAllowed = Math.max(0, (amountNumber || 0) - otherSum);
                            const clampedNumber = Math.min(nextNumber, maxAllowed);

                            setForm({
                              ...form,
                              distributions: {
                                ...form.distributions,
                                [goal.id]: clampedNumber === nextNumber ? nextMasked : formatBRLFromNumber(clampedNumber),
                              },
                            });
                          }}
                        onBlur={(e) => setForm({ ...form, distributions: { ...form.distributions, [goal.id]: formatBRLInputValue(e.target.value) } })}
                        onFocus={(e) => e.currentTarget.select()}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <span className={`${distOver ? 'text-red-400' : 'text-slate-500'}`}>Restante para alocar</span>
              <span className={`${distOver ? 'text-red-400' : 'text-emerald-400'}`}>{formatVal(Math.max(0, (amountNumber || 0) - distTotal))}</span>
            </div>
            {distOver && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
                A soma das metas não pode exceder o valor do investimento. Excedeu {formatVal(distTotal - (amountNumber || 0))}.
              </div>
            )}

            <button 
              disabled={loading || !form.asset || !form.amount || distOver} 
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
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
                
<div className="space-y-2">
  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
    Meta
  </p>
  <select
    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-300 outline-none uppercase font-bold"
    value={filterGoal}
    onChange={(e) => setFilterGoal(e.target.value)}
  >
    <option value="Todas">TODAS</option>
    {goals.map((g: any) => (
      <option key={g.id} value={String(g.id)}>
        {g.title}
      </option>
    ))}
  </select>
</div>

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
                      onClick={() => { setDeleteError(null); setDeleteConfirm({ id: inv.id, asset: inv.asset, amount: inv.amount }); }}
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

                    {/* Info extra para metas: se a liquidez é no vencimento, mostramos a data */}
                    {inv.liquidity === 'No Vencimento' && inv.asset_due_date && (
                       <div className="flex items-center gap-1 text-amber-400/90">
                          <Milestone size={12} />
                          <span>Venc.: {formatDateBR(inv.asset_due_date)}</span>
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

  const [deleteConfirm, setDeleteConfirm] = useState(null as null | { kind: 'class' | 'inst'; id: string; name: string });
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Excluir item"
        description={deleteConfirm ? `Deseja excluir "${deleteConfirm.name}"? Esta ação não pode ser desfeita.` : undefined}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={deleteLoading}
        onCancel={() => {
          if (deleteLoading) return;
          setDeleteConfirm(null);
        }}
        onConfirm={async () => {
          if (!deleteConfirm || deleteLoading) return;
          setDeleteLoading(true);
          const res = deleteConfirm.kind === 'class'
            ? await onDeleteClass(deleteConfirm.id)
            : await onDeleteInst(deleteConfirm.id);

          if (res?.error) {
            setError((prev) => ({
              ...prev,
              [deleteConfirm.kind === 'class' ? 'cls' : 'inst']: res.error.message || 'Não foi possível excluir.'
            }));
            setDeleteLoading(false);
            return;
          }

          setDeleteConfirm(null);
          setDeleteLoading(false);
        }}
      />
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
                  <button onClick={() => { setError((p) => ({ ...p, cls: null })); setDeleteConfirm({ kind: 'class', id: cls.id, name: cls.name }); }} className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
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
                  <button onClick={() => { setError((p) => ({ ...p, inst: null })); setDeleteConfirm({ kind: 'inst', id: inst.id, name: inst.name }); }} className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ stats, level, xpLevel, patrimony, user, onLogout }) { 
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const RankIcon = level?.Icon || Trophy;

  const rankTiers = useMemo(() => ([
    { min: 0, max: 99_999, title: 'Sementeiro', Icon: Sprout, hint: 'Começo consciente' },
    { min: 100_000, max: 199_999, title: 'Pioneiro', Icon: Rocket, hint: 'Primeiro salto' },
    { min: 200_000, max: 299_999, title: 'Construtor', Icon: Layers, hint: 'Base sólida' },
    { min: 300_000, max: 399_999, title: 'Estrategista', Icon: Target, hint: 'Plano em ação' },
    { min: 400_000, max: 499_999, title: 'Alpinista', Icon: Mountain, hint: 'Subindo com foco' },
    { min: 500_000, max: 599_999, title: 'Visionário', Icon: TrendingUp, hint: 'Crescimento consistente' },
    { min: 600_000, max: 699_999, title: 'Guardião', Icon: ShieldCheck, hint: 'Protege e diversifica' },
    { min: 700_000, max: 799_999, title: 'Mestre de Carteira', Icon: Star, hint: 'Equilíbrio e disciplina' },
    { min: 800_000, max: 899_999, title: 'Lenda', Icon: Trophy, hint: 'Performance acima da média' },
    { min: 900_000, max: 999_999, title: 'Pré-Milhão', Icon: Gem, hint: 'Última milha' },
    { min: 1_000_000, max: Number.POSITIVE_INFINITY, title: 'Ícone do Milhão', Icon: Crown, hint: 'Marco histórico' },
  ]), []);

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Header do Perfil */}
      <div className="flex flex-col items-center text-center p-10 bg-gradient-to-br from-slate-900 to-slate-950 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="w-28 h-28 bg-slate-800/50 rounded-[2rem] flex items-center justify-center border-4 border-emerald-500/20 mb-6 relative">
          <RankIcon className="text-yellow-500 w-14 h-14" />
          <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-slate-950 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border-4 border-slate-950">
             {level.currentLevel}
          </div>
        </div>
        <h2 className="text-3xl font-black text-white">{level.title}</h2>
        <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.3em] font-black">Rank por Patrimônio</p>
        <p className="text-[11px] text-slate-300/90 mt-3 font-black">{level.rangeLabel}</p>
        <div className="w-full mt-10">
           <ProgressBar progress={level.progress} color="bg-gradient-to-r from-emerald-500 to-teal-500" size="h-3" />
           <p className="text-[10px] text-slate-500 text-right mt-2 font-bold italic">Progressão na faixa: {Math.round(level.progress)}%</p>
           {level.nextTarget != null && (
             <p className="text-[10px] text-slate-600 text-center mt-2 font-bold">
               Próximo marco: <span className="text-slate-300">{formatBRLFromNumber(level.nextTarget)}</span>
             </p>
           )}
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
                 <span className="font-black text-white uppercase">Como o Rank funciona:</span> o Rank (Evolução) é calculado pelo <strong>Patrimônio Total</strong> (soma dos investimentos). As faixas sobem de <strong>R$ 100.000 em R$ 100.000</strong> até <strong>R$ 1.000.000</strong>.
              </p>
           </div>
           <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 font-black text-xs">2</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                 <span className="font-black text-white uppercase">XP (gamificação):</span> mantemos o XP para feedback rápido. A regra é simples: <strong>1 XP</strong> a cada <strong>R$ 10,00</strong> investidos. Seu nível de XP atual: <strong>{xpLevel?.currentLevel ?? 1}</strong>.
              </p>
           </div>
           <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 font-black text-xs">3</div>
              <div className="space-y-2">
                 <p className="text-[11px] text-slate-300 font-black uppercase text-white">Faixas do Rank (Patrimônio):</p>
                 <div className="grid grid-cols-1 gap-1.5">
                    {rankTiers.map((t, i) => (
                      <div key={i} className={`flex items-center gap-2 text-[10px] bg-slate-950/40 p-2 rounded-lg border ${level.title === t.title ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800'}`}>
                        <t.Icon size={12} className={level.title === t.title ? 'text-emerald-400' : 'text-slate-500'} />
                        <span className="text-slate-500">{formatBRLFromNumber(t.min)}{t.max === Number.POSITIVE_INFINITY ? '+' : `–${formatBRLFromNumber(t.max)}`}</span>
                        <strong className={level.title === t.title ? 'text-emerald-300' : 'text-slate-200'}>{t.title}</strong>
                        <span className="ml-auto text-slate-600 font-black">{t.hint}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </Card>

      {/* Guia do SaltInvest */}
      <Card className="border-slate-800/40 bg-slate-900/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-800/60 rounded-xl text-slate-300">
            <Info size={20} />
          </div>
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-300">Guia rápido</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950/30 border border-slate-800/60 rounded-3xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Objetivo do SaltInvest</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              O SaltInvest centraliza seus investimentos e transforma suas <strong>metas</strong> em um plano prático: você vê seu patrimônio,
              acompanha a evolução das metas, recebe recomendações e usa a gamificação (XP/Rank) para manter consistência.
            </p>
          </div>

          <div className="bg-slate-950/30 border border-slate-800/60 rounded-3xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Como priorizamos as metas na Home (Início)</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Na seção <strong>“Metas em foco”</strong>, a prioridade é: <strong>prazo mais próximo</strong> primeiro.
              Se duas metas têm o mesmo prazo, entra primeiro a que tem <strong>maior valor faltante</strong>. Metas sem vencimento vão por último.
              Isso define a <strong>“Próxima ação”</strong> e a ordem da <strong>Timeline</strong>.
            </p>
          </div>

          <div className="bg-slate-950/30 border border-slate-800/60 rounded-3xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">INSIGHTS DO DIA SALTINVEST</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Os insights são gerados pela IA com base no seu patrimônio, aportes e metas.
              A requisição é feita <strong>automaticamente 1 vez por dia</strong>, no <strong>primeiro acesso do dia</strong> (por usuário).
              Os cards são ordenados por prioridade: <strong>Alerta</strong> → <strong>Dica</strong> → <strong>Oportunidade</strong>.
            </p>
          </div>

          <div className="bg-slate-950/30 border border-slate-800/60 rounded-3xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">O que significa cada card do Início</p>
            <ul className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
              <li><strong>Patrimônio Total:</strong> soma dos seus investimentos cadastrados (base do Rank por Patrimônio).</li>
              <li><strong>XP Acumulado:</strong> gamificação — 1 XP a cada R$ 10,00 investidos (motivação de consistência).</li>
              <li><strong>Aporte Mensal:</strong> total investido no mês atual e variação vs. mês anterior.</li>
              <li><strong>Próxima ação:</strong> a meta mais urgente (prazo mais próximo) com sugestão de valor mensal para bater a meta.</li>
              <li><strong>Plano do Mês:</strong> recomenda até 3 metas com aporte sugerido e distribuição percentual do seu mês.</li>
              <li><strong>Timeline:</strong> visão das próximas metas (até 6), destacando atrasos e progresso.</li>
              <li><strong>Insights do Dia:</strong> recomendações automáticas da IA (alertas/dicas/oportunidades).</li>
            </ul>
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