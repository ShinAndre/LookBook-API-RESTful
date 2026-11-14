import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter((key) => process.env[key] === undefined);
if (missing.length > 0) {
  throw new Error(`Missing environment variables: ${missing.join(", ")}. Copy .env.example to .env and fill it in.`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const withTransaction = async (work) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export default pool;
