const http = require('https');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const url = 'https://firestore.googleapis.com/v1/projects/savr-f5076/databases/(default)/documents:runQuery';
  
  // Query all branches to check unique pais values
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'branches' }]
    }
  };
  
  const results = await post(url, JSON.stringify(query));
  console.log(`Total branches loaded: ${results.length}`);
  
  const countryCounts = {};
  let missingCountryCount = 0;
  
  for (const item of results) {
    if (item.document) {
      const f = item.document.fields;
      if (f.pais && f.pais.stringValue) {
        const country = f.pais.stringValue;
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      } else {
        missingCountryCount++;
      }
    }
  }
  
  console.log('\nBranches by Country:');
  console.log(JSON.stringify(countryCounts, null, 2));
  console.log(`Branches missing country field: ${missingCountryCount}`);
}

main().catch(console.error);
