const fs = require("fs");
const os = require("os");
const path = require("path");
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
    userId: String(conversation?.userId || ""),
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
let SqliteDatabase = null;

function ensureInitialized() {
  if (!initPromise) {
    initPromise = databaseProvider === "postgres" ? initializePostgres() : initializeSqlite();
  }

  return initPromise;
}

function initializeSqlite() {
  if (!SqliteDatabase) {
    SqliteDatabase = require("better-sqlite3");
  }

  fs.mkdirSync(path.dirname(sqliteDbPath), { recursive: true });
  sqliteDb = new SqliteDatabase(sqliteDbPath);
  sqliteDb.pragma("journal_mode = WAL");

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      tree_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const columns = sqliteDb.prepare("PRAGMA table_info(conversations)").all();
  const hasUserId = columns.some((column) => column.name === "user_id");
  if (!hasUserId) {
    sqliteDb.exec("ALTER TABLE conversations ADD COLUMN user_id TEXT NOT NULL DEFAULT ''");
  }
}

async function initializePostgres() {
  postgresPool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      tree_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `);

  await postgresPool.query(`
    ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''
  `);
}

async function listConversations(userId) {
  await ensureInitialized();

  if (databaseProvider === "postgres") {
    const result = await postgresPool.query(
      `
      SELECT id, user_id, title, tree_json, created_at, updated_at
      FROM conversations
      WHERE user_id = $1
      ORDER BY updated_at DESC, id DESC
    `,
      [userId],
    );

    return result.rows.map(parsePostgresRow);
  }

  const statement = sqliteDb.prepare(`
    SELECT id, user_id, title, tree_json, created_at, updated_at
    FROM conversations
    WHERE user_id = ?
    ORDER BY datetime(updated_at) DESC, id DESC
  `);

  return statement.all(userId).map(parseSqliteRow);
}

async function getConversation(id, userId) {
  await ensureInitialized();

  if (databaseProvider === "postgres") {
    const result = await postgresPool.query(
      `
        SELECT id, user_id, title, tree_json, created_at, updated_at
        FROM conversations
        WHERE id = $1 AND user_id = $2
      `,
      [id, userId],
    );

    return parsePostgresRow(result.rows[0]);
  }

  const statement = sqliteDb.prepare(`
    SELECT id, user_id, title, tree_json, created_at, updated_at
    FROM conversations
    WHERE id = ? AND user_id = ?
  `);

  return parseSqliteRow(statement.get(id, userId));
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
        INSERT INTO conversations (id, user_id, title, tree_json, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz, $6::timestamptz)
        ON CONFLICT(id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          title = EXCLUDED.title,
          tree_json = EXCLUDED.tree_json,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        normalized.id,
        normalized.userId,
        normalized.title,
        JSON.stringify(normalized.tree),
        normalized.createdAt,
        normalized.updatedAt,
      ],
    );

    return getConversation(normalized.id, normalized.userId);
  }

  const statement = sqliteDb.prepare(`
    INSERT INTO conversations (id, user_id, title, tree_json, created_at, updated_at)
    VALUES (@id, @user_id, @title, @tree_json, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      title = excluded.title,
      tree_json = excluded.tree_json,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `);

  statement.run({
    id: normalized.id,
    user_id: normalized.userId,
    title: normalized.title,
    tree_json: JSON.stringify(normalized.tree),
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
  });

  return getConversation(normalized.id, normalized.userId);
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
            INSERT INTO conversations (id, user_id, title, tree_json, created_at, updated_at)
            VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz, $6::timestamptz)
            ON CONFLICT(id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              title = EXCLUDED.title,
              tree_json = EXCLUDED.tree_json,
              created_at = EXCLUDED.created_at,
              updated_at = EXCLUDED.updated_at
          `,
          [
            normalized.id,
            normalized.userId,
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

    return listConversations(items[0]?.userId || "");
  }

  const statement = sqliteDb.prepare(`
    INSERT INTO conversations (id, user_id, title, tree_json, created_at, updated_at)
    VALUES (@id, @user_id, @title, @tree_json, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
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
        user_id: normalized.userId,
        title: normalized.title,
        tree_json: JSON.stringify(normalized.tree),
        created_at: normalized.createdAt,
        updated_at: normalized.updatedAt,
      });
    });
  });

  transaction(items);
  return listConversations(items[0]?.userId || "");
}

async function deleteConversation(id, userId) {
  await ensureInitialized();

  if (databaseProvider === "postgres") {
    const result = await postgresPool.query(
      `
        DELETE FROM conversations
        WHERE id = $1 AND user_id = $2
      `,
      [id, userId],
    );

    return result.rowCount > 0;
  }

  const statement = sqliteDb.prepare(`
    DELETE FROM conversations
    WHERE id = ? AND user_id = ?
  `);

  return statement.run(id, userId).changes > 0;
}

function parseSqliteRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
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
    userId: row.user_id,
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
