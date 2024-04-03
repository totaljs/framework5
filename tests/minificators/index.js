/* eslint-disable */

require('../../index');
require('../../test');

Test.push('Minifactors', function(next) {
	var value, response, correct;

	var arr = [];

	arr.push(function(resume) {
		correct = 'var arr=[1,2,3,4,5,6,7,8];arr.wait(function(item){console.log(item)},function(){console.log(data)});';
		Total.Fs.readFile(PATH.public('script.js'), function(err, data) {
			if (data)
				value = data.toString();
			var response = U.minify_js(value);
			Test.print(' Minify - JS (without comments)', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});

	arr.push(function(resume) {
		correct = 'var arr=[1,2,3,4,5,6,7,8];arr.wait(function(item){console.log(item)},function(){console.log(data)});';
		Total.Fs.readFile(PATH.public('script2.js'), function(err, data) {
			if (data)
				value = data.toString();
			var response = U.minify_js(value);
			Test.print(' Minify - JS (with comments)', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});

	// arr.push(function(resume) {
	// correct = 'var arr=[1,2,3,4,5,6,7,8];arr.wait(function(item){console.log(item)},function(){console.log(data)});';
	// Total.Fs.readFile(PATH.public('script_multiline_string.js'), function(err, data) {
	// if (data)
	// value = data.toString();
	// var response = U.minify_js(value);

	// Test.print('Minify - JS (Multiline String)', response !== null && response === correct ? null : 'Something went rong');
	// resume();
	// });
	// });

	// arr.push(function(resume) {
	// correct = 'const REG_HTML_2=/\s{2,}/g;const REG_HTML_4=/\n\s{2,}./g;const REG_HTML_5=/>\n\s{1,}</g;var arr=[1,2,3,4,5,6,7,8];arr.wait(function(item){console.log(item)},function(){console.log(data)});';
	// Total.Fs.readFile(PATH.public('script_regex.js'), function(err, data) {
	// if (data)
	// value = data.toString();
	// var response = U.minify_js(value);
	// console.log(response);
	// Test.print(' Minify - JS (Regular expression)', response !== null && response === correct ? null : 'Something went rong');
	// resume();
	// });
	// });

	arr.push(function(resume) {
		correct = 'var arr=[1,2,3,4,5,6,7,8],a,b,cd;arr.wait(function(item){console.log(item)},function(){console.log(data)});';
		Total.Fs.readFile(PATH.public('script_multiple_var.js'), function(err, data) {
			if (data)
				value = data.toString();
			var response = U.minify_js(value);
			console.log(response);
			Test.print(' Minify - JS (Multiple Variable)', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});


	arr.push(function(resume) {
		correct = '.circle{width:40px;height:40px;border-radius:100%}';
		Total.Fs.readFile(PATH.public('style.css'), function(err, data) {
			if (data)
				value = data.toString();

			var response = U.minify_css(value);
			Test.print(' Minify - CSS (without comments)', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});

	arr.push(function(resume) {
		correct = '.circle{width:40px;height:40px;border-radius:100%}';
		Total.Fs.readFile(PATH.public('style2.css'), function(err, data) {
			if (data)
				value = data.toString();

			var response = U.minify_css(value);
			Test.print(' Minify - CSS (with comments)', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});

	arr.push(function(resume) {
		correct = '.circle{color:#fff;background-color:#000}';
		Total.Fs.readFile(PATH.public('style_color.css'), function(err, data) {
			if (data)
				value = data.toString();

			var response = U.minify_css(value);
			Test.print(' Minify - colors', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});

	arr.push(function(resume) {
		correct = 'nav ul{margin:0;padding:0;list-style:none}nav li{display:inline-block}nav a{display:block;padding:6px 12px;text-decoration:none}';
		Total.Fs.readFile(PATH.public('style_nested.css'), function(err, data) {
			if (data)
				value = data.toString();

			var response = U.minify_css(value);
			Test.print(' Minify - Nested selectors', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});

	arr.push(function(resume) {
		correct = '.circle{padding:0}.square{padding:20px 0 0}.rectangle{padding:20px 30px}.card{padding:20px 30px 10px}';
		Total.Fs.readFile(PATH.public('style_value_compression.css'), function(err, data) {
			if (data)
				value = data.toString();

			var response = U.minify_css(value);
			Test.print(' Minify - Value Compression', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});

	arr.push(function(resume) {
		correct = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport"content="width=device-width, initial-scale=1.0"><title>Document</title></head><body></body></html>';
		Total.Fs.readFile(PATH.public('index.html'), function(err, data) {
			if (data)
				value = data.toString();

			var response = U.minify_js(value);
			Test.print(' Minify - HTML (without comments)', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});

	arr.push(function(resume) {
		correct = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport"content="width=device-width, initial-scale=1.0"><title>Document</title><!--this is a comment--></head><body><!--Now put whatever you want here--></body></html>';
		Total.Fs.readFile(PATH.public('index2.html'), function(err, data) {
			if (data)
				value = data.toString();

			var response = U.minify_js(value);
			Test.print(' Minify - HTML (with comments)', response !== null && response === correct ? null : 'Something went rong');
			resume();
		});
	});

	arr.async(next);
});

Test.run();