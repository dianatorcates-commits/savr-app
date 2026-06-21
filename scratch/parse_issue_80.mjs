import fs from 'fs';

function run() {
  const html = fs.readFileSync('scratch/issue_80.html', 'utf8');
  
  // Look for comment body using various GitHub HTML patterns
  const matches = [...html.matchAll(/<div class="[^"]*markdown-body[^"]*"[^>]*>([\s\S]*?)<\/div>/g)];
  if (matches.length > 0) {
    console.log("Markdown body matches found:", matches.length);
    matches.forEach((m, idx) => {
      console.log(`--- Match ${idx + 1} ---`);
      console.log(m[1].replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim());
    });
  } else {
    const matches2 = [...html.matchAll(/<td class="[^"]*comment-body[^"]*"[^>]*>([\s\S]*?)<\/td>/g)];
    if (matches2.length > 0) {
      console.log("Comment body matches found:", matches2.length);
      matches2.forEach((m, idx) => {
        console.log(`--- Match ${idx + 1} ---`);
        console.log(m[1].replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim());
      });
    } else {
      console.log("No markdown-body or comment-body matches found.");
    }
  }
}

run();
