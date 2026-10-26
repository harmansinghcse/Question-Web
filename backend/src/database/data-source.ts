import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

// Load .env if not already loaded in environment
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1]] = val.trim();
    }
  }
}

const caPath = path.resolve(process.cwd(), 'certs', 'ca.pem');
const caCert = fs.existsSync(caPath) ? fs.readFileSync(caPath, 'utf8') : undefined;

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: caCert
    ? {
        ca: caCert,
        rejectUnauthorized: true,
      }
    : undefined,
  synchronize: false,
  entities: [path.join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
});
