/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

CONF.$imprint = false;

ROUTE('GET /href/object/', $ => $.json({ href: $.href('page', { a: 1 }) }));
ROUTE('GET /href/trailing/', $ => $.json({ a: $.href('page', 2), b: $.href('page', 3, 'q') }));
ROUTE('GET /href/cache/', $ => $.json({ a: $.href('page', 2, 'q'), b: $.href('page', 3) }));
ROUTE('GET /href/keys/', $ => $.json({ href: $.href({ page: 2, sort: 'name' }) }));

F.run({ port: 8441, release: true, watcher: false });

ON('ready', function() {

	Test.push('Views fixes', function(next) {

		var arr = [];

		arr.push(resume => setTimeout(resume, 500));

		// JSON schema: items of type object
		arr.push(function(resume) {
			var schema = { type: 'object', properties: { lines: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'number' } }, required: ['name'] } } } };
			var error = new ErrorBuilder();
			F.TJSONSchema.transform(schema, error, { lines: [{ name: 'a' }, { price: 3 }] });
			var err = error.items[0];
			Test.print('JSON schema: an invalid item of an array of objects', error.items.length === 1 && err.name === 'lines.name' && err.path === 'lines.name' && err.index === 1 && err.error === '@' ? null : 'Unexpected errors: ' + JSON.stringify(error.items));
			resume();
		});

		// Views: title2()
		arr.push(function(resume) {
			F.temporary.views.vf13_ = F.TViewEngine.compile('vf13', '@{layout(\'\')}@{title(\'A<b>\')}@{title2(\' / C<\')}<i>@{title}</i>@{meta}', false);
			var html = F.view('vf13', {});
			Test.print('Views: title2() is encoded once', html.indexOf('<i>A&lt;b&gt; / C&lt;</i>') !== -1 && html.indexOf('<title>A&lt;b&gt; / C&lt;') !== -1 ? null : 'Unexpected output: ' + html);
			resume();
		});

		// Views: @{language} of F.view()
		arr.push(function(resume) {
			F.temporary.views.vf14_sk = F.TViewEngine.compile('vf14', '@{layout(\'\')}<b>@{language}</b>', false);
			var html = F.view('vf14', {}, view => view.language = 'sk');
			Test.print('Views: @{language} of F.view()', html === '<b>sk</b>' ? null : 'Unexpected output: ' + html);
			resume();
		});

		// Views: two values in a <style> block
		arr.push(function(resume) {
			F.temporary.views.vf25_ = F.TViewEngine.compile('vf25', '@{layout(\'\')}<style>:root{--accent:@{model.c};--color:@{model.c}}</style>', false);
			var html = F.view('vf25', { c: '#f00' });
			Test.print('Views: two values in a <style> block', html === '<style>:root{--accent:#f00;--color:#f00}</style>' ? null : 'Unexpected output: ' + html);
			resume();
		});

		// Images: the filter of miniature()
		arr.push(function(resume) {
			var cmd = Image.load('a.jpg').miniature(100, 100, 'white', 'Lanczos').cmd('a.jpg', 'b.jpg');
			var filter = cmd.indexOf('-filter');
			Test.print('Images: the filter of miniature() goes before -thumbnail', filter !== -1 && filter < cmd.indexOf('-thumbnail') ? null : 'Unexpected command: ' + cmd);
			resume();
		});

		// HTML parser: [attr] without a value
		arr.push(function(resume) {
			var dom = '<div><span x="1">2</span><b>3</b><i class="c">4</i></div>'.parseHTML();
			Test.print('HTML parser: [attr] without a value', dom.find('[x]').length === 1 && dom.find('span[x]').length === 1 && dom.find('b[x]').length === 0 && dom.find('[class]').length === 1 ? null : 'Unexpected matches');
			resume();
		});

		// CMS: compile() with an object of widgets
		arr.push(function(resume) {
			var widget = { id: 'hello', css: '.hello { color: red; }', render: $ => $.body('<b>Hello</b>') };
			var output;
			try {
				output = F.TCMS.compile('<div><div data-cms="hello__%7B%7D">old</div></div>', { hello: widget });
			} catch (e) {
				output = e;
			}
			Test.print('CMS: compile() with an object of widgets', output && output.widgets && output.widgets.length === 1 && output.css.indexOf('.hello') !== -1 ? null : 'Unexpected result: ' + output);
			resume();
		});

		// $.href() with an object value
		arr.push(function(resume) {
			RESTBuilder.GET('http://127.0.0.1:8441/href/object/?q=a&page=1').exec(function(err, response) {
				Test.print('$.href() with an object value', response && response.href === '?q=a&page=' + encodeURIComponent('{"a":1}') ? null : 'Unexpected link: ' + JSON.stringify(err || response));
				resume();
			});
		});

		// $.href() without a trailing &
		arr.push(function(resume) {
			RESTBuilder.GET('http://127.0.0.1:8441/href/trailing/?page=1&q=a').exec(function(err, response) {
				Test.print('$.href() removes the last parameter without a trailing &', response && response.a === '?page=2&q=a' && response.b === '?page=3' ? null : 'Unexpected links: ' + JSON.stringify(err || response));
				resume();
			});
		});

		// $.href() keeps the parameters after another call
		arr.push(function(resume) {
			RESTBuilder.GET('http://127.0.0.1:8441/href/cache/?page=1&q=a').exec(function(err, response) {
				Test.print('$.href() keeps the parameters after another call', response && response.a === '?page=2' && response.b === '?page=3&q=a' ? null : 'Unexpected links: ' + JSON.stringify(err || response));
				resume();
			});
		});

		// Views: meta() is encoded once
		arr.push(function(resume) {
			F.temporary.views.vf31_ = F.TViewEngine.compile('vf31', '@{layout(\'\')}@{meta(\'A<b>\', \'D&E\', [\'K<1\', \'K2\'])}@{meta}', false);
			var html = F.view('vf31', {});
			Test.print('Views: meta() is encoded once', html.indexOf('<title>A&lt;b&gt;') !== -1 && html.indexOf('content="D&amp;E"') !== -1 && html.indexOf('content="K&lt;1, K2"') !== -1 && html.indexOf('&amp;lt;') === -1 && html.indexOf('&amp;amp;') === -1 ? null : 'Unexpected output: ' + html);
			resume();
		});

		// Views: no global variable "language"
		arr.push(function(resume) {
			F.temporary.views.vf32_sk = F.TViewEngine.compile('vf32', '@{layout(\'\')}<b>@{language}</b>', false);
			var html = F.view('vf32', {}, view => view.language = 'sk');
			Test.print('Views: a compiled view does not create a global "language"', html === '<b>sk</b>' && !('language' in global) ? null : 'Unexpected output: ' + html + ', global.language: ' + global.language);
			resume();
		});

		// Images: background() before -extent
		arr.push(function(resume) {
			var cmd = Image.load('a.jpg').background('red').cmd('a.jpg', 'b.jpg');
			var cmd2 = Image.load('a.jpg').miniature(100, 100, 'red').cmd('a.jpg', 'b.jpg');
			var check = c => c.indexOf('-background') !== -1 && c.indexOf('-background') < c.indexOf('-extent 0x0');
			Test.print('Images: -background goes before -extent', check(cmd) && check(cmd2) ? null : 'Unexpected commands: ' + cmd + ' | ' + cmd2);
			resume();
		});

		// $.href() with an object of keys
		arr.push(function(resume) {
			RESTBuilder.GET('http://127.0.0.1:8441/href/keys/?q=a&page=1').exec(function(err, response) {
				Test.print('$.href() with an object of keys', response && response.href === '/href/keys/?q=a&page=2&sort=name' ? null : 'Unexpected link: ' + JSON.stringify(err || response));
				resume();
			});
		});

		arr.async(next);
	});

	Test.run();
});
