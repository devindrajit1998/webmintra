import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Mapping of corrupted Windows-1252 interpreted UTF-8 characters to actual UTF-8
  const replacements = {
    'â‚¹': '₹',
    'â€¦': '…',
    'â”€': '─',
    'â€”': '—',
    'âŒ˜': '⌘',
    'â€¢': '•',
    'â€“': '–', // en dash just in case
    'â€™': "’", // right single quotation mark
    'â€œ': '“',
    'â€': '”',
  };

  for (const [corrupted, fixed] of Object.entries(replacements)) {
    content = content.split(corrupted).join(fixed);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walkDir(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      fixFile(fullPath);
    }
  }
}

walkDir('f:/2026/indra/webmintra/frontend/src');
