// Total.js QueryBuilder
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

const REG_FIELDS_CLEANER = /"|`|\||'|\s/g;

var LANGUAGE_SKIP = '_';
var LANGUAGE_PREFIX = '';

function QueryBuilderOptions() {}

function Controller(singleton) {
	var t = this;
	if (!singleton) {
		t.commands = [];
		t.response = {};
		t.error = null;
		setImmediate(t.next, t);
	}
}

function DB(conn) {
	var t = this;
	t.conn = conn;
	t.options = new QueryBuilderOptions();
	// t.options.db = String;                -- database/collection/table
	// t.options.exec = String;              -- operation name (find/insert/remove/etc..)
	// t.options.payload = {};
	// t.options.upsert = Boolean;
	// t.options.fields = String Array;
	// t.options.sort = String Array;        -- in the form: field_asc, field_desc
	// t.options.take = Number;
	// t.options.skip = Number;
	// t.options.filter = Object Array       -- types: where/in/notin/or/between/contains/empty
	t.options.filter = [];
}

function execdb(db) {
	var conn = F.querybuilders[db.conn] || F.querybuilders['*'];
	if (conn) {
		if (db.options.checksum)
			db.options.checksum = HASH(db.options.checksum).toString(36);
		conn.call(db, db.options, (err, response) => db.evaluate(err, response));
	} else
		db.evaluate('Database is not initialized');
}

function QueryBuilder(main, table, exec) {

	var t = this;

	t.main = main;
	t.options = main.options;
	t.options.checksum = '';
	t.options.table = table;
	t.options.exec = exec;
	t.filter = t.options.filter;

	if (exec === 'list') {
		t.options.skip = 0;
		t.options.take = 100;
	}

	if (exec === 'read') {
		t.options.take = 1;
		t.options.first = true;
	}

	var ctrl = main.controller;

	if (!ctrl.commands) {
		setImmediate(execdb, main);
		return;
	}

	if (ctrl.$debug)
		t.options.debug = true;

	if (ctrl.$end) {
		ctrl.$end = false;
		setImmediate(ctrl.next, ctrl);
	}
}

var CTP = Controller.prototype;
var DBP = DB.prototype;
var QBP = QueryBuilder.prototype;

function parsedb(table) {
	var index = table.indexOf('/');
	return index === -1 ? { db: 'default', table: table } : { db: table.substring(0, index), table: table.substring(index + 1) };
}

CTP.language = function(prefix, skip) {
	LANGUAGE_PREFIX = prefix;
	LANGUAGE_SKIP = skip;
	return this;
};

CTP.exec = function(filter, callback) {

	var t = this;
	var builder;

	switch (filter.exec) {
		case 'find':
		case 'list':
		case 'read':
		case 'count':
		case 'truncate':
		case 'drop':
		case 'remove':
		case 'insert':
		case 'update':
		case 'scalar':
		case 'command':
			builder = t[filter.exec](filter.table);
			for (var key in filter) {
				if (key !== 'table')
					builder.options[key] = filter[key];
			}
			builder.callback(callback);
			break;
		case 'query':
			builder = t[filter.exec](filter.table, filter.query);
			for (var key in filter) {
				if (key !== 'table' && key !== 'query')
					builder.options[key] = filter[key];
			}
			builder.callback(callback);
			break;
	}
};

CTP.next = function(t) {

	if (t.error) {
		t.$callback && t.$callback(t.error, null);
		t.free();
		return;
	}

	if (t.commands) {
		var item = t.commands.shift();
		if (item) {
			execdb(item);
			return;
		}
	}

	t.$callback && t.$callback(t.error, t.response);
	t.$end = true;

};

CTP.callback = CTP.pipe = function($) {
	var t = this;
	t.$callback = typeof($) === 'function' ? $ : $.callback();
	return t;
};

CTP.promise = function($) {
	var t = this;
	var promise = new Promise(function(resolve, reject) {
		t.$callback = function(err, response) {
			if (err) {
				if ($ && $.invalid) {
					$.invalid(err);
					t.free();
				} else {
					reject(err);
				}
			} else
				resolve(response);
		};
	});
	return promise;
};

CTP.done = function($, callback) {
	var t = this;
	t.$callback = function(err, response) {
		if (err)
			$.invalid(err);
		else
			callback && callback(response);
		t.free();
	};
	return t;
};

CTP.free = function() {
	var t = this;
	t.commands = t.$callback = t.$fail = t.$data = t.response = t.error = null;
};

CTP.load = function(conn, opt) {

	if (!opt) {
		opt = conn;
		conn = 'default';
	}

	var t = this;
	var db = new DB(conn);

	db.controller = t;
	t.commands && t.commands.push(db);

	var builder = new QueryBuilder(db, opt.table, opt.exec);

	builder.options.fields = opt.fields && opt.fields instanceof Array && opt.fields.length ? opt.fields : null;
	builder.options.skip = opt.skip;
	builder.options.take = opt.take;
	builder.options.query = opt.query;
	builder.options.sort = opt.sort && opt.sort instanceof Array && opt.sort.length ? opt.sort : null;
	builder.options.payload = opt.payload;
	builder.options.upsert = opt.upsert;
	builder.options.returning = opt.returning;
	builder.options.filter = opt.filter && opt.filter instanceof Array  ? opt.filter : EMPTYARRAY;

	return builder;
};

CTP.find = CTP.all = function(table) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;
	var db = new DB(meta.db);

	db.controller = t;
	t.commands && t.commands.push(db);
	return new QueryBuilder(db, meta.table, 'find');
};

CTP.debug = function() {
	this.$debug = true;
	return this;
};

CTP.list = function(table) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var db = new DB(meta.db);
	var t = this;
	db.controller = t;
	t.commands && t.commands.push(db);
	return new QueryBuilder(db, meta.table, 'list');
};

CTP.check = function(table) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;
	var db = new DB(meta.db);
	db.controller = t;
	t.commands && t.commands.push(db);
	var builder = new QueryBuilder(db, meta.table, 'check');
	builder.options.take = builder.options.first = 1;
	return builder;
};

CTP.read = CTP.one = function(table) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;
	var db = new DB(meta.db);
	db.controller = t;
	t.commands && t.commands.push(db);
	return new QueryBuilder(db, meta.table, 'read');
};

CTP.count = function(table) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;
	var db = new DB(meta.db);
	db.controller = t;
	t.commands && t.commands.push(db);
	return new QueryBuilder(db, meta.table, 'count');
};

CTP.scalar = function(table, type, key, key2) {

	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;

	if (key == null)
		key = '*';

	var db = new DB(meta.db);
	db.options.scalar = {};
	db.options.scalar.type = type;

	if (key)
		db.options.scalar.key = key;

	if (key2)
		db.options.scalar.key2 = key2;

	db.controller = t;
	t.commands && t.commands.push(db);
	return new QueryBuilder(db, meta.table, 'scalar');
};

CTP.insert = CTP.ins = function(table, data) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;
	var db = new DB(meta.db);

	db.controller = t;
	t.commands && t.commands.push(db);

	db.options.payload = data;
	return new QueryBuilder(db, meta.table, 'insert');
};

CTP.update = CTP.modify = CTP.mod = CTP.upd = function(table, data, upsert) {

	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;
	var db = new DB(meta.db);

	db.options.payload = data;
	db.options.upsert = upsert;
	db.controller = t;
	t.commands && t.commands.push(db);

	return new QueryBuilder(db, meta.table, 'update');
};

CTP.remove = CTP.rem = function(table) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;
	var db = new DB(meta.db);
	db.controller = t;
	t.commands && t.commands.push(db);
	return new QueryBuilder(db, meta.table, 'remove');
};

CTP.query = function(table, query, params) {

	if (query == null || typeof(query) === 'object') {
		params = query;
		query = table;
		table = 'default/';
	} else
		table += '/';

	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;
	var db = new DB(meta.db);
	db.controller = t;
	t.commands && t.commands.push(db);
	db.options.query = query;
	db.options.params = params;
	return new QueryBuilder(db, '', 'query');
};

CTP.drop = function(table) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var t = this;
	var db = new DB(meta.db);
	db.controller = t;
	t.commands && t.commands.push(db);
	return new QueryBuilder(db, meta.table, 'drop');
};

CTP.truncate = CTP.clear = function(table) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var db = new DB(meta.db);
	var t = this;
	db.controller = t;
	t.commands && t.commands.push(db);
	return new QueryBuilder(db, meta.table, 'truncate');
};

CTP.command = function(table, name) {
	var meta = F.temporary.querybuilders[table] || (F.temporary.querybuilders[table] = parsedb(table));
	var db = new DB(meta.db);
	var t = this;
	db.controller = t;
	t.commands && t.commands.push(db);
	db.options.command = name;
	return new QueryBuilder(db, meta.table, 'command');
};

DBP.evaluate = function(err, response) {
	var t = this;

	if (t.options.first && response instanceof Array)
		response = response.length ? response[0] : null;

	if (!err && t.error) {
		if (t.error_reverse) {
			if (response)
				err = t.error;
			else if (!t.options.first && response instanceof Array && response.length)
				err = t.error;
		} else if (!response)
			err = t.error;
		else if (!t.options.first && response instanceof Array && !response.length)
			err = t.error;
	}

	// Upsert
	if (!err && t.options.exec === 'update' && t.options.upsert) {

		var is = false;

		if (t.options.returning) {

			if (t.options.first) {
				if (!response)
					is = true;
			} else {
				if (!response.length)
					is = true;
			}


		} else if (!response)
			is = true;

		if (is) {
			t.$insert && t.$insert(t.options.payload, t.$insertparam);
			t.options.exec = 'insert';
			t.options.filter.length = 0;
			execdb(t);
			return;
		}
	}

	if (!err && t.options.exec === 'list') {
		response.page = (t.options.skip / t.options.take) + 1;
		response.limit = t.options.take;
		response.pages = Math.ceil(response.count / t.options.take);
	}

	if (t.controller) {
		t.controller.error = err;
		if (!t.$nobind) {
			if (t.output)
				t.controller.response[t.output] = response;
			else
				t.controller.response = response;
		}
	}

	if (err) {
		t.callback_fail && t.callback_fail(err);
	} else {
		if (t.$audit) {
			t.$audit();
			t.$audit = null;
		}
		t.callback_data && t.callback_data(response);
	}

	t.callback && t.callback(err, response);
	t.controller && setImmediate(t.controller.next, t.controller);
};

QBP.audit = function($, message, type) {
	var self = this;
	self.main.$audit = function() {

		// Dynamic arguments
		if (message)
			message = $.variables(message, self.options.payload);

		$.audit(message, type);
	};
	return self;
};

QBP.promise = function($) {
	var t = this;
	var promise = new Promise(function(resolve, reject) {
		t.main.callback = function(err, response) {
			if (err) {
				if ($ && $.invalid) {
					$.invalid(err);
					t.main.controller && t.main.controller.free();
				} else {
					err.name = 'QueryBuilder(' + t.options.table + ' --> ' + t.options.exec + ')';
					reject(err);
				}
			} else
				resolve(response);
		};
	});
	return promise;
};

QBP.insert = function(callback, param) {
	this.main.$insert = callback;
	this.main.$insertparam = param;
	return this;
};

QBP.set = function(name) {
	this.main.output = name;
	return this;
};

QBP.callback = QBP.pipe = function($) {
	var t = this;
	t.main.callback = typeof($) === 'function' ? $ : $.callback();
	return t;
};

QBP.returning = function(fields) {

	var key = '_' + fields;

	if (!F.temporary.querybuilders[key]) {
		var arr = [];
		fields = fields.split(',');
		for (var field of fields) {
			field = field.trim();
			arr.push(field);
		}
		F.temporary.querybuilders[key] = arr;
	}

	this.options.returning = F.temporary.querybuilders[key];
	return this;
};

QBP.nobind = function() {
	this.main.$nobind = true;
	return this;
};

QBP.data = function(cb) {
	this.main.callback_data = cb;
	return this;
};

QBP.fail = function(cb) {
	this.main.callback_fail = cb;
	return this;
};

QBP.error = QBP.err = function(err, reverse) {
	this.main.error = err + '';
	this.main.error_reverse = reverse;
	return this;
};

QBP.done = function($, callback, param) {
	this.main.callback = function(err, response) {
		if (err)
			$.invalid(err);
		else
			callback(response, param);
	};
	return this;
};

QBP.id = function(id) {
	return id instanceof Array ? this.in('id', id) : this.where('id', id);
};

QBP.userid = function(id) {
	return id instanceof Array ? this.in('userid', id) : this.where('userid', typeof(id) === 'string' ? id : (id.user ? id.user.id : id.id));
};

QBP.equal = function(obj) {
	for (var key in obj)
		this.where(key, obj[key]);
	return this;
};

QBP.where = function(name, comparer, value) {

	var t = this;

	if (comparer === undefined && value === undefined)
		return t.query(name);

	if (value === undefined) {
		value = comparer;
		comparer = '=';
	}

	switch (comparer) {
		case '==':
			comparer = '=';
			break;
		case '!=':
			comparer = '<>';
			break;
	}

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'where' + comparer + name;
	t.filter.push({ type: 'where', name: name, comparer: comparer, value: value });
	return t;
};

QBP.array = function(name, comparer, value) {

	var t = this;

	if (value === undefined) {
		value = comparer;
		comparer = '&&';
	}

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'array' + comparer + name;
	t.filter.push({ type: 'array', name: name, comparer: comparer, value: value });
	return t;
};

QBP.take = function(count) {
	this.options.take = count;
	return this;
};

QBP.first = function() {
	this.options.take = this.options.first = 1;
	return this;
};

QBP.limit = function(count) {
	this.options.take = count;
	return this;
};

QBP.language = function(val, prefix, skip) {

	var self = this;

	if (!skip)
		skip = LANGUAGE_SKIP;

	if (val && typeof(val) === 'object')
		val = val.language;

	if (skip && val && val === skip) {
		val = '';
		prefix = '';
	}

	if (val != null)
		self.options.language = (prefix == null ? LANGUAGE_PREFIX : prefix) + val;

	return self;
};

QBP.debug = function() {
	this.options.debug = true;
	return this;
};

QBP.page = function(page, limit) {
	if (limit)
		this.options.take = limit;
	this.options.skip = (page - 1) * this.options.take;
	return this;
};

QBP.paginate = function(page, limit, maxlimit) {

	var limit2 = +(limit || 0);
	var page2 = (+(page || 0)) - 1;

	if (page2 < 0)
		page2 = 0;

	if (maxlimit && limit2 > maxlimit)
		limit2 = maxlimit;

	if (!limit2)
		limit2 = maxlimit;

	this.options.skip = page2 * limit2;
	this.options.take = limit2;
	return this;
};

QBP.primarykey = function(val) {
	this.options.primarykey = val;
	return this;
};

QBP.skip = function(count) {
	this.options.skip = count;
	return this;
};

QBP.in = function(name, value, id) {
	var t = this;

	if (id) {
		var arr = [];
		for (var i = 0; i < value.length; i++)
			arr.push(value[i][id]);
		value = arr;
	}

	if (!(value instanceof Array))
		value = [value];

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'in=' + name;
	t.filter.push({ type: 'in', name: name, value: value });
	return t;
};

QBP.notin = function(name, value, id) {
	var t = this;

	if (id) {
		var arr = [];
		for (var i = 0; i < value.length; i++)
			arr.push(value[i][id]);
		value = arr;
	}

	if (!(value instanceof Array))
		value = [value];

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'notin=' + name;
	t.filter.push({ type: 'notin', name: name, value: value });
	return t;
};

QBP.between = function(name, a, b) {
	var t = this;
	t.options.checksum += (t.options.checksum ? ' ' : '') + 'between=' + name;
	t.filter.push({ type: 'between', name: name, a: a, b: b });
	return t;
};

QBP.or = function(callback) {
	var t = this;
	var filter = t.filter;
	t.filter = [];
	t.options.checksum += (t.options.checksum ? ' ' : '') + 'or(';
	callback.call(t, t);
	if (t.filter.length) {
		filter.push({ type: 'or', value: t.filter });
	}
	t.options.checksum += ')';
	t.filter = filter;
	return t;
};

QBP.fields = function(fields) {

	var t = this;
	var key = '_' + fields;

	if (!F.temporary.querybuilders[key]) {
		var arr = [];
		fields = fields.split(',');
		for (var field of fields) {
			field = field.trim();
			arr.push(field);
		}
		F.temporary.querybuilders[key] = arr;
	}

	t.options.fields = F.temporary.querybuilders[key];
	return t;
};

QBP.month = function(name, comparer, value) {
	var t = this;

	if (value === undefined) {
		value = comparer;
		comparer = '=';
	}

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'month' + comparer + name;
	t.filter.push({ type: 'month', name: name, comparer: comparer, value: value });
	return t;
};

QBP.day = function(name, comparer, value) {
	var t = this;

	if (value === undefined) {
		value = comparer;
		comparer = '=';
	}

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'day' + comparer + name;
	t.filter.push({ type: 'day', name: name, comparer: comparer, value: value });
	return t;
};

QBP.year = function(name, comparer, value) {
	var t = this;

	if (value === undefined) {
		value = comparer;
		comparer = '=';
	}

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'year' + comparer + name;
	t.filter.push({ type: 'year', name: name, comparer: comparer, value: value });
	return t;
};

QBP.hour = function(name, comparer, value) {
	var t = this;

	if (value === undefined) {
		value = comparer;
		comparer = '=';
	}

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'hour' + comparer + name;
	t.filter.push({ type: 'hour', name: name, comparer: comparer, value: value });
	return t;
};

QBP.minute = function(name, comparer, value) {
	var t = this;

	if (value === undefined) {
		value = comparer;
		comparer = '=';
	}

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'minute' + comparer + name;
	t.filter.push({ type: 'minute', name: name, comparer: comparer, value: value });
	return t;
};

QBP.search = function(name, value, where) {
	var t = this;
	t.options.checksum += (t.options.checksum ? ' ' : '') + 'search=' + name + '=' + (where || '');
	t.filter.push({ type: 'search', name: name, comparer: where, value: value });
	return t;
};

QBP.contains = function(name) {
	var t = this;
	t.options.checksum += (t.options.checksum ? ' ' : '') + 'contains=' + name;
	t.filter.push({ type: 'contains', name: name });
	return t;
};

QBP.empty = function(name) {
	var t = this;
	t.options.checksum += (t.options.checksum ? ' ' : '') + 'empty=' + name;
	t.filter.push({ type: 'empty', name: name });
	return t;
};

// Converting values
var convert = function(value, type) {

	if (type === undefined || type === String)
		return value;

	if (type === Number)
		return value.trim().parseFloat();

	if (type === Date) {
		value = value.trim();
		if (value.indexOf(' ') !== -1)
			return NOW.add('-' + value);
		if (value.length < 8) {
			var tmp;
			var index = value.indexOf('-');
			if (index !== -1) {
				tmp = value.split('-');
				value = NOW.getFullYear() + '-' + (tmp[0].length > 1 ? '' : '0') + tmp[0] + '-' + (tmp[1].length > 1 ? '' : '0') + tmp[1];
			} else {
				index = value.indexOf('.');
				if (index !== -1) {
					tmp = value.split('.');
					value = NOW.getFullYear() + '-' + (tmp[1].length > 1 ? '' : '0') + tmp[0] + '-' + (tmp[0].length > 1 ? '' : '0') + tmp[1];
				} else {
					index = value.indexOf(':');
					if (index !== -1) {
						// hours
					} else if (value.length <= 4) {
						value = +value;
						return value || 0;
					}
				}
			}
		}

		return value.trim().parseDate();
	}

	if (type === Boolean)
		return value.trim().parseBoolean();

	return value;
};

QBP.gridfields = function(fields, allowed) {

	var t = this;
	var count = 0;
	var newfields = [];

	fields = fields.replace(REG_FIELDS_CLEANER, '').split(',');

	if (allowed)
		allowed = allowed.split(',');

	for (var i = 0; i < fields.length; i++) {
		var field = fields[i];
		var can = !allowed;
		if (!can) {
			for (var j = 0; j < allowed.length; j++) {
				if (allowed[j] === field) {
					can = true;
					break;
				}
			}
		}
		if (can) {
			newfields.push(fields[i]);
			count++;
		}
	}

	if (!count)
		t.options.fields = newfields;

	return t;
};

// Grid filtering
QBP.gridfilter = function(name, obj, type, key) {

	let builder = this;
	let value = obj[name] || '';

	if (!value || typeof(value) !== 'string')
		return builder;

	let arr, val;

	if (!key)
		key = name;

	if (typeof(type) === 'string') {
		switch (type) {
			case 'string':
				type = String;
				break;
			case 'date':
			case 'datetime':
				type = Date;
				break;
			case 'number':
			case 'decimal':
			case 'float':
				type = Number;
				break;
			case 'boolean':
			case 'bool':
				type = Boolean;
				break;
			case '[string]':
				return builder.array(key, value);
			case 'json':
				return builder.search(key, value);
		}
	}

	// Between
	let index = value.indexOf(' - ');
	if (index !== -1) {

		arr = value.split(' - ');

		for (let i = 0, length = arr.length; i < length; i++) {
			let item = arr[i].trim();
			arr[i] = convert(item, type);
		}

		if (type === Date) {
			if (typeof(arr[0]) === 'number') {
				arr[0] = new Date(arr[0], 1, 1, 0, 0, 0);
				arr[1] = new Date(arr[1], 11, 31, 23, 59, 59);
			} else
				arr[1] = arr[1].extend('23:59:59');
		}

		return builder.between(key, arr[0], arr[1]);
	}

	// Multiple values
	index = value.indexOf(',');
	if (index !== -1) {

		let exact = value[0] === '=';
		let arr = (exact ? value.substring(1) : value).split(',');

		if (type === undefined || type === String) {
			if (exact) {
				for (let i = 0; i < arr.length; i++)
					arr[i] = arr[i].trim();
				builder.in(key, arr);
			} else {
				builder.or(function() {
					for (let i = 0; i < arr.length; i++) {
						let item = arr[i].trim();
						builder.search(key, item);
					}
				});
			}
			return builder;
		}

		for (let i = 0; i < arr.length; i++)
			arr[i] = convert(arr[i], type);

		return builder.in(key, arr);
	}

	if (type === undefined || type === String)
		return value[0] === '=' ? builder.where(key, '=', value.substring(1)) : builder.search(key, value);

	let comparer = '=';

	switch (value[0]) {
		case '>':
		case '<':
			comparer = value[0];
			value = value.substring(1);
			break;
	}

	if (type === Date) {

		if (value === 'yesterday')
			val = NOW.add('-1 day');
		else if (value === 'today')
			val = NOW;
		else
			val = convert(value, type);

		if (typeof(val) === 'number') {
			if (val > 1000)
				return builder.year(key, comparer, val);
			else
				return builder.month(key, comparer, val);
		}

		if (!(val instanceof Date) || !val.getTime())
			val = NOW;

		return comparer === '=' ? builder.between(key, val.extend('00:00:00'), val.extend('23:59:59')) : builder.where(key, comparer, val);
	}

	return builder.where(key, comparer, convert(value, type));
};

QBP.sort = function(sort, type) {
	var t = this;
	if (!t.options.sort)
		t.options.sort = [];
	t.options.sort.push(sort + '_' + (type === true || type === 'desc' ? 'desc' : 'asc'));
	return t;
};

QBP.gridsort = function(sort, localized) {

	var t = this;

	if (!t.options.sort)
		t.options.sort = [];

	var keys = sort.split(',');
	for (var key of keys) {
		key = key.trim();

		var index = key.lastIndexOf('_');
		var field = '';
		var sort = '';

		if (index === -1) {
			field = key;
			sort = 'asc';
		} else {
			field = key.substring(0, index);
			sort = key.substring(index + 1);
		}

		if (localized && localized[field])
			field = localized[field];

		//t.options.sort.push(index === -1 ? (key + '_asc') : key);
		t.options.sort.push(field + '_' + sort);
	}

	return t;
};

QBP.schema = function(value) {
	this.options.schema = value || '';
	return this;
};

QBP.autoquery = function(query, schema, defsort, maxlimit) {

	let t = this;
	let skipped;
	let key = 'QBF' + schema;
	let allowed = F.temporary.querybuilders[key];
	let tmp;

	if (!allowed) {

		let obj = {};
		let arr = [];
		let filter = [];
		let localized = {};

		if (schema.charAt(0) === '@') {
			let jschema = F.jsonschemas[schema.substring(1)];
			if (jschema) {
				schema = '';
				for (let key in jschema.properties) {
					let prop = jschema.properties[key];
					schema = (schema ? schema + ',' : '') + key + ':' + (prop.type === 'array' ? '[string]' : prop.type);
				}
			}
		}

		tmp = schema.split(',').trim();

		for (let field of tmp) {
			let k = field.split(':').trim();
			arr.push(k[0]);
			let cleaned = k[0].replace(/§/g, '');
			obj[cleaned] = 1;
			localized[cleaned] = k[0];
			filter.push({ name: cleaned, type: (k[1] || 'string').toLowerCase() });
		}

		allowed = F.temporary.querybuilders[key] = { keys: arr, meta: obj, filter: filter, fields: localized };
	}

	let fields = query.fields;
	let fieldscount = 0;

	if (!t.options.fields)
		t.options.fields = [];

	if (fields) {
		fields = fields.replace(REG_FIELDS_CLEANER, '').split(',');
		for (let field of fields) {
			if (allowed && allowed.meta[field]) {
				t.options.fields.push(field);
				fieldscount++;
			}
		}
	}

	if (!fieldscount) {
		for (let field of allowed.keys)
			t.options.fields.push(field);
	}

	if (allowed && allowed.filter) {
		for (let item of allowed.filter)
			t.gridfilter(item.name, query, item.type, allowed.fields[item.name]);
	}

	if (query.sort) {

		tmp = query.sort.split(',');
		let count = 0;

		for (let item of tmp) {
			let index = item.lastIndexOf('_');
			let name = index === - 1 ? item : item.substring(0, index);

			if ((skipped && skipped[name]) || (!allowed.meta[name]))
				continue;

			t.sort(allowed.fields[name], item[index + 1] === 'd');
			count++;
		}

		if (!count && defsort)
			t.gridsort(defsort, allowed.fields);

	} else if (defsort)
		t.gridsort(defsort, allowed.fields);

	maxlimit && t.paginate(query.page, query.limit, maxlimit);
	return t;
};

QBP.query = function(value) {
	this.filter.push({ type: 'query', value: value });
	return this;
};

QBP.join = function(name, table, jointype, a, b) {
	this.filter.push({ type: 'join', table: table, name: name, join: jointype, on: [a, b] });
	return this;
};

QBP.permit = function(name, type, value, userid, required) {

	// type: R read
	// type: W write
	// type: D delete

	var t = this;
	var types = type.split('');
	var arr = [];

	if (value && value.length) {
		for (let m of value) {
			for (let n of types)
				arr.push(n + m);
		}
	}

	t.options.checksum += (t.options.checksum ? ' ' : '') + 'permit' + type + arr.join('');
	t.filter.push({ type: 'permit', name: name, value: arr, userid: userid, required: required != false });

	return t;
};

exports.create = function(type, callback) {

	if (typeof(type) === 'function') {
		callback = type;
		type = 'default';
	}

	if (callback)
		F.querybuilders[type] = callback;
	else
		delete F.querybuilders[type];

};

exports.Controller = Controller;
exports.QueryBuilder = QueryBuilder;