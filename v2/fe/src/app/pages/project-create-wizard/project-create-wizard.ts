import { Component, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Header } from '../../components/organisms/header/header';
import { Button } from '../../components/atoms/button/button';
import { ErrorAlert } from '../../components/atoms/error-alert/error-alert';
import { FormField } from '../../components/molecules/form-field/form-field';
import { Textarea } from '../../components/atoms/textarea/textarea';
import { Label } from '../../components/atoms/label/label';
import { DocumentsPanel } from '../../components/organisms/documents-panel/documents-panel';
import { ProjectsService, ProjectStatus, StepStatus, ProjectRoleItem, RbacMatrixCell, ProjectMemberItem, StakeholderRole, SessionItem, SessionMessage, SessionParticipantItem } from '../../services/projects.service';
import { WsService } from '../../services/ws.service';
import type { DocumentPurpose } from '../../services/documents.service';

interface StepDef { number: number; title: string; subtitle: string }

const STEPS: StepDef[] = [
  { number: 1, title: 'Brief',          subtitle: 'Name + one-line goal'        },
  { number: 2, title: 'Documents',      subtitle: 'BRDs, mocks, references'     },
  { number: 3, title: 'Roles',          subtitle: 'Personas in your app'        },
  { number: 4, title: 'AI Clarification', subtitle: 'Multi-participant chat'    },
  { number: 5, title: 'Members',        subtitle: 'Stakeholders building it'    },
  { number: 6, title: 'Module Skeleton', subtitle: 'AI-proposed structure'      },
];

const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 64);

// Default permission keys offered until Phase F lands real features.
// Boss said RBAC matrix is the heart of the system, so we ship a sane starter
// list — user can still toggle per role. Phase F replaces this with feature-driven
// columns once modules exist.
const DEFAULT_PERMISSION_KEYS: string[] = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export',
  'manage_members',
];

// Default capabilities shown per stakeholder role on the members table.
// Static for Phase D — Phase E/F may derive these from RBAC + features instead.
const STAKEHOLDER_ROLES: { value: StakeholderRole; label: string; capabilities: string[] }[] = [
  { value: 'decider',     label: 'Decider',     capabilities: ['Approves', 'Sets direction']   },
  { value: 'reviewer',    label: 'Reviewer',    capabilities: ['Reviews', 'Comments']          },
  { value: 'contributor', label: 'Contributor', capabilities: ['Builds', 'Edits']              },
  { value: 'observer',    label: 'Observer',    capabilities: ['Watches', 'Read-only']         },
];

const DOC_PURPOSES: { value: DocumentPurpose; label: string }[] = [
  { value: 'requirement',          label: 'Requirement'    },
  { value: 'design',               label: 'Design'         },
  { value: 'technical_spec',       label: 'Tech Spec'      },
  { value: 'meeting_notes',        label: 'Meeting Notes'  },
  { value: 'wireframe',            label: 'Wireframe'      },
  { value: 'user_research',        label: 'Research'       },
  { value: 'competitive_analysis', label: 'Competitive'    },
  { value: 'reference',            label: 'Reference'      },
  { value: 'other',                label: 'Other'          },
];

@Component({
  selector:    'bs-project-create-wizard',
  imports:     [FormsModule, Header, Button, ErrorAlert, FormField, Textarea, Label, DocumentsPanel],
  templateUrl: './project-create-wizard.html',
})
export class ProjectCreateWizard implements OnDestroy {
  private readonly projects = inject(ProjectsService);
  private readonly router   = inject(Router);
  private readonly route    = inject(ActivatedRoute);
  private readonly ws       = inject(WsService);

  private ws_unsub_ctx: (() => void) | null = null;

  readonly docs_panel = viewChild<DocumentsPanel>('docsPanel');

  readonly steps          = STEPS;
  readonly doc_purposes   = DOC_PURPOSES;
  readonly project_id     = signal<string | null>(null);
  readonly project_name   = signal<string | null>(null);
  readonly project_status = signal<ProjectStatus | null>(null);
  readonly active_step    = signal<number>(1);
  readonly step_statuses  = signal<Map<number, StepStatus>>(new Map());
  readonly loading        = signal(false);
  readonly error          = signal<string | null>(null);

  readonly name           = signal('');
  readonly slug           = signal('');
  readonly brief          = signal('');
  readonly slug_dirty     = signal(false);

  readonly paste_title    = signal('');
  readonly paste_content  = signal('');
  readonly paste_purpose  = signal<DocumentPurpose>('requirement');
  readonly pasting        = signal(false);
  readonly paste_error    = signal<string | null>(null);
  readonly step2_loading  = signal(false);

  readonly initial_ctx_status   = signal<'idle' | 'checking' | 'building' | 'ready' | 'failed'>('idle');
  readonly initial_ctx_markdown = signal<string | null>(null);
  readonly initial_ctx_error    = signal<string | null>(null);

  readonly roles               = signal<ProjectRoleItem[]>([]);
  readonly rbac_cells          = signal<RbacMatrixCell[]>([]);
  readonly permission_keys     = signal<string[]>(DEFAULT_PERMISSION_KEYS);
  readonly new_role_name       = signal('');
  readonly new_role_desc       = signal('');
  readonly role_busy           = signal(false);
  readonly role_error          = signal<string | null>(null);
  readonly step3_loading       = signal(false);
  readonly editing_role_id     = signal<string | null>(null);
  readonly editing_role_name   = signal('');
  readonly editing_role_desc   = signal('');

  readonly stakeholder_roles  = STAKEHOLDER_ROLES;
  readonly members            = signal<ProjectMemberItem[]>([]);
  readonly new_member_name        = signal('');
  readonly new_member_email       = signal('');
  readonly new_member_designation = signal('');
  readonly new_member_stake       = signal<StakeholderRole>('contributor');
  readonly new_member_rank        = signal<number>(3);
  readonly member_busy        = signal(false);
  readonly member_error       = signal<string | null>(null);
  readonly editing_member_id  = signal<string | null>(null);
  readonly editing_member     = signal<{ name: string; email: string; designation: string; stakeholder_role: StakeholderRole; authority_rank: number }>({
    name: '', email: '', designation: '', stakeholder_role: 'contributor', authority_rank: 3,
  });
  readonly step5_loading      = signal(false);

  readonly sessions             = signal<SessionItem[]>([]);
  readonly active_session_id    = signal<string | null>(null);
  readonly session_participants = signal<SessionParticipantItem[]>([]);
  readonly session_messages     = signal<SessionMessage[]>([]);
  readonly new_session_title    = signal('');
  readonly new_message_text     = signal('');
  readonly speaking_as          = signal<string | null>(null);
  readonly session_busy         = signal(false);
  readonly message_busy         = signal(false);
  readonly session_error        = signal<string | null>(null);
  readonly step4_loading        = signal(false);

  readonly active_step_def = computed(() => this.steps.find(s => s.number === this.active_step()) ?? this.steps[0]);

  constructor() { void this.bootstrap(); }

  private async bootstrap(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.project_id.set(id);
    await this.refresh_init_state();
    const requested = Number(this.route.snapshot.queryParamMap.get('step') ?? '1');
    if (Number.isFinite(requested) && requested >= 1 && requested <= 6) this.active_step.set(requested);
  }

  private async refresh_init_state(): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    try {
      const res = await this.projects.get_init_state(id);
      const map = new Map<number, StepStatus>();
      for (const s of res.data.steps) map.set(s.step, s.status);
      this.step_statuses.set(map);
      this.project_name.set(res.data.project_name);
      this.project_status.set(res.data.project_status);
      if (map.get(2) === 'done') void this.load_initial_ctx(id);
      void this.load_roles_and_matrix(id);
      void this.load_members(id);
      void this.load_sessions(id);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load init state');
    }
  }

  private async load_roles_and_matrix(project_id: string): Promise<void> {
    try {
      const [roles_res, rbac_res] = await Promise.all([
        this.projects.list_roles(project_id),
        this.projects.get_rbac_matrix(project_id),
      ]);
      this.roles.set(roles_res.data.items);
      this.rbac_cells.set(rbac_res.data.cells);
      const keys = new Set<string>(DEFAULT_PERMISSION_KEYS);
      for (const k of rbac_res.data.permission_keys) keys.add(k);
      this.permission_keys.set(Array.from(keys));
    } catch (e: any) {
      this.role_error.set(e?.message ?? 'Failed to load roles');
    }
  }

  cell_allow(role_id: string, permission_key: string): boolean {
    const cell = this.rbac_cells().find(c => c.role_id === role_id && c.permission_key === permission_key && c.feature_id === null);
    return !!cell?.allow;
  }

  can_add_role(): boolean {
    return !this.role_busy() && this.new_role_name().trim().length >= 1;
  }

  async add_role(): Promise<void> {
    const id = this.project_id();
    if (!id || !this.can_add_role()) return;
    this.role_error.set(null);
    this.role_busy.set(true);
    try {
      await this.projects.create_role(id, {
        name:        this.new_role_name().trim(),
        description: this.new_role_desc().trim() || undefined,
      });
      this.new_role_name.set('');
      this.new_role_desc.set('');
      await this.load_roles_and_matrix(id);
    } catch (e: any) {
      this.role_error.set(e?.message ?? 'Failed to create role');
    } finally {
      this.role_busy.set(false);
    }
  }

  start_edit_role(role: ProjectRoleItem): void {
    this.editing_role_id.set(role.id);
    this.editing_role_name.set(role.name);
    this.editing_role_desc.set(role.description ?? '');
  }

  cancel_edit_role(): void {
    this.editing_role_id.set(null);
    this.editing_role_name.set('');
    this.editing_role_desc.set('');
  }

  async save_edit_role(): Promise<void> {
    const id      = this.project_id();
    const role_id = this.editing_role_id();
    if (!id || !role_id) return;
    this.role_error.set(null);
    this.role_busy.set(true);
    try {
      await this.projects.update_role(id, role_id, {
        name:        this.editing_role_name().trim(),
        description: this.editing_role_desc().trim() || null,
      });
      this.cancel_edit_role();
      await this.load_roles_and_matrix(id);
    } catch (e: any) {
      this.role_error.set(e?.message ?? 'Failed to update role');
    } finally {
      this.role_busy.set(false);
    }
  }

  async delete_role(role: ProjectRoleItem): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    if (!confirm(`Delete role "${role.name}"? Its permission grants will also be removed.`)) return;
    this.role_error.set(null);
    this.role_busy.set(true);
    try {
      await this.projects.delete_role(id, role.id);
      await this.load_roles_and_matrix(id);
    } catch (e: any) {
      this.role_error.set(e?.message ?? 'Failed to delete role');
    } finally {
      this.role_busy.set(false);
    }
  }

  async toggle_permission(role_id: string, permission_key: string): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    const next_allow = !this.cell_allow(role_id, permission_key);
    try {
      if (next_allow) {
        await this.projects.set_role_permission(id, { role_id, permission_key, allow: true });
      } else {
        await this.projects.unset_role_permission(id, { role_id, permission_key });
      }
      await this.load_roles_and_matrix(id);
    } catch (e: any) {
      this.role_error.set(e?.message ?? 'Failed to toggle permission');
    }
  }

  private async load_members(project_id: string): Promise<void> {
    try {
      const res = await this.projects.list_members(project_id);
      this.members.set(res.data.items);
    } catch (e: any) {
      this.member_error.set(e?.message ?? 'Failed to load members');
    }
  }

  capabilities_for(role: StakeholderRole): string[] {
    return this.stakeholder_roles.find(r => r.value === role)?.capabilities ?? [];
  }

  can_add_member(): boolean {
    return !this.member_busy()
      && this.new_member_name().trim().length >= 1
      && this.new_member_email().trim().length >= 3
      && this.new_member_designation().trim().length >= 1
      && this.new_member_rank() >= 1;
  }

  async add_member(): Promise<void> {
    const id = this.project_id();
    if (!id || !this.can_add_member()) return;
    this.member_error.set(null);
    this.member_busy.set(true);
    try {
      await this.projects.add_member(id, {
        name:             this.new_member_name().trim(),
        email:            this.new_member_email().trim(),
        designation:      this.new_member_designation().trim(),
        stakeholder_role: this.new_member_stake(),
        authority_rank:   this.new_member_rank(),
      });
      this.new_member_name.set('');
      this.new_member_email.set('');
      this.new_member_designation.set('');
      this.new_member_stake.set('contributor');
      this.new_member_rank.set(3);
      await this.load_members(id);
    } catch (e: any) {
      this.member_error.set(e?.message ?? 'Failed to add member');
    } finally {
      this.member_busy.set(false);
    }
  }

  start_edit_member(m: ProjectMemberItem): void {
    this.editing_member_id.set(m.id);
    this.editing_member.set({
      name:             m.name,
      email:            m.email,
      designation:      m.designation,
      stakeholder_role: m.stakeholder_role,
      authority_rank:   m.authority_rank,
    });
  }

  cancel_edit_member(): void {
    this.editing_member_id.set(null);
  }

  patch_editing_member<K extends keyof ReturnType<typeof this.editing_member>>(key: K, value: ReturnType<typeof this.editing_member>[K]): void {
    this.editing_member.set({ ...this.editing_member(), [key]: value });
  }

  async save_edit_member(): Promise<void> {
    const id        = this.project_id();
    const member_id = this.editing_member_id();
    if (!id || !member_id) return;
    this.member_error.set(null);
    this.member_busy.set(true);
    try {
      const patch = this.editing_member();
      await this.projects.update_member(id, member_id, {
        name:             patch.name.trim(),
        email:            patch.email.trim(),
        designation:      patch.designation.trim(),
        stakeholder_role: patch.stakeholder_role,
        authority_rank:   patch.authority_rank,
      });
      this.cancel_edit_member();
      await this.load_members(id);
    } catch (e: any) {
      this.member_error.set(e?.message ?? 'Failed to update member');
    } finally {
      this.member_busy.set(false);
    }
  }

  async remove_member(m: ProjectMemberItem): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    if (!confirm(`Remove ${m.name} <${m.email}> from this project?`)) return;
    this.member_error.set(null);
    this.member_busy.set(true);
    try {
      await this.projects.remove_member(id, m.id);
      await this.load_members(id);
    } catch (e: any) {
      this.member_error.set(e?.message ?? 'Failed to remove member');
    } finally {
      this.member_busy.set(false);
    }
  }

  private async load_sessions(project_id: string): Promise<void> {
    try {
      const res = await this.projects.list_sessions(project_id, 'clarification');
      this.sessions.set(res.data.items);
      const current = this.active_session_id();
      if (!current && res.data.items.length > 0) {
        await this.open_session(res.data.items[0].id);
      } else if (current) {
        await this.refresh_active_session();
      }
    } catch (e: any) {
      this.session_error.set(e?.message ?? 'Failed to load sessions');
    }
  }

  async open_session(session_id: string): Promise<void> {
    this.active_session_id.set(session_id);
    await this.refresh_active_session();
  }

  private async refresh_active_session(): Promise<void> {
    const sid = this.active_session_id();
    if (!sid) return;
    try {
      const res = await this.projects.get_session_messages(sid);
      this.session_participants.set(res.data.participants);
      this.session_messages.set(res.data.messages);
      const me_id = this.find_self_participant_id(res.data.participants);
      if (!this.speaking_as() && me_id) this.speaking_as.set(me_id);
    } catch (e: any) {
      this.session_error.set(e?.message ?? 'Failed to load messages');
    }
  }

  private find_self_participant_id(participants: SessionParticipantItem[]): string | null {
    const human = participants.find(p => p.kind === 'human' && p.user_id !== null);
    return human?.id ?? null;
  }

  async start_new_session(): Promise<void> {
    const id = this.project_id();
    if (!id || this.session_busy()) return;
    this.session_error.set(null);
    this.session_busy.set(true);
    try {
      const member_participants = this.members().slice(0, 5).map(m => ({
        kind:         'human' as const,
        member_id:    m.id,
        display_name: m.name,
      }));
      const created = await this.projects.start_session(id, {
        kind:                 'clarification',
        title:                this.new_session_title().trim() || null,
        initial_participants: member_participants,
      });
      this.new_session_title.set('');
      await this.load_sessions(id);
      await this.open_session(created.session_id);
    } catch (e: any) {
      this.session_error.set(e?.message ?? 'Failed to start session');
    } finally {
      this.session_busy.set(false);
    }
  }

  async end_active_session(): Promise<void> {
    const project_id = this.project_id();
    const session_id = this.active_session_id();
    if (!project_id || !session_id) return;
    if (!confirm('End this session? You will not be able to add messages to it.')) return;
    this.session_busy.set(true);
    try {
      await this.projects.end_session(project_id, session_id);
      await this.load_sessions(project_id);
    } catch (e: any) {
      this.session_error.set(e?.message ?? 'Failed to end session');
    } finally {
      this.session_busy.set(false);
    }
  }

  active_session(): SessionItem | null {
    const sid = this.active_session_id();
    return this.sessions().find(s => s.id === sid) ?? null;
  }

  participant_label(participant_id: string | null): string {
    if (!participant_id) return 'System';
    return this.session_participants().find(p => p.id === participant_id)?.display_name ?? 'Unknown';
  }

  can_send_message(): boolean {
    return !this.message_busy()
      && !!this.active_session_id()
      && !this.active_session()?.ended_at
      && this.new_message_text().trim().length >= 1;
  }

  async send_message(): Promise<void> {
    const project_id = this.project_id();
    const session_id = this.active_session_id();
    if (!project_id || !session_id || !this.can_send_message()) return;
    this.message_busy.set(true);
    try {
      await this.projects.add_message(project_id, session_id, {
        content:        this.new_message_text().trim(),
        role:           'user',
        participant_id: this.speaking_as(),
      });
      this.new_message_text.set('');
      await this.refresh_active_session();
    } catch (e: any) {
      this.session_error.set(e?.message ?? 'Failed to send message');
    } finally {
      this.message_busy.set(false);
    }
  }

  async continue_to_step5(): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    this.error.set(null);
    this.step4_loading.set(true);
    try {
      await this.projects.mark_step(id, 4, 'done');
      const next = new Map(this.step_statuses());
      next.set(4, 'done');
      this.step_statuses.set(next);
      this.active_step.set(5);
      await this.router.navigate(['/app/projects', id, 'wizard'], { queryParams: { step: 5 } });
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to mark step 4 done');
    } finally {
      this.step4_loading.set(false);
    }
  }

  async continue_to_step6(): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    this.error.set(null);
    this.step5_loading.set(true);
    try {
      await this.projects.mark_step(id, 5, 'done');
      const next = new Map(this.step_statuses());
      next.set(5, 'done');
      this.step_statuses.set(next);
      this.active_step.set(6);
      await this.router.navigate(['/app/projects', id, 'wizard'], { queryParams: { step: 6 } });
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to mark step 5 done');
    } finally {
      this.step5_loading.set(false);
    }
  }

  async continue_to_step4(): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    this.error.set(null);
    this.step3_loading.set(true);
    try {
      await this.projects.mark_step(id, 3, 'done');
      const next = new Map(this.step_statuses());
      next.set(3, 'done');
      this.step_statuses.set(next);
      this.active_step.set(4);
      await this.router.navigate(['/app/projects', id, 'wizard'], { queryParams: { step: 4 } });
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to mark step 3 done');
    } finally {
      this.step3_loading.set(false);
    }
  }

  on_name_change(value: string): void {
    this.name.set(value);
    if (!this.slug_dirty()) this.slug.set(slugify(value));
  }

  on_slug_change(value: string): void {
    this.slug_dirty.set(true);
    this.slug.set(value);
  }

  status_for(step: number): StepStatus { return this.step_statuses().get(step) ?? null; }

  step_classes(step: number): string {
    const is_active = step === this.active_step();
    const status    = this.status_for(step);
    if (is_active)            return 'border-green-600 bg-green-50';
    if (status === 'done')    return 'border-green-200 bg-white';
    if (status === 'stale')   return 'border-amber-300 bg-amber-50';
    return 'border-gray-200 bg-white';
  }

  step_badge(step: number): string {
    const status = this.status_for(step);
    if (status === 'done')  return 'Done';
    if (status === 'stale') return 'Stale';
    if (status === 'in-progress') return 'In progress';
    return '';
  }

  can_submit_step1(): boolean {
    return !this.loading() && this.name().trim().length >= 1 && this.slug().trim().length >= 1;
  }

  async submit_step1(): Promise<void> {
    if (!this.can_submit_step1()) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      const created = await this.create_or_skip();
      await this.mark_step1_done(created.project_id);
      await this.navigate_to_step2(created.project_id);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to save brief');
    } finally {
      this.loading.set(false);
    }
  }

  private async create_or_skip(): Promise<{ project_id: string }> {
    const existing = this.project_id();
    if (existing) return { project_id: existing };
    const created = await this.projects.create_project({ name: this.name(), slug: this.slug(), brief: this.brief() || undefined });
    this.project_id.set(created.project_id);
    return { project_id: created.project_id };
  }

  private async mark_step1_done(project_id: string): Promise<void> {
    await this.projects.mark_step(project_id, 1, 'done');
    const next = new Map(this.step_statuses());
    next.set(1, 'done');
    this.step_statuses.set(next);
  }

  private async navigate_to_step2(project_id: string): Promise<void> {
    this.active_step.set(2);
    await this.router.navigate(['/app/projects', project_id, 'wizard'], { queryParams: { step: 2 } });
  }

  jump_to_step(step: number): void {
    if (!this.project_id()) return;
    this.active_step.set(step);
    void this.router.navigate(['/app/projects', this.project_id(), 'wizard'], { queryParams: { step }, replaceUrl: true });
  }

  can_save_paste(): boolean {
    return !this.pasting()
      && this.paste_title().trim().length >= 1
      && this.paste_content().trim().length >= 1;
  }

  async save_paste(): Promise<void> {
    const id = this.project_id();
    if (!id || !this.can_save_paste()) return;
    this.paste_error.set(null);
    this.pasting.set(true);
    try {
      await this.projects.paste_document(id, {
        title:   this.paste_title().trim(),
        content: this.paste_content(),
        purpose: this.paste_purpose(),
      });
      this.paste_title.set('');
      this.paste_content.set('');
      this.paste_purpose.set('requirement');
      void this.docs_panel()?.load();
    } catch (e: any) {
      this.paste_error.set(e?.message ?? 'Failed to save pasted content');
    } finally {
      this.pasting.set(false);
    }
  }

  async continue_to_step3(): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    this.error.set(null);
    this.step2_loading.set(true);
    try {
      await this.projects.mark_step(id, 2, 'done');
      const next = new Map(this.step_statuses());
      next.set(2, 'done');
      this.step_statuses.set(next);
      await this.load_initial_ctx(id);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to mark step 2 done');
    } finally {
      this.step2_loading.set(false);
    }
  }

  async proceed_to_step3(): Promise<void> {
    const id = this.project_id();
    if (!id) return;
    this.active_step.set(3);
    await this.router.navigate(['/app/projects', id, 'wizard'], { queryParams: { step: 3 } });
  }

  private async load_initial_ctx(project_id: string): Promise<void> {
    this.initial_ctx_status.set('checking');
    this.ws_unsub_ctx?.();
    this.ws_unsub_ctx = this.ws.on<{ project_id: string; status: string; error_message: string | null }>(
      'project.initial-context.status',
      (event) => {
        if (event.payload?.project_id !== project_id) return;
        const s = event.payload.status;
        if (s === 'ready')    void this.fetch_initial_ctx(project_id);
        else if (s === 'failed')   { this.initial_ctx_status.set('failed');   this.initial_ctx_error.set(event.payload.error_message ?? 'Build failed'); }
        else if (s === 'building') this.initial_ctx_status.set('building');
      },
    );
    await this.fetch_initial_ctx(project_id);
  }

  private async fetch_initial_ctx(project_id: string): Promise<void> {
    try {
      const res = await this.projects.get_initial_context(project_id);
      const { status, markdown_text, error_message } = res.data;
      if (status === 'ready' && markdown_text) {
        this.initial_ctx_markdown.set(markdown_text);
        this.initial_ctx_status.set('ready');
        this.ws_unsub_ctx?.();
        this.ws_unsub_ctx = null;
      } else if (status === 'failed') {
        this.initial_ctx_status.set('failed');
        this.initial_ctx_error.set(error_message ?? 'Build failed');
      } else {
        this.initial_ctx_status.set('building');
      }
    } catch (e: any) {
      this.initial_ctx_status.set('failed');
      this.initial_ctx_error.set(e?.message ?? 'Failed to load initial context');
    }
  }

  ngOnDestroy(): void {
    this.ws_unsub_ctx?.();
  }
}
