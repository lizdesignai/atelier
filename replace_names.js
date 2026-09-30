const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

const replacements = [
  { search: /White[- ]Label/gi, replace: 'Studio Veronna' },
  { search: /Estúdio/g, replace: 'Studio Veronna' },
  { search: /estúdio/g, replace: 'Studio Veronna' },
  { search: /Estudio/g, replace: 'Studio Veronna' },
  { search: /estudio/g, replace: 'Studio Veronna' },
  { search: />Studio</g, replace: '>Studio Veronna<' },
  { search: />Studio\.</g, replace: '>Studio Veronna.<' },
  { search: /'Studio'/g, replace: "'Studio Veronna'" },
  { search: /"Studio"/g, replace: '"Studio Veronna"' },
  { search: /Cliente Studio/g, replace: 'Cliente Studio Veronna' }
];

walk('./frontend/src', (err, files) => {
  if (err) throw err;
  
  files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    replacements.forEach(r => {
      content = content.replace(r.search, r.replace);
    });
    
    if (content !== original) {
      console.log('Updated: ' + file);
      fs.writeFileSync(file, content, 'utf8');
    }
  });
});
