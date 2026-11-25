/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

const Fs = require('fs');

try {
	require('node:sqlite');
} catch (e) {
	console.log('The test is skipped: this version of Node.js has no "node:sqlite" module');
	process.exit(0);
}

const DBFILE = 'querybuilder-sqlite-' + process.pid + '.db';

function cleanup() {
	for (let ext of ['', '-journal', '-wal', '-shm']) {
		try {
			Fs.rmSync(PATH.root(DBFILE + ext), { force: true, maxRetries: 10, retryDelay: 100 });
		} catch (e) {}
	}
}

// The database engine is chosen according to the connection string
DATA.init('lite', 'sqlite://:memory:');

Test.push('QueryBuilder SQLite', function(next) {

	var arr = [];
	var check = (name, ok, detail) => Test.print(name, ok ? null : ('Unexpected value: ' + (typeof(detail) === 'string' ? detail : JSON.stringify(detail))));
	var dt1 = new Date('2026-03-10T08:15:00.000Z');
	var dt2 = new Date('2027-06-20T18:45:00.000Z');

	arr.push(async function(resume) {

		try {

			var response;

			await DATA.query('lite', 'CREATE TABLE tbl_product (id INTEGER PRIMARY KEY, name TEXT, price NUMERIC, stock INTEGER, isactive BOOLEAN, tags JSON, data JSON, dtcreated DATETIME)').promise();

			// Insert
			response = await DATA.insert('lite/tbl_product', { name: 'Apple', price: 10, stock: 5, isactive: true, tags: ['fruit', 'red'], data: { color: 'red', weight: '1.5', bio: 'yes', dtexpire: '2027-01-02', sizes: ['S', 'M'] }, dtcreated: dt1 }).promise();
			check('insert() returns the count', response === 1, response);

			response = await DATA.insert('lite/tbl_product', { name: 'Banana', price: 20, stock: 0, isactive: false, tags: ['fruit', 'yellow'], data: { color: 'yellow', weight: 'abc', bio: 'no' }, dtcreated: dt2 }).primarykey('id').promise();
			check('insert() with primarykey() returns the identifier', response === 2, response);

			response = await DATA.insert('lite/tbl_product', { name: 'O\'Carrot \\ 100%', price: 30, stock: 7, isactive: true, tags: ['vegetable'], dtcreated: dt2 }).returning('id,name').promise();
			check('insert() with returning()', response && response.id === 3 && response.name === 'O\'Carrot \\ 100%', response);

			await DATA.insert('lite/tbl_product', { name: '', price: 40, stock: 1, isactive: true }).promise();

			// Find
			response = await DATA.find('lite/tbl_product').where('price', '>', 10).sort('price', true).fields('id,name,isactive,tags,dtcreated').take(2).promise();
			check('find() with where(), sort(), fields() and take()', response.length === 2 && response[0].id === 4 && response[1].id === 3 && Object.keys(response[1]).length === 5, response);
			check('find() returns parsed types', response[1].isactive === true && response[1].tags instanceof Array && response[1].tags[0] === 'vegetable' && response[1].dtcreated instanceof Date && response[1].dtcreated.getTime() === dt2.getTime(), response[1]);

			response = await DATA.find('lite/tbl_product').sort('id').skip(3).promise();
			check('find() with skip() only', response.length === 1 && response[0].id === 4, response);

			response = await DATA.read('lite/tbl_product').id(2).promise();
			check('read() with id()', response && response.name === 'Banana' && response.isactive === false, response);

			response = await DATA.list('lite/tbl_product').sort('id').page(2, 3).promise();
			check('list() with page()', response.count === 4 && response.items.length === 1 && response.items[0].id === 4, response);

			// Filters
			response = await DATA.find('lite/tbl_product').where('name', 'O\'Carrot \\ 100%').promise();
			check('where() escapes the value', response.length === 1 && response[0].id === 3, response);

			response = await DATA.find('lite/tbl_product').where('isactive', false).promise();
			check('where() with a boolean', response.length === 1 && response[0].id === 2, response);

			response = await DATA.find('lite/tbl_product').where('dtcreated', '>', new Date('2026-12-31T00:00:00.000Z')).sort('id').promise();
			check('where() with a date', response.length === 2 && response[0].id === 2, response);

			response = await DATA.find('lite/tbl_product').where('tags', null).promise();
			check('where() with null', response.length === 1 && response[0].id === 4, response);

			response = await DATA.find('lite/tbl_product').in('id', [1, 3]).notin('name', ['Apple']).promise();
			check('in() and notin()', response.length === 1 && response[0].id === 3, response);

			response = await DATA.find('lite/tbl_product').between('price', 15, 30).sort('id').promise();
			check('between()', response.length === 2 && response[0].id === 2 && response[1].id === 3, response);

			response = await DATA.find('lite/tbl_product').or(b => b.where('id', 1).where('id', 4)).sort('id').promise();
			check('or()', response.length === 2 && response[0].id === 1 && response[1].id === 4, response);

			response = await DATA.find('lite/tbl_product').search('name', 'BANA', 'beg').promise();
			var end = await DATA.find('lite/tbl_product').search('name', 'pple', 'end').promise();
			var all = await DATA.find('lite/tbl_product').search('name', 'arro').promise();
			check('search()', response.length === 1 && response[0].id === 2 && end.length === 1 && end[0].id === 1 && all.length === 1 && all[0].id === 3, [response, end, all]);

			response = await DATA.find('lite/tbl_product').empty('name').promise();
			var contains = await DATA.find('lite/tbl_product').contains('name').promise();
			check('empty() and contains()', response.length === 1 && response[0].id === 4 && contains.length === 3, [response, contains]);

			response = await DATA.find('lite/tbl_product').year('dtcreated', 2027).month('dtcreated', 6).day('dtcreated', 20).hour('dtcreated', 18).minute('dtcreated', 45).sort('id').promise();
			check('year(), month(), day(), hour() and minute()', response.length === 2 && response[0].id === 2, response);

			response = await DATA.find('lite/tbl_product').array('tags', ['red', 'yellow']).sort('id').promise();
			var containsall = await DATA.find('lite/tbl_product').array('tags', '@>', ['fruit', 'red']).promise();
			var containedby = await DATA.find('lite/tbl_product').array('tags', '<@', ['vegetable', 'other']).contains('tags').promise();
			check('array() with "&&", "@>" and "<@"', response.length === 2 && response[1].id === 2 && containsall.length === 1 && containsall[0].id === 1 && containedby.length === 1 && containedby[0].id === 3, [response, containsall, containedby]);

			// Permissions are stored with the type: "R" + value
			await DATA.update('lite/tbl_product', { tags: ['Radmin', 'Wadmin'] }).where('id', 3).promise();
			response = await DATA.find('lite/tbl_product').permit('tags', 'R', ['admin']).sort('id').promise();
			var required = await DATA.find('lite/tbl_product').permit('tags', 'R', ['admin'], null, false).promise();
			var denied = await DATA.find('lite/tbl_product').permit('tags', 'D', ['admin'], null, false).promise();
			check('permit()', response.length === 2 && response[0].id === 3 && response[1].id === 4 && required.length === 1 && required[0].id === 3 && denied.length === 0, [response, required, denied]);

			response = await DATA.find('lite/tbl_product').query('stock>0 AND price<30').promise();
			check('query()', response.length === 1 && response[0].id === 1, response);

			// Scalars
			response = await DATA.count('lite/tbl_product').where('isactive', true).promise();
			check('count()', response === 3, response);

			response = await DATA.check('lite/tbl_product').where('id', 2).promise();
			var missing = await DATA.check('lite/tbl_product').where('id', 100).promise();
			check('check()', response === true && missing === false, [response, missing]);

			response = await DATA.scalar('lite/tbl_product', 'sum', 'price').promise();
			var avg = await DATA.scalar('lite/tbl_product', 'avg', 'price').promise();
			var max = await DATA.scalar('lite/tbl_product', 'max', 'price').where('isactive', true).promise();
			var count = await DATA.scalar('lite/tbl_product', 'count').promise();
			check('scalar() with "sum", "avg", "max" and "count"', response === 100 && avg === 25 && max === 40 && count === 4, [response, avg, max, count]);

			response = await DATA.scalar('lite/tbl_product', 'group', 'isactive', 'price').promise();
			check('scalar() with "group"', response.length === 2 && response.findItem('isactive', true).value === 80, response);

			// Update
			response = await DATA.update('lite/tbl_product', { '+stock': 5, '>price': 15, '!isactive': 1, name: 'Apple 2' }).where('id', 1).promise();
			var row = await DATA.read('lite/tbl_product').id(1).promise();
			check('update() returns the count and applies "+", ">" and "!"', response === 1 && row.stock === 10 && row.price === 15 && row.isactive === false && row.name === 'Apple 2', [response, row]);

			response = await DATA.update('lite/tbl_product', { '-stock': 3, '<price': 12, '*id': 1 }).where('id', 1).promise();
			row = await DATA.read('lite/tbl_product').id(1).promise();
			check('update() applies "-", "<" and "*"', response === 1 && row.stock === 7 && row.price === 12, row);

			response = await DATA.update('lite/tbl_product', { stock: 99 }).where('id', '>', 100).promise();
			check('update() without a changed row', response === 0, response);

			response = await DATA.update('lite/tbl_product', { stock: 1 }).where('id', 2).returning('id,stock').first().promise();
			check('update() with returning()', response && response.id === 2 && response.stock === 1, response);

			// JSON properties
			response = await DATA.find('lite/tbl_product').autoqueryjson({ sort: 'color_desc' }, 'data', 'color:String,weight:Number,bio:Boolean,dtexpire:Date,sizes:[String]').where('id', '<', 3).promise();
			check('autoqueryjson() returns the properties', response.length === 2 && response[0].color === 'yellow' && response[1].color === 'red', response);
			check('autoqueryjson() converts the types', response[1].weight === 1.5 && response[1].bio === true && response[1].dtexpire instanceof Date && response[1].sizes instanceof Array && response[1].sizes[1] === 'M', response[1]);
			check('autoqueryjson() never fails on a wrong value', response[0].weight === 0 && response[0].bio === false && response[0].dtexpire === null && response[0].sizes === null, response[0]);

			response = await DATA.find('lite/tbl_product').autoqueryjson({ color: 'red' }, 'data', 'color:String,weight:Number').promise();
			check('autoqueryjson() filters the rows', response.length === 1 && response[0].weight === 1.5, response);

			// Raw query with parameters
			response = await DATA.query('lite', 'SELECT id, name FROM tbl_product WHERE price>=$1 AND id<>$2 ORDER BY id', [20, 4]).promise();
			check('query() with parameters', response.length === 2 && response[0].id === 2 && response[1].id === 3, response);

			// Remove
			response = await DATA.remove('lite/tbl_product').where('id', 4).promise();
			check('remove() returns the count', response === 1, response);

			await DATA.truncate('lite/tbl_product').promise();
			response = await DATA.count('lite/tbl_product').promise();
			check('truncate()', response === 0, response);

			await DATA.drop('lite/tbl_product').promise();

			var error = null;
			try {
				await DATA.find('lite/tbl_product').promise();
			} catch (e) {
				error = e;
			}
			check('drop() and an error of the query', !!error, error + '');

		} catch (e) {
			Test.print('QueryBuilder SQLite', e);
		}

		resume();
	});

	// A database in a file: the filename is relative to the root of the app
	arr.push(async function(resume) {

		cleanup();

		try {

			DATA.init('litefile', 'sqlite://' + DBFILE + '?wal=1&pooling=2');
			await DATA.query('litefile', 'CREATE TABLE tbl_item (id INTEGER PRIMARY KEY, name TEXT)').promise();
			await DATA.insert('litefile/tbl_item', { name: 'A' }).promise();

			var response = await DATA.find('litefile/tbl_item').promise();
			var mode = await DATA.query('litefile', 'PRAGMA journal_mode').promise();
			check('A database in a file relative to the root', Fs.existsSync(PATH.root(DBFILE)) && response.length === 1 && mode[0].journal_mode === 'wal', [response, mode]);

			// The same name with another database
			DATA.init('litefile', 'sqlite://:memory:');
			await DATA.query('litefile', 'CREATE TABLE tbl_item (id INTEGER PRIMARY KEY, name TEXT)').promise();
			response = await DATA.find('litefile/tbl_item').promise();
			check('DATA.init() replaces the connection', response.length === 0, response);

			// Removed connection
			DATA.init('litefile', null);

			var error = null;
			try {
				await DATA.find('litefile/tbl_item').promise();
			} catch (e) {
				error = e;
			}
			check('DATA.init() removes the connection', !!error, error + '');

		} catch (e) {
			Test.print('QueryBuilder SQLite: a file', e);
		}

		DATA.init('lite', null);
		setTimeout(function() {
			cleanup();
			resume();
		}, 200);
	});

	arr.async(next);
});

Test.run();
