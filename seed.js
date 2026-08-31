const { createClient } = require('@libsql/client');
const turso = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  await turso.execute('CREATE TABLE IF NOT EXISTS users (phone TEXT PRIMARY KEY, name TEXT)');
  await turso.execute(`INSERT OR IGNORE INTO users (phone, name) VALUES ('9876543210', 'Rahul Kumar'), ('9998887776', 'Papa'), ('1122334455', 'Neha')`);
  console.log('Users inserted successfully');
}
run();
