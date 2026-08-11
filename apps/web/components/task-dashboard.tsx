'use client';

import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import clsx from 'clsx';
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Columns3,
  FolderKanban,
  GripVertical,
  LayoutDashboard,
  LoaderCircle,
  MoreHorizontal,
  Moon,
  Palette,
  Pencil,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  Tag,
  Trash2,
  UserRound,
  X
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createTask, deleteTask, guestSession, moveTask, updateTask, workspace } from '../lib/api';
import type { GuestSession, Task, TaskInput, TaskStatus, Workspace } from '../lib/types';

const columns: Array<{ status: TaskStatus; label: string; dot: string }> = [
  { status: 'TODO', label: 'To Do', dot: 'bg-slate-400' },
  { status: 'DOING', label: 'Doing', dot: 'bg-amber-400' },
  { status: 'COMPLETED', label: 'Completed', dot: 'bg-emerald-500' },
  { status: 'ON_HOLD', label: 'On Hold', dot: 'bg-rose-400' }
];

const accentOptions = [
  { id: 'black', label: 'Neutral', color: '#171717' },
  { id: 'violet', label: 'Violet', color: '#5b43cc' },
  { id: 'blue', label: 'Blue', color: '#2563eb' },
  { id: 'rose', label: 'Rose', color: '#e11d48' }
];

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const demoSession: GuestSession = {
  accessToken: 'local-demo-token',
  guestKey: 'local-demo-key',
  user: { id: 'local-demo-user', displayName: 'Guest user' },
  workspaceId: 'local-demo-workspace'
};
const demoWorkspace: Workspace = {
  id: 'local-demo-workspace',
  name: 'Dexter workspace',
  tasks: [
    { id: 'demo-1', title: 'Write API Documentation', description: null, status: 'TODO', assignee: 'Admin', dueDate: '2026-07-29T00:00:00.000Z', labels: ['Deployment'], sortOrder: 0, createdAt: '', updatedAt: '' },
    { id: 'demo-2', title: 'Implement Search Function', description: null, status: 'TODO', assignee: 'Admin', dueDate: '2026-07-29T00:00:00.000Z', labels: ['Development'], sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 'demo-3', title: 'Deploy to Production', description: null, status: 'TODO', assignee: 'Admin', dueDate: '2026-07-29T00:00:00.000Z', labels: ['Deployment'], sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: 'demo-4', title: 'Code Review Completed', description: null, status: 'DOING', assignee: 'Deployment', dueDate: '2026-07-29T00:00:00.000Z', labels: ['Deployment'], sortOrder: 0, createdAt: '', updatedAt: '' },
    { id: 'demo-5', title: 'Design Mockups Finalized', description: null, status: 'DOING', assignee: 'Designer', dueDate: '2026-07-30T00:00:00.000Z', labels: ['Design', 'Updated'], sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 'demo-6', title: 'Feature Testing Passed', description: null, status: 'COMPLETED', assignee: 'QA Team', dueDate: '2026-07-30T00:00:00.000Z', labels: ['Testing'], sortOrder: 0, createdAt: '', updatedAt: '' },
    { id: 'demo-7', title: 'UI Design Updated', description: null, status: 'COMPLETED', assignee: 'Designer', dueDate: '2026-07-31T00:00:00.000Z', labels: ['Design', 'Updated'], sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 'demo-8', title: 'Security Audit Scheduled', description: null, status: 'COMPLETED', assignee: 'Security', dueDate: '2026-08-01T00:00:00.000Z', labels: ['Audit', 'Scheduled'], sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: 'demo-9', title: 'UI Review', description: null, status: 'ON_HOLD', assignee: 'Designer', dueDate: '2026-08-02T00:00:00.000Z', labels: ['Review'], sortOrder: 0, createdAt: '', updatedAt: '' }
  ]
};

function statusLabel(status: TaskStatus) {
  return columns.find((column) => column.status === status)?.label ?? status;
}

function formatDate(value: string | null) {
  if (!value) return 'No due date';
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', timeZone: 'UTC' }).format(new Date(value));
}

function dueValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

type ModalState = { mode: 'create'; status: TaskStatus } | { mode: 'edit'; task: Task } | null;

export function TaskDashboard() {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [board, setBoard] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showFields, setShowFields] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [accent, setAccent] = useState('black');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [googleNotice, setGoogleNotice] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    const savedTheme = (localStorage.getItem('pyramid.theme') as 'light' | 'dark' | null) ?? 'light';
    const savedAccent = localStorage.getItem('pyramid.accent') ?? 'black';
    setTheme(savedTheme);
    setAccent(savedAccent);
    document.documentElement.dataset.theme = savedTheme;
    document.documentElement.dataset.accent = savedAccent;

    if (demoMode || localStorage.getItem('pyramid.guest-key')) void enterGuest();
    else setLoading(false);
  }, []);

  async function enterGuest() {
    setLoading(true);
    setError(null);
    try {
      if (demoMode) {
        setSession(demoSession);
        setBoard(demoWorkspace);
        return;
      }
      const nextSession = await guestSession();
      setSession(nextSession);
      setBoard(await workspace(nextSession.accessToken));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not load the workspace.');
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = useMemo(() => {
    if (!board) return [];
    const normalizedQuery = search.trim().toLowerCase();
    return board.tasks.filter((task) => {
      const matchesSearch = !normalizedQuery || [task.title, task.assignee, ...task.labels].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesSearch && (filter === 'ALL' || task.status === filter);
    });
  }, [board, filter, search]);

  function applyTheme(nextTheme: 'light' | 'dark') {
    setTheme(nextTheme);
    localStorage.setItem('pyramid.theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  function applyAccent(nextAccent: string) {
    setAccent(nextAccent);
    localStorage.setItem('pyramid.accent', nextAccent);
    document.documentElement.dataset.accent = nextAccent;
  }

  async function handleMove(event: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(event.active.id).replace('task:', '');
    const targetId = event.over ? String(event.over.id) : '';
    if (!targetId.startsWith('status:') || !session || !board) return;
    const targetStatus = targetId.replace('status:', '') as TaskStatus;
    const existingTask = board.tasks.find((task) => task.id === taskId);
    if (!existingTask || existingTask.status === targetStatus) return;
    const nextSortOrder = board.tasks.filter((task) => task.status === targetStatus).length;
    const optimistic = { ...existingTask, status: targetStatus, sortOrder: nextSortOrder };
    setBoard((current) => current ? { ...current, tasks: current.tasks.map((task) => task.id === taskId ? optimistic : task) } : current);
    if (demoMode) return;
    try {
      const saved = await moveTask(session.accessToken, taskId, targetStatus, nextSortOrder);
      setBoard((current) => current ? { ...current, tasks: current.tasks.map((task) => task.id === taskId ? saved : task) } : current);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Task status could not be changed.');
      setBoard((current) => current ? { ...current, tasks: current.tasks.map((task) => task.id === taskId ? existingTask : task) } : current);
    }
  }

  async function saveTask(input: TaskInput) {
    if (!session) return;
    try {
      if (demoMode) {
        if (modal?.mode === 'edit') {
          const saved: Task = { ...modal.task, ...input, description: input.description ?? null, dueDate: input.dueDate ?? null, labels: input.labels ?? [] };
          setBoard((current) => current ? { ...current, tasks: current.tasks.map((task) => task.id === saved.id ? saved : task) } : current);
          setSelectedTask(saved);
        } else {
          const saved: Task = { id: crypto.randomUUID(), title: input.title, description: input.description ?? null, status: input.status ?? 'TODO', assignee: input.assignee ?? 'Guest user', dueDate: input.dueDate ?? null, labels: input.labels ?? [], sortOrder: board?.tasks.filter((task) => task.status === (input.status ?? 'TODO')).length ?? 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          setBoard((current) => current ? { ...current, tasks: [...current.tasks, saved] } : current);
        }
        setModal(null);
        return;
      }
      if (modal?.mode === 'edit') {
        const saved = await updateTask(session.accessToken, modal.task.id, input);
        setBoard((current) => current ? { ...current, tasks: current.tasks.map((task) => task.id === saved.id ? saved : task) } : current);
        setSelectedTask(saved);
      } else {
        const saved = await createTask(session.accessToken, input);
        setBoard((current) => current ? { ...current, tasks: [...current.tasks, saved] } : current);
      }
      setModal(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Task could not be saved.');
      throw nextError;
    }
  }

  async function removeTask(task: Task) {
    if (!session) return;
    try {
      if (demoMode) {
        setBoard((current) => current ? { ...current, tasks: current.tasks.filter((item) => item.id !== task.id) } : current);
        setSelectedTask(null);
        return;
      }
      await deleteTask(session.accessToken, task.id);
      setBoard((current) => current ? { ...current, tasks: current.tasks.filter((item) => item.id !== task.id) } : current);
      setSelectedTask(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Task could not be deleted.');
    }
  }

  if (loading) return <LoadingScreen />;
  if (!board || !session) return <LoginScreen error={error} googleNotice={googleNotice} onGuest={() => void enterGuest()} onGoogle={() => setGoogleNotice(true)} />;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => setActiveTask(board.tasks.find((task) => task.id === String(event.active.id).replace('task:', '')) ?? null)}
      onDragEnd={handleMove}
      onDragCancel={() => setActiveTask(null)}
    >
      <main className="min-h-screen overflow-hidden bg-[var(--page)]">
        <div className="flex min-h-screen">
          <Sidebar onSettings={() => setSettingsOpen(true)} />
          <section className="min-w-0 flex-1">
            <header className="surface flex h-[74px] items-center justify-between border-b line px-4 sm:px-7">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  <span>Workspace</span><span>/</span><span>{board.name}</span>
                </div>
                <h1 className="text-lg font-semibold tracking-normal">Tasks</h1>
              </div>
              <div className="flex items-center gap-2">
                <button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button>
                <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 rounded-md border line px-2 py-1.5 hover:bg-[var(--surface-muted)]" aria-label="Open profile settings">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-xs font-bold text-white">G</span>
                  <ChevronDown size={15} className="text-muted" />
                </button>
              </div>
            </header>

            <div className="px-4 py-5 sm:px-7">
              {error && <div className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><span>{error}</span><button className="icon-button !h-7 !w-7" onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button></div>}
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-[340px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={17} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} className="control h-10 w-full pl-9 pr-3 text-sm" placeholder="Search tasks" aria-label="Search tasks" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setShowFields((value) => !value)} className={clsx('inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm', showFields ? 'border-[var(--accent)] text-[var(--accent)]' : 'line text-muted')}><Columns3 size={16} />Fields</button>
                  <div className="relative">
                    <button onClick={() => setFilterOpen((value) => !value)} className={clsx('inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm', filter !== 'ALL' ? 'border-[var(--accent)] text-[var(--accent)]' : 'line text-muted')}><SlidersHorizontal size={16} />Filter</button>
                    {filterOpen && <FilterMenu value={filter} onChange={(value) => { setFilter(value); setFilterOpen(false); }} />}
                  </div>
                  <button onClick={() => setModal({ mode: 'create', status: 'TODO' })} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-[var(--accent-contrast)] hover:opacity-90"><Plus size={16} />Add task</button>
                </div>
              </div>

              <div className="scrollbar-thin overflow-x-auto pb-4">
                <div className="grid min-w-[1040px] grid-cols-4 gap-4">
                  {columns.map((column) => (
                    <TaskColumn
                      key={column.status}
                      column={column}
                      tasks={filteredTasks.filter((task) => task.status === column.status).sort((a, b) => a.sortOrder - b.sortOrder)}
                      showFields={showFields}
                      onAdd={() => setModal({ mode: 'create', status: column.status })}
                      onOpen={setSelectedTask}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} showFields={showFields} overlay /> : null}</DragOverlay>
      {modal && <TaskModal modal={modal} onClose={() => setModal(null)} onSave={saveTask} />}
      {selectedTask && <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} onEdit={() => { setModal({ mode: 'edit', task: selectedTask }); setSelectedTask(null); }} onDelete={() => void removeTask(selectedTask)} />}
      {settingsOpen && <SettingsPanel theme={theme} accent={accent} onClose={() => setSettingsOpen(false)} onTheme={applyTheme} onAccent={applyAccent} />}
    </DndContext>
  );
}

function Sidebar({ onSettings }: { onSettings: () => void }) {
  return (
    <aside className="surface hidden w-[218px] shrink-0 border-r line lg:flex lg:flex-col">
      <div className="flex h-[74px] items-center gap-2 border-b line px-5"><div className="grid h-7 w-7 place-items-center rounded-md bg-[var(--accent)] text-[var(--accent-contrast)]"><LayoutDashboard size={16} /></div><span className="font-semibold">Pyramid</span></div>
      <nav className="flex-1 px-3 py-5 text-sm">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-subtle">Workspace</p>
        <a className="mb-1 flex items-center gap-3 rounded-md bg-[var(--surface-muted)] px-3 py-2 font-medium" href="#tasks"><LayoutDashboard size={17} />Tasks</a>
        <a className="flex items-center gap-3 rounded-md px-3 py-2 text-muted hover:bg-[var(--surface-muted)]" href="#projects"><FolderKanban size={17} />Projects</a>
      </nav>
      <button onClick={onSettings} className="m-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted hover:bg-[var(--surface-muted)]"><Settings2 size={17} />Settings</button>
    </aside>
  );
}

function TaskColumn({ column, tasks, showFields, onAdd, onOpen }: { column: typeof columns[number]; tasks: Task[]; showFields: boolean; onAdd: () => void; onOpen: (task: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `status:${column.status}` });
  return (
    <section ref={setNodeRef} className={clsx('min-h-[420px] rounded-md border p-2 transition-colors', isOver ? 'border-[var(--accent)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-muted)]')}>
      <div className="flex items-center justify-between px-2 py-2"><div className="flex items-center gap-2 text-sm font-semibold"><span className={clsx('h-2 w-2 rounded-full', column.dot)} />{column.label}<span className="text-xs font-normal text-subtle">{tasks.length}</span></div><button onClick={onAdd} className="icon-button !h-7 !w-7" aria-label={`Add task to ${column.label}`}><Plus size={15} /></button></div>
      <div className="space-y-2">{tasks.map((task) => <TaskCard key={task.id} task={task} showFields={showFields} onOpen={onOpen} />)}</div>
      <button onClick={onAdd} className="mt-2 flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left text-sm text-muted hover:bg-[var(--surface)]"><Plus size={15} />Add task</button>
    </section>
  );
}

function TaskCard({ task, showFields, onOpen, overlay = false }: { task: Task; showFields: boolean; onOpen?: (task: Task) => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task:${task.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <article ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={() => onOpen?.(task)} className={clsx('surface group rounded-md border border-[var(--border)] p-3 shadow-[var(--shadow)] transition hover:border-neutral-300', isDragging && !overlay && 'opacity-40', overlay && 'w-[248px] rotate-1 shadow-xl')}>
      <div className="mb-3 flex items-start gap-2"><GripVertical className="mt-0.5 shrink-0 text-subtle opacity-0 transition group-hover:opacity-100" size={14} /><h3 className="flex-1 text-sm font-medium leading-5">{task.title}</h3><button onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpen?.(task); }} className="icon-button !h-6 !w-6 opacity-0 transition group-hover:opacity-100" aria-label={`More options for ${task.title}`}><MoreHorizontal size={15} /></button></div>
      {showFields && <><div className="mb-3 flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 text-muted"><span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-[9px] font-bold text-white">{task.assignee.slice(0, 1)}</span>{task.assignee}</span>{task.dueDate && <span className="flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-1 text-rose-600"><CalendarDays size={12} />{formatDate(task.dueDate)}</span>}</div><div className="flex flex-wrap gap-1">{task.labels.map((label) => <span key={label} className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-muted)] px-1.5 py-1 text-[11px] text-muted"><Tag size={10} />{label}</span>)}</div></>}
    </article>
  );
}

function FilterMenu({ value, onChange }: { value: TaskStatus | 'ALL'; onChange: (value: TaskStatus | 'ALL') => void }) {
  return <div className="surface absolute right-0 z-20 mt-2 w-44 rounded-md border line p-1 shadow-lg"><button className={clsx('flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-[var(--surface-muted)]', value === 'ALL' && 'font-semibold')} onClick={() => onChange('ALL')}><Check size={14} className={value === 'ALL' ? 'opacity-100' : 'opacity-0'} />All tasks</button>{columns.map((column) => <button key={column.status} className={clsx('flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-[var(--surface-muted)]', value === column.status && 'font-semibold')} onClick={() => onChange(column.status)}><Check size={14} className={value === column.status ? 'opacity-100' : 'opacity-0'} />{column.label}</button>)}</div>;
}

function TaskModal({ modal, onClose, onSave }: { modal: Exclude<ModalState, null>; onClose: () => void; onSave: (input: TaskInput) => Promise<void> }) {
  const initial = modal.mode === 'edit' ? modal.task : null;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [assignee, setAssignee] = useState(initial?.assignee ?? 'Guest user');
  const [status, setStatus] = useState<TaskStatus>(modal.mode === 'create' ? modal.status : initial?.status ?? 'TODO');
  const [dueDate, setDueDate] = useState(dueValue(initial?.dueDate ?? null));
  const [labels, setLabels] = useState(initial?.labels.join(', ') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(null);
    try {
      await onSave({ title, description, assignee, status, dueDate: dueDate ? new Date(dueDate).toISOString() : undefined, labels: labels.split(',').map((label) => label.trim()).filter(Boolean) });
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Task could not be saved.'); } finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Task editor"><form onSubmit={submit} className="surface w-full max-w-xl rounded-lg border line shadow-2xl"><div className="flex items-center justify-between border-b line px-5 py-4"><div><p className="text-sm font-semibold">{modal.mode === 'edit' ? 'Edit task' : 'Create task'}</p><p className="mt-1 text-xs text-muted">Keep task details concise and useful.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close task editor"><X size={18} /></button></div><div className="grid gap-4 p-5"><label className="grid gap-1.5 text-sm font-medium">Task title<input required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="control h-10 px-3 font-normal" placeholder="What needs to be done?" /></label><label className="grid gap-1.5 text-sm font-medium">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="control min-h-24 resize-y p-3 font-normal" placeholder="Add context for the team" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Status<select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className="control h-10 px-3 font-normal">{columns.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Assignee<input value={assignee} onChange={(event) => setAssignee(event.target.value)} className="control h-10 px-3 font-normal" /></label><label className="grid gap-1.5 text-sm font-medium">Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="control h-10 px-3 font-normal" /></label><label className="grid gap-1.5 text-sm font-medium">Labels<input value={labels} onChange={(event) => setLabels(event.target.value)} className="control h-10 px-3 font-normal" placeholder="Design, Updated" /></label></div>{error && <p className="text-sm text-red-600">{error}</p>}</div><div className="flex justify-end gap-2 border-t line px-5 py-4"><button type="button" onClick={onClose} className="h-9 rounded-md px-3 text-sm text-muted hover:bg-[var(--surface-muted)]">Cancel</button><button disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-[var(--accent-contrast)] disabled:opacity-60">{saving && <LoaderCircle size={15} className="animate-spin" />}{modal.mode === 'edit' ? 'Save changes' : 'Create task'}</button></div></form></div>;
}

function TaskDrawer({ task, onClose, onEdit, onDelete }: { task: Task; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  return <div className="fixed inset-0 z-30 bg-black/20" onMouseDown={onClose}><aside className="surface ml-auto flex h-full w-full max-w-md flex-col border-l line shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b line px-5 py-4"><span className="text-sm font-semibold">Task details</span><button onClick={onClose} className="icon-button" aria-label="Close task details"><X size={18} /></button></div><div className="flex-1 overflow-y-auto p-5"><div className="mb-5 flex items-start justify-between gap-3"><h2 className="text-xl font-semibold leading-7">{task.title}</h2><span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs text-muted">{statusLabel(task.status)}</span></div><p className="mb-6 whitespace-pre-wrap text-sm leading-6 text-muted">{task.description || 'No additional description has been added.'}</p><dl className="grid gap-4 text-sm"><div className="flex items-center justify-between border-b line pb-3"><dt className="text-muted">Assignee</dt><dd className="font-medium">{task.assignee}</dd></div><div className="flex items-center justify-between border-b line pb-3"><dt className="text-muted">Due date</dt><dd className="font-medium">{formatDate(task.dueDate)}</dd></div><div className="grid gap-2 border-b line pb-3"><dt className="text-muted">Labels</dt><dd className="flex flex-wrap gap-1">{task.labels.length ? task.labels.map((label) => <span className="rounded bg-[var(--surface-muted)] px-2 py-1 text-xs" key={label}>{label}</span>) : <span className="text-muted">No labels</span>}</dd></div></dl></div><div className="flex gap-2 border-t line p-4"><button onClick={onEdit} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border line text-sm font-medium hover:bg-[var(--surface-muted)]"><Pencil size={15} />Edit</button><button onClick={onDelete} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-[var(--danger-soft)] px-3 text-sm font-medium text-[var(--danger)]"><Trash2 size={15} />Delete</button></div></aside></div>;
}

function SettingsPanel({ theme, accent, onClose, onTheme, onAccent }: { theme: 'light' | 'dark'; accent: string; onClose: () => void; onTheme: (theme: 'light' | 'dark') => void; onAccent: (accent: string) => void }) {
  return <div className="fixed inset-0 z-30 bg-black/20" onMouseDown={onClose}><aside className="surface ml-auto flex h-full w-full max-w-md flex-col border-l line shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b line px-5 py-4"><span className="text-sm font-semibold">Profile settings</span><button onClick={onClose} className="icon-button" aria-label="Close settings"><X size={18} /></button></div><div className="flex min-h-0 flex-1"><nav className="w-32 shrink-0 border-r line p-3 text-sm"><button className="mb-1 flex w-full items-center gap-2 rounded bg-[var(--surface-muted)] px-2 py-2 text-left"><UserRound size={15} />Profile</button><button className="mb-1 flex w-full items-center gap-2 rounded px-2 py-2 text-left text-muted"><Sun size={15} />Theme</button><button className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-muted"><Palette size={15} />Color</button></nav><div className="flex-1 overflow-y-auto p-5"><h2 className="mb-6 text-xl font-semibold">Profile</h2><div className="mb-7 rounded-md border line"><div className="flex items-center justify-between border-b line px-4 py-4"><span className="text-sm">Profile picture</span><span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-xs font-bold text-white">G</span></div><div className="flex items-center justify-between border-b line px-4 py-4"><span className="text-sm">Email</span><span className="text-sm font-medium">guest@pyramid.app</span></div><div className="px-4 py-4"><p className="text-sm">Full name</p><p className="mt-1 text-sm text-muted">Guest user</p></div></div><section className="mb-7"><div className="mb-3 flex items-center gap-2"><Sun size={16} /><h3 className="font-semibold">Theme</h3></div><div className="grid grid-cols-2 gap-2"><button onClick={() => onTheme('light')} className={clsx('rounded-md border p-3 text-left text-sm', theme === 'light' ? 'border-[var(--accent)]' : 'line')}><Sun size={17} className="mb-4" />Light</button><button onClick={() => onTheme('dark')} className={clsx('rounded-md border p-3 text-left text-sm', theme === 'dark' ? 'border-[var(--accent)]' : 'line')}><Moon size={17} className="mb-4" />Dark</button></div></section><section><div className="mb-3 flex items-center gap-2"><Palette size={16} /><h3 className="font-semibold">Color</h3></div><div className="flex gap-2">{accentOptions.map((option) => <button title={option.label} onClick={() => onAccent(option.id)} key={option.id} className={clsx('grid h-9 w-9 place-items-center rounded-full border-2', accent === option.id ? 'border-[var(--text)]' : 'border-transparent')} style={{ background: option.color }} aria-label={`${option.label} color`}>{accent === option.id && <Check size={15} className="text-white" />}</button>)}</div></section></div></div></aside></div>;
}

function LoginScreen({ error, googleNotice, onGuest, onGoogle }: { error: string | null; googleNotice: boolean; onGuest: () => void; onGoogle: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-[var(--page)] p-5"><section className="w-full max-w-[390px]"><div className="mb-7 flex items-center justify-center gap-2 text-sm font-semibold"><span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--accent)] text-[var(--accent-contrast)]"><LayoutDashboard size={16} /></span>Pyramid</div><div className="surface rounded-[18px] border line p-6 shadow-[var(--shadow)] sm:p-8"><h1 className="text-center text-2xl font-semibold">Let&apos;s get back on track</h1><p className="mt-2 text-center text-sm text-muted">Enter your email below to login to your account.</p><label className="mt-6 block text-sm font-medium">Email<input disabled className="control mt-2 h-11 w-full cursor-not-allowed px-3 opacity-60" placeholder="you@example.com" /></label><button onClick={onGuest} className="mt-4 h-11 w-full rounded-md bg-[var(--accent)] text-sm font-medium text-[var(--accent-contrast)] hover:opacity-90">Continue as Guest</button><button onClick={onGoogle} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border line text-sm font-medium hover:bg-[var(--surface-muted)]"><span className="text-base font-bold">G</span>Login with Google</button>{googleNotice && <p className="mt-4 rounded-md bg-[var(--surface-muted)] px-3 py-2 text-center text-xs leading-5 text-muted">Google OAuth is not configured for this assessment demo. Use guest access to review the working product.</p>}{error && <p className="mt-4 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}</div><p className="mx-auto mt-5 max-w-[320px] text-center text-xs leading-5 text-subtle">By clicking continue, you agree to our Terms of Service and Privacy Policy.</p></section></main>;
}

function LoadingScreen() { return <main className="grid min-h-screen place-items-center bg-[var(--page)]"><div className="flex items-center gap-3 text-sm text-muted"><LoaderCircle className="animate-spin" size={20} />Loading your workspace</div></main>; }
function ErrorScreen({ message }: { message: string }) { return <main className="grid min-h-screen place-items-center bg-[var(--page)] p-6"><section className="surface max-w-md rounded-lg border line p-6 text-center shadow-[var(--shadow)]"><h1 className="mb-2 text-lg font-semibold">Workspace unavailable</h1><p className="text-sm leading-6 text-muted">{message}</p><p className="mt-4 text-xs text-subtle">Confirm that the API is running and NEXT_PUBLIC_API_URL is set correctly.</p></section></main>; }
