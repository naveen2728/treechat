const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");
const { Pool } = require("pg");

function createRoot() {
  return {
    id: "root",
    text: "",
    role: "root",
    expanded: true,
    children: [],
  };
}

function normalizeConversation(conversation) {
  const now = new Date().toISOString();
  const tree = conversation && typeof conversation.tree === "object" ? conversation.tree : createRoot();

  return {
    id: String(conversation?.id || ""),
    title: String(conversation?.title || "New chat"),
    tree,
    createdAt: String(conversation?.createdAt || now),
    updatedAt: String(conversation?.updatedAt || now),
  };
}

function resolveSqliteDbPath() {
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH;
  }

  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "treechat.db");
  }

  return path.join(__dirname, "data", "treechat.db");
}

const sqliteDbPath = resolveSqliteDbPath();
const databaseUrl = String(process.env.DATABASE_URL || "").trim();
const databaseProvider = databaseUrl ? "postgres" : "sqlite";
const dbPath = databaseProvider === "postgres" ? "supabase-postgres" : sqliteDbPath;

let sqliteDb = null;
let postgresPool = null;
let initPromise = null;

function ensureInitialized() {
  if (!initPromise) {
    initPromise = databaseProvider === "postgres" ? initializePostgres() : initializeSqlite();
  }

  return initPromise;
}

function initializeSqlite() {
  fs.mkdirSync(path.dirname(sqliteDbPath), { recursive: true });
  sqliteDb = new Database(sqliteDbPath);
  sqliteDb.pragma("journal_mode = WAL");

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tree_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

async function initializePostgres() {
  postgresPool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tree_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `);
}

async function listConversations() {
  await ensureInitialized();

  if (databaseProvider === "postgres") {
    const result = await postgresPool.query(`
      SELECT id, title, tree_json, created_at, updated_at
      FROM conversations
      ORDER BY updated_at DESC, id DESC
    `);

    return result.rows.map(parsePostgresRow);
  }

  const statement = sqliteDb.prepare(`
    SELECT id, title, tree_json, created_at, updated_at
    FROM conversations
    ORDER BY datetime(updated_at) DESC, id DESC
  `);

  return statement.all().map(parseSqliteRow);
}

async function getConversation(id) {
  await ensureInitialized();

  if (databaseProvider === "postgres") {
    const result = await postgresPool.query(
      `
        SELECT id, title, tree_json, created_at, updated_at
        FROM conversations
        WHERE id = $1
      `,
      [id],
    );

    return parsePostgresRow(result.rows[0]);
  }

  const statement = sqliteDb.prepare(`
    SELECT id, title, tree_json, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `);

  return parseSqliteRow(statement.get(id));
}

async function upsertConversation(conversation) {
  await ensureInitialized();

  const normalized = normalizeConversation(conversation);
  if (!normalized.id) {
    throw new Error("Conversation id is required");
  }

  if (databaseProvider === "postgres") {
    await postgresPool.query(
      `
        INSERT INTO conversations (id, title, tree_json, created_at, updated_at)
        VALUES ($1, $2, $3::jsonb, $4::timestamptz, $5::timestamptz)
        ON CONFLICT(id) DO UPDATE SET
          title = EXCLUDED.title,
          tree_json = EXCLUDED.tree_json,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        normalized.id,
        normalized.title,
        JSON.stringify(normalized.tree),
        normalized.createdAt,
        normalized.updatedAt,
      ],
    );

    return getConversation(normalized.id);
  }

  const statement = sqliteDb.prepare(`
    INSERT INTO conversations (id, title, tree_json, created_at, updated_at)
    VALUES (@id, @title, @tree_json, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      tree_json = excluded.tree_json,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `);

  statement.run({
    id: normalized.id,
    title: normalized.title,
    tree_json: JSON.stringify(normalized.tree),
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
  });

  return getConversation(normalized.id);
}

async function bulkUpsertConversations(conversations) {
  await ensureInitialized();

  const items = (Array.isArray(conversations) ? conversations : []).filter(
    (conversation) => conversation && conversation.id,
  );

  if (databaseProvider === "postgres") {
    const client = await postgresPool.connect();
    try {
      await client.query("BEGIN");
      for (const conversation of items) {
        const normalized = normalizeConversation(conversation);
        await client.query(
          `
            INSERT INTO conversations (id, title, tree_json, created_at, updated_at)
            VALUES ($1, $2, $3::jsonb, $4::timestamptz, $5::timestamptz)
            ON CONFLICT(id) DO UPDATE SET
              title = EXCLUDED.title,
              tree_json = EXCLUDED.tree_json,
              created_at = EXCLUDED.created_at,
              updated_at = EXCLUDED.updated_at
          `,
          [
            normalized.id,
            normalized.title,
            JSON.stringify(normalized.tree),
            normalized.createdAt,
            normalized.updatedAt,
          ],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return listConversations();
  }

  const statement = sqliteDb.prepare(`
    INSERT INTO conversations (id, title, tree_json, created_at, updated_at)
    VALUES (@id, @title, @tree_json, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      tree_json = excluded.tree_json,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `);

  const transaction = sqliteDb.transaction((batch) => {
    batch.forEach((conversation) => {
      const normalized = normalizeConversation(conversation);
      statement.run({
        id: normalized.id,
        title: normalized.title,
        tree_json: JSON.stringify(normalized.tree),
        created_at: normalized.createdAt,
        updated_at: normalized.updatedAt,
      });
    });
  });

  transaction(items);
  return listConversations();
}

async function deleteConversation(id) {
  await ensureInitialized();

  if (databaseProvider === "postgres") {
    const result = await postgresPool.query(
      `
        DELETE FROM conversations
        WHERE id = $1
      `,
      [id],
    );

    return result.rowCount > 0;
  }

  const statement = sqliteDb.prepare(`
    DELETE FROM conversations
    WHERE id = ?
  `);

  return statement.run(id).changes > 0;
}

function parseSqliteRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    tree: JSON.parse(row.tree_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parsePostgresRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    tree: row.tree_json,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

module.exports = {
  dbPath,
  databaseProvider,
  ensureInitialized,
  listConversations,
  getConversation,
  upsertConversation,
  bulkUpsertConversations,
  deleteConversation,
};
