const fs = require('fs');
const file = 'src/app/admin/jtbd/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Include archived tasks in completed tasks
let targetCompleted = `const completedTasks = allUserTasks
      .filter(t => t.status === 'completed' || t.status === 'pending_client_approval')`;
      
let replacementCompleted = `const completedTasks = allUserTasks
      .filter(t => t.status === 'completed' || t.status === 'pending_client_approval' || t.status === 'archived')`;

if (content.includes(targetCompleted)) {
    content = content.replace(targetCompleted, replacementCompleted);
    fs.writeFileSync(file, content);
    console.log('Fixed archived tasks rendering');
} else {
    // try removing tabs
    targetCompleted = `const completedTasks = allUserTasks\r\n      .filter(t => t.status === 'completed' || t.status === 'pending_client_approval')`;
    replacementCompleted = `const completedTasks = allUserTasks\r\n      .filter(t => t.status === 'completed' || t.status === 'pending_client_approval' || t.status === 'archived')`;
    
    if (content.includes(targetCompleted)) {
        content = content.replace(targetCompleted, replacementCompleted);
        fs.writeFileSync(file, content);
        console.log('Fixed archived tasks rendering (CRLF)');
    } else {
        // generic regex
        let regex = /const completedTasks = allUserTasks\s*\.filter\(t => t\.status === 'completed' \|\| t\.status === 'pending_client_approval'\)/;
        let repl = `const completedTasks = allUserTasks.filter(t => t.status === 'completed' || t.status === 'pending_client_approval' || t.status === 'archived')`;
        if (content.match(regex)) {
             content = content.replace(regex, repl);
             fs.writeFileSync(file, content);
             console.log('Fixed archived tasks rendering (Regex)');
        } else {
             console.log('Could not find completed tasks filter');
        }
    }
}
