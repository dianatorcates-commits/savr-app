async function run() {
  try {
    const res = await fetch("https://github.com/dianatorcates-commits/savr-app/issues/93");
    const html = await res.text();
    console.log("Status:", res.status);
    
    // Find Title
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) {
      console.log("Title:", titleMatch[1].trim());
    }

    const descMatch = html.match(/<div class="[^"]*markdown-body[^"]*"[^>]*>([\s\S]*?)<\/div>/)
      || html.match(/<td class="d-block comment-body[^>]*>([\s\S]*?)<\/td>/) 
      || html.match(/<div class="edit-comment-hide[^>]*>([\s\S]*?)<\/div>/)
      || html.match(/<td class="[^"]*comment-body[^"]*"[^>]*>([\s\S]*?)<\/td>/);
      
    if (descMatch) {
      console.log("Description found!");
      console.log(descMatch[1].replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim());
    } else {
      console.log("No description match found in HTML. Length of HTML:", html.length);
      const fs = await import('fs');
      fs.writeFileSync('scratch/issue_93.html', html);
      console.log("Saved HTML to scratch/issue_93.html");
    }
  } catch (err) {
    console.error(err);
  }
}
run();
