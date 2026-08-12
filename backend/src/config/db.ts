import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.COGNODB_URI) missing.push('COGNODB_URI');
  if (!process.env.COGNODB_USER) missing.push('COGNODB_USER');
  if (!process.env.COGNODB_PASSWORD) missing.push('COGNODB_PASSWORD');

  if (missing.length > 0) {
    console.warn(`[Env Validation] Warning: Missing environment variables: ${missing.join(', ')}. Defaulting to fallback/localhost configuration.`);
  } else {
    console.log('[Env Validation] ✅ CognoDB environment variables validated successfully.');
  }

  return { valid: missing.length === 0, missing };
}

const uri = process.env.COGNODB_URI || 'bolt://localhost:7687';
const user = process.env.COGNODB_USER || 'neo4j';
const password = process.env.COGNODB_PASSWORD || 'password';

let driver: Driver | null = null;
let connectionTested = false;
let isConnected = false;
let connectionError: string | null = null;

export function getDriver(): Driver {
  if (!driver) {
    validateEnv();
    console.log(`[CognoDB] Initializing Neo4j driver connection to: ${uri}`);
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 50,
      connectionTimeout: 10000,
    });
  }
  return driver;
}

export function getSession(): Session {
  const d = getDriver();
  return d.session();
}

export async function testConnection(): Promise<{ connected: boolean; error?: string; uri: string }> {
  try {
    const d = getDriver();
    const serverInfo = await d.getServerInfo();
    console.log(`[CognoDB] Connected successfully to CognoDB instance: ${serverInfo.address} (${serverInfo.agent})`);
    isConnected = true;
    connectionError = null;
    connectionTested = true;
    return { connected: true, uri };
  } catch (err: any) {
    console.warn(`[CognoDB] Could not connect to CognoDB at ${uri}: ${err.message}`);
    isConnected = false;
    connectionError = err.message || 'Unknown database connection error';
    connectionTested = true;
    return { connected: false, error: connectionError || undefined, uri };
  }
}

export function getDBStatus() {
  return {
    tested: connectionTested,
    connected: isConnected,
    error: connectionError,
    uri,
  };
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    console.log('[CognoDB] Driver connection closed.');
  }
}
