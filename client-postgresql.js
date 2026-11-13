// Total.js Module: PostgreSQL client
// A tiny dependency-free implementation of PostgreSQL wire protocol v3
//
// const PG = require('./postgresql');
//
// A single connection:
// PG.connect('postgresql://user:password@localhost:5432/database', function(err, client) {
//     client.query('SELECT * FROM tbl_user WHERE id=$1', ['123'], function(err, response) {
//         console.log(response.rows, response.rowCount);
//         client.close();
//     });
// });
//
// Pooling:
// var pool = PG.pool('postgresql://user:password@localhost:5432/database', 10);
// pool.connect(function(err, client, release) {
//     client.query('SELECT 1 AS value', function(err, response) {
//         release(); // or client.release() or client.close()
//     });
// });

const Net = require('net');
const Tls = require('tls');
const Crypto = require('crypto');
const Os = require('os');

const SSLREQUEST = Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]);
const TERMINATE = Buffer.from([88, 0, 0, 0, 4]);
const SYNC = Buffer.from([83, 0, 0, 0, 4]);

// Describe (statement) + Flush
const DESCRIBE = Buffer.from([68, 0, 0, 0, 6, 83, 0, 72, 0, 0, 0, 4]);

// Describe (portal) + Execute + Sync
const EXECUTE = Buffer.from([68, 0, 0, 0, 6, 80, 0, 69, 0, 0, 0, 9, 0, 0, 0, 0, 0, 83, 0, 0, 0, 4]);

// Cache of parsed connection strings
const OPTIONS = new Map();
const REG_DATE = /^(\d+)-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d):(\d\d)(\.\d+)?)?(?:([+-])(\d\d)(?::?(\d\d))?(?::?(\d\d))?)?( BC)?$/;
const REG_ARR_ESCAPE = /(\\|")/g;
const ERROR_FIELDS = { S: 'severity', C: 'code', D: 'detail', H: 'hint', P: 'position', W: 'where', s: 'schema', t: 'table', c: 'column', d: 'datatype', n: 'constraint', R: 'routine' };

// ============================================================================
// Types: OID -> parser(string)
// ============================================================================

const TYPES = {};

function parsenumber(val) {
	return +val;
}

function parsebool(val) {
	return val === 't';
}

function jsondateparser(key, value) {
	return typeof(value) === 'string' && value.isJSONDate() ? new Date(value) : value;
}

function parsejson(val) {
	return JSON.parse(val, jsondateparser);
}

function parsebytea(val) {

	// Hex format (default from PostgreSQL 9.0)
	if (val[0] === '\\' && val[1] === 'x')
		return Buffer.from(val.substring(2), 'hex');

	// Escape format
	var arr = [];
	for (var i = 0; i < val.length; i++) {
		var c = val.charCodeAt(i);
		if (c === 92) {
			if (val[i + 1] === '\\') {
				arr.push(92);
				i++;
			} else {
				arr.push(parseInt(val.substring(i + 1, i + 4), 8));
				i += 3;
			}
		} else
			arr.push(c);
	}
	return Buffer.from(arr);
}

function digits(val, index) {
	return ((val.charCodeAt(index) - 48) * 10) + val.charCodeAt(index + 1) - 48;
}

function parsedate(val) {

	var len = val.length;
	var ms;

	// A fast path for the most used formats:
	// YYYY-MM-DD
	// YYYY-MM-DD HH:MM:SS[.ffffff][+HH[:MM]]
	if (len >= 10 && val.charCodeAt(4) === 45 && val.charCodeAt(7) === 45) {

		var year = (digits(val, 0) * 100) + digits(val, 2);
		var month = digits(val, 5) - 1;
		var day = digits(val, 8);

		if (year >= 100) {

			if (len === 10)
				return new Date(year, month, day);

			if (len >= 19 && val.charCodeAt(10) === 32 && val.charCodeAt(13) === 58 && val.charCodeAt(16) === 58) {

				var hh = digits(val, 11);
				var mm = digits(val, 14);
				var ss = digits(val, 17);
				var pos = 19;
				var mul = 100;
				var c;

				ms = 0;

				if (pos < len && val.charCodeAt(pos) === 46) {
					pos++;
					while (pos < len) {
						c = val.charCodeAt(pos) - 48;
						if (c < 0 || c > 9)
							break;
						ms += c * mul;
						mul = (mul / 10) | 0;
						pos++;
					}
				}

				// Without time zone --> local time
				if (pos === len)
					return new Date(year, month, day, hh, mm, ss, ms);

				c = val.charCodeAt(pos);

				if ((c === 43 || c === 45) && (len - pos === 3 || (len - pos === 6 && val.charCodeAt(pos + 3) === 58))) {
					var tz = (digits(val, pos + 1) * 60) + (len - pos === 6 ? digits(val, pos + 4) : 0);
					return new Date(Date.UTC(year, month, day, hh, mm, ss, ms) + ((c === 45 ? tz : -tz) * 60000));
				}
			}
		}
	}

	if (val === 'infinity')
		return Infinity;

	if (val === '-infinity')
		return -Infinity;

	var m = REG_DATE.exec(val);
	if (!m)
		return val;

	var y = +m[1];
	var dt;

	ms = m[7] ? +(m[7] + '00').substring(1, 4) : 0;

	// 1 BC is the year 0
	if (m[12])
		y = 1 - y;

	if (m[8]) {
		// With time zone
		dt = new Date(Date.UTC(2000, 0, 1, +m[4], +m[5], +m[6], ms));
		dt.setUTCFullYear(y, +m[2] - 1, +m[3]);
		var offset = ((+m[9] * 3600) + ((+m[10] || 0) * 60) + (+m[11] || 0)) * 1000;
		return new Date(dt.getTime() + (m[8] === '-' ? offset : -offset));
	}

	// Without time zone --> local time
	dt = new Date(2000, 0, 1, +m[4] || 0, +m[5] || 0, +m[6] || 0, ms);
	dt.setFullYear(y, +m[2] - 1, +m[3]);
	return dt;
}

function parsearray(val, parser) {

	var pos = val.indexOf('{');
	var len = val.length;

	if (pos === -1)
		return val;

	var parse = function() {

		var arr = [];
		var str, c, beg;

		pos++;

		while (pos < len) {

			c = val[pos];

			if (c === '}') {
				pos++;
				break;
			}

			if (c === ',') {
				pos++;
				continue;
			}

			if (c === '{') {
				arr.push(parse());
				continue;
			}

			if (c === '"') {
				str = '';
				pos++;
				while (pos < len) {
					c = val[pos++];
					if (c === '\\')
						str += val[pos++];
					else if (c === '"')
						break;
					else
						str += c;
				}
				arr.push(parser ? parser(str) : str);
				continue;
			}

			beg = pos;

			while (pos < len && val[pos] !== ',' && val[pos] !== '}')
				pos++;

			str = val.substring(beg, pos);
			arr.push(str === 'NULL' ? null : parser ? parser(str) : str);
		}

		return arr;
	};

	return parse();
}

function arrayof(parser) {
	return val => parsearray(val, parser);
}

TYPES[16] = parsebool;      // bool
TYPES[17] = parsebytea;     // bytea
TYPES[21] = parsenumber;    // int2
TYPES[23] = parsenumber;    // int4
TYPES[26] = parsenumber;    // oid
TYPES[700] = parsenumber;   // float4
TYPES[701] = parsenumber;   // float8
TYPES[1700] = parsenumber;  // numeric
TYPES[114] = parsejson;     // json
TYPES[3802] = parsejson;    // jsonb
TYPES[1082] = parsedate;    // date
TYPES[1114] = parsedate;    // timestamp
TYPES[1184] = parsedate;    // timestamptz

// NOTE: int8/bigint (OID 20) is returned as a string because it doesn't fit into the JS number
// It can be changed via: require('./postgresql').types[20] = val => +val;

// Arrays
TYPES[1000] = arrayof(parsebool);
TYPES[1001] = arrayof(parsebytea);
TYPES[1005] = arrayof(parsenumber);   // int2[]
TYPES[1007] = arrayof(parsenumber);   // int4[]
TYPES[1028] = arrayof(parsenumber);   // oid[]
TYPES[1021] = arrayof(parsenumber);   // float4[]
TYPES[1022] = arrayof(parsenumber);   // float8[]
TYPES[1231] = arrayof(parsenumber);   // numeric[]
TYPES[199] = arrayof(parsejson);      // json[]
TYPES[3807] = arrayof(parsejson);     // jsonb[]
TYPES[1182] = arrayof(parsedate);     // date[]
TYPES[1115] = arrayof(parsedate);     // timestamp[]
TYPES[1185] = arrayof(parsedate);     // timestamptz[]
TYPES[1016] = arrayof();              // int8[]
TYPES[1002] = arrayof();              // char[]
TYPES[1003] = arrayof();              // name[]
TYPES[1009] = arrayof();              // text[]
TYPES[1014] = arrayof();              // bpchar[]
TYPES[1015] = arrayof();              // varchar[]
TYPES[2951] = arrayof();              // uuid[]

// ============================================================================
// Serialization of parameters
// ============================================================================

function pad(val, len) {
	val = val + '';
	while (val.length < len)
		val = '0' + val;
	return val;
}

function datetostring(dt) {

	var offset = -dt.getTimezoneOffset();
	var y = dt.getFullYear();
	var bc = y < 1;

	if (bc)
		y = 1 - y;

	var str = pad(y, 4) + '-' + pad(dt.getMonth() + 1, 2) + '-' + pad(dt.getDate(), 2) + 'T' + pad(dt.getHours(), 2) + ':' + pad(dt.getMinutes(), 2) + ':' + pad(dt.getSeconds(), 2) + '.' + pad(dt.getMilliseconds(), 3);

	if (offset < 0) {
		str += '-';
		offset = -offset;
	} else
		str += '+';

	return str + pad(Math.floor(offset / 60), 2) + ':' + pad(offset % 60, 2) + (bc ? ' BC' : '');
}

function arraytostring(arr) {
	var builder = '{';
	for (var i = 0; i < arr.length; i++) {
		var val = arr[i];
		if (i)
			builder += ',';
		if (val == null)
			builder += 'NULL';
		else if (val instanceof Array)
			builder += arraytostring(val);
		else if (ArrayBuffer.isView(val))
			builder += '"\\\\x' + Buffer.from(val.buffer, val.byteOffset, val.byteLength).toString('hex') + '"';
		else
			builder += '"' + paramtostring(val).replace(REG_ARR_ESCAPE, '\\$1') + '"';
	}
	return builder + '}';
}

function paramtostring(val) {
	switch (typeof(val)) {
		case 'string':
			return val;
		case 'boolean':
			return val ? 'true' : 'false';
		case 'object':
			if (val instanceof Date)
				return datetostring(val);
			if (val instanceof Array)
				return arraytostring(val);
			return JSON.stringify(val);
	}
	return val.toString();
}

// ============================================================================
// Protocol helpers
// ============================================================================

function int16(val) {
	var buf = Buffer.allocUnsafe(2);
	buf.writeInt16BE(val);
	return buf;
}

function int32(val) {
	var buf = Buffer.allocUnsafe(4);
	buf.writeInt32BE(val);
	return buf;
}

function cstring(val) {
	return Buffer.from(val + '\0', 'utf8');
}

// Creates a frontend message: [type (1 byte)] + length (int32) + body
function message(type, parts) {

	var length = 4;

	for (var i = 0; i < parts.length; i++)
		length += parts[i].length;

	var head;

	if (type) {
		head = Buffer.allocUnsafe(5);
		head[0] = type.charCodeAt(0);
		head.writeInt32BE(length, 1);
	} else
		head = int32(length);

	parts.unshift(head);
	return Buffer.concat(parts);
}

function readint32(buf, index) {
	return (buf[index] << 24) | (buf[index + 1] << 16) | (buf[index + 2] << 8) | buf[index + 3];
}

// A shared buffer for building of query messages
// Messages are written directly to this buffer, so a query needs only one allocation
var WB = Buffer.allocUnsafe(16384);
var WP = 0;

function wreserve(size) {
	if (WB.length - WP < size) {
		var buf = Buffer.allocUnsafe(Math.max(WB.length * 2, WP + size));
		WB.copy(buf, 0, 0, WP);
		WB = buf;
	}
}

function wint16(val) {
	WB[WP++] = (val >> 8) & 255;
	WB[WP++] = val & 255;
}

function wint32(val) {
	WB[WP++] = (val >> 24) & 255;
	WB[WP++] = (val >> 16) & 255;
	WB[WP++] = (val >> 8) & 255;
	WB[WP++] = val & 255;
}

// Writes a null-terminated string
function wstring(val) {
	var len = Buffer.byteLength(val, 'utf8');
	wreserve(len + 1);
	WB.write(val, WP, len, 'utf8');
	WP += len;
	WB[WP++] = 0;
}

// Begins a message and returns the position of its length
function wbegin(type) {
	wreserve(16);
	WB[WP++] = type;
	WP += 4;
	return WP - 4;
}

function wend(pos) {
	var len = WP - pos;
	WB[pos] = (len >> 24) & 255;
	WB[pos + 1] = (len >> 16) & 255;
	WB[pos + 2] = (len >> 8) & 255;
	WB[pos + 3] = len & 255;
}

function wraw(buf) {
	wreserve(buf.length);
	buf.copy(WB, WP);
	WP += buf.length;
}

// Returns written data
function wflush() {

	var buf = Buffer.allocUnsafe(WP);
	WB.copy(buf, 0, 0, WP);
	WP = 0;

	// Releases a big buffer
	if (WB.length > 1048576)
		WB = Buffer.allocUnsafe(16384);

	return buf;
}

// Writes Parse message
function wparse(sql) {
	var pos = wbegin(80);
	WB[WP++] = 0;
	wstring(sql);
	wreserve(2);
	wint16(0);
	wend(pos);
}

// Writes Bind + Describe + Execute + Sync messages
// types {Number Array} optional, OID of parameters
function wbind(params, types) {

	var count = params.length;

	wreserve(16 + (count * 2));

	var pos = wbegin(66);
	var len, val;

	WB[WP++] = 0;
	WB[WP++] = 0;
	wint16(count);

	// Formats are filled bellow
	var fpos = WP + 1;
	WP += count * 2;
	wint16(count);

	for (var i = 0; i < count; i++, fpos += 2) {

		val = params[i];
		WB[fpos - 1] = 0;
		WB[fpos] = 0;

		if (val == null) {
			wreserve(4);
			wint32(-1);
			continue;
		}

		if (typeof(val) !== 'string') {

			if (ArrayBuffer.isView(val)) {
				// Binary data
				len = val.byteLength;
				wreserve(len + 4);
				wint32(len);
				WB.set(new Uint8Array(val.buffer, val.byteOffset, len), WP);
				WP += len;
				WB[fpos] = 1;
				continue;
			}

			// JSON/JSONB: a JS array must be serialized as JSON, not as a PostgreSQL array
			val = types && val instanceof Array && (types[i] === 114 || types[i] === 3802) ? JSON.stringify(val) : paramtostring(val);
		}

		len = Buffer.byteLength(val, 'utf8');
		wreserve(len + 4);
		wint32(len);
		WB.write(val, WP, len, 'utf8');
		WP += len;
	}

	wreserve(2);
	wint16(0);
	wend(pos);
	wraw(EXECUTE);
}

function parseerror(buf, beg, end) {

	var err = new Error('Unknown PostgreSQL error');

	while (beg < end && buf[beg]) {
		var type = String.fromCharCode(buf[beg++]);
		var index = buf.indexOf(0, beg);
		var val = buf.toString('utf8', beg, index);
		beg = index + 1;
		if (type === 'M')
			err.message = val;
		else if (ERROR_FIELDS[type])
			err[ERROR_FIELDS[type]] = val;
	}

	return err;
}

function decode(val) {
	try {
		return decodeURIComponent(val);
	} catch (e) {
		return val;
	}
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

	// "types" is a cache of types of parameters (SQL -> OID Array) and "scram" is a cache of SCRAM salted password
	output = { $parsed: true, host: 'localhost', port: 5432, user: '', password: '', database: '', ssl: false, sslprefer: false, tls: null, timeout: 0, name: '', types: new Map(), scram: null };
	var connstring = typeof(opt) === 'string' ? opt : opt ? (opt.connectionString || opt.connstring) : null;
	var sslmode;

	if (connstring) {

		var url = new URL(connstring);

		if (url.hostname)
			output.host = decode(url.hostname);

		if (url.port)
			output.port = +url.port;

		output.user = decode(url.username);
		output.password = decode(url.password);
		output.database = decode(url.pathname.substring(1));

		for (var [key, val] of url.searchParams) {
			switch (key) {
				case 'host':
					output.host = val;
					break;
				case 'port':
					output.port = +val;
					break;
				case 'user':
				case 'password':
					output[key] = val;
					break;
				case 'dbname':
					output.database = val;
					break;
				case 'ssl':
					if (val === 'true' || val === '1')
						sslmode = 'require';
					break;
				case 'sslmode':
					sslmode = val;
					break;
				case 'connect_timeout':
					output.timeout = (+val || 0) * 1000;
					break;
				case 'application_name':
					output.name = val;
					break;
			}
		}
	}

	if (opt && typeof(opt) === 'object') {

		for (var key of ['host', 'port', 'user', 'password', 'database', 'timeout', 'name']) {
			if (opt[key] != null)
				output[key] = opt[key];
		}

		if (opt.ssl) {
			if (typeof(opt.ssl) === 'object') {
				// TLS options for Tls.connect()
				output.ssl = true;
				output.tls = opt.ssl;
			} else
				sslmode = opt.ssl === true ? 'require' : opt.ssl;
		}
	}

	// It follows the "libpq" behaviour:
	// "prefer"/"require" encrypt the connection without verifying the certificate
	// "verify-ca"/"verify-full" verify the certificate
	switch (sslmode) {
		case 'allow':
		case 'prefer':
			output.ssl = true;
			output.sslprefer = true;
			output.tls = { rejectUnauthorized: false };
			break;
		case 'require':
		case 'no-verify':
			output.ssl = true;
			output.tls = { rejectUnauthorized: false };
			break;
		case 'verify-ca':
		case 'verify-full':
			output.ssl = true;
			output.tls = { rejectUnauthorized: true };
			break;
	}

	if (!output.user)
		output.user = process.env.PGUSER || Os.userInfo().username;

	if (!output.database)
		output.database = output.user;

	if (typeof(opt) === 'string') {
		OPTIONS.size > 100 && OPTIONS.clear();
		OPTIONS.set(opt, output);
	}

	return output;
}

// ============================================================================
// Client
// ============================================================================

function Client(opt) {
	var t = this;
	t.opt = parseoptions(opt);
	t.socket = null;
	t.chunks = null;
	t.chunksize = 0;
	t.needed = 0;
	t.queue = [];
	t.current = null;
	t.ready = false;
	t.closed = false;
	t.ending = false;
	t.parameters = {};
	t.pid = 0;
	t.secret = 0;
	t.status = 'I'; // I: idle, T: in a transaction, E: in a failed transaction
	t.pool = null;
	t.$connect = null;
	t.$end = null;
	t.$timeout = null;
	t.$scram = null;
	t.onclose = null;
}

const CP = Client.prototype;

CP.connect = function(callback) {

	var t = this;
	var opt = t.opt;
	var socket = t.socket = opt.host[0] === '/' ? Net.connect(opt.host + '/.s.PGSQL.' + opt.port) : Net.connect(opt.port, opt.host);

	t.$connect = callback || NOOP;

	if (opt.timeout)
		t.$timeout = setTimeout(() => t.destroy(new Error('Connection timeout')), opt.timeout);

	socket.setNoDelay(true);
	socket.on('error', err => t.destroy(err));
	socket.on('close', () => t.destroy(t.ending ? null : new Error('Connection terminated unexpectedly')));
	socket.once('connect', function() {

		if (!opt.ssl || opt.host[0] === '/') {
			socket.on('data', chunk => t.ondata(chunk));
			t.startup();
			return;
		}

		socket.write(SSLREQUEST);
		socket.once('data', function(chunk) {

			// S: SSL is supported
			if (chunk[0] === 83) {
				var tlsopt = Object.assign({}, opt.tls);
				tlsopt.socket = socket;
				if (!tlsopt.servername && !Net.isIP(opt.host))
					tlsopt.servername = opt.host;
				t.socket = Tls.connect(tlsopt);
				t.socket.on('error', err => t.destroy(err));
				t.socket.on('data', chunk => t.ondata(chunk));
				t.socket.once('secureConnect', () => t.startup());
				return;
			}

			// N: SSL is not supported
			if (chunk[0] === 78 && opt.sslprefer) {
				socket.on('data', chunk => t.ondata(chunk));
				t.startup();
			} else
				t.destroy(new Error('The server does not support SSL connections'));
		});
	});

	return t;
};

CP.startup = function() {
	var t = this;
	var opt = t.opt;
	var parts = [int32(196608), cstring('user'), cstring(opt.user), cstring('database'), cstring(opt.database), cstring('client_encoding'), cstring('UTF8'), cstring('DateStyle'), cstring('ISO')];
	opt.name && parts.push(cstring('application_name'), cstring(opt.name));
	parts.push(Buffer.from([0]));
	t.socket.write(message(null, parts));
};

CP.ondata = function(chunk) {

	var t = this;

	if (t.chunks) {

		// Waits for the rest of the message, chunks are joined only once
		t.chunks.push(chunk);
		t.chunksize += chunk.length;

		if (t.chunksize < t.needed)
			return;

		chunk = Buffer.concat(t.chunks, t.chunksize);
		t.chunks = null;
	}

	var len = chunk.length;
	var offset = 0;
	var length, rest, beg;

	try {
		while (!t.closed) {

			rest = len - offset;

			if (rest < 5)
				break;

			length = readint32(chunk, offset + 1) + 1;

			if (length < 5) {
				t.destroy(new Error('Invalid PostgreSQL message'));
				break;
			}

			if (rest < length)
				break;

			beg = offset;
			offset += length;
			t.onmessage(chunk[beg], chunk, beg + 5, offset);
		}
	} finally {
		// "finally" keeps the reader consistent if a query callback throws an exception
		if (offset < len && !t.closed) {
			rest = len - offset;
			t.chunks = [offset ? chunk.subarray(offset) : chunk];
			t.chunksize = rest;
			t.needed = rest < 5 ? 5 : (readint32(chunk, offset + 1) + 1);
		}
	}
};

CP.onmessage = function(type, buf, beg, end) {

	var t = this;
	var q = t.current;
	var index, count, i, err;

	switch (type) {

		case 68: // D: DataRow

			if (!q || !q.result)
				return;

			var fields = q.result.fields;
			var row = {};
			var field, length, val, stop;

			count = (buf[beg] << 8) | buf[beg + 1];
			beg += 2;

			for (i = 0; i < count; i++) {

				field = fields[i];
				length = readint32(buf, beg);
				beg += 4;

				if (length === -1) {
					row[field.name] = null;
					continue;
				}

				stop = beg + length;

				switch (field.kind) {
					case 1: // integer, it's parsed directly from bytes
						val = 0;
						index = buf[beg] === 45 ? (beg + 1) : beg;
						for (; index < stop; index++)
							val = (val * 10) + buf[index] - 48;
						row[field.name] = buf[beg] === 45 ? -val : val;
						break;
					case 2: // boolean
						row[field.name] = buf[beg] === 116;
						break;
					case 3: // ASCII values (numbers, dates)
						row[field.name] = field.parser(buf.latin1Slice(beg, stop));
						break;
					case 4:
						row[field.name] = field.parser(buf.utf8Slice(beg, stop));
						break;
					default:
						row[field.name] = buf.utf8Slice(beg, stop);
						break;
				}

				beg = stop;
			}

			q.result.rows.push(row);
			return;

		case 84: // T: RowDescription

			if (!q)
				return;

			q.result = { command: '', rowCount: 0, rows: [], fields: [] };
			count = buf.readInt16BE(beg);
			beg += 2;

			for (i = 0; i < count; i++) {
				index = buf.indexOf(0, beg);
				var name = buf.toString('utf8', beg, index);
				var oid = buf.readInt32BE(index + 7);
				var parser = TYPES[oid];
				var kind = 0;

				// The kind determines how the value will be read, look into the "DataRow" message
				if (parser) {
					if (parser === parsenumber)
						kind = oid === 21 || oid === 23 || oid === 26 ? 1 : 3;
					else if (parser === parsebool)
						kind = 2;
					else if (parser === parsedate)
						kind = 3;
					else
						kind = 4;
				}

				q.result.fields.push({ name: name, type: oid, parser: parser, kind: kind });
				beg = index + 19;
			}

			return;

		case 67: // C: CommandComplete

			if (!q)
				return;

			var result = q.result || { command: '', rowCount: 0, rows: [], fields: [] };
			var tag = buf.toString('utf8', beg, end - 1).split(' ');
			result.command = tag[0];
			result.rowCount = tag.length > 1 ? (+tag[tag.length - 1] || 0) : 0;
			q.results.push(result);
			q.result = null;
			return;

		case 73: // I: EmptyQueryResponse
			q && q.results.push({ command: '', rowCount: 0, rows: [], fields: [] });
			return;

		case 90: // Z: ReadyForQuery

			t.status = String.fromCharCode(buf[beg]);
			t.ready = true;

			if (t.$connect) {
				var callback = t.$connect;
				t.$connect = null;
				t.$scram = null;
				t.$timeout && clearTimeout(t.$timeout);
				t.$timeout = null;
				try {
					callback(null, t);
				} finally {
					t.next();
				}
				return;
			}

			t.current = null;

			try {
				if (q) {
					if (q.error)
						q.callback(q.error);
					else
						q.callback(null, q.results.length > 1 ? q.results : (q.results[0] || { command: '', rowCount: 0, rows: [], fields: [] }));
				}
			} finally {
				t.next();
			}

			return;

		case 69: // E: ErrorResponse

			err = parseerror(buf, beg, end);

			if (q) {
				// The server sends ReadyForQuery after the error
				if (!q.error)
					q.error = err;
				// Cached types of parameters can be obsolete
				if (q.cached) {
					q.cached = false;
					t.opt.types.delete(q.sql);
				}
				// The server waits for Sync
				if (q.describing) {
					q.describing = false;
					t.socket.write(SYNC);
				}
			} else
				t.destroy(err);

			return;

		case 116: // t: ParameterDescription

			if (!q || !q.describing)
				return;

			q.describing = false;
			count = buf.readInt16BE(beg);

			var types = [];
			for (i = 0; i < count; i++)
				types.push(buf.readInt32BE(beg + 2 + (i * 4)));

			// The next query with the same SQL won't need to ask for the types
			t.opt.types.size > 2000 && t.opt.types.clear();
			t.opt.types.set(q.sql, types);

			try {
				wbind(q.params, types);
				t.socket.write(wflush());
			} catch (e) {
				// A parameter can't be serialized
				WP = 0;
				q.error = e;
				t.socket.write(SYNC);
			}

			return;

		case 82: // R: Authentication
			t.onauth(buf.readInt32BE(beg), buf, beg + 4, end);
			return;

		case 83: // S: ParameterStatus
			index = buf.indexOf(0, beg);
			t.parameters[buf.toString('utf8', beg, index)] = buf.toString('utf8', index + 1, end - 1);
			return;

		case 75: // K: BackendKeyData
			t.pid = buf.readInt32BE(beg);
			t.secret = buf.readInt32BE(beg + 4);
			return;

		case 71: // G: CopyInResponse
		case 87: // W: CopyBothResponse
			// COPY FROM STDIN is not supported
			t.socket.write(message('f', [cstring('COPY FROM STDIN is not supported')]));
			return;
	}

	// Ignored messages:
	// 1: ParseComplete, 2: BindComplete, 3: CloseComplete, n: NoData, s: PortalSuspended
	// N: NoticeResponse, A: NotificationResponse, H: CopyOutResponse, d: CopyData, c: CopyDone
};

CP.onauth = function(code, buf, beg, end) {

	var t = this;
	var opt = t.opt;
	var scram, data, index;

	switch (code) {

		case 0: // AuthenticationOk
			return;

		case 3: // Cleartext password
			t.socket.write(message('p', [cstring(opt.password)]));
			return;

		case 5: // MD5 password
			var hash = Crypto.createHash('md5').update(opt.password + opt.user, 'utf8').digest('hex');
			hash = Crypto.createHash('md5').update(hash).update(buf.subarray(beg, beg + 4)).digest('hex');
			t.socket.write(message('p', [cstring('md5' + hash)]));
			return;

		case 10: // SASL

			var mechanisms = [];

			while (beg < end && buf[beg]) {
				index = buf.indexOf(0, beg);
				mechanisms.push(buf.toString('utf8', beg, index));
				beg = index + 1;
			}

			if (!mechanisms.includes('SCRAM-SHA-256')) {
				t.destroy(new Error('Unsupported SASL authentication mechanism: ' + mechanisms.join(', ')));
				return;
			}

			scram = t.$scram = {};
			scram.nonce = Crypto.randomBytes(18).toString('base64');
			scram.first = 'n=*,r=' + scram.nonce;
			data = Buffer.from('n,,' + scram.first, 'utf8');
			t.socket.write(message('p', [cstring('SCRAM-SHA-256'), int32(data.length), data]));
			return;

		case 11: // SASLContinue

			scram = t.$scram;
			data = buf.toString('utf8', beg, end);

			var attr = {};

			for (var m of data.split(',')) {
				index = m.indexOf('=');
				attr[m.substring(0, index)] = m.substring(index + 1);
			}

			var iterations = +attr.i;

			if (!scram || !attr.r || !attr.s || !iterations || !attr.r.startsWith(scram.nonce) || attr.r.length === scram.nonce.length) {
				t.destroy(new Error('Invalid SCRAM server response'));
				return;
			}

			var finish = function(salted) {

				var clientkey = Crypto.createHmac('sha256', salted).update('Client Key').digest();
				var storedkey = Crypto.createHash('sha256').update(clientkey).digest();
				var serverkey = Crypto.createHmac('sha256', salted).update('Server Key').digest();
				var final = 'c=biws,r=' + attr.r;
				var authmessage = scram.first + ',' + data + ',' + final;
				var signature = Crypto.createHmac('sha256', storedkey).update(authmessage).digest();

				for (var i = 0; i < signature.length; i++)
					signature[i] ^= clientkey[i];

				scram.signature = Crypto.createHmac('sha256', serverkey).update(authmessage).digest('base64');
				t.socket.write(message('p', [Buffer.from(final + ',p=' + signature.toString('base64'), 'utf8')]));
			};

			// PBKDF2 is expensive (thousands of iterations), so the salted password is cached for next connections
			var cache = opt.scram;
			if (cache && cache.salt === attr.s && cache.iterations === iterations) {
				finish(cache.salted);
				return;
			}

			Crypto.pbkdf2(opt.password.normalize('NFKC'), Buffer.from(attr.s, 'base64'), iterations, 32, 'sha256', function(err, salted) {

				if (t.closed)
					return;

				if (err)
					t.destroy(err);
				else {
					opt.scram = { salt: attr.s, iterations: iterations, salted: salted };
					finish(salted);
				}
			});

			return;

		case 12: // SASLFinal
			scram = t.$scram;
			data = buf.toString('utf8', beg, end);
			if (!scram || !scram.signature || data.split(',')[0] !== ('v=' + scram.signature))
				t.destroy(new Error('Invalid SCRAM server signature'));
			return;
	}

	t.destroy(new Error('Unsupported authentication method: ' + code));
};

// Executes a query
// client.query(sql, [params], callback(err, response))
// response: { command: String, rowCount: Number, rows: [Object], fields: [{ name, type }] }
// It returns a Promise if the callback is not defined
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
		t.queue.push({ sql: sql, params: params, callback: callback, results: [], result: null, error: null, describing: false, cached: false });
		t.next();
	}
};

CP.next = function() {

	var t = this;

	if (!t.ready || t.current || t.closed)
		return;

	var q = t.queue.shift();

	if (!q) {
		if (t.ending) {
			t.ready = false;
			t.socket.end(TERMINATE);
		}
		return;
	}

	var params = q.params;
	var data;

	try {

		if (params && params.length) {

			// Extended query protocol: Parse + Bind + Describe + Execute + Sync
			wparse(q.sql);

			var types = null;

			// A JS array can be a PostgreSQL array or JSON/JSONB value. It depends on the type of the parameter,
			// so the client asks the server for the types of parameters first (Parse + Describe + Flush)
			// and the query continues in the "ParameterDescription" message. The types are cached.
			for (var i = 0; i < params.length; i++) {
				if (params[i] instanceof Array) {
					types = t.opt.types.get(q.sql);
					if (types)
						q.cached = true;
					else
						q.describing = true;
					break;
				}
			}

			if (q.describing)
				wraw(DESCRIBE);
			else
				wbind(params, types);

		} else {
			// Simple query protocol
			var pos = wbegin(81);
			wstring(q.sql);
			wend(pos);
		}

		data = wflush();

	} catch (e) {

		// A parameter can't be serialized
		WP = 0;
		q.describing = false;

		try {
			q.callback(e);
		} finally {
			t.next();
		}

		return;
	}

	t.current = q;
	t.ready = false;
	t.socket.write(data);
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

	// Not connected yet
	if (t.$connect || !t.socket)
		t.destroy(new Error('Connection terminated'));
	else
		t.next();
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
	t.chunks = null;

	if (t.$timeout) {
		clearTimeout(t.$timeout);
		t.$timeout = null;
	}

	if (t.socket) {
		t.socket.destroy();
		t.socket = null;
	}

	t.onclose && t.onclose(err);

	var error = err || new Error('Connection is closed');
	var callbacks = [];

	if (t.$connect) {
		callbacks.push([t.$connect, error]);
		t.$connect = null;
	}

	if (t.current) {
		callbacks.push([t.current.callback, t.current.error || error]);
		t.current = null;
	}

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

function NOOP() {}

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
			clearTimeout(client.$idle);
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

	// The connection with an unfinished transaction or pending queries can't be reused
	if (t.ended || client.status !== 'I' || client.current || client.queue.length) {
		client.end();
		return;
	}

	client.$idle = setTimeout(function() {
		client.$idle = null;
		client.end();
	}, t.timeout);

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

// Creates a new connection
// callback(err, client)
exports.connect = function(opt, callback) {
	return new Client(opt).connect(callback);
};

// Creates a pool of connections
exports.pool = function(opt, max) {
	return new Pool(opt, max);
};