import { Target, Activity, Clock, CheckCircle2, Eye } from 'lucide-react';

interface PersonalDeskProps {
  viewedUser: any;
  isViewingSelf: boolean;
  allUserTasks: any[];
}

function getRoleLabel(role?: string): string {
  if (!role) return 'Designer';
  switch (role.toLowerCase()) {
    case 'admin':
      return 'Diretor Criativo';
    case 'gestor':
      return 'Gestor de Projetos';
    case 'colaborador':
      return 'Designer';
    default:
      return role;
  }
}

export default function PersonalDesk({
  viewedUser,
  isViewingSelf,
  allUserTasks = []
}: PersonalDeskProps) {
  // Current playing task (in_progress)
  const currentTask = allUserTasks.find((t) => t.status === 'in_progress');

  // Pending hours calculation
  const activeTasks = allUserTasks.filter((t) =>
    ['pending', 'in_progress', 'review'].includes(t.status)
  );
  const totalEstMinutes = activeTasks.reduce(
    (acc, t) => acc + (t.estimated_time || 0),
    0
  );
  const cargaHoras = Math.floor(totalEstMinutes / 60);
  const cargaMin = totalEstMinutes % 60;
  const cargaFormatada =
    cargaMin > 0 ? `${cargaHoras}h ${cargaMin}m` : `${cargaHoras}h`;

  // Efficiency calculation
  const completedTasksCount = allUserTasks.filter(
    (t) => t.status === 'completed'
  ).length;
  const totalTasksCount = allUserTasks.length;
  const eficiencia =
    totalTasksCount === 0
      ? 0
      : Math.round((completedTasksCount / totalTasksCount) * 100);

  const userName = viewedUser?.nome || viewedUser?.name || 'Membro da Equipe';
  const userRole = getRoleLabel(viewedUser?.role);

  return (
    <div className="shrink-0 flex flex-col w-full animate-[fadeInUp_0.5s_ease-out]">
      <div className="w-full relative overflow-hidden rounded-[2.5rem] min-h-[370px] p-6 md:p-8 flex flex-col justify-between border border-white/10">
        {/* Full Card Background: Avatar or Rich Terracotta/Charcoal Gradient */}
        {viewedUser?.avatar_url ? (
          <>
            <img
              src={viewedUser.avatar_url}
              alt={userName}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black/95 pointer-events-none" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#17171a] via-[var(--color-atelier-grafite)] to-[#4a2420] pointer-events-none" />
            <div className="absolute right-[-10%] top-[-10%] w-[300px] h-[300px] bg-[var(--color-atelier-terracota)]/25 rounded-full blur-[70px] pointer-events-none" />
          </>
        )}

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
          {/* TOP Section: Mode Label */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
              {isViewingSelf ? (
                <CheckCircle2 size={12} className="text-[var(--color-atelier-terracota)]" />
              ) : (
                <Eye size={12} className="text-[var(--color-atelier-terracota)]" />
              )}
              {isViewingSelf ? 'Meu Espaço' : 'Visão de Gestão'}
            </span>
          </div>

          {/* MIDDLE Section: Role Badge & Name (Ocupação acima do nome) */}
          <div>
            <div className="mb-2 inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-white/10 text-[var(--color-atelier-creme)] backdrop-blur-md border border-white/15">
              {userRole}
            </div>
            <h2 className="font-elegant text-3xl md:text-4xl text-white tracking-wide leading-tight">
              {userName}
            </h2>
          </div>

          {/* BOTTOM Section: Only rendered when there is an active task running */}
          {currentTask && (
            <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                      Executando agora
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">
                    {currentTask.title}
                  </p>
                </div>
              </div>

              {/* Decorative Progress Bar */}
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[var(--color-atelier-terracota)] to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}