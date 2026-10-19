/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

CONF.$imprint = false;
CONF.$python = 'node';


ROUTE('GET /xml/', $ => $.content('<root><name>Total.js</name></root>', 'application/xml'));
ROUTE('GET /module/', $ => $.plain('module.exports = 1;'));
ROUTE('GET /search/', $ => $.json({ href: $.href('page', 2), all: $.href() }));

var runs = 0;

NEWACTION('Cached', {
	name: 'Cached',
	query: 'page:Number',
	cache: { expire: '1 minute', query: 'page' },
	action: function($) {
		runs++;
		$.callback({ runs: runs, page: $.query.page });
	}
});

ROUTE('GET /cached/ --> Cached');

F.run({ port: 8211, release: true, watcher: false });

ON('ready', function() {

	Test.push('Fixes', function(next) {

		var arr = [];

		arr.push(resume => setTimeout(resume, 500));

		// CRON: the step form
		arr.push(function(resume) {
			var cron = require('../../cron');
			function hits(line, from, to, fn) {
				var check = cron.make(line);
				var out = [];
				for (var i = from; i <= to; i++) {
					if (check(fn(i)))
						out.push(i);
				}
				return out.join(',');
			}
			Test.print('CRON */15 matches 0,15,30,45', hits('*/15 * * * *', 0, 59, i => new Date(2026, 0, 5, 10, i)) === '0,15,30,45' ? null : 'The step form does not match the expected minutes');
			Test.print('CRON 5/20 starts at 5', hits('5/20 * * * *', 0, 59, i => new Date(2026, 0, 5, 10, i)) === '5,25,45' ? null : 'The step form with a start does not match the expected minutes');
			Test.print('CRON */6 in the hours', hits('0 */6 * * *', 0, 23, i => new Date(2026, 0, 5, i, 0)) === '0,6,12,18' ? null : 'The step form does not match the expected hours');
			Test.print('CRON */10 in the days', hits('0 0 */10 * *', 1, 31, i => new Date(2026, 0, i, 0, 0)) === '1,11,21,31' ? null : 'The step form does not match the expected days');
			resume();
		});

		// setTimeout2: the limit
		arr.push(function(resume) {
			var count = 0;
			var fn = () => count++;
			for (var i = 0; i < 4; i++)
				setTimeout2('fixes-limit', fn, 5000, 2);
			Test.print('setTimeout2 limit runs the callback at once', count === 1 ? null : 'Expected the callback after the limit, got ' + count);
			clearTimeout2('fixes-limit');
			resume();
		});

		// AJAX: an answer of the type XML
		arr.push(function(resume) {
			var timer = setTimeout(() => Test.print('AJAX with XML answers', 'The callback was not called'), 3000);
			AJAX('GET http://127.0.0.1:8211/xml/', function(err, response) {
				clearTimeout(timer);
				Test.print('AJAX with XML answers', !err && response && response.root_name === 'Total.js' ? null : 'Expected the parsed XML, got ' + JSON.stringify(err || response));
				resume();
			});
		});

		// IMPORT: an address that answers 404
		arr.push(function(resume) {
			var timer = setTimeout(() => Test.print('IMPORT with 404', 'The callback was not called'), 3000);
			IMPORT('http://127.0.0.1:8211/missing/', function(err) {
				clearTimeout(timer);
				Test.print('IMPORT with 404 gives an error', err ? null : 'Expected an error');
				resume();
			});
		});

		arr.push(function(resume) {
			IMPORT('http://127.0.0.1:8211/module/', function(err, module) {
				Test.print('IMPORT of a module', !err && module === 1 ? null : 'Expected the module');
				resume();
			});
		});

		// F.python without a callback
		arr.push(function(resume) {
			var file = PATH.tmp('fixes-python.js');
			require('fs').writeFileSync(file, 'console.log("python-ok");');
			var timer = setTimeout(() => Test.print('F.python as a promise', 'The promise was not settled'), 3000);
			F.python(file).then(function(response) {
				clearTimeout(timer);
				Test.print('F.python as a promise', response && response.indexOf('python-ok') !== -1 ? null : 'Expected the output');
				resume();
			});
		});

		// LOGMAIL: an object as the body
		arr.push(function(resume) {
			var old = DEF.onMail;
			var body = '';
			DEF.onMail = function(email, subject, html) {
				body = html;
			};
			LOGMAIL('nobody@example.com', { rows: '<1>' });
			DEF.onMail = old;
			Test.print('LOGMAIL with an object', body.indexOf('{&quot;rows&quot;') !== -1 || body.indexOf('&lt;1&gt;') !== -1 ? null : 'Expected the object in the body');
			resume();
		});

		// $.href
		arr.push(function(resume) {
			RESTBuilder.GET('http://127.0.0.1:8211/search/?q=a&page=1').exec(function(err, response) {
				Test.print('$.href()', !err && response && response.href && response.href.indexOf('page=2') !== -1 ? null : 'Expected a link with page=2, got ' + JSON.stringify(err || response));
				resume();
			});
		});

		// The cache option of an action
		arr.push(function(resume) {
			RESTBuilder.GET('http://127.0.0.1:8211/cached/?page=1').exec(function(err, first) {
				RESTBuilder.GET('http://127.0.0.1:8211/cached/?page=1').exec(function(err2, second) {
					RESTBuilder.GET('http://127.0.0.1:8211/cached/?page=2').exec(function(err3, third) {
						Test.print('Action cache: the same key is answered from the cache', first && second && first.runs === 1 && second.runs === 1 ? null : 'Expected one run for the same page');
						Test.print('Action cache: another key runs the action', third && third.runs === 2 ? null : 'Expected a new run for another page');
						resume();
					});
				});
			});
		});

		// Compact types JSON and IP
		arr.push(function(resume) {
			var js = 'json:JSON,address:IP'.toJSONSchema();
			var bad = js.transform({ json: '{broken', address: '999.1.1.1' }, false, new ErrorBuilder());
			var good = js.transform({ json: '{"a":1}', address: '127.0.0.1' }, false, new ErrorBuilder());
			Test.print('Compact JSON and IP reject invalid values', bad.error ? null : 'Expected an error');
			Test.print('Compact JSON and IP accept valid values', !good.error ? null : 'Expected no error');
			resume();
		});

		arr.async(function() {
			// The files that the test created in the temporary folder
			require('fs').rmSync(PATH.tmp(), { recursive: true, force: true });
			next();
		});
	});

	Test.run();
});
