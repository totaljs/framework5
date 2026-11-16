/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

// The PostgreSQL adapter runs against a fake client: the tests check the SQL text only
var Pg = require('../../client-postgresql');
var sqls = [];

Pg.connect = function(opt, callback) {
	callback(null, {
		query: function(query, params, callback) {
			sqls.push(query);
			callback(null, { rows: [{ count: 0, value: 0 }] });
		},
		close: NOOP
	});
};

require('../../querybuilder-pg').init('qbfixes', 'postgresql://user:pass@127.0.0.1:1/db');

var dir = Total.Fs.mkdtempSync(Total.Path.join(require('os').tmpdir(), 'total5-qbfixes-'));
var table = 'nosql/' + dir + '/orders';

Test.push('QueryBuilder fixes', function(next) {

	var arr = [];

	arr.push(function(resume) {
		var docs = [{ id: 1, price: 10 }, { id: 2, price: 20 }, { id: 3, price: 60 }, { id: 4, price: 30 }, { id: 5, price: 40 }];
		docs.wait(function(doc, done) {
			DATA.insert(table, doc).callback(() => done());
		}, resume);
	});

	// NoSQL: the ">" and "<" prefixes of update()
	arr.push(function(resume) {
		DATA.update(table, { '>price': 15 }).where('id', 1).callback(function() {
			DATA.update(table, { '<price': 50 }).where('id', 3).callback(function() {
				DATA.find(table).sort('id').callback(function(err, response) {
					var prices = response.map(item => item.price).join(',');
					Test.print('NoSQL update() with ">" and "<"', prices === '15,20,50,30,40' ? null : 'Expected 15,20,50,30,40, got ' + prices);
					resume();
				});
			});
		});
	});

	// NoSQL: scalar() "avg" and the aggregates without a key
	arr.push(function(resume) {
		DATA.scalar(table, 'avg', 'price').callback(function(err, avg) {
			DATA.scalar(table, 'count').callback(function(err, count) {
				Test.print('NoSQL scalar() "avg" and "count" without a key', avg.value === 31 && count.value === 5 ? null : 'Expected avg 31 and count 5, got ' + avg.value + ' and ' + count.value);
				resume();
			});
		});
	});

	// NoSQL: list() counts every document
	arr.push(function(resume) {
		DATA.list(table).page(1, 2).callback(function(err, response) {
			Test.print('NoSQL list() count and pages', response.count === 5 && response.pages === 3 && response.items.length === 2 ? null : 'Expected count 5, pages 3, 2 items, got ' + response.count + ', ' + response.pages + ', ' + response.items.length);
			resume();
		});
	});

	// PostgreSQL: search() with "beg" and "end"
	arr.push(function(resume) {
		sqls = [];
		DATA.find('qbfixes/tbl').search('name', 'abc', 'beg').callback(function() {
			DATA.find('qbfixes/tbl').search('name', 'abc', 'end').callback(function() {
				var ok = sqls[0].indexOf('ILIKE \'abc%\'') !== -1 && sqls[1].indexOf('ILIKE \'%abc\'') !== -1;
				Test.print('PostgreSQL search() with "beg" and "end"', ok ? null : 'Wrong SQL: ' + sqls.join(' | '));
				resume();
			});
		});
	});

	// QueryBuilder: fields() before autoquery() keeps the cached fields
	arr.push(function(resume) {
		sqls = [];
		DATA.find('qbfixes/tbl').fields('id,name').autoquery({ fields: 'email' }, 'id,name,email').callback(function() {
			DATA.find('qbfixes/tbl').fields('id,name').callback(function() {
				Test.print('QueryBuilder fields() before autoquery()', sqls[1] === 'SELECT "id","name" FROM tbl' ? null : 'Wrong SQL: ' + sqls[1]);
				resume();
			});
		});
	});

	// QueryBuilder: gridfields() with an empty value
	arr.push(function(resume) {
		sqls = [];
		var err = null;
		try {
			DATA.find('qbfixes/tbl').gridfields('').callback(NOOP);
			DATA.find('qbfixes/tbl').gridfields(undefined).callback(NOOP);
		} catch (e) {
			err = e;
		}
		setTimeout(function() {
			Test.print('QueryBuilder gridfields() with an empty value', !err && sqls.length === 2 && sqls[0] === 'SELECT * FROM tbl' && sqls[1] === 'SELECT * FROM tbl' ? null : 'Wrong SQL or error: ' + (err || sqls.join(' | ')));
			resume();
		}, 100);
	});

	// PostgreSQL: the toggle "!name" of update()
	arr.push(function(resume) {
		sqls = [];
		DATA.update('qbfixes/tbl', { '!isactive': 1 }).where('id', 1).callback(function() {
			Test.print('PostgreSQL update() with the toggle "!name"', sqls[0].indexOf('"isactive"=NOT "isactive"') !== -1 ? null : 'Wrong SQL: ' + sqls[0]);
			resume();
		});
	});

	// NoSQL: the "-", "*" and "/" prefixes of update()
	arr.push(function(resume) {
		DATA.update(table, { '-price': 2 }).where('id', 2).callback(function() {
			DATA.update(table, { '*price': 3 }).where('id', 4).callback(function() {
				DATA.update(table, { '/price': 2 }).where('id', 5).callback(function() {
					DATA.find(table).sort('id').callback(function(err, response) {
						var prices = response.map(item => item.price).join(',');
						Test.print('NoSQL update() with "-", "*" and "/"', prices === '15,18,50,90,20' ? null : 'Expected 15,18,50,90,20, got ' + prices);
						resume();
					});
				});
			});
		});
	});

	// PostgreSQL: search() with "beg" and "end" casts the column to text
	arr.push(function(resume) {
		sqls = [];
		DATA.find('qbfixes/tbl').search('number', 'abc', 'beg').callback(function() {
			DATA.find('qbfixes/tbl').search('number', 'abc', 'end').callback(function() {
				var ok = sqls[0].indexOf('"number"::text ILIKE \'abc%\'') !== -1 && sqls[1].indexOf('"number"::text ILIKE \'%abc\'') !== -1;
				Test.print('PostgreSQL search() with "beg" and "end" on a column that is not text', ok ? null : 'Wrong SQL: ' + sqls.join(' | '));
				resume();
			});
		});
	});

	arr.async(function() {
		Total.Fs.rmSync(dir, { recursive: true, force: true });
		next();
	});
});

Test.run();
