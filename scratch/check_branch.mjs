import { getBranches } from '../src/services/branches.js';
import { db } from '../src/services/firebase.js';

async function check() {
  try {
    const branches = await getBranches();
    if (branches.length > 0) {
      console.log('Sample branch:', JSON.stringify(branches[0], null, 2));
    } else {
      console.log('No branches found.');
    }
  } catch (e) {
    console.error(e);
  }
}
check();
