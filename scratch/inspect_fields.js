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
  
  // Get 10 random discounts
  const queryDiscounts = {
    structuredQuery: {
      from: [{ collectionId: 'discounts' }],
      limit: 10
    }
  };
  const discounts = await post(url, JSON.stringify(queryDiscounts));
  console.log('Sample Discount Fields:');
  if (discounts.length > 0 && discounts[0].document) {
    console.log(Object.keys(discounts[0].document.fields));
  }

  // Get 10 random restaurants
  const queryRestaurants = {
    structuredQuery: {
      from: [{ collectionId: 'restaurants' }],
      limit: 10
    }
  };
  const restaurants = await post(url, JSON.stringify(queryRestaurants));
  console.log('\nSample Restaurant Fields:');
  if (restaurants.length > 0 && restaurants[0].document) {
    console.log(Object.keys(restaurants[0].document.fields));
  }
}

main().catch(console.error);
