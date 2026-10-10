const API = 'https://xzox8eatg9.execute-api.ap-south-1.amazonaws.com';

async function test() {
  console.log("\n7. GET /pickups (List)");
  let res = await fetch(`${API}/pickups`);
  const list = await res.json();
  console.log(`Total pickups: ${list.items?.length}, First ID: ${list.items?.[0]?.id}`);
}

test().catch(console.error);
