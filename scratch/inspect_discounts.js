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
  
  // 1. Get active discounts
  const activeDiscountsQuery = {
    structuredQuery: {
      from: [{ collectionId: 'discounts' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'activo' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      }
    }
  };
  const discounts = await post(url, JSON.stringify(activeDiscountsQuery));
  console.log(`Active discounts found: ${discounts.length}`);
  
  const rishtedarDiscount = discounts.find(d => d.document && d.document.fields.restaurant_id.stringValue === 'rest_7ffdc914-05a');
  if (rishtedarDiscount) {
    console.log('Rishtedar active discount document fields:', JSON.stringify(rishtedarDiscount.document.fields, null, 2));
  } else {
    console.log('Rishtedar NOT found in active discounts!');
  }

  // 2. Let's see what is inside countries
  const countriesQuery = {
    structuredQuery: {
      from: [{ collectionId: 'countries' }]
    }
  };
  const countries = await post(url, JSON.stringify(countriesQuery));
  console.log('\nCountries:');
  for (const c of countries) {
    if (c.document) {
      console.log(`  - Name: "${c.document.fields.pais.stringValue}", ID: ${c.document.name.split('/').pop()}`);
    }
  }

  // 3. Let's check regions
  const regionsQuery = {
    structuredQuery: {
      from: [{ collectionId: 'regions' }]
    }
  };
  const regions = await post(url, JSON.stringify(regionsQuery));
  console.log('\nRegions:');
  for (const r of regions) {
    if (r.document) {
      console.log(`  - Name: "${r.document.fields.region.stringValue}", Pais ID: "${r.document.fields.pais_id ? r.document.fields.pais_id.stringValue : 'N/A'}"`);
    }
  }
}

main().catch(console.error);
