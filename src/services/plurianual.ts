import { supabase } from '@/lib/supabase';
import { cacheFetch } from '@/services/cache';
import { asErrorMessage, requireUserId } from '@/services/db';

export type PlurianualYearSummary = {
  ano: number;
  metasCount: number;
  metasAbertasCount: number;
  metasBaixadasCount: number;
  totalMetas: number;
  totalPlanejadoAno: number;
  totalAportadoAno: number;
  totalRestanteAno: number;
  totalPlanoMensalAno: number;
  progressoAnoPct: number;
  proximasMetas: Array<{ id: string; nome: string; dataAlvo: string | null; valorMeta: number; status: string | null }>;
};

export type PlurianualData = {
  anos: PlurianualYearSummary[];
  totalGeralMetas: number;
  totalGeralAportado: number;
  totalGeralRestante: number;
};

const TTL = 15_000;

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeStatusFromSubmetas(subs: any[]): 'BAIXADA' | 'ABERTA' {
  if (!subs.length) return 'ABERTA';
  const statuses = subs.map((s) => String(s?.status ?? '').toUpperCase());
  const hasOpen = statuses.some((s) => s === 'ABERTA');
  return hasOpen ? 'ABERTA' : 'BAIXADA';
}

export async function getPlanejamentoPlurianual(): Promise<PlurianualData> {
  const uid = await requireUserId();
  return cacheFetch(`plurianual:${uid}`, TTL, async () => {
    try {
      // Schema atual usa valor_alvo (não valor_meta) e não possui coluna status em metas.
      const { data: metasRaw, error: metasErr } = await supabase
        .from('metas')
        .select('id,nome,valor_alvo,data_alvo,data_inicio,is_plano_mensal')
        .eq('user_id', uid)
        .order('data_alvo', { ascending: true });
      if (metasErr) throw metasErr;

      const metas = (metasRaw ?? []) as any[];
      if (!metas.length) {
        return { anos: [], totalGeralMetas: 0, totalGeralAportado: 0, totalGeralRestante: 0 };
      }

      const metaIds = metas.map((m) => String(m.id));
      const { data: subsRaw, error: subsErr } = await supabase
        .from('submetas')
        .select('meta_id,data_referencia,valor_esperado,valor_aportado,status')
        .eq('user_id', uid)
        .in('meta_id', metaIds)
        .order('data_referencia', { ascending: true });
      if (subsErr) throw subsErr;

      const subs = (subsRaw ?? []) as any[];
      const subsByMeta = new Map<string, any[]>();
      for (const s of subs) {
        const k = String((s as any).meta_id);
        const arr = subsByMeta.get(k) ?? [];
        arr.push(s);
        subsByMeta.set(k, arr);
      }

      const byYear = new Map<number, PlurianualYearSummary>();
      const ensureYear = (ano: number): PlurianualYearSummary => {
        let y = byYear.get(ano);
        if (!y) {
          y = {
            ano,
            metasCount: 0,
            metasAbertasCount: 0,
            metasBaixadasCount: 0,
            totalMetas: 0,
            totalPlanejadoAno: 0,
            totalAportadoAno: 0,
            totalRestanteAno: 0,
            totalPlanoMensalAno: 0,
            progressoAnoPct: 0,
            proximasMetas: []
          };
          byYear.set(ano, y);
        }
        return y;
      };

      for (const m of metas) {
        const dataAlvo = isDate(m.data_alvo) ? m.data_alvo : null;
        if (!dataAlvo) continue;

        const ano = Number(dataAlvo.slice(0, 4));
        if (!Number.isFinite(ano)) continue;

        const y = ensureYear(ano);
        y.metasCount += 1;

        const metaSubs = subsByMeta.get(String(m.id)) ?? [];
        const metaStatus = normalizeStatusFromSubmetas(metaSubs);
        if (metaStatus === 'BAIXADA') y.metasBaixadasCount += 1;
        else y.metasAbertasCount += 1;

        const valorMeta = Number((m as any).valor_alvo ?? 0) || 0;
        y.totalMetas += valorMeta;
        if ((m as any).is_plano_mensal) y.totalPlanoMensalAno += valorMeta;

        let planejado = 0;
        let aportado = 0;
        for (const s of metaSubs) {
          planejado += Number((s as any).valor_esperado ?? 0) || 0;
          aportado += Number((s as any).valor_aportado ?? 0) || 0;
        }
        y.totalPlanejadoAno += planejado;
        y.totalAportadoAno += aportado;
        y.totalRestanteAno += Math.max(0, valorMeta - aportado);

        y.proximasMetas.push({
          id: String((m as any).id),
          nome: String((m as any).nome ?? 'Meta'),
          dataAlvo,
          valorMeta,
          status: metaStatus
        });
      }

      const anos = Array.from(byYear.values())
        .sort((a, b) => a.ano - b.ano)
        .map((y) => ({
          ...y,
          progressoAnoPct: y.totalMetas > 0 ? Math.min(100, (y.totalAportadoAno / y.totalMetas) * 100) : 0,
          proximasMetas: y.proximasMetas
            .sort((a, b) => String(a.dataAlvo ?? '').localeCompare(String(b.dataAlvo ?? '')))
            .slice(0, 4)
        }));

      const totalGeralMetas = anos.reduce((s, y) => s + y.totalMetas, 0);
      const totalGeralAportado = anos.reduce((s, y) => s + y.totalAportadoAno, 0);
      const totalGeralRestante = anos.reduce((s, y) => s + y.totalRestanteAno, 0);

      return { anos, totalGeralMetas, totalGeralAportado, totalGeralRestante };
    } catch (e) {
      throw new Error(asErrorMessage(e));
    }
  });
}
