const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('frontend/src/app/admin/jtbd/components/TaskCard.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Insert manager flags after isPdf
const isPdfTarget = "const isPdf = displayImageUrl?.toLowerCase().includes('.pdf');";
const managerFlags = `const isPdf = displayImageUrl?.toLowerCase().includes('.pdf');

  const isCuradoriaTask = !!task.title?.toLowerCase().includes('curadoria');
  const isTerritoriesTask = !!(task.title?.toLowerCase().includes('território') || task.title?.toLowerCase().includes('territorio') || task.title?.toLowerCase().includes('caminho'));
  const isCalendarioTask = !!(task.title?.toLowerCase().includes('calendário') || task.title?.toLowerCase().includes('calendario'));
  const isCeremonyTask = !!(task.title?.toLowerCase().includes('cerimônia') || task.title?.toLowerCase().includes('cerimonia') || task.title?.toLowerCase().includes('apresentação') || task.title?.toLowerCase().includes('apresentacao')) && !!taskProject;
  const hasSpecializedManager = isCuradoriaTask || isTerritoriesTask || isCalendarioTask || isCeremonyTask;`;

if (!content.includes('isCuradoriaTask')) {
  content = content.replace(isPdfTarget, managerFlags);
}

// 2. Update modal container className to expand width when hasSpecializedManager
const modalTarget = "rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl max-w-lg border border-white/20 max-h-[85vh] sm:max-h-[90vh] h-auto my-auto";
const modalReplacement = "rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl ` + (hasSpecializedManager ? 'max-w-4xl' : 'max-w-lg') + ` border border-white/20 max-h-[85vh] sm:max-h-[90vh] h-auto my-auto";

if (content.includes(modalTarget)) {
  content = content.replace(modalTarget, modalReplacement);
}

// 3. Insert deliverable panels into scrollable body
const bodyTarget = '{/* SCROLLABLE BODY */}\n              <div className="p-5 sm:p-8 pt-4 sm:pt-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">';
const bodyTargetCRLF = '{/* SCROLLABLE BODY */}\r\n              <div className="p-5 sm:p-8 pt-4 sm:pt-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">';

const deliverablePanels = `
                {/* PAINÉIS DE ENTREGÁVEIS ESPECIALIZADOS */}
                {isCuradoriaTask && (
                  <div className="order-0">
                    <AdminCuradoriaManager
                      projectId={task.project_id}
                      taskId={task.id}
                      currentUser={currentUser}
                      onTaskUpdate={() => {
                        window.dispatchEvent(new CustomEvent('reloadTasks'));
                      }}
                    />
                  </div>
                )}

                {isTerritoriesTask && (
                  <div className="order-0">
                    <AdminTerritoriesManager
                      projectId={task.project_id}
                      taskId={task.id}
                      currentUser={currentUser}
                    />
                  </div>
                )}

                {isCalendarioTask && (
                  <div className="order-0">
                    <AdminCalendarioManager
                      projectId={task.project_id}
                      taskId={task.id}
                      currentUser={currentUser}
                      onTaskUpdate={() => {
                        window.dispatchEvent(new CustomEvent('reloadTasks'));
                      }}
                    />
                  </div>
                )}

                {isCeremonyTask && (
                  <div className="order-0">
                    <RevealCeremonyAdmin
                      project={taskProject}
                      onUpdate={() => getProjectByIdAction(task.project_id).then(setTaskProject)}
                    />
                  </div>
                )}`;

if (!content.includes('AdminCuradoriaManager projectId')) {
  if (content.includes(bodyTargetCRLF)) {
    content = content.replace(bodyTargetCRLF, bodyTargetCRLF + deliverablePanels);
  } else if (content.includes(bodyTarget)) {
    content = content.replace(bodyTarget, bodyTarget + deliverablePanels);
  }
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('TaskCard.tsx successfully updated!');
