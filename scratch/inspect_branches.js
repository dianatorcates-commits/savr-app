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
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'branches' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'restaurant_id' },
          op: 'EQUAL',
          value: { stringValue: 'rest_7ffdc914-05a' }
        }
      }
    }
  };
  
  const url = 'https://firestore.googleapis.com/v1/projects/savr-f5076/databases/(default)/documents:runQuery';
  const results = await post(url, JSON.stringify(query));
  
  for (const item of results) {
    if (item.document) {
      const doc = item.document;
      const f = doc.fields;
      console.log(`Branch ID: ${f.id ? f.id.stringValue : 'unknown'}`);
      console.log(`  Name: ${f.nombre_sucursal ? f.nombre_sucursal.stringValue : 'N/A'}`);
      console.log(`  Comuna: ${f.comuna ? f.comuna.stringValue : 'N/A'}`);
      console.log(`  Region: ${f.region ? f.region.stringValue : 'N/A'}`);
      console.log(`  Pais: ${f.pais ? f.pais.stringValue : 'N/A'}`);
      console.log('---');
    }
  }
}

main().catch(console.error);
