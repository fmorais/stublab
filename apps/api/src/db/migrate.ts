import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrationsFolder = path.join(__dirname, '..', '..', 'drizzle')

const sqlite = new Database(process.env.DATABASE_URL ?? './stublab.db')
const db = drizzle(sqlite)

migrate(db, { migrationsFolder })
sqlite.close()
