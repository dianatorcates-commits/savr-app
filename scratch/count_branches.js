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
  
  // 1. Get branches for Chile & RM without limit
  const queryAll = {
    structuredQuery: {
      from: [{ collectionId: 'branches' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'pais' },
                op: 'EQUAL',
                value: { stringValue: 'Chile' }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: 'region' },
                op: 'EQUAL',
                value: { stringValue: 'Región Metropolitana' }
              }
            }
          ]
        }
      }
    }
  };
  
  const allBranches = await post(url, JSON.stringify(queryAll));
  console.log(`Total branches in Chile / Región Metropolitana: ${allBranches.length}`);
  
  const rishtedarBranchesAll = allBranches.filter(b => b.document && b.document.fields.restaurant_id.stringValue === 'rest_7ffdc914-05a');
  console.log(`Rishtedar branches count (no limit): ${rishtedarBranchesAll.length}`);

  // 2. Get branches with limit of 400
  const queryLimit400 = {
    structuredQuery: {
      from: [{ collectionId: 'branches' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'pais' },
                op: 'EQUAL',
                value: { stringValue: 'Chile' }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: 'region' },
                op: 'EQUAL',
                value: { stringValue: 'Región Metropolitana' }
              }
            }
          ]
        }
      },
      limit: 400
    }
  };

  const limit400Branches = await post(url, JSON.stringify(queryLimit400));
  console.log(`Branches returned with limit 400: ${limit400Branches.length}`);
  
  const rishtedarBranchesLimit = limit400Branches.filter(b => b.document && b.document.fields.restaurant_id.stringValue === 'rest_7ffdc914-05a');
  console.log(`Rishtedar branches found in limit 400: ${rishtedarBranchesLimit.length}`);
}

main().catch(console.error);
