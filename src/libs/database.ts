import path from 'path';
import {generateUniqueId} from "../backend/urlgen";
import { config } from "../backend/config";

let sqliteDb: any = null;

// SQLite
function connectSQLite() {
    const sqlite3 = require('sqlite3').verbose();
    sqliteDb =  new sqlite3.Database(path.join('backend','chatlogs.sqlite3.db'), (err: any) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the database.');
    });
    return sqliteDb;
}

function insertSqlite(db: any, instigator:string, members: string, log: object, timestampOpen:number, timestampClose:number) {
    const uri = generateUniqueId(log, timestampOpen);
    const insertSQL = `INSERT INTO chatlogs (id, instigator, members, log, timestampOpen, timestampClose) VALUES ('${uri}', '${instigator}', '${members}', '${JSON.stringify(log)}', '${timestampOpen}', '${timestampClose}')`;
    db.run(insertSQL, (err: any) => {
        if (err) {
            console.error(err.message);
            return err("Failed to insert into database");
        }
    });
    return uri;
}

function insertStorageSqlite(db: any, id: string, data: string) {
    const insertSQL = `INSERT INTO storage (id, data) VALUES ('${id}', '${data}')`;
    db.run(insertSQL, (err: any) => {
        if (err) {
            console.error(err.message);
            return err("Failed to insert into database");
        }
    });
}

function selectSqlite(db: any, table: string, id: string) {
    return new Promise((resolve, reject) => {
        const selectSQL = `SELECT * FROM ${table} WHERE id = '${id}'`;
        db.get(selectSQL, (err: any, row: any) => {
            if (err) {
                console.error(err.message);
                reject(new Error("Failed to select from database"));
            } else {
                resolve(row);
            }
        });
    });
}

function selectAllSqlite(db: any, table: string) {
    return new Promise((resolve, reject) => {
        const selectSQL = `SELECT id, members, instigator, timestampOpen FROM ${table}`;
        db.all(selectSQL, (err: any, rows: any) => {
            if (err) {
                console.error(err.message);
                reject(new Error("Failed to select from database"));
            } else {
                console.log(rows);
                resolve(rows);
            }
        });
    });
}

function removeSqlite(db: any, id: string) {

}

// MySQL/MariaDB
import * as mysql from 'mariadb';

function connectMySQL() {
    const pool = mysql.createPool({
        host: config.sqlHost,
        port: Number(config.sqlPort),
        user: config.sqlUser,
        password: config.sqlPass,
        database: config.sqlDatabase,
        connectionLimit: 5
    });
    return pool;
}

async function insertMySQL(db: any, table: string, instigator:string, members: string, log: object, timestampOpen:number, timestampClose:number) {
    const uri = generateUniqueId(log, timestampOpen);
    const conn = await db.getConnection();
    const res = conn.query(`INSERT INTO ${table} (id, instigator, members, log, timestampOpen, timestampClose) VALUES ('${uri}', '${instigator}', '${members}', '${JSON.stringify(log)}', '${timestampOpen}', '${timestampClose}')`);
    return uri;
}

async function insertStorageMySQL(db: any, id: string, data: string) {
    const conn = await db.getConnection();
    const res = conn.query(`INSERT INTO storage (id, data) VALUES ('${id}', '${data}')`);
}

async function selectMySQL(db: any, table: string, id: string) {
    const conn = await db.getConnection();
    const rows = await conn.query(`SELECT * FROM ${table} WHERE id = '${id}'`);
    return rows[0];

}

async function selectAllMySQL(db: any) {
    const conn = await db.getConnection();
    const rows = await conn.query(`SELECT * FROM ${config.table}`);
    return rows.map((row: any) => ({
        ...row,
        timestampOpen: row.timestampOpen.toString(),
        timestampClose: row.timestampClose.toString()
    }));
}

function removeMySQL(db: any, id: number) {

}


// Generic Functions
export function sqliteSetup(table: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const db = connectSQLite();
        const createTicketTableSQL = `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY UNIQUE, instigator TEXT, members TEXT, log JSON, timestampOpen INTEGER, timestampClose INTEGER)`;
        db.run(createTicketTableSQL, (err: any) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                console.log(`Table ${table} created or already exists.`);
                resolve();
            }
        });
        const createStorageTableSQL = `CREATE TABLE IF NOT EXISTS storage (id TEXT PRIMARY KEY UNIQUE, data TEXT)`;
        db.run(createStorageTableSQL, (err: any) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                console.log(`Table storage created or already exists.`);
                resolve();
            }
        });
    });
}

async function createDatabase(db: string) {
    console.log("Creating Database");
    let pool = mysql.createPool({
        host: config.sqlHost || "192.168.1.176",
        port: config.sqlPort || 3006,
        user: config.sqlUser || "root",
        password: config.sqlPass || "example",
        connectionLimit: 5 });
    let conn;
    let res;
    try {
        conn = await pool.getConnection();
        res = await conn.query(`CREATE DATABASE IF NOT EXISTS ${db}`);
        console.log("Create Database: ", res);
    } catch (err) {
        console.log(err);
    } finally {
        if (conn) conn.release();
    }
}

export async function mysqlSetup(table: string) {
    await createDatabase(config.sqlDatabase || "TicketBot");
    const pool = mysql.createPool({
        host: config.sqlHost ||"192.168.1.176",
        port: config.sqlPort || 3006,
        user: config.sqlUser || "root",
        password: config.sqlPass || "",
        database: config.sqlDatabase || "TicketBot",
        connectionLimit: 5 });
    let conn;
    let res;
    try {
        console.log("attempting conn");
        conn = await pool.getConnection()
        console.log("conn success");

        res = await conn.query(`CREATE TABLE IF NOT EXISTS ${table} (id VARCHAR(255) PRIMARY KEY, instigator TEXT, members TEXT, log JSON, timestampOpen BIGINT, timestampClose BIGINT)`);
        console.log(res)
        res =await conn.query(`CREATE TABLE IF NOT EXISTS storage (id VARCHAR(255) PRIMARY KEY, data VARCHAR(255))`);
        console.log(res)
    } catch (err) {
        console.log(err);
    } finally {
        if (conn) conn.release();
    }
}

export function Database() {
    const db_type: string = config.sqlServerType || 'sqlite';
    if (db_type === 'sqlite') {
        const db = connectSQLite();
        return {
            insert: (table: string, instigator:string, members: string, log: object, timestampOpen: number, timestampClose: number) => insertSqlite(db, instigator, members, log, timestampOpen, timestampClose),
            insertStorage: (id: string, data: string) => insertStorageSqlite(db, id, data),
            select: (table: string, id: string) => selectSqlite(db, table, id),
            remove: (id: string) => removeSqlite(db, id),
            selectAll: (table: string) => selectAllSqlite(db, table)
        };
    } else if (db_type === 'mysql') {
        const db = connectMySQL();
        return {
            insert: (table: string, instigator:string, members: string, log: object, timestampOpen: number, timestampClose: number) => insertMySQL(db, config.table, instigator, members, log, timestampOpen, timestampClose),
            insertStorage: (id: string, data: string) => insertStorageMySQL(db, id, data),
            select: (table: string, id: string) => selectMySQL(db, table, id),
            remove: (id: number) => removeMySQL(db, id),
            selectAll: () => selectAllMySQL(db)
        };
    } else {
        throw new Error(`Unsupported DB_TYPE: ${db_type}`);
    }
}