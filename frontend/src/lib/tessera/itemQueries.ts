// src/lib/tessera/itemQueries.ts
// Consultas e tipos compartilhados pelos serviços de domínio do Tessera.
import { getDb } from '@/lib/db';
import { notFound } from './errors';
import type { TesseraWorkItem } from './types';

export interface Actor { id: string; isManager: boolean }

export const sqlClient = () => getDb();

/** SELECT base de work item com joins. Sempre filtrar por organization_id no WHERE. */
export const ITEM_SELECT = `
  SELECT w.*,
    p.nome AS owner_name,
    p.avatar_url AS owner_avatar,
    CASE WHEN pr.id IS NULL THEN NULL ELSE COALESCE(NULLIF(TRIM(pc.empresa), ''), pc.nome, pr.type, 'Projeto') END AS project_title,
    pc.nome AS client_name,
    (SELECT COUNT(*)::int FROM public.tessera_checklist_items c WHERE c.work_item_id = w.id) AS checklist_total,
    (SELECT COUNT(*)::int FROM public.tessera_checklist_items c WHERE c.work_item_id = w.id AND c.is_completed) AS checklist_completed
  FROM public.tessera_work_items w
  LEFT JOIN public.profiles p ON p.id = w.owner_id
  LEFT JOIN public.projects pr ON pr.id = w.project_id
  LEFT JOIN public.profiles pc ON pc.id = pr.client_id
`;

export async function fetchItem(orgId: string, id: string): Promise<TesseraWorkItem> {
  const rows = await sqlClient().query(
    `${ITEM_SELECT} WHERE w.id = $1::uuid AND w.organization_id = $2::uuid LIMIT 1;`,
    [id, orgId],
  );
  if (!rows.length) throw notFound();
  return rows[0] as TesseraWorkItem;
}

export interface OrgSettings {
  workdayMinutes: number;
  workDays: number[];
  timezone: string;
  wipLimits: Record<string, number>;
}

export async function getOrgSettings(orgId: string): Promise<OrgSettings> {
  const rows = await sqlClient().query(
    `SELECT timezone, settings FROM public.tessera_organizations WHERE id = $1::uuid LIMIT 1;`,
    [orgId],
  );
  const row = rows[0] as { timezone?: string; settings?: Record<string, any> } | undefined;
  const s = row?.settings || {};
  const hours = Number(s.workday_hours);
  return {
    workdayMinutes: Math.round((hours > 0 ? hours : 6) * 60),
    workDays: Array.isArray(s.work_days) && s.work_days.length ? s.work_days.map(Number) : [1, 2, 3, 4, 5],
    timezone: row?.timezone || 'America/Sao_Paulo',
    wipLimits: s.wip_limits && typeof s.wip_limits === 'object' ? s.wip_limits : {},
  };
}

export async function isOrgMember(orgId: string, userId: string): Promise<boolean> {
  const rows = await sqlClient().query(
    `SELECT 1 FROM public.tessera_memberships WHERE organization_id = $1::uuid AND user_id = $2::uuid
     UNION
     SELECT 1 FROM public.profiles WHERE id = $2::uuid AND role IN ('admin', 'gestor', 'colaborador')
     LIMIT 1;`,
    [orgId, userId],
  );
  return rows.length > 0;
}

export function deliverablesOf(item: Pick<TesseraWorkItem, 'metadata'>): { label: string; url: string }[] {
  const d = (item.metadata as any)?.deliverables;
  return Array.isArray(d) ? d.filter(x => x && typeof x.url === 'string' && x.url) : [];
}

export interface OrgMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatar_url?: string | null;
  weekly_capacity_hours?: number;
}

export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const rows = await sqlClient().query(
    `SELECT p.id, COALESCE(p.nome, p.email, 'Membro') AS name, p.email, p.role, p.avatar_url,
            COALESCE(m.weekly_capacity_hours, 30)::numeric AS weekly_capacity_hours
       FROM public.profiles p
       LEFT JOIN public.tessera_memberships m ON m.user_id = p.id AND m.organization_id = $1::uuid
      WHERE COALESCE(p.role, '') IN ('admin', 'gestor', 'colaborador')
        AND COALESCE(p.contract_status, 'active') != 'dismissed'
      ORDER BY p.nome ASC NULLS LAST;`,
    [orgId],
  );
  return rows as OrgMember[];
}

export interface OrgProject {
  id: string;
  title: string;
  client_name: string;
  service_type: string;
  stage_label: string;
}

export async function listOrgProjects(): Promise<OrgProject[]> {
  const rows = await sqlClient().query(
    `SELECT pr.id,
            COALESCE(NULLIF(TRIM(pc.empresa), ''), pc.nome, pr.type, 'Projeto Ativo') AS title,
            COALESCE(pc.nome, 'Cliente') AS client_name,
            COALESCE(pr.service_type, pr.type, 'idv') AS service_type,
            COALESCE(pr.idv_phase, pr.fase, 'Em Produção') AS stage_label
       FROM public.projects pr
       LEFT JOIN public.profiles pc ON pc.id = pr.client_id
      WHERE pr.status NOT IN ('delivered', 'archived', 'canceled')
      ORDER BY title ASC
      LIMIT 100;`,
  );
  return rows as OrgProject[];
}

