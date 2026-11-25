// Total.js Module: SQLite client
// A tiny dependency-free client for SQLite, it uses the built-in Node.js module "node:sqlite"
// The API is the same as the API of the PostgreSQL client (client-postgresql.js)
//
// const SQLite = require('./client-sqlite');
//
// A single connection:
// SQLite.connect('sqlite:///www/app/databases/app.db?wal=1', function(err, client) {
//     client.query('SELECT * FROM tbl_user WHERE id=$1', ['123'], function(err, response) {
//         console.log(response.rows, response.rowCount);
//         client.close();
//     });
// });
//
// Pooling:
// var pool = SQLite.pool('sqlite:///www/app/databases/app.db?wal=1', 10);
// pool.connect(function(err, client, release) {
//     client.query('SELECT 1 AS value', function(err, response) {
//         release(); // or client.release() or client.close()
//     });
// });
//
// Connection string:
// "sqlite:///absolute/path/app.db", "sqlite://relative/path/app.db", "sqlite://:memory:", ":memory:" or a filename
// ?wal=1          it switches the database to the WAL journal mode
// ?readonly=1     it opens the database for reading only
// ?foreignkeys=0  it disables foreign key constraints (enabled by default)
// ?timeout=5000   how long (in ms) a query waits for a locked database (default: 5000)
//
// Parameters:
// "$1, $2" or "?" with an array, ":name", "@name" or "$name" with an object
//
// IMPORTANT: "node:sqlite" is synchronous, so a query blocks the process until it is finished.

// Cache of parsed connection strings and SQL statements
const OPTIONS = new Map();
const PARSED = new Map();

const REG_DATE = /^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(:\d\d(\.\d+)?)?$/;
const REG_SIZE = /\(.*$/;
const BIGMAX = BigInt(Number.MAX_SAFE_INTEGER);
const BIGMIN = BigInt(Number.MIN_SAFE_INTEGER);
const EMPTY = [];

// Commands that change the schema: the prepared statements are released
const SCHEMA = { CREATE: 1, ALTER: 1, DROP: 1, ATTACH: 1, DETACH: 1, VACUUM: 1, PRAGMA: 1, REINDEX: 1 };

// Commands that return the count of changed rows
const CHANGES = { INSERT: 1, UPDATE: 1, DELETE: 1, REPLACE: 1, WITH: 1 };

var Sqlite = null;

// ============================================================================
// Types: declared type of the column (uppercase) -> parser(value)
// ============================================================================

const TYPES = {};

function parsebool(val) {
	return typeof(val) === 'string' ? (val === '1' || val === 'true' || val === 't') : !!val;
}

function jsondateparser(key, value) {
	return typeof(value) === 'string' && value.isJSONDate() ? new Date(value) : value;
}

function parsejson(val) {
	if (typeof(val) === 'string') {
		try {
			return JSON.parse(val, jsondateparser);
		} catch (e) {}
	}
	return val;
}

function parsedate(val) {

	var dt;

	if (typeof(val) === 'number') {
		// Unix time in seconds (a value lower than 100000000000) or in milliseconds
		dt = new Date(val < 1e11 && val > -1e11 ? (val * 1000) : val);
	} else if (typeof(val) === 'string') {
		// SQLite keeps "CURRENT_TIMESTAMP" and "datetime()" in UTC without a time zone
		dt = new Date(REG_DATE.test(val) ? (val.replace(' ', 'T') + 'Z') : val);
	} else
		return val;

	return isNaN(dt.getTime()) ? val : dt;
}

TYPES.BOOLEAN = parsebool;
TYPES.BOOL = parsebool;
TYPES.DATE = parsedate;
TYPES.DATETIME = parsedate;
TYPES.TIMESTAMP = parsedate;
TYPES.TIMESTAMPTZ = parsedate;
TYPES.JSON = parsejson;
TYPES.JSONB = parsejson;

// NOTE: an integer that doesn't fit into the JS number is returned as a string (like "bigint" in the PostgreSQL client)
// A parser can be changed via: require('./client-sqlite').types.DATE = val => val;

function tonumber(val) {
	return val <= BIGMAX && val >= BIGMIN ? Number(val) : val.toString();
}

// ============================================================================
// Serialization of parameters
// ============================================================================

function param(val) {
	switch (typeof(val)) {
		case 'undefined':
			return null;
		case 'boolean':
			return val ? 1 : 0;
		case 'object':
			if (val === null || ArrayBuffer.isView(val))
				return val;
			if (val instanceof Date)
				return val.toISOString();
			return JSON.stringify(val);
	}
	return val;
}

// ============================================================================
// Parser of SQL statements
// ============================================================================

function isword(c) {
	return (c > 64 && c < 91) || (c > 96 && c < 123) || c === 95;
}

// Splits SQL into statements: [{ sql: String, command: String, numbered: Boolean }]
// "numbered" means that the statement contains PostgreSQL parameters ($1, $2)
function parse(sql) {

	var output = PARSED.get(sql);
	if (output)
		return output;

	output = [];

	var length = sql.length;
	var beg = 0;
	var index = 0;
	var words = [];       // first words of the statement
	var last = '';        // the last token
	var prev = '';        // the token before the last token
	var numbered = false;
	var istoken = false;

	var flush = function(end) {
		if (istoken) {
			// "CREATE TRIGGER" contains statements, it ends with ";END;"
			var trigger = words[0] === 'CREATE' && (words[1] === 'TRIGGER' || ((words[1] === 'TEMP' || words[1] === 'TEMPORARY') && words[2] === 'TRIGGER'));
			if (trigger && end < length && !(last === 'END' && prev === ';')) {
				prev = last;
				last = ';';
				return;
			}
			output.push({ sql: sql.substring(beg, end).trim(), command: words[0] || '', numbered: numbered });
		}
		beg = end + 1;
		words = [];
		last = prev = '';
		numbered = istoken = false;
	};

	while (index < length) {

		var c = sql.charCodeAt(index);

		// Whitespace
		if (c === 32 || c === 9 || c === 10 || c === 13) {
			index++;
			continue;
		}

		// A comment: -- text
		if (c === 45 && sql.charCodeAt(index + 1) === 45) {
			index = sql.indexOf('\n', index);
			if (index === -1)
				index = length;
			continue;
		}

		// A comment: /* text */
		if (c === 47 && sql.charCodeAt(index + 1) === 42) {
			index = sql.indexOf('*/', index + 2);
			index = index === -1 ? length : (index + 2);
			continue;
		}

		// The end of the statement
		if (c === 59) {
			flush(index);
			index++;
			continue;
		}

		istoken = true;
		prev = last;

		// A string or a quoted name: 'text', "name", `name`, [name]
		if (c === 39 || c === 34 || c === 96 || c === 91) {
			var quote = c === 91 ? 93 : c;
			index++;
			while (index < length) {
				if (sql.charCodeAt(index) === quote) {
					// An escaped quote
					if (quote !== 93 && sql.charCodeAt(index + 1) === quote) {
						index += 2;
						continue;
					}
					break;
				}
				index++;
			}
			index++;
			last = '';
			continue;
		}

		// A word
		if (isword(c)) {
			var start = index;
			index++;
			while (index < length) {
				c = sql.charCodeAt(index);
				if (isword(c) || (c > 47 && c < 58))
					index++;
				else
					break;
			}
			last = sql.substring(start, index).toUpperCase();
			words.length < 3 && words.push(last);
			continue;
		}

		// A PostgreSQL parameter: $1
		if (c === 36) {
			c = sql.charCodeAt(index + 1);
			if (c > 47 && c < 58)
				numbered = true;
		}

		last = '';
		index++;
	}

	flush(length);

	PARSED.size > 1000 && PARSED.clear();
	PARSED.set(sql, output);
	return output;
}

// ============================================================================
// Options
// ============================================================================

function istrue(val) {
	return val === true || val === 1 || val === '1' || val === 'true';
}

// Parses a connection string or object with options
function parseoptions(opt) {

	if (opt && opt.$parsed)
		return opt;

	var output;

	if (typeof(opt) === 'string') {
		output = OPTIONS.get(opt);
		if (output)
			return output;
	}

	output = { $parsed: true, filename: ':memory:', readonly: false, foreignkeys: true, wal: false, timeout: 5000 };

	var connstring = typeof(opt) === 'string' ? opt : opt ? (opt.connectionString || opt.connstring) : null;

	if (connstring) {

		var filename = connstring;

		if ((/^sqlite:/i).test(connstring)) {

			filename = connstring.substring(7).replace(/^\/\//, '');

			var index = filename.indexOf('?');
			if (index !== -1) {
				for (var [key, val] of new URLSearchParams(filename.substring(index + 1))) {
					switch (key) {
						case 'wal':
						case 'readonly':
						case 'foreignkeys':
							output[key] = istrue(val);
							break;
						case 'timeout':
							output.timeout = +val || 0;
							break;
					}
				}
				filename = filename.substring(0, index);
			}

			try {
				filename = decodeURIComponent(filename);
			} catch (e) {}
		}

		if (filename)
			output.filename = filename;
	}

	if (opt && typeof(opt) === 'object') {

		for (var key of ['filename', 'timeout']) {
			if (opt[key] != null)
				output[key] = opt[key];
		}

		for (var key of ['wal', 'readonly', 'foreignkeys']) {
			if (opt[key] != null)
				output[key] = istrue(opt[key]);
		}
	}

	if (typeof(opt) === 'string') {
		OPTIONS.size > 100 && OPTIONS.clear();
		OPTIONS.set(opt, output);
	}

	return output;
}

// The database is locked by another connection: SQLITE_BUSY (5), SQLITE_LOCKED (6)
function islocked(err) {
	var code = err ? (err.errcode & 255) : 0;
	return code === 5 || code === 6;
}

// ============================================================================
// Client
// ============================================================================

function Client(opt) {
	var t = this;
	t.opt = parseoptions(opt);
	t.db = null;
	t.statements = new Map();
	t.queue = [];
	t.current = null;
	t.ready = false;
	t.closed = false;
	t.ending = false;
	t.status = 'I'; // I: idle, T: in a transaction
	t.pool = null;
	t.$end = null;
	t.$retry = null;
	t.onclose = null;
}

const CP = Client.prototype;

CP.connect = function(callback) {

	var t = this;
	var opt = t.opt;

	try {

		if (!Sqlite)
			Sqlite = require('node:sqlite');

		t.db = new Sqlite.DatabaseSync(opt.filename, { readOnly: opt.readonly, enableForeignKeyConstraints: opt.foreignkeys });
		opt.wal && !opt.readonly && t.db.exec('PRAGMA journal_mode=WAL');
		t.ready = true;

	} catch (e) {
		t.destroy(e);
		callback && process.nextTick(callback, e);
		return t;
	}

	callback && process.nextTick(callback, null, t);
	t.queue.length && process.nextTick(() => t.next());
	return t;
};

// client.query(sql, [params], callback(err, response))
// response: { command: String, rowCount: Number, rows: Array, fields: Array, lastid: Number } or Array of responses (multiple statements)
CP.query = function(sql, params, callback) {

	var t = this;

	if (typeof(params) === 'function') {
		callback = params;
		params = null;
	}

	if (!callback)
		return new Promise((resolve, reject) => t.query(sql, params, (err, response) => err ? reject(err) : resolve(response)));

	if (t.closed || t.ending)
		process.nextTick(callback, new Error('Connection is closed'));
	else {
		t.queue.push({ sql: sql, params: params, callback: callback, results: [], index: 0, ticks: 0 });
		t.next();
	}
};

CP.next = function() {

	var t = this;

	if (!t.ready || t.closed || t.$retry)
		return;

	while (true) {

		var q = t.queue[0];

		if (!q) {
			t.ending && t.destroy();
			return;
		}

		var err = null;

		t.current = q;

		try {
			t.exec(q);
		} catch (e) {
			err = e;
		}

		t.current = null;

		if (t.db)
			t.status = t.db.isTransaction ? 'T' : 'I';

		// The database is locked by another connection: the query tries it again (the process isn't blocked)
		if (err && islocked(err) && t.opt.timeout) {
			if (!q.ticks)
				q.ticks = Date.now();
			if ((Date.now() - q.ticks) < t.opt.timeout) {
				t.$retry = setTimeout(function() {
					t.$retry = null;
					t.next();
				}, 20);
				return;
			}
		}

		t.queue.shift();

		if (err)
			process.nextTick(q.callback, err);
		else
			process.nextTick(q.callback, null, q.results.length > 1 ? q.results : (q.results[0] || { command: '', rowCount: 0, rows: [], fields: [] }));
	}
};

// Executes all statements of the query, it continues with "q.index" (after a locked database)
CP.exec = function(q) {

	var t = this;
	var statements = parse(q.sql);
	var params = q.params;
	var isparams = params && (params instanceof Array ? params.length > 0 : typeof(params) === 'object');

	if (isparams && statements.length > 1)
		throw new Error('Multiple statements can\'t be used with parameters');

	while (q.index < statements.length) {

		var item = statements[q.index];
		var meta = t.statements.get(item.sql);

		if (!meta) {

			var stmt = t.db.prepare(item.sql);
			var columns = stmt.columns();

			// Integers are read as BigInt, otherwise a big integer throws an exception
			stmt.setReadBigInts(true);

			meta = { stmt: stmt, fields: [], parsers: null };

			for (var column of columns) {
				var type = column.type ? column.type.toUpperCase().replace(REG_SIZE, '').trim() : null;
				var parser = type ? TYPES[type] : null;
				meta.fields.push({ name: column.name, type: type, parser: parser });
				if (parser) {
					if (!meta.parsers)
						meta.parsers = [];
					meta.parsers.push(column.name, parser);
				}
			}

			t.statements.size > 500 && t.statements.clear();
			t.statements.set(item.sql, meta);
		}

		var args = EMPTY;

		if (isparams) {
			if (params instanceof Array) {
				if (item.numbered) {
					// PostgreSQL parameters: $1, $2
					var named = {};
					for (var i = 0; i < params.length; i++)
						named['$' + (i + 1)] = param(params[i]);
					args = [named];
				} else {
					args = new Array(params.length);
					for (var i = 0; i < params.length; i++)
						args[i] = param(params[i]);
				}
			} else {
				var named = {};
				for (var key in params)
					named[key] = param(params[key]);
				args = [named];
			}
		}

		var result = { command: item.command, rowCount: 0, rows: [], fields: meta.fields };

		if (meta.fields.length) {

			var rows = result.rows = meta.stmt.all.apply(meta.stmt, args);
			var parsers = meta.parsers;

			result.rowCount = rows.length;

			for (var row of rows) {

				for (var key in row) {
					var val = row[key];
					if (typeof(val) === 'bigint')
						row[key] = tonumber(val);
					else if (val instanceof Uint8Array)
						row[key] = Buffer.from(val.buffer, val.byteOffset, val.byteLength);
				}

				if (parsers) {
					for (var i = 0; i < parsers.length; i += 2) {
						var val = row[parsers[i]];
						if (val != null)
							row[parsers[i]] = parsers[i + 1](val);
					}
				}
			}

		} else {

			var info = meta.stmt.run.apply(meta.stmt, args);

			// SQLite keeps the count of changes of the last INSERT, UPDATE or DELETE, so other commands have 0
			if (CHANGES[item.command]) {
				result.rowCount = tonumber(info.changes);
				if (item.command === 'INSERT' || item.command === 'REPLACE')
					result.lastid = tonumber(info.lastInsertRowid);
			}
		}

		// The schema can be changed: the prepared statements are released
		SCHEMA[item.command] && t.statements.clear();

		q.results.push(result);
		q.index++;
	}
};

// Closes the connection (waits for pending queries)
CP.end = function(callback) {

	var t = this;

	if (t.closed) {
		callback && process.nextTick(callback);
		return;
	}

	if (callback)
		t.$end = callback;

	t.ending = true;

	if (t.queue.length)
		t.next();
	else
		t.destroy();
};

// Closes the connection or it returns the connection to the pool
CP.close = CP.release = function(callback) {
	var t = this;
	if (t.pool) {
		t.$release && t.$release();
		callback && process.nextTick(callback);
	} else
		t.end(callback);
};

// Destroys the connection immediately
CP.destroy = function(err) {

	var t = this;

	if (t.closed)
		return;

	t.closed = true;
	t.ready = false;
	t.statements.clear();

	if (t.$retry) {
		clearTimeout(t.$retry);
		t.$retry = null;
	}

	if (t.db) {
		// An unfinished transaction is rolled back
		try {
			t.db.close();
		} catch (e) {}
		t.db = null;
	}

	t.status = 'I';
	t.onclose && t.onclose(err);

	var error = err || new Error('Connection is closed');
	var callbacks = [];

	for (var q of t.queue)
		callbacks.push([q.callback, error]);

	t.queue = [];

	if (t.$end) {
		callbacks.push([t.$end, null]);
		t.$end = null;
	}

	for (var item of callbacks)
		process.nextTick(item[0], item[1]);
};

// ============================================================================
// Pool
// ============================================================================

function Pool(opt, max) {
	var t = this;
	t.opt = parseoptions(opt);
	t.max = max || (opt && opt.max) || 10;
	t.timeout = (opt && opt.idle) || 10000; // idle timeout
	t.clients = [];
	t.idle = [];
	t.pending = [];
	t.ended = false;
	t.$end = null;

	// Each connection to the in-memory database is a new database
	if (t.opt.filename === ':memory:' || !t.opt.filename) {
		t.max = 1;
		t.timeout = 0;
	}
}

const PP = Pool.prototype;

// pool.connect(function(err, client, release) {})
PP.connect = function(callback) {
	var t = this;
	if (t.ended)
		process.nextTick(callback, new Error('Pool is closed'));
	else {
		t.pending.push(callback);
		t.dispatch();
	}
};

PP.dispatch = function() {

	var t = this;

	while (t.pending.length) {

		var client = t.idle.pop();

		if (client) {
			client.$idle && clearTimeout(client.$idle);
			client.$idle = null;
			t.assign(client, t.pending.shift());
		} else if (t.clients.length < t.max)
			t.create(t.pending.shift());
		else
			break;
	}
};

PP.create = function(callback) {

	var t = this;
	var client = new Client(t.opt);

	client.pool = t;
	client.$busy = false;
	client.$idle = null;
	client.$release = null;

	client.onclose = function() {

		var index = t.clients.indexOf(client);
		if (index !== -1)
			t.clients.splice(index, 1);

		index = t.idle.indexOf(client);
		if (index !== -1)
			t.idle.splice(index, 1);

		if (client.$idle) {
			clearTimeout(client.$idle);
			client.$idle = null;
		}

		if (t.ended) {
			if (!t.clients.length && t.$end) {
				process.nextTick(t.$end);
				t.$end = null;
			}
		} else
			t.dispatch();
	};

	t.clients.push(client);
	client.connect(function(err) {
		if (err)
			callback(err);
		else
			t.assign(client, callback);
	});
};

PP.assign = function(client, callback) {

	var t = this;
	var released = false;

	// Each checkout has its own "release" function, so a double call can't release the connection to somebody else
	client.$release = function() {
		if (!released) {
			released = true;
			t.release(client);
		}
	};

	client.$busy = true;
	callback(null, client, client.$release);
};

PP.release = function(client) {

	var t = this;

	if (!client.$busy)
		return;

	client.$busy = false;

	if (client.closed)
		return;

	// The connection with pending queries can't be reused
	if (t.ended || client.queue.length) {
		client.end();
		return;
	}

	// An unfinished transaction is rolled back
	if (client.status !== 'I') {
		try {
			client.db.exec('ROLLBACK');
			client.status = 'I';
		} catch (e) {
			client.destroy(e);
			return;
		}
	}

	// The in-memory database is kept open (closing destroys its data)
	if (t.timeout) {
		client.$idle = setTimeout(function() {
			client.$idle = null;
			client.end();
		}, t.timeout);
	}

	t.idle.push(client);
	t.dispatch();
};

// pool.query(sql, [params], callback(err, response))
PP.query = function(sql, params, callback) {

	var t = this;

	if (typeof(params) === 'function') {
		callback = params;
		params = null;
	}

	if (!callback)
		return new Promise((resolve, reject) => t.query(sql, params, (err, response) => err ? reject(err) : resolve(response)));

	t.connect(function(err, client, release) {
		if (err)
			callback(err);
		else {
			client.query(sql, params, function(err, response) {
				release();
				callback(err, response);
			});
		}
	});
};

// Closes all connections
PP.end = function(callback) {

	var t = this;
	var err = new Error('Pool is closed');

	t.ended = true;

	for (var fn of t.pending)
		process.nextTick(fn, err);

	t.pending = [];

	if (t.clients.length) {
		if (callback)
			t.$end = callback;
		// Busy connections will be closed when they are released
		for (var client of t.idle.slice(0))
			client.end();
	} else
		callback && process.nextTick(callback);
};

exports.Client = Client;
exports.Pool = Pool;
exports.types = TYPES;

// Parses a connection string or object with options
exports.options = parseoptions;

// Creates a new connection
// callback(err, client)
exports.connect = function(opt, callback) {
	return new Client(opt).connect(callback);
};

// Creates a pool of connections
exports.pool = function(opt, max) {
	return new Pool(opt, max);
};
