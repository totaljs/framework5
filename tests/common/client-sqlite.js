/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

const PORT = 8493;
const Fs = require('fs');
const Path = require('path');
const Os = require('os');

try {
	require('node:sqlite');
} catch (e) {
	console.log('The test is skipped: this version of Node.js has no "node:sqlite" module');
	process.exit(0);
}

const SQLite = require('../../client-sqlite');
const filename = Path.join(Os.tmpdir(), 'total5-client-sqlite-' + process.pid + '.db');

function cleanup() {
	for (let ext of ['', '-journal', '-wal', '-shm']) {
		try {
			Fs.rmSync(filename + ext, { force: true, maxRetries: 10, retryDelay: 100 });
		} catch (e) {}
	}
}

CONF.$imprint = false;

F.run({ port: PORT, release: true, watcher: false });

ON('ready', function() {

	Test.push('SQLite client', function(next) {

		var arr = [];

		// A single connection to the in-memory database
		arr.push(async function(resume) {

			var check = (name, ok, detail) => Test.print(name, ok ? null : ('Unexpected value: ' + (typeof(detail) === 'string' ? detail : JSON.stringify(detail))));

			try {

				var client = await new Promise((resolve, reject) => SQLite.connect(':memory:', (err, client) => err ? reject(err) : resolve(client)));
				var dt = new Date('2026-05-04T10:20:30.123Z');
				var response;

				// Multiple statements with a trigger
				response = await client.query(`
					-- tables; with a semicolon in the comment
					CREATE TABLE tbl_user (id INTEGER PRIMARY KEY, name TEXT, price NUMERIC, isactive BOOLEAN, dtcreated DATETIME, data JSON, body BLOB, total INTEGER, dtupdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
					CREATE TABLE tbl_log (id INTEGER PRIMARY KEY, message VARCHAR(50));
					/* a trigger; with statements */
					CREATE TRIGGER trg_user AFTER INSERT ON tbl_user BEGIN
						INSERT INTO tbl_log (message) VALUES ('created; ' || CASE WHEN NEW.isactive THEN 'active' ELSE 'inactive' END);
						INSERT INTO tbl_log (message) VALUES ('second');
					END;
					SELECT 1 AS value;
				`);
				check('Multiple statements with a trigger', response instanceof Array && response.length === 4 && response[0].command === 'CREATE' && response[2].command === 'CREATE' && response[3].rows[0].value === 1, response);

				// PostgreSQL parameters with all types
				response = await client.query('INSERT INTO tbl_user (name, price, isactive, dtcreated, data, body, total) VALUES ($2, $1, $3, $4, $5, $6, $7)', [12.5, 'Peter', true, dt, { tags: ['a', 'b'], created: dt }, Buffer.from('total'), 9007199254740993n]);
				check('INSERT with "$1" parameters', response.command === 'INSERT' && response.rowCount === 1 && response.lastid === 1 && response.rows.length === 0, response);

				response = await client.query('SELECT * FROM tbl_user WHERE id=$1', [1]);
				var row = response.rows[0] || {};
				check('SELECT returns rows and fields', response.command === 'SELECT' && response.rowCount === 1 && response.fields.length === 9 && response.fields[3].name === 'isactive' && response.fields[3].type === 'BOOLEAN', response.fields);
				check('Types: text and number', row.id === 1 && row.name === 'Peter' && row.price === 12.5, row);
				check('Types: boolean', row.isactive === true, row.isactive);
				check('Types: date', row.dtcreated instanceof Date && row.dtcreated.getTime() === dt.getTime(), row.dtcreated);
				check('Types: JSON with dates', row.data && row.data.tags[1] === 'b' && row.data.created instanceof Date, row.data);
				check('Types: BLOB as Buffer', Buffer.isBuffer(row.body) && row.body.toString('utf8') === 'total', row.body + '');
				check('Types: a big integer as a string', row.total === '9007199254740993', row.total + '');
				check('Types: CURRENT_TIMESTAMP is read as UTC', row.dtupdated instanceof Date && Math.abs(row.dtupdated.getTime() - Date.now()) < 60000, row.dtupdated);

				// The trigger
				response = await client.query('SELECT message FROM tbl_log ORDER BY id');
				check('The trigger has two statements', response.rowCount === 2 && response.rows[0].message === 'created; active' && response.rows[1].message === 'second', response.rows);

				// "?" parameters, "$5" in the string isn't a parameter
				response = await client.query('INSERT INTO tbl_user (name, isactive) VALUES (?, ?) RETURNING id, name', ['costs $5', false]);
				check('INSERT with "?" parameters and RETURNING', response.rowCount === 1 && response.rows[0].id === 2 && response.rows[0].name === 'costs $5', response);

				// Named parameters
				response = await client.query('SELECT id, isactive, price FROM tbl_user WHERE name=:name', { name: 'costs $5' });
				check('Named parameters and NULL values', response.rowCount === 1 && response.rows[0].id === 2 && response.rows[0].isactive === false && response.rows[0].price === null, response.rows);

				// Changes
				response = await client.query('UPDATE tbl_user SET price=$1', [5]);
				check('UPDATE returns the count of changed rows', response.command === 'UPDATE' && response.rowCount === 2, response);

				response = await client.query('CREATE TABLE tbl_empty (id INTEGER)');
				check('CREATE has no changed rows', response.command === 'CREATE' && response.rowCount === 0, response);

				response = await client.query('');
				check('An empty query', response.command === '' && response.rowCount === 0 && response.rows.length === 0, response);

				// A changed schema
				await client.query('SELECT * FROM tbl_log');
				await client.query('ALTER TABLE tbl_log ADD COLUMN isread BOOLEAN DEFAULT 1');
				response = await client.query('SELECT * FROM tbl_log');
				check('A changed schema is applied', response.fields.length === 3 && response.rows[0].isread === true, response);

				// Errors
				var error = null;
				try {
					await client.query('SELEC 1');
				} catch (e) {
					error = e;
				}
				response = await client.query('SELECT 1 AS value');
				check('An error doesn\'t close the connection', error && response.rows[0].value === 1, error + '');

				error = null;
				try {
					await client.query('SELECT $1 AS a; SELECT $1 AS b', [1]);
				} catch (e) {
					error = e;
				}
				check('Multiple statements can\'t have parameters', !!error, error + '');

				// Transactions
				await client.query('BEGIN');
				var status = client.status;
				await client.query('DELETE FROM tbl_log');
				await client.query('ROLLBACK');
				response = await client.query('SELECT COUNT(*) AS count FROM tbl_log');
				check('Transactions', status === 'T' && client.status === 'I' && response.rows[0].count === 4, status + ', ' + client.status + ', ' + JSON.stringify(response.rows));

				// Callbacks are called in the order of the queries
				var order = [];
				client.query('SELECT 1', () => order.push(1));
				client.query('SELECT 2', () => order.push(2));
				await new Promise(resolve => client.end(resolve));
				check('The connection is closed after pending queries', order.join(',') === '1,2' && client.closed, order.join(','));

				error = null;
				try {
					await client.query('SELECT 1');
				} catch (e) {
					error = e;
				}
				check('A closed connection returns an error', !!error, error + '');

			} catch (e) {
				Test.print('SQLite client', e);
			}

			resume();
		});

		// Pooling
		arr.push(async function(resume) {

			var check = (name, ok, detail) => Test.print(name, ok ? null : ('Unexpected value: ' + (typeof(detail) === 'string' ? detail : JSON.stringify(detail))));

			cleanup();

			try {

				var connect = pool => new Promise((resolve, reject) => pool.connect((err, client) => err ? reject(err) : resolve(client)));
				var pool = SQLite.pool('sqlite://' + filename.replace(/\\/g, '/') + '?timeout=3000', 3);
				var response;

				await pool.query('CREATE TABLE tbl_item (id INTEGER PRIMARY KEY, name TEXT)');
				await pool.query('INSERT INTO tbl_item (name) VALUES ($1)', ['A']);

				// A locked database: the second connection waits for the first one
				var a = await connect(pool);
				var b = await connect(pool);
				var ticks = Date.now();

				await a.query('BEGIN IMMEDIATE');
				await a.query('INSERT INTO tbl_item (name) VALUES ($1)', ['B']);
				setTimeout(() => a.query('COMMIT', NOOP), 300);

				response = await b.query('INSERT INTO tbl_item (name) VALUES ($1)', ['C']);
				ticks = Date.now() - ticks;
				check('A query waits for a locked database', a !== b && response.rowCount === 1 && ticks >= 250 && ticks < 2500, ticks + ' ms');

				// An unfinished transaction is rolled back when the connection is released
				await a.query('BEGIN');
				await a.query('DELETE FROM tbl_item');
				a.release();
				b.release();

				response = await pool.query('SELECT COUNT(*) AS count FROM tbl_item');
				check('A released connection rolls back its transaction', response.rows[0].count === 3 && pool.clients.length === 2 && pool.idle.length === 2, response.rows[0].count + ', ' + pool.clients.length + ', ' + pool.idle.length);

				await new Promise(resolve => pool.end(resolve));
				check('The pool is closed', pool.clients.length === 0, pool.clients.length + '');

				// The timeout of a locked database
				var locker = await new Promise((resolve, reject) => SQLite.connect(filename, (err, client) => err ? reject(err) : resolve(client)));
				var waiter = await new Promise((resolve, reject) => SQLite.connect({ filename: filename, timeout: 200 }, (err, client) => err ? reject(err) : resolve(client)));
				var error = null;

				await locker.query('BEGIN IMMEDIATE');
				ticks = Date.now();

				try {
					await waiter.query('INSERT INTO tbl_item (name) VALUES ($1)', ['D']);
				} catch (e) {
					error = e;
				}

				ticks = Date.now() - ticks;
				check('A locked database returns an error after the timeout', error && error.errcode === 5 && ticks >= 150 && ticks < 2000, error + ' ' + ticks + ' ms');

				locker.close();
				waiter.close();

				// The pool of the in-memory database has one connection that is kept open
				var memory = SQLite.pool(':memory:', 5);
				await memory.query('CREATE TABLE tbl_memory (id INTEGER)');
				await memory.query('INSERT INTO tbl_memory VALUES (1)');
				response = await memory.query('SELECT COUNT(*) AS count FROM tbl_memory');
				check('The pool of the in-memory database keeps its data', memory.max === 1 && response.rows[0].count === 1, response.rows);
				await new Promise(resolve => memory.end(resolve));

			} catch (e) {
				Test.print('SQLite pool', e);
			}

			cleanup();
			resume();
		});

		arr.async(next);
	});

	Test.run();
});
