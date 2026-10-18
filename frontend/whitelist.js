const fs = require('fs');
let routeFile = 'src/app/api/db/query/route.ts';
let content = fs.readFileSync(routeFile, 'utf8');

if (!content.includes("'prospect_meetings'")) {
    content = content.replace(
        "'studio_diary'",
        "'studio_diary', 'prospect_meetings', 'leads'"
    );
    fs.writeFileSync(routeFile, content);
    console.log('Whitelisted prospect_meetings and leads in api/db/query');
} else {
    console.log('Already whitelisted');
}
