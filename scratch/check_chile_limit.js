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
  
  // 1. Get branches for Chile with limit 400
  const queryLimit400 = {
    structuredQuery: {
      from: [{ collectionId: 'branches' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'pais' },
          op: 'EQUAL',
          value: { stringValue: 'Chile' }
        }
      },
      limit: 400
    }
  };

  const limit400Branches = await post(url, JSON.stringify(queryLimit400));
  console.log(`Branches returned for Chile (limit 400): ${limit400Branches.length}`);
  
  const rishtedarBranchesLimit = limit400Branches.filter(b => b.document && b.document.fields.restaurant_id.stringValue === 'rest_7ffdc914-05a');
  console.log(`Rishtedar branches found in Chile (limit 400): ${rishtedarBranchesLimit.length}`);
}

main().catch(console.error);
