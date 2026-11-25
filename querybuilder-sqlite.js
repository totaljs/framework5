// Total.js Module: SQLite integrator
// DATA.init('name', 'sqlite://databases/app.db?wal=1');
//
// The filename is relative to the root of the app, "sqlite:///www/app.db" is an absolute path and "sqlite://:memory:" is the in-memory database
// ?pooling=1    count of connections (default: 1)
// ?schema=name  a default schema (a name of the attached database)
// + the options of the SQLite client: wal, readonly, foreignkeys, timeout
//
// Arrays and objects are stored as JSON, so their columns should be declared as "JSON"
const CANSTATS = global.F ? (global.F.stats && global.F.stats.performance && global.F.stats.performance.dbrm != null) : false;
const SQLite = require('./client-sqlite');
const REG_ESCAPE = /'/g;
const REG_LANGUAGE = /[a-z0-9]+§/gi;
const REG_WRITE = /(INSERT|UPDATE|DELETE|DROP)\s/i;
const LOGGER = '-- SQLite -->';
const POOLS = {};
const REG_COL_TEST = /"|\s|:|\./;
const DATEPARTS = { year: '%Y', month: '%m', day: '%d', hour: '%H', minute: '%M' };

var FieldsCache = {};

function exec(client, filter, callback, done, errorhandling) {

	var cmd;

	if (filter.exec === 'list') {

		try {
			cmd = makesql(filter);
		} catch (e) {
			done();
			callback(e);
			return;
		}

		if (filter.debug)
			console.log(LOGGER, cmd.query, cmd.params);

		client.query(cmd.query, cmd.params, function(err, response) {
			if (err) {
				done();
				errorhandling && errorhandling(err, cmd);
				callback(err);
			} else {

				cmd.convert && convert(response.rows, cmd.convert);
				cmd = makesql(filter, 'count');

				if (filter.debug)
					console.log(LOGGER, cmd.query, cmd.params);

				client.query(cmd.query, cmd.params, function(err, counter) {
					done();
					err && errorhandling && errorhandling(err, cmd);
					callback(err, err ? null : { items: response.rows, count: +counter.rows[0].count });
				});
			}
		});
		return;
	}

	try {
		cmd = makesql(filter);
	} catch (e) {
		done();
		callback(e);
		return;
	}

	if (filter.debug)
		console.log(LOGGER, cmd.query, cmd.params);

	client.query(cmd.query, cmd.params, function(err, response) {

		done();

		if (err) {
			errorhandling && errorhandling(err, cmd);
			callback(err);
			return;
		}

		// Multiple statements: the last response
		if (response instanceof Array)
			response = response[response.length - 1];

		var output;

		switch (filter.exec) {
			case 'insert':
				if (filter.returning)
					output = response.rows.length && response.rows[0];
				else if (filter.primarykey)
					output = response.rows.length && response.rows[0][filter.primarykey];
				else
					output = response.rowCount;
				callback(null, output);
				break;
			case 'update':

				if (filter.returning)
					output = filter.first ? (response.rows.length && response.rows[0]) : response.rows;
				else
					output = response.rowCount;

				callback(null, output);
				break;
			case 'remove':

				if (filter.returning)
					output = filter.first ? (response.rows.length && response.rows[0]) : response.rows;
				else
					output = response.rowCount;

				callback(null, output);
				break;
			case 'check':
				output = response.rows[0] ? response.rows[0].count > 0 : false;
				callback(null, output);
				break;
			case 'count':
				output = response.rows[0] ? response.rows[0].count : null;
				callback(null, output);
				break;
			case 'scalar':
				output = filter.scalar.type === 'group' ? response.rows : (response.rows[0] ? response.rows[0].value : null);
				callback(null, output);
				break;
			default:
				output = response.rows;
				cmd.convert && convert(output, cmd.convert);
				callback(err, output);
				break;
		}
	});
}

// Values of the JSON properties (autoqueryjson) have no declared type, so they are converted here
function convert(rows, fields) {
	for (var row of rows) {
		for (var i = 0; i < fields.length; i += 2) {

			var key = fields[i];
			var val = row[key];

			if (val == null)
				continue;

			switch (fields[i + 1]) {
				case 'boolean':
					row[key] = val === 1 || val === true;
					break;
				case 'date':
					row[key] = new Date(val);
					break;
				case 'array':
					try {
						row[key] = JSON.parse(val);
					} catch (e) {
						row[key] = [];
					}
					break;
			}
		}
	}
}

// Items of the JSON array in the column, a value that isn't JSON is taken as an empty array
function jsonitems(name) {
	return 'json_each(CASE WHEN json_valid(' + name + ') THEN ' + name + ' ELSE \'[]\' END)';
}

function sqlite_where(where, opt, filter, operator) {

	var tmp;

	for (var item of filter) {

		var name = '';

		if (item.name) {

			let key = 'where_' + (opt.language || '') + '_' + item.name;
			name = FieldsCache[key];

			if (!name) {
				name = item.name;
				if (name.substring(0, 5) === 'json:')
					name = jsonname(name);
				else if (name[name.length - 1] === '§')
					name = replacelanguage(item.name, opt.language, true);
				else
					name = REG_COL_TEST.test(item.name) ? item.name : ('"' + item.name + '"');
				FieldsCache[key] = name;
			}

		}

		switch (item.type) {
			case 'or':
				tmp = [];
				sqlite_where(tmp, opt, item.value, 'OR');
				where.length && where.push(operator);
				where.push('(' + tmp.join(' ') + ')');
				break;
			case 'in':
			case 'notin':
				where.length && where.push(operator);
				tmp = [];
				if (item.value instanceof Array) {
					for (var val of item.value) {
						if (val != null)
							tmp.push(SQLITE_ESCAPE(val));
					}
				} else if (item.value != null)
					tmp = [SQLITE_ESCAPE(item.value)];
				if (!tmp.length)
					tmp.push('null');
				where.push(name + (item.type === 'in' ? ' IN ' : ' NOT IN ') + '(' + tmp.join(',') + ')');
				break;
			case 'array':

				where.length && where.push(operator);
				tmp = [];

				if (typeof(item.value) === 'string')
					item.value = item.value.split(',');

				for (let m of item.value) {
					m = SQLITE_ESCAPE(m);
					!tmp.includes(m) && tmp.push(m);
				}

				if (!tmp.length)
					tmp = ['\'\''];

				switch (item.comparer) {
					case '&&':
						// Overlaps
						where.push('EXISTS(SELECT 1 FROM ' + jsonitems(name) + ' WHERE value IN (' + tmp.join(',') + '))');
						break;
					case '@>':
						// Contains all values
						where.push('(SELECT COUNT(DISTINCT value) FROM ' + jsonitems(name) + ' WHERE value IN (' + tmp.join(',') + '))=' + tmp.length);
						break;
					case '<@':
						// Is contained by the values
						where.push('NOT EXISTS(SELECT 1 FROM ' + jsonitems(name) + ' WHERE value NOT IN (' + tmp.join(',') + '))');
						break;
					default:
						throw new Error('SQLite: the array comparer "' + item.comparer + '" is not supported');
				}

				break;
			case 'query':
				where.length && where.push(operator);
				where.push('(' + item.value + ')');
				break;
			case 'where':
				where.length && where.push(operator);
				if (item.value == null)
					where.push(name + (item.comparer === '=' ? ' IS NULL' : ' IS NOT NULL'));
				else
					where.push(name + item.comparer + SQLITE_ESCAPE(item.value));
				break;
			case 'contains':
				where.length && where.push(operator);
				where.push('LENGTH(CAST(' + name +' AS TEXT))>0');
				break;
			case 'search':
				where.length && where.push(operator);

				tmp = item.value ? item.value.replace(/%/g, '') : '';

				// LIKE is case-insensitive for ASCII characters only
				if (item.comparer === 'beg')
					where.push('CAST(' + name + ' AS TEXT) LIKE ' + SQLITE_ESCAPE(tmp + '%'));
				else if (item.comparer === 'end')
					where.push('CAST(' + name + ' AS TEXT) LIKE ' + SQLITE_ESCAPE('%' + tmp));
				else
					where.push('CAST(' + name + ' AS TEXT) LIKE ' + SQLITE_ESCAPE('%' + tmp + '%'));
				break;
			case 'month':
			case 'year':
			case 'day':
			case 'hour':
			case 'minute':
				where.length && where.push(operator);
				where.push('CAST(strftime(\'' + DATEPARTS[item.type] + '\',' + name + ') AS INTEGER)' + item.comparer + SQLITE_ESCAPE(item.value));
				break;
			case 'empty':
				where.length && where.push(operator);
				where.push('(' + name + ' IS NULL OR LENGTH(CAST(' + name + ' AS TEXT))=0)');
				break;
			case 'between':
				where.length && where.push(operator);
				where.push('(' + name + ' BETWEEN ' + SQLITE_ESCAPE(item.a) + ' AND ' + SQLITE_ESCAPE(item.b) + ')');
				break;
			case 'permit':

				where.length && where.push(operator);

				tmp = [];

				for (let m of item.value)
					tmp.push(SQLITE_ESCAPE(m));

				if (!tmp.length)
					tmp = ['\'\''];

				var overlaps = 'EXISTS(SELECT 1 FROM ' + jsonitems(name) + ' WHERE value IN (' + tmp.join(',') + '))';

				if (item.required)
					where.push('(' + (item.userid ? ('userid=' + sqlite_escape(item.userid) + ' OR ') : '') + 'NOT EXISTS(SELECT 1 FROM ' + jsonitems(name) + ') OR ' + overlaps + ')');
				else
					where.push('(' + (item.userid ? ('userid=' + sqlite_escape(item.userid) + ' OR ') : '') + overlaps + ')');

				break;

		}
	}
}

function sqlite_insertupdate(filter, insert) {

	var query = [];
	var fields = insert ? [] : null;
	var params = [];

	for (var key in filter.payload) {
		var val = filter.payload[key];

		if (val === undefined)
			continue;

		var c = key[0];
		switch (c) {
			case '-':
			case '+':
			case '*':
			case '/':
				key = key.substring(1);
				params.push(val ? val : 0);
				if (insert) {
					fields.push('"' + key + '"');
					query.push('$' + params.length);
				} else
					query.push('"' + key + '"=COALESCE("' + key + '",0)' + c + '$' + params.length);
				break;
			case '>':
			case '<':
				key = key.substring(1);
				params.push(val ? val : 0);
				if (insert) {
					fields.push('"' + key + '"');
					query.push('$' + params.length);
				} else
					query.push('"' + key + '"=' + (c === '>' ? 'MAX' : 'MIN') + '("' + key + '",$' + params.length + ')');
				break;
			case '!':
				// toggle
				key = key.substring(1);
				if (insert) {
					fields.push('"' + key + '"');
					query.push('0');
				} else
					query.push('"' + key + '"=NOT "' + key + '"');
				break;
			case '=':
			case '#':
				// raw
				key = key.substring(1);
				if (insert) {
					if (c === '=') {
						fields.push('"' + key + '"');
						query.push(val);
					}
				} else
					query.push('"' + key + '"=' + val);
				break;
			default:
				params.push(val);
				if (insert) {
					fields.push('"' + key + '"');
					query.push('$' + params.length);
				} else
					query.push('"' + key + '"=$' + params.length);
				break;
		}
	}

	return { fields, query, params };
}

// Neutral name from QueryBuilder.autoqueryjson(): "json:column:property:type"
// A value in a wrong format never fails: a missing property is NULL, a mismatching value becomes the default one
// (Number: 0 or the number at the beginning of the text, Boolean: false, Date: NULL, Array: [])
function jsonname(name, select) {

	let arr = name.split(':');
	let col = '"' + arr[1] + '"';
	let key = '\'' + arr[2] + '\'';
	let text = '(CASE WHEN json_valid(' + col + ') THEN ' + col + '->>' + key + ' END)';
	let expr;

	switch (arr[3]) {
		case 'number':
		case 'decimal':
		case 'float':
			expr = 'CAST(' + text + ' AS NUMERIC)';
			break;
		case 'boolean':
		case 'bool':
			expr = 'CASE WHEN ' + text + ' IS NULL THEN NULL WHEN lower(trim(' + text + ')) IN (\'true\',\'1\',\'on\',\'yes\') THEN 1 ELSE 0 END';
			break;
		case 'date':
		case 'datetime':
			expr = 'CASE WHEN datetime(' + text + ') IS NOT NULL THEN ' + text + ' END';
			break;
		case '[string]':
			let x = '(CASE WHEN json_valid(' + col + ') THEN ' + col + '->' + key + ' END)';
			expr = 'CASE WHEN ' + x + ' IS NULL THEN NULL WHEN json_type(' + x + ')=\'array\' THEN ' + x + ' ELSE \'[]\' END';
			break;
		default:
			expr = text;
			break;
	}

	if (select)
		return expr + ' AS "' + arr[2] + '"';

	return expr === text ? text : '(' + expr + ')';
}

// A type of the conversion of the JSON property
function jsontype(name) {
	switch (name.split(':')[3]) {
		case 'boolean':
		case 'bool':
			return 'boolean';
		case 'date':
		case 'datetime':
			return 'date';
		case '[string]':
			return 'array';
	}
}

function replacelanguage(fields, language, noas) {
	return fields.replace(REG_LANGUAGE, function(val) {
		val = val.substring(0, val.length - 1);
		return '"' + val + '' + (noas ? ((language || '') + '"') : language ? (language + '" AS "' + val + '"') : '"');
	});
}

function makesql(opt, exec) {

	var query = '';
	var where = [];
	var model = {};
	var isread = false;
	var params;
	var returning;
	var tmp;

	if (!exec)
		exec = opt.exec;

	sqlite_where(where, opt, opt.filter, 'AND');

	var language = opt.language || '';
	var fields;
	var sort;

	if (opt.fields) {

		let key = 'fields_' + language + '_' + opt.fields.join(',');
		let cache = FieldsCache[key];

		if (!cache) {

			cache = FieldsCache[key] = { fields: '', convert: null };

			for (let i = 0; i < opt.fields.length; i++) {
				let m = opt.fields[i];
				if (m.substring(0, 5) === 'json:') {
					let type = jsontype(m);
					if (type) {
						if (!cache.convert)
							cache.convert = [];
						cache.convert.push(m.split(':')[2], type);
					}
					cache.fields += (cache.fields ? ',' : '') + jsonname(m, true);
				} else if (m[m.length - 1] === '§')
					cache.fields += (cache.fields ? ',' : '') + replacelanguage(m, opt.language);
				else
					cache.fields += (cache.fields ? ',' : '') + (REG_COL_TEST.test(m) ? m : ('"' + m + '"'));
			}
		}

		fields = cache.fields;
		model.convert = cache.convert;
	}

	switch (exec) {
		case 'find':
		case 'read':
			query = 'SELECT ' + (fields || '*') + ' FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '');
			isread = true;
			break;
		case 'list':
			query = 'SELECT ' + (fields || '*') + ' FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '');
			isread = true;
			break;
		case 'count':
			opt.first = true;
			query = 'SELECT COUNT(1) AS count FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '');
			isread = true;
			break;
		case 'insert':
			returning = opt.returning ? opt.returning.join(',') : opt.primarykey ? opt.primarykey : '';
			tmp = sqlite_insertupdate(opt, true);
			query = 'INSERT INTO ' + opt.table2 + ' (' + tmp.fields.join(',') + ') VALUES(' + tmp.query.join(',') + ')' + (returning ? ' RETURNING ' + returning : '');
			params = tmp.params;
			break;
		case 'remove':
			returning = opt.returning ? opt.returning.join(',') : opt.primarykey ? opt.primarykey : '';
			query = 'DELETE FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '') + (returning ? ' RETURNING ' + returning : '');
			break;
		case 'update':
			returning = opt.returning ? opt.returning.join(',') : '';
			tmp = sqlite_insertupdate(opt);
			query = 'UPDATE ' + opt.table2 + ' SET ' + tmp.query.join(',') + (where.length ? (' WHERE ' + where.join(' ')) : '') + (returning ? ' RETURNING ' + returning : '');
			params = tmp.params;
			break;
		case 'check':
			query = 'SELECT 1 AS count FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '');
			isread = true;
			break;
		case 'drop':
			query = 'DROP TABLE ' + opt.table2;
			break;
		case 'truncate':
			// SQLite has no TRUNCATE (the AUTOINCREMENT sequence isn't restarted)
			query = 'DELETE FROM ' + opt.table2;
			break;
		case 'command':
			break;
		case 'scalar':
			switch (opt.scalar.type) {
				case 'avg':
				case 'min':
				case 'sum':
				case 'max':
				case 'count':
					opt.first = true;
					var val = opt.scalar.key === '*' ? 1 : opt.scalar.key;
					query = 'SELECT ' + opt.scalar.type.toUpperCase() + (opt.scalar.type !== 'count' ? ('(' + val + ')') : '(1)') + ' AS value FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '');
					break;
				case 'group':
					query = 'SELECT ' + opt.scalar.key + ', ' + (opt.scalar.key2 ? ('SUM(' + opt.scalar.key2 + ')') : 'COUNT(1)') + ' AS value FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '') + ' GROUP BY ' + opt.scalar.key;
					break;
			}
			isread = true;
			break;
		case 'query':
			if (where.length) {
				let wherem = opt.query.match(/\{where\}/ig);
				let wherec = 'WHERE ' + where.join(' ');
				query = wherem ? opt.query.replace(wherem, wherec) : (opt.query + ' ' + wherec);
			} else
				query = opt.query;
			params = opt.params;
			isread = REG_WRITE.test(query) ? false : true;
			break;
	}

	if (exec === 'find' || exec === 'read' || exec === 'list' || exec === 'query' || exec === 'check') {

		if (opt.sort) {
			let key = 'sort_' + language + '_' + opt.sort.join(',');
			sort = FieldsCache[key] || '';
			if (!sort) {
				for (let i = 0; i < opt.sort.length; i++) {
					let m = opt.sort[i];
					let index = m.lastIndexOf('_');
					let name = m.substring(0, index);
					let value = name.substring(0, 5) === 'json:' ? jsonname(name) : (REG_COL_TEST.test(name) ? name : ('"' + name + '"')).replace(/§/, language);
					sort += (sort ? ',' : '') + value + ' ' + (m.substring(index + 1).toLowerCase() === 'desc' ? 'DESC' : 'ASC');
				}
				FieldsCache[key] = sort;
			}
			query += ' ORDER BY ' + sort;
		}

		// SQLite needs LIMIT for OFFSET
		if (opt.take && opt.skip)
			query += ' LIMIT ' + opt.take + ' OFFSET ' + opt.skip;
		else if (opt.take)
			query += ' LIMIT ' + opt.take;
		else if (opt.skip)
			query += ' LIMIT -1 OFFSET ' + opt.skip;
	}

	model.query = query;
	model.params = params;

	if (CANSTATS) {
		if (isread)
			F.stats.performance.dbrm++;
		else
			F.stats.performance.dbwm++;
	}

	return model;
}

function SQLITE_ESCAPE(value) {

	if (value == null)
		return 'null';

	var type = typeof(value);

	if (type === 'function') {
		value = value();
		if (value == null)
			return 'null';
		type = typeof(value);
	}

	if (type === 'boolean')
		return value === true ? '1' : '0';

	if (type === 'number')
		return value + '';

	if (type === 'string')
		return sqlite_escape(value);

	// Dates are stored as ISO 8601 text in UTC (like in the SQLite client)
	if (value instanceof Date)
		return sqlite_escape(value.toISOString());

	// Arrays and objects are stored as JSON
	if (type === 'object')
		return sqlite_escape(JSON.stringify(value));

	return sqlite_escape(value.toString());
}

function sqlite_escape(val) {

	if (val == null)
		return 'NULL';

	return '\'' + (val + '').replace(REG_ESCAPE, '\'\'') + '\'';
}

exports.escape = SQLITE_ESCAPE;

exports.init = function(name, connstring, errorhandling) {

	if (!name)
		name = 'default';

	if (POOLS[name]) {
		POOLS[name].end();
		delete POOLS[name];
	}

	if (!connstring) {
		// Removes instance
		NEWDB(name, null);
		return;
	}

	var onerror = null;

	if (!errorhandling)
		errorhandling = ERROR(name);

	if (errorhandling)
		onerror = (err, cmd) => errorhandling(err + ' - ' + cmd.query.substring(0, 100));

	let index = connstring.indexOf('?');
	let defschema = '';
	let pooling = 1;

	if (index !== -1) {
		var args = connstring.substring(index + 1).parseEncoded();
		defschema = args.schema;
		if (args.pooling)
			pooling = +args.pooling || 1;
	}

	// A copy, the options of the connection string are cached in the client
	let opt = Object.assign({}, SQLite.options(connstring));

	// The filename is relative to the root of the app
	if (opt.filename !== ':memory:' && !F.Path.isAbsolute(opt.filename))
		opt.filename = PATH.root(opt.filename);

	// The connections are always pooled: a new connection to the in-memory database would be a new empty database
	let pool = POOLS[name] = SQLite.pool(opt, pooling);

	NEWDB(name, function(filter, callback) {

		if (filter.schema == null && defschema)
			filter.schema = defschema;

		filter.table2 = filter.schema ? (filter.schema + '.' + filter.table) : filter.table;

		pool.connect(function(err, client, done) {
			if (err)
				callback(err);
			else
				exec(client, filter, callback, done, onerror);
		});
	});
};

ON('service', function(counter) {
	if (counter % 10 === 0)
		FieldsCache = {};
});
