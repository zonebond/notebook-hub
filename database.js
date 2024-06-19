const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// 生成12位UUID
const generateUUID = () => {
    return uuidv4().replace(/-/g, '').slice(0, 12);
};

// 连接SQLite数据库
let db = new sqlite3.Database('./notebooks.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the notebook_containers database.');
});

// 创建表
db.run(`CREATE TABLE IF NOT EXISTS notebook_containers (
    id TEXT PRIMARY KEY,
    name TEXT,
    port INTEGER,
    volume TEXT,
    token TEXT,
    cid TEXT,
    status TEXT DEFAULT 'running',
    ctime DATETIME
)`);

// 插入容器信息
const insert_container = (name, port, volume, token, cid, callback) => {
    const id = `hb.${generateUUID()}`;
    const ctime = new Date().toISOString();
    db.run(`INSERT INTO notebook_containers (id, name, port, volume, token, cid, ctime) VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, name, port, volume, token, cid, ctime], function(err) {
        if (err) {
            return callback(err);
        }
        callback(null, { id, name, port, volume, token, cid, ctime });
    });
};

// 更新容器状态
const update_container_status = (id, status, callback) => {
    db.run(`UPDATE notebook_containers SET status = ? WHERE id = ?`, [status, id], function(err) {
        if (err) {
            return callback(err);
        }
        callback(null, { id, status });
    });
};

// 查询所有容器信息
const get_containers = (status, callback) => {
    let query = `SELECT * FROM notebook_containers`;
    let params = [];

    if (status) {
        query += ` WHERE status = ?`;
        params.push(status);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return callback(err);
        }
        callback(null, rows);
    });
};

// 查询单个容器信息
const get_target_container = (id, callback) => {
    db.get(`SELECT * FROM notebook_containers WHERE id = ?`, [id], (err, row) => {
        if (err) {
            return callback(err);
        }
        callback(null, row);
    });
};

const delete_container = (id, callback) => {
    db.run(`DELETE FROM notebook_containers WHERE id = ?`, [id], function(err) {
        if (err) {
            return callback(err);
        }
        callback(null, { id, status: 'deleted' });
    });
}

module.exports = {
    insert_container,
    update_container_status,
    get_containers,
    get_target_container,
    delete_container,
};
