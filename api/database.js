import pg from "pg";

const { Pool } = pg;

// pg avtomatik PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT o'qiydi
const pool = new Pool();

// Tablelarni yaratish
export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(255) UNIQUE,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS food_analyses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      image_url TEXT,
      result TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Database tables ready");
}

// USER functions
export async function createUser(name, email, avatar_url = null) {
  const result = await pool.query(
    `INSERT INTO users (name, email, avatar_url)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = $1
     RETURNING *`,
    [name, email, avatar_url]
  );
  return result.rows[0];
}

export async function getUserById(id) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

// CONVERSATION functions
export async function createConversation(userId, title = "Yangi suhbat") {
  const result = await pool.query(
    `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *`,
    [userId, title]
  );
  return result.rows[0];
}

export async function getConversationsByUser(userId) {
  const result = await pool.query(
    `SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

// MESSAGE functions
export async function addMessage(conversationId, role, content) {
  const result = await pool.query(
    `INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING *`,
    [conversationId, role, content]
  );
  return result.rows[0];
}

export async function getMessagesByConversation(conversationId) {
  const result = await pool.query(
    `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );
  return result.rows;
}

// FOOD ANALYSIS functions
export async function saveFoodAnalysis(userId, imageUrl, result) {
  const res = await pool.query(
    `INSERT INTO food_analyses (user_id, image_url, result) VALUES ($1, $2, $3) RETURNING *`,
    [userId, imageUrl, result]
  );
  return res.rows[0];
}

export async function getFoodAnalysesByUser(userId) {
  const result = await pool.query(
    `SELECT * FROM food_analyses WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export default pool;
