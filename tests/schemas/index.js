/* eslint-disable */

require('../../index');
require('../../test');

// NEWSCHEMA()
// NEWACTION()
// ACTION()
// JSON schema types defined in the ACTIONS

F.console = NOOP;
var url = 'http://0.0.0.0:8000';
// load web server and test app
F.http();
ON('ready', function() {
	Test.push('NEWSCHEMA()', function(next) {
		// Test.print('String.slug()', [error]);

		var arr = [];
		var methods = ['query', 'read', 'update', 'patch', 'remove', 'insert'];
		var valid = [
			{ number: 123, email: 'abc@abc.abc', phone: '+421123456789', boolean: true, uid: UID(), url: 'https://www.totaljs.com', object: {}, date: NOW, json: '{}', base64: 'c3VwZXJ1c2Vy' },
			{ number: 123.123456, email: 'abc@abc.abc', boolean: '1', url: 'http://www.totaljs.com', date: new Date(), base64: 'c3VwZXJ1c2Vy' },
			{ email: 'abc.abc@abc.abc', url: 'http://totaljs.com' },
			{ url: 'https://totaljs.com' }
		];
	
		var invalid = [
			{ number: 'abc', email: 'ca@.sk', phone: 'notphone', boolean: '', uid: 'AV232CS@', url: 'url', date: 'today', json: null, base64: '' },
			{ number: 'one', email: '@', phone: '12345667', boolean: '', json: '', base64: '' }
		];

		function prefill_undefined(arr) {
			// Prefill missing fields in rows if 'undefined' based on index 0 row
			for (var i = 0; i < arr.length; i++) {
				for (var key in arr[0]) {
					if (typeof arr[i][key] === 'undefined')
						arr[i][key] = arr[0][key];
				}
			}
		};

		arr.push(function(next_fn) {
			methods.wait(function(item, fn) {
				RESTBuilder.GET(url + '/schema/methods/' + item).exec(function(err, res, output) {
					Test.print('Methods (GET) ' + item, err === null && res.success ? null : item + ' Failed');
					fn();
				});
			}, function() {
				next_fn();
			});
		});

		arr.push(function(next_fn) {

			prefill_undefined(valid);

			valid.wait(function(item, func) {
				RESTBuilder.POST(url + '/schema/required/', item).exec(function(err) {
					var items = [];
					if (err && err.items && err.items.length)
						items = err.items.map(i => i.name + '(' + item[i.name] + ')');
						Test.print('Schema required (valid): ', !items.length ? null : 'fields are not valid --> ' + items);
					func();
				});
			}, function() {
				next_fn();
			});
		});


		arr.push(function(next_fn) {

			prefill_undefined(invalid);
			invalid.wait(function(item, func) {
				RESTBuilder.POST(url + '/schema/required/', item).exec(function(err) {
					// Remap
					var errors = [];
					if (err && err.items && err.items.length) {
						for (var i = 0; i < err.items.length; i++)
							errors.push(err.items[i].name);
					}
	
					// Check
					var keys = Object.keys(item);
					keys.wait(function (i, cb) {
						Test.print('Schema required (invalid): {0}({1})'.format(i, item[i]), errors.includes(i) ? null : 'field was accepted --> ' + i + '(' + item[i] + ')');
						cb();
					}, function() {
						func();
					});
				});
			}, function() {
				next_fn();
			});
		});


		arr.async(function() {
			next();
		});
		
		Test.print('Test');
		next();
	});
	setTimeout(function() {
		Test.run();
	}, 100);
});
