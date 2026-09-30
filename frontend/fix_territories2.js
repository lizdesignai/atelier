const fs = require('fs'); 
let code = fs.readFileSync('src/components/brand/Territories.tsx', 'utf-8'); 
code = code.replace(
  "const [isSubmitting, setIsSubmitting] = useState(false);",
  "const [isSubmitting, setIsSubmitting] = useState(false);\n  const isEvaluated = status === 'evaluated';"
);
fs.writeFileSync('src/components/brand/Territories.tsx', code);
