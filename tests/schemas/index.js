/* eslint-disable */

require('../../index');
require('../../test');

// NEWSCHEMA()
// NEWACTION()
// ACTION()
// JSON schema types defined in the ACTIONS

CONF.$imprint = false;
F.console = NOOP;
var url = 'http://0.0.0.0:8000';

// load web server and test app
F.http();

ON('ready', function () {

	Test.push('NEWSCHEMA()', function (next) {
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

		var fields = [
			{ number: 123, email: 'ca@gmail.sk', phone: '+413233443344', boolean: false, uid: UID(), url: 'https://totaljs.com', date: NOW, json: '{"key":"value"}', base64: 'c3VwZXJ1c2Vy' },
			{ number: 1, email: 'slovakia@gmail.sk', phone: '+41543454323', boolean: false, uid: UID(), url: 'https://totaljs.com/community', date: NOW, json: '{"anotherkey":"anothervalue"}', base64: 'c3VwZXJ1c2Vy' },
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

		arr.push(function (resume) {
			methods.wait(function (item, fn) {
				RESTBuilder.GET(url + '/schema/methods/' + item).exec(function (err, res, output) {
					Test.print('Methods (GET) ' + item, err === null && res.success ? null : item + ' Failed');
					fn();
				});
			}, function () {
				resume();
			});
		});


		// Method data validation
		// arr.push(function(resume) {
		// 	var methods = [{ name: 'GET', validate: false }, { name: 'POST', validate: true }, { name: 'PUT', validate: true }, { name: 'PATCH', validate: true }, { name: 'DELETE', validate: true }];
		// 	methods.wait(function(method, next) {
		// 		RESTBuilder[method.name](url + '/schema/methods/validation').exec(function(err, res) {
		// 			if (method.validate) 
		// 				Test.print('Schema data validation - Should validate ' + method.name, err !== null && !res ? null : 'Should Validate');
		// 			else 
		// 				Test.print('Schema data validation - Should not validate ' + method.name, err === null && res  ? null : 'Should not validate');

		// 			next();
		// 		});
		// 	}, function() {
		// 		resume();
		// 	});
		// });

		// PATCH / DELETE with validation (invalid)
		arr.push(function (resume) {
			var methods = ['PATCH', 'DELETE'];

			methods.wait(function (method, next) {
				RESTBuilder[method](url + '/schema/methods/validation', { email: 'not_email' }).exec(function (err, res) {
					if (method)
						Test.print('Validation - Invalid' + method, err !== null ? null : 'Expected  error');
					next();
				});
			}, resume);
		});

		// PATCH / DELETE with validation (valid)
		arr.push(function (resume) {
			var methods = ['PATCH', 'DELETE'];

			methods.wait(function (method, next) {
				RESTBuilder[method](url + '/schema/methods/validation', { email: 'abc@abc.com' }).exec(function (err, res) {
					if (method)
						Test.print('Validation - Valid' + method, err === null && res.success ? null : 'Expected  error');
					next();
				});
			}, resume);
		});

		arr.push(function (resume) {

			var data = {
				number: { i: 123, o: 123 },
				number_float: { i: 123.456789, o: 123.456789 },
				string: { i: 'HeLlO..@#$%%^&*!@#$%^&*(_+(123', o: 'HeLlO..@#$%%^&*!@#$%^&*(_+(123' },
				string_name: { i: 'firsť? lást123@$#', o: 'Firsť Lást' },
				string_capitalize: { i: 'camel časé1', o: 'Camel Časé1' },
				string_capitalize2: { i: 'only first', o: 'Only first' },
				string_lowercase: { i: 'LoWEr cAse', o: 'lower case' },
				string_uppercase: { i: 'UPper CaSe', o: 'UPPER CASE' }
			};

			// Assemble body object
			var body = {};
			for (var key in data) {
				body[key] = data[key].i;
			}

			RESTBuilder.POST(url + '/schema/formatting/', body).exec(function (err, res) {
				for (var key in data)
					Test.print('Schema formatting - ' + res[key], res[key] === data[key].o ? null : ' - ' + key + ' - INPUT=' + data[key].i + ' OUTPUT=' + res[key] + ' EXPECTING=' + data[key].o);
				resume();
			});

		});
		arr.push(function (resume) {

			prefill_undefined(valid);

			valid.wait(function (item, func) {
				RESTBuilder.POST(url + '/schema/required/', item).exec(function (err) {
					var items = [];
					if (err && err.items && err.items.length)
						items = err.items.map(i => i.name + '(' + item[i.name] + ')');
					Test.print('Schema required (valid): ', !items.length ? null : 'fields are not valid --> ' + items);
					func();
				});
			}, resume);
		});


		arr.push(function(resume) {
			prefill_undefined(invalid);
			invalid.wait(function (item, resume2) {
				RESTBuilder.POST(url + '/schema/required/', item).exec(function (err) {
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
					}, resume2);
				});
			}, resume);
		});

		var data = { value: { one: 'one', two: 'two' } };
		arr.push(function (resume) {
			RESTBuilder.POST(url + '/schema/chaining/one', data).exec(function (err, res) {
				Test.print('Schema chaining: one ', err === null && res.success && res.value === data.value.one ? null : ' Chaining failed - expecting \'{0}\' got \'{1}\' instead'.format(data.value.one, res.value));
				resume();
			});
		});

		arr.push(function (resume) {
			RESTBuilder.POST(url + '/schema/chaining/two', data).exec(function (err, res) {
				Test.print('Schema chaining: two ', err === null && res.success && res.value === data.value.two ? null : ' Chaining failed - expecting \'{0}\' got \'{1}\' instead'.format(data.value.one, res.value));
				resume();
			});
		});

		arr.push(function (resume) {
			var data = { countryid: 'sk' };
			RESTBuilder.POST(url + '/schema/verify/', data).exec(function (err, res) {
				Test.print('Schema Verify/Check ', err === null && res.success && res.value === data.countryid ? null : 'Schema verify is not as expected');
				resume();
			});
		});

		arr.push(function (resume) {
			var data = { countryid: 'hu' };
			RESTBuilder.POST(url + '/schema/verify/', data).exec(function (err, res) {
				Test.print('Schema verify', err !== null ? null : 'Schema verify returned value (It shouldn\'t)');
				resume();
			});
		});

		arr.async(next);
	});

	Test.push('NEWACTION()', function (next) {

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

		var fields = [
			{ number: 123, email: 'ca@gmail.sk', phone: '+413233443344', boolean: false, uid: UID(), url: 'https://totaljs.com', date: NOW, json: '{"key":"value"}', base64: 'c3VwZXJ1c2Vy' },
			{ number: 1, email: 'slovakia@gmail.sk', phone: '+41543454323', boolean: false, uid: UID(), url: 'https://totaljs.com/community', date: NOW, json: '{"anotherkey":"anothervalue"}', base64: 'c3VwZXJ1c2Vy' },
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

		arr.push(function (resume) {
			methods.wait(function (item, fn) {
				RESTBuilder.GET(url + '/actions/methods/' + item).exec(function (err, res, output) {
					Test.print('New Action Methods (GET) ' + item, err === null && res.success ? null : item + ' Failed');
					fn();
				});
			}, resume);
		});


		// Method data validation
		// arr.push(function(resume) {
		// 	var methods = [{ name: 'GET', validate: false }, { name: 'POST', validate: true }, { name: 'PUT', validate: true }, { name: 'PATCH', validate: true }, { name: 'DELETE', validate: true }];
		// 	methods.wait(function(method, next) {
		// 		RESTBuilder[method.name](url + '/actions/methods/validation').exec(function(err, res) {
		// 			if (method.validate) 
		// 				Test.print('Schema data validation - Should validate ' + method.name, err !== null && !res ? null : 'Should Validate');
		// 			else 
		// 				Test.print('Schema data validation - Should not validate ' + method.name, err === null && res  ? null : 'Should not validate');

		// 			next();
		// 		});
		// 	}, function() {
		// 		resume();
		// 	});
		// });

		// PATCH / DELETE with validation (invalid)
		arr.push(function (resume) {
			var methods = ['PATCH', 'DELETE'];

			methods.wait(function (method, next) {
				RESTBuilder[method](url + '/actions/methods/validation', { email: 'not_email' }).exec(function (err, res) {
					if (method)
						Test.print('New Action Validation - Invalid' + method, err !== null ? null : 'Expected  error');
					next();
				});
			}, function () {
				resume();
			});
		});

		// PATCH / DELETE with validation (valid)
		arr.push(function (resume) {
			var methods = ['PATCH', 'DELETE'];

			methods.wait(function (method, next) {
				RESTBuilder[method](url + '/actions/methods/validation', { email: 'abc@abc.com' }).exec(function (err, res) {
					if (method)
						Test.print('New Action Validation - Valid' + method, err === null && res.success ? null : 'Expected  error');
					next();
				});
			}, resume);
		});


		arr.push(function (resume) {

			var data = {
				number: { i: 123, o: 123 },
				number_float: { i: 123.456789, o: 123.456789 },
				string: { i: 'HeLlO..@#$%%^&*!@#$%^&*(_+(123', o: 'HeLlO..@#$%%^&*!@#$%^&*(_+(123' },
				string_name: { i: 'firsť? lást123@$#', o: 'Firsť Lást' },
				string_capitalize: { i: 'camel časé1', o: 'Camel Časé1' },
				string_capitalize2: { i: 'only first', o: 'Only first' },
				string_lowercase: { i: 'LoWEr cAse', o: 'lower case' },
				string_uppercase: { i: 'UPper CaSe', o: 'UPPER CASE' }
			};

			// Assemble body object
			var body = {};
			for (var key in data) {
				body[key] = data[key].i;
			}

			RESTBuilder.POST(url + '/actions/formatting/', body).exec(function (err, res) {
				for (var key in data)
					Test.print('New Action formatting - ' + res[key], res[key] === data[key].o ? null : ' - ' + key + ' - INPUT=' + data[key].i + ' OUTPUT=' + res[key] + ' EXPECTING=' + data[key].o);
				resume();
			});

		});
		arr.push(function (resume) {
			prefill_undefined(valid);
			valid.wait(function (item, func) {
				RESTBuilder.POST(url + '/actions/required/', item).exec(function (err) {
					var items = [];
					if (err && err.items && err.items.length)
						items = err.items.map(i => i.name + '(' + item[i.name] + ')');
					Test.print('New Action required (valid): ', !items.length ? null : 'fields are not valid --> ' + items);
					func();
				});
			}, resume);
		});


		arr.push(function (resume) {

			prefill_undefined(invalid);
			invalid.wait(function (item, func) {
				RESTBuilder.POST(url + '/actions/required/', item).exec(function (err) {
					// Remap
					var errors = [];
					if (err && err.items && err.items.length) {
						for (var i = 0; i < err.items.length; i++)
							errors.push(err.items[i].name);
					}

					// Check
					var keys = Object.keys(item);
					keys.wait(function (i, cb) {
						Test.print('New Action required (invalid): {0}({1})'.format(i, item[i]), errors.includes(i) ? null : 'field was accepted --> ' + i + '(' + item[i] + ')');
						cb();
					}, function () {
						func();
					});
				});
			}, resume);
		});

		var data = { value: { one: 'one', two: 'two' } };
		arr.push(function (resume) {
			RESTBuilder.POST(url + '/actions/chaining/one', data).exec(function (err, res) {
				Test.print('New Action chaining: one ', err === null && res.success && res.value === data.value.one ? null : ' Chaining failed - expecting \'{0}\' got \'{1}\' instead'.format(data.value.one, res.value));
				resume();
			});
		});

		arr.push(function (resume) {
			RESTBuilder.POST(url + '/actions/chaining/two', data).exec(function (err, res) {
				Test.print('New Action chaining: two ', err === null && res.success && res.value === data.value.two ? null : ' Chaining failed - expecting \'{0}\' got \'{1}\' instead'.format(data.value.one, res.value));
				resume();
			});
		});

		arr.push(function (resume) {
			var data = { countryid: 'sk' };
			RESTBuilder.POST(url + '/actions/verify/', data).exec(function (err, res) {
				Test.print('New Action Verify/Check ', err === null && res.success && res.value === data.countryid ? null : 'Action verify is not as expected');
				resume();
			});

		});

		arr.push(function (resume) {
			var data = { countryid: 'hu' };
			RESTBuilder.POST(url + '/actions/verify/', data).exec(function (err, res) {
				Test.print('New Action verify', err !== null ? null : 'Action verify returned value (It shouldn\'t)');
				resume();
			});
		});

		arr.async(next);
	});

	Test.push('ACTION()', function (next) {

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

		var fields = [
			{ number: 123, email: 'ca@gmail.sk', phone: '+413233443344', boolean: false, uid: UID(), url: 'https://totaljs.com', date: NOW, json: '{"key":"value"}', base64: 'c3VwZXJ1c2Vy' },
			{ number: 1, email: 'slovakia@gmail.sk', phone: '+41543454323', boolean: false, uid: UID(), url: 'https://totaljs.com/community', date: NOW, json: '{"anotherkey":"anothervalue"}', base64: 'c3VwZXJ1c2Vy' },
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

		arr.push(function (resume) {
			methods.wait(function (item, resume2) {
				ACTION('Methods/' + item).callback(function (err, res) {
					Test.print('Action Method/' + item, err === null && res.success ? null : item + ' Failed');
					resume2();
				});
			}, resume);
		});


		// Method data validation
		// arr.push(function(resume) {
		// 	var methods = [{ name: 'GET', validate: false }, { name: 'POST', validate: true }, { name: 'PUT', validate: true }, { name: 'PATCH', validate: true }, { name: 'DELETE', validate: true }];
		// 	methods.wait(function(method, next) {
		// 		RESTBuilder[method.name](url + '/actions/methods/validation').exec(function(err, res) {
		// 			if (method.validate) 
		// 				Test.print('Schema data validation - Should validate ' + method.name, err !== null && !res ? null : 'Should Validate');
		// 			else 
		// 				Test.print('Schema data validation - Should not validate ' + method.name, err === null && res  ? null : 'Should not validate');

		// 			next();
		// 		});
		// 	}, function() {
		// 		resume();
		// 	});
		// });

		arr.push(function (resume) {
			ACTION('Validation/exec', { email: 'not_email' }).callback(function (err, res) {
				Test.print('Action Validation/exec - Invalid', err !== null ? null : 'Expected  error');
				resume();
			});
		});

		arr.push(function (resume) {
			ACTION('Validation/exec', { email: 'abc@abc.com' }).callback(function (err, res) {
				Test.print('Action Validation - Valid', err === null && res.success ? null : 'Expected  error');
				resume();
			});
		});

		arr.push(function (resume) {

			var data = {
				number: { i: 123, o: 123 },
				number_float: { i: 123.456789, o: 123.456789 },
				string: { i: 'HeLlO..@#$%%^&*!@#$%^&*(_+(123', o: 'HeLlO..@#$%%^&*!@#$%^&*(_+(123' },
				string_name: { i: 'firsť? lást123@$#', o: 'Firsť Lást' },
				string_capitalize: { i: 'camel časé1', o: 'Camel Časé1' },
				string_capitalize2: { i: 'only first', o: 'Only first' },
				string_lowercase: { i: 'LoWEr cAse', o: 'lower case' },
				string_uppercase: { i: 'UPper CaSe', o: 'UPPER CASE' }
			};

			// Assemble body object
			var body = {};
			for (var key in data)
				body[key] = data[key].i;

			ACTION('Formatting/exec', body).callback(function (err, res) {
				for (var key in data)
					Test.print('Action Formatting/exec -' + res[key], res[key] === data[key].o ? null : ' - ' + key + ' - INPUT=' + data[key].i + ' OUTPUT=' + res[key] + ' EXPECTING=' + data[key].o);
				resume();
			});
		});
		arr.push(function (resume) {
			prefill_undefined(valid);
			valid.wait(function (item, resume2) {
				ACTION('Required/exec', item).callback(function (err) {
					var items = [];
					if (err && err.items && err.items.length)
						items = err.items.map(i => i.name + '(' + item[i.name] + ')');
					Test.print('Action Required/exec (valid): ', !items.length ? null : 'fields are not valid --> ' + items);
					resume2();
				});
			}, resume);
		});


		arr.push(function (resume) {

			prefill_undefined(invalid);
			invalid.wait(function (item, resume2) {
				ACTION('Required/exec', item).callback(function (err) {
					// Remap
					var errors = [];
					if (err && err.items && err.items.length) {
						for (var i = 0; i < err.items.length; i++)
							errors.push(err.items[i].name);
					}

					// Check
					var keys = Object.keys(item);
					keys.wait(function (i, cb) {
						Test.print('Action Required/exec (invalid): {0}({1})'.format(i, item[i]), errors.includes(i) ? null : 'field was accepted --> ' + i + '(' + item[i] + ')');
						cb();
					}, resume2);
				});
			}, resume);
		});

		var data = { value: { one: 'one', two: 'two' } };
		arr.push(function (resume) {
			ACTION('Chaining/one', data).callback(function (err, res) {
				Test.print('Action Chaining/one ', err === null && res.success && res.value === data.value.one ? null : ' Chaining failed - expecting \'{0}\' got \'{1}\' instead'.format(data.value.one, res.value));
				resume();
			});
		});

		arr.push(function (resume) {
			ACTION('Chaining/two', data).callback(function (err, res) {
				Test.print('Action Chaining/two ', err === null && res.success && res.value === data.value.two ? null : ' Chaining failed - expecting \'{0}\' got \'{1}\' instead'.format(data.value.one, res.value));
				resume();
			});
		});

		arr.push(function (resume) {
			var data = { countryid: 'sk' };
			ACTION('Verify/exec', data).callback(function (err, res) {
				Test.print('Action Verify/exec ', err === null && res.success && res.value === data.countryid ? null : 'Action verify is not as expected');
				resume();
			});
		});

		arr.push(function (resume) {
			var data = { countryid: 'hu' };
			ACTION('Verify/exec', data).callback(function (err, res) {
				Test.print('Action Verify/exec', err !== null ? null : 'Action verify returned value (It shouldn\'t)');
				resume();
			});
		});

		arr.async(next);
	});
	setTimeout(Test.run, 100);
});
