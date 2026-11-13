// Total.js Module: PostgreSQL integrator
const CANSTATS = global.F ? (global.F.stats && global.F.stats.performance && global.F.stats.performance.dbrm != null) : false;
const Pg = require('./client-postgresql');
const REG_PG_ESCAPE_1 = /'/g;
const REG_PG_ESCAPE_2 = /\\/g;
const REG_LANGUAGE = /[a-z0-9]+§/gi;
const REG_WRITE = /(INSERT|UPDATE|DELETE|DROP)\s/i;
const LOGGER = '-- PostgreSQL -->';
const POOLS = {};
const REG_COL_TEST = /"|\s|:|\./;

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
					output = (response.rows.length && response.rows[0].count) || 0;

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
				callback(err, output);
				break;
		}
	});
}

function pg_where(where, opt, filter, operator) {

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
				pg_where(tmp, opt, item.value, 'OR');
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
							tmp.push(PG_ESCAPE(val));
					}
				} else if (item.value != null)
					tmp = [PG_ESCAPE(item.value)];
				if (!tmp.length)
					tmp.push('null');
				where.push(name + (item.type === 'in' ? ' IN ' : ' NOT IN ') + '(' + tmp.join(',') + ')');
				break;
			case 'array':

				where.length && where.push(operator);
				tmp = [];

				if (typeof(item.value) === 'string')
					item.value = item.value.split(',');

				for (let m of item.value)
					tmp.push(PG_ESCAPE(m));

				if (!tmp.length)
					tmp = ['\'\''];

				where.push(name + ' ' + item.comparer + ' ARRAY[' + tmp.join(',') + ']');
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
					where.push(name + item.comparer + PG_ESCAPE(item.value));
				break;
			case 'contains':
				where.length && where.push(operator);
				where.push('LENGTH(' + name +'::text)>0');
				break;
			case 'search':
				where.length && where.push(operator);

				tmp = item.value ? item.value.replace(/%/g, '') : '';

				if (item.operator === 'beg')
					where.push(name + ' ILIKE ' + PG_ESCAPE('%' + tmp));
				else if (item.operator === 'end')
					where.push(name + ' ILIKE ' + PG_ESCAPE(tmp + '%'));
				else
					where.push(name + '::text ILIKE ' + PG_ESCAPE('%' + tmp + '%'));
				break;
			case 'month':
			case 'year':
			case 'day':
			case 'hour':
			case 'minute':
				where.length && where.push(operator);
				where.push('EXTRACT(' + item.type + ' from ' + name + ')' + item.comparer + PG_ESCAPE(item.value));
				break;
			case 'empty':
				where.length && where.push(operator);
				where.push('(' + name + ' IS NULL OR LENGTH(' + name + '::text)=0)');
				break;
			case 'between':
				where.length && where.push(operator);
				where.push('(' + name + ' BETWEEN ' + PG_ESCAPE(item.a) + ' AND ' + PG_ESCAPE(item.b) + ')');
				break;
			case 'permit':

				where.length && where.push(operator);

				tmp = [];

				for (let m of item.value)
					tmp.push(PG_ESCAPE(m));

				if (!tmp.length)
					tmp = ['\'\''];

				if (item.required)
					where.push('(' + (item.userid ? ('userid=' + pg_escape(item.userid) + ' OR ') : '') + 'array_length(' + name + ',1) IS NULL OR ' + name + '::_text && ARRAY[' + tmp.join(',') + '])');
				else
					where.push('(' + (item.userid ? ('userid=' + pg_escape(item.userid) + ' OR ') : '') + name + '::_text && ARRAY[' + tmp.join(',') + '])');

				break;

		}
	}
}

function pg_insertupdate(filter, insert) {

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
					query.push('"' + key + '"=' + (c === '>' ? 'GREATEST' : 'LEAST') + '("' + key + '",$' + params.length + ')');
				break;
			case '!':
				// toggle
				key = key.substring(1);
				if (insert) {
					fields.push('"' + key + '"');
					query.push('FALSE');
				} else
					query.push('"' + key + '"=NOT ' + key);
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
// Like in autoquery(), a value in a wrong format never fails: a missing property is NULL,
// a mismatching value becomes the default one (Number: 0, Boolean: false, Date: NULL, Array: [])
function jsonname(name, select) {

	let arr = name.split(':');
	let col = '"' + arr[1] + '"';
	let key = '\'' + arr[2] + '\'';
	let text = col + '->>' + key;
	let expr;
	let wrap;

	switch (arr[3]) {
		case 'number':
		case 'decimal':
		case 'float':
			expr = 'CASE WHEN ' + text + ' IS NULL THEN NULL WHEN ' + text + ' ~ \'^\\s*-?[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?\\s*$\' THEN (' + text + ')::numeric ELSE 0 END';
			wrap = 'to_jsonb';
			break;
		case 'boolean':
		case 'bool':
			expr = 'CASE WHEN ' + text + ' IS NULL THEN NULL WHEN lower(trim(' + text + ')) IN (\'true\',\'1\',\'on\',\'yes\') THEN true ELSE false END';
			wrap = 'to_jsonb';
			break;
		case 'date':
		case 'datetime':
			// the regular expression validates the format and the days of month/leap year are validated here, a wrong date never fails
			let y = 'substring(' + text + ',1,4)::int';
			let m = 'substring(' + text + ',6,2)::int';
			let d = 'substring(' + text + ',9,2)::int';
			expr = 'CASE WHEN ' + text + ' ~ \'^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])([T ]([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\\.[0-9]+)?)?(Z|[+-](0[0-9]|1[0-5])(:?[0-5][0-9])?)?)?$\' AND ' + d + '<=CASE WHEN ' + m + '=2 THEN 28+(CASE WHEN (' + y + '%4=0 AND ' + y + '%100<>0) OR ' + y + '%400=0 THEN 1 ELSE 0 END) WHEN ' + m + ' IN (4,6,9,11) THEN 30 ELSE 31 END THEN (' + text + ')::timestamptz END';
			break;
		case '[string]':
			let x = col + '::jsonb->' + key;
			expr = 'CASE WHEN ' + x + ' IS NULL THEN NULL WHEN jsonb_typeof(' + x + ')=\'array\' THEN ARRAY(SELECT jsonb_array_elements_text(' + x + ')) ELSE ARRAY[]::text[] END';
			break;
		default:
			expr = text;
			break;
	}

	if (select)
		return (wrap ? (wrap + '(' + expr + ')') : expr) + ' AS "' + arr[2] + '"';

	return expr === text ? text : '(' + expr + ')';
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

	pg_where(where, opt, opt.filter, 'AND');

	var language = opt.language || '';
	var fields;
	var sort;

	if (opt.fields) {
		let key = 'fields_' + language + '_' + opt.fields.join(',');
		fields = FieldsCache[key] || '';
		if (!fields) {
			for (let i = 0; i < opt.fields.length; i++) {
				let m = opt.fields[i];
				if (m.substring(0, 5) === 'json:')
					fields += (fields ? ',' : '') + jsonname(m, true);
				else if (m[m.length - 1] === '§')
					fields += (fields ? ',' : '') + replacelanguage(m, opt.language);
				else
					fields += (fields ? ',' : '') + (REG_COL_TEST.test(m) ? m : ('"' + m + '"'));
			}
			FieldsCache[key] = fields;
		}
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
			query = 'SELECT COUNT(1)::int as count FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '');
			isread = true;
			break;
		case 'insert':
			returning = opt.returning ? opt.returning.join(',') : opt.primarykey ? opt.primarykey : '';
			tmp = pg_insertupdate(opt, true);
			query = 'INSERT INTO ' + opt.table2 + ' (' + tmp.fields.join(',') + ') VALUES(' + tmp.query.join(',') + ')' + (returning ? ' RETURNING ' + returning : '');
			params = tmp.params;
			break;
		case 'remove':
			returning = opt.returning ? opt.returning.join(',') : opt.primarykey ? opt.primarykey : '';
			query = 'DELETE FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '') + (returning ? ' RETURNING ' + returning : '');
			break;
		case 'update':
			returning = opt.returning ? opt.returning.join(',') : '';
			tmp = pg_insertupdate(opt);
			if (returning)
				query = 'UPDATE ' + opt.table2 + ' SET ' + tmp.query.join(',') + (where.length ? (' WHERE ' + where.join(' ')) : '') + (returning ? ' RETURNING ' + returning : '');
			else
				query = 'WITH rows AS (UPDATE ' + opt.table2 + ' SET ' + tmp.query.join(',') + (where.length ? (' WHERE ' + where.join(' ')) : '') + ' RETURNING 1) SELECT COUNT(1)::int count FROM rows';
			params = tmp.params;
			break;
		case 'check':
			query = 'SELECT 1 as count FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '');
			isread = true;
			break;
		case 'drop':
			query = 'DROP TABLE ' + opt.table2;
			break;
		case 'truncate':
			query = 'TRUNCATE TABLE ' + opt.table2 + ' RESTART IDENTITY';
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
					query = 'SELECT ' + opt.scalar.type.toUpperCase() + (opt.scalar.type !== 'count' ? ('(' + val + ')') : '(1)') + '::numeric as value FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '');
					break;
				case 'group':
					query = 'SELECT ' + opt.scalar.key + ', ' + (opt.scalar.key2 ? ('SUM(' + opt.scalar.key2 + ')::numeric') : 'COUNT(1)::int') + ' as value FROM ' + opt.table2 + (where.length ? (' WHERE ' + where.join(' ')) : '') + ' GROUP BY ' + opt.scalar.key;
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

		if (opt.take && opt.skip)
			query += ' LIMIT ' + opt.take + ' OFFSET ' + opt.skip;
		else if (opt.take)
			query += ' LIMIT ' + opt.take;
		else if (opt.skip)
			query += ' OFFSET ' + opt.skip;
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

function PG_ESCAPE(value) {

	if (value == null)
		return 'null';

	if (value instanceof Array) {
		var builder = [];
		if (value.length) {
			for (var m of value)
				builder.push(PG_ESCAPE(m));
			return 'ARRAY[' + builder.join(',') + ']';
		} else
			return 'null';
	}

	var type = typeof(value);

	if (type === 'function') {
		value = value();
		if (value == null)
			return 'null';
		type = typeof(value);
	}

	if (type === 'boolean')
		return value === true ? 'true' : 'false';

	if (type === 'number')
		return value + '';

	if (type === 'string')
		return pg_escape(value);

	if (value instanceof Date)
		return pg_escape(dateToString(value));

	if (type === 'object')
		return pg_escape(JSON.stringify(value));

	return pg_escape(value.toString());
}

// Author: https://github.com/segmentio/pg-escape
// License: MIT
function pg_escape(val) {

	if (val == null)
		return 'NULL';

	var backslash = ~val.indexOf('\\');
	var prefix = backslash ? 'E' : '';
	val = val.replace(REG_PG_ESCAPE_1, '\'\'').replace(REG_PG_ESCAPE_2, '\\\\');
	return prefix + '\'' + val + '\'';
}

function dateToString(dt) {

	var arr = [];

	arr.push(dt.getFullYear().toString());
	arr.push((dt.getMonth() + 1).toString());
	arr.push(dt.getDate().toString());
	arr.push(dt.getHours().toString());
	arr.push(dt.getMinutes().toString());
	arr.push(dt.getSeconds().toString());

	for (var i = 1; i < arr.length; i++) {
		if (arr[i].length === 1)
			arr[i] = '0' + arr[i];
	}

	return arr[0] + '-' + arr[1] + '-' + arr[2] + ' ' + arr[3] + ':' + arr[4] + ':' + arr[5];
}

global.PG_ESCAPE = PG_ESCAPE;

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
	let pooling = 0;

	if (index !== -1) {
		var args = connstring.substring(index + 1).parseEncoded();
		defschema = args.schema;
		if (args.pooling)
			pooling = +args.pooling;
	}

	NEWDB(name, function(filter, callback) {

		if (filter.schema == null && defschema)
			filter.schema = defschema;

		filter.table2 = filter.schema ? (filter.schema + '.' + filter.table) : filter.table;

		if (pooling) {
			var pool = POOLS[name] || (POOLS[name] = Pg.pool(connstring, pooling));
			pool.connect(function(err, client, done) {
				if (err)
					callback(err);
				else
					exec(client, filter, callback, done, onerror);
			});
		} else {
			Pg.connect(connstring, function(err, client) {
				if (err)
					callback(err);
				else
					exec(client, filter, callback, () => client.close(), onerror);
			});
		}
	});
};

ON('service', function(counter) {
	if (counter % 10 === 0)
		FieldsCache = {};
});
