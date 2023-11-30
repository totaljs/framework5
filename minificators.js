// Total.js HTML/JS/CSS minificators
// The MIT License
// Copyright 2016-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const REG_HTML_1 = /[\n\r\t]+/g;
const REG_HTML_2 = /\s{2,}/g;
const REG_HTML_4 = /\n\s{2,}./g;
const REG_HTML_5 = />\n\s{1,}</g;
const REG_HTML_6 = /[<\w"\u0080-\u07ff\u0400-\u04FF]+\s{2,}[\w\u0080-\u07ff\u0400-\u04FF>]+/;
const REG_HTML_9 = />\n\s+/g;
const REG_HTML_10 = /(\w|\W)\n\s+</g;
const REG_HTML_WIN = /\r/g;
const REG_CSS_0 = /\s{2,}|\t/g;
const REG_CSS_1 = /\n/g;
const REG_CSS_2 = /\s?\{\s{1,}/g;
const REG_CSS_3 = /\s?\}\s{1,}/g;
const REG_CSS_4 = /\s?:\s{1,}/g;
const REG_CSS_5 = /\s?;\s{1,}/g;
const REG_CSS_6 = /,\s{1,}/g;
const REG_CSS_7 = /\s\}/g;
const REG_CSS_8 = /\s\{/g;
const REG_CSS_9 = /;\}/g;
const REG_CSS_10 = /\$[a-z0-9-_]+(\s)*:.*?;/gi;
const REG_CSS_11 = /\$.*?(\s|;|\}|!)/gi;
const REG_CSS_12 = /(margin|padding):.*?(;|})/g;
const REG_CSS_13 = /#(0{6}|1{6}|2{6}|3{6}|4{6}|5{6}|6{6}|7{6}|8{6}|9{6}|0{6}|A{6}|B{6}|C{6}|D{6}|E{6}|F{6})+[\s;,)}]/gi;
const REG_CSS_14 = /\s>\s/g;
const REG_HTTPHTTPS = /^http(s)?:\/\//i;

exports.js = function(value) {

	var index = 0;
	var output = [];
	var isCS = false; // comment multiline
	var isCI = false; // comment inline
	var alpha = /[0-9a-z$]/i;
	var white = /\W/;
	var skip = { '$': true, '_': true };
	var newlines = { '\n': 1, '\r': 1 };
	var regexp = false;
	var scope, prev, next, last;
	var vtmp = false;
	var regvar = /^(\s)*var /;
	var vindex = 0;

	while (true) {

		var c = value[index];
		var prev = value[index - 1];
		var next = value[index + 1];

		index++;

		if (c === undefined)
			break;

		if (!scope) {

			if (!regexp) {

				if (!isCI && c === '/' && next === '*') {
					isCS = true;
					continue;
				} else if (!isCI && c === '*' && next === '/') {
					isCS = false;
					index++;
					continue;
				}

				if (isCS)
					continue;

				if (c === '/' && next === '/') {
					isCI = true;
					continue;
				} else if (isCI && newlines[c]) {
					isCI = false;
					alpha.test(last) && output.push(' ');
					last = '';
					continue;
				}

				if (isCI)
					continue;
			}

			if (c === '\t' || newlines[c]) {
				if (!last || !alpha.test(last))
					continue;
				output.push(' ');
				last = '';
				continue;
			}

			if (!regexp && (c === ' ' && (white.test(prev) || white.test(next)))) {
				// if (!skip[prev] && !skip[next])
				if (!skip[prev]) {
					if (!skip[next] || !alpha.test(prev))
						continue;
				}
			}

			if (regexp) {
				if ((last !== '\\' && c === '/') || (last === '\\' && c === '/' && output[output.length - 2] === '\\'))
					regexp = false;
			} else
				regexp = (last === '=' || last === '(' || last === ':' || last === '{' || last === '[' || last === '?') && (c === '/');
		}

		if (scope && c === '\\') {
			output.push(c);
			output.push(next);
			index++;
			last = next;
			continue;
		}

		if (!regexp && (c === '"' || c === '\'' || c === '`')) {

			if (scope && scope !== c) {
				output.push(c);
				continue;
			}

			if (c === scope)
				scope = 0;
			else
				scope = c;
		}

		// var
		if (!scope && c === 'v' && next === 'a') {
			var v = c + value[index] + value[index + 1] + value[index + 2];
			if (v === 'var ') {
				if (vtmp && output[output.length - 1] === ';') {
					output.pop();
					output.push(',');
				} else
					output.push('var ');
				index += 3;
				vtmp = true;
				continue;
			}
		} else {
			if (vtmp) {
				vindex = index + 1;
				while (true) {
					if (!value[vindex] || !white.test(value[vindex]))
						break;
					vindex++;
				}
				if (c === '(' || c === ')' || (c === ';' && !regvar.test(value.substring(vindex, vindex + 20))))
					vtmp = false;
			}
		}

		if ((c === '+' || c === '-') && next === ' ') {
			if (value[index + 1] === c) {
				index += 2;
				output.push(c);
				output.push(' ');
				output.push(c);
				last = c;
				continue;
			}
		}

		if (!scope && (c === '}' && last === ';') || ((c === '}' || c === ']') && output[output.length - 1] === ' ' && alpha.test(output[output.length - 2])))
			output.pop();

		output.push(c);
		last = c;
	}

	return output.join('').trim();
};

exports.css = function(value) {
	try {
		var isvariable = false;
		value = cssnested(value, '', () => isvariable = true);
		value = cssautovendor(value);
		if (isvariable)
			value = cssvariables(value);
		return value;
	} catch (ex) {
		F.error(new Error('CSS compiler error: ' + ex.message));
		return '';
	}
};

exports.html = function(html, ischunk) {

	html = exports.htmlremovecomments(html.replace(REG_HTML_WIN, ''));

	var tags = ['script', 'textarea', 'pre', 'code', 'readme'];
	var id = '[' + new Date().getTime() + ']#';
	var cache = {};
	var indexer = 0;
	var length = tags.length;
	var chars = 65;
	var tagBeg, tagEnd, beg, end, len, key, value;

	for (var i = 0; i < length; i++) {
		var o = tags[i];

		tagBeg = '<' + o;
		tagEnd = '</' + o;

		beg = html.indexOf(tagBeg);
		end = 0;
		len = tagEnd.length;

		while (beg !== -1) {

			end = html.indexOf(tagEnd, beg + 3);
			if (end === -1) {
				if (ischunk)
					end = html.length;
				else
					break;
			}

			key = id + (indexer++) + String.fromCharCode(chars++);
			if (chars > 90)
				chars = 65;

			value = html.substring(beg, end + len);

			if (!i) {
				end = value.indexOf('>');
				len = value.indexOf('type="text/template"');

				if (len < end && len !== -1) {
					beg = html.indexOf(tagBeg, beg + tagBeg.length);
					continue;
				}

				len = value.indexOf('type="text/html"');

				if (len < end && len !== -1) {
					beg = html.indexOf(tagBeg, beg + tagBeg.length);
					continue;
				}

				len = value.indexOf('type="text/ng-template"');

				if (len < end && len !== -1) {
					beg = html.indexOf(tagBeg, beg + tagBeg.length);
					continue;
				}
			}

			cache[key] = value;
			html = replacer(html, value, key);
			beg = html.indexOf(tagBeg, beg + tagBeg.length);
		}
	}

	while (true) {
		if (!REG_HTML_6.test(html))
			break;
		html = html.replace(REG_HTML_6, text => text.replace(/\s+/g, ' '));
	}

	html = html.replace(REG_HTML_9, '>').replace(REG_HTML_10, function(text) {
		return text.trim().replace(/\s/g, '');
	}).replace(REG_HTML_5, '><').replace(REG_HTML_4, function(text) {
		var c = text[text.length - 1];
		return c === '<' ? c : ' ' + c;
	}).replace(REG_HTML_1, '').replace(REG_HTML_2, '');

	for (var k in cache)
		html = replacer(html, k, cache[k]);

	return exports.htmlcss(exports.htmljs(html));
};

exports.htmlremovecomments = function(value) {
	var tagBeg = '<!--';
	var tagEnd = '-->';
	var beg = value.indexOf(tagBeg);
	var end = 0;

	while (beg !== -1) {
		end = value.indexOf(tagEnd, beg + 4);

		if (end === -1)
			break;

		var comment = value.substring(beg, end + 3);
		if (comment.indexOf('[if') !== -1 || comment.indexOf('[endif') !== -1) {
			beg = value.indexOf(tagBeg, end + 3);
		} else {
			value = replacer(value, comment, '');
			beg = value.indexOf(tagBeg, beg);
		}
	}
	return value;
};

exports.merge = async function(filename, filenames, minify = true) {

	// @filename {String/Boolean}

	var isbuffer = false;
	var writer = null;

	if (typeof(filename) === 'string') {
		writer = F.Fs.createWriteStream(filename);
	} else {
		writer = [];
		isbuffer = true;
	}

	for (let i = 0; i < filenames.length; i++) {

		let path = filenames[i];
		let response = '';

		if (REG_HTTPHTTPS.test(path))
			response = await mergedownload(path, minify);
		else
			response = await mergefile(path, minify);

		if (DEBUG)
			mergedebug(writer, path, response.ext, i);

		if (response.body) {
			if (isbuffer)
				writer.push(Buffer.from(response.body, 'utf8'));
			else
				writer.write(response.body, 'utf8');
		}
	}

	if (isbuffer)
		return Buffer.concat(writer);

	writer.end();
	return filename;
};

function mergedebug(writer, filename, ext, index) {

	if (filename.substring(0, F.directory.length) === F.directory)
		filename = filename.substring(F.directory.length);

	var plus = '===========================================================================================';
	var beg = ext === 'js' ? '/*\n' : ext === 'css' ? '/*!\n' : '<!--\n';
	var end = ext === 'js' || ext === 'css' ? '\n */' : '\n-->';
	var mid = ext !== 'html' ? ' * ' : ' ';
	var line = (index > 0 ? '\n\n' : '') + beg + mid + plus + '\n' + mid + 'MERGED: ' + filename + '\n' + mid + plus + end + '\n\n';

	if (writer instanceof Array)
		writer.push(Buffer.from(line, 'utf8'));
	else
		writer.write(line, 'utf8');
}

async function mergedownload(url, minify = true) {
	return new Promise(function(resolve) {
		var opt = {};
		opt.method = 'GET';
		opt.url = url;
		opt.callback = function(err, response) {

			if (err) {
				resolve('');
				F.error(err, 'total5/minificators/merge');
				return;
			}

			var index = url.lastIndexOf('?');
			var ext = '';

			if (index !== -1)
				url = url.substring(0, index);

			url = url.toLowerCase();

			var isminified = (/(-|_|@|.)min(.|@|-|_)/).test(url);

			index = url.lastIndexOf('.');

			if (index !== -1) {
				ext = url.substring(index + 1);
				index = ext.indexOf('?');
				if (index !== -1)
					ext = ext.substring(0, index);
				ext = ext.toLowerCase();
			}

			var output = { ext: ext };

			response.body = response.body.ROOT();

			if (minify && !isminified) {
				switch (ext) {
					case 'js':
						output.body = exports.js(response.body);
						resolve(output);
						return;
					case 'css':
						output.body = exports.css(response.body);
						resolve(output);
						return;
					case 'html':
						output.body = exports.html(response.body);
						resolve(output);
						return;
				}
			}

			output.body = response.body;
			resolve(output);
		};

		F.TUtils.request(opt);
	});
}

async function mergefile(filename, minify) {
	return new Promise(function(resolve) {

		F.Fs.readFile(filename, 'utf8', function(err, response) {

			if (err) {
				resolve('');
				F.error(err, 'total5/minificators/merge');
				return;
			}

			var isminified = (/(-|_|@|.)min(-|_|@|.)/).test(filename);
			var index = filename.lastIndexOf('.');
			var ext = '';

			if (index !== -1) {
				ext = filename.substring(index + 1);
				index = ext.indexOf('?');
				if (index !== -1)
					ext = ext.substring(0, index);
				ext = ext.toLowerCase();
			}

			var output = { ext: ext };

			response = response.ROOT();

			if (minify && !isminified) {
				switch (ext) {
					case 'js':
						output.body = exports.js(response);
						resolve(output);
						return;
					case 'css':
						output.body = exports.css(response);
						resolve(output);
						return;
					case 'html':
						output.body = exports.html(response);
						resolve(output);
						return;
				}
			}

			output.body = response;
			resolve(output);
		});

	});
}

function cssnested(css, id, variable) {

	if (!css)
		return css;

	var index = 0;
	var output = '';
	var A = false;
	var count = 0;
	var beg;
	var begAt;
	var valid = false;
	var plus = '';
	var skip = false;
	var skipImport = '';
	var isComment = false;
	var comment = '';
	var skipView = false;
	var skipType;

	while (true) {

		var a = css[index++];
		if (!a)
			break;

		if (a === '/' && css[index] === '*') {
			isComment = true;
			index++;
			comment = '';
			continue;
		}

		if (isComment) {
			comment += a;
			if (a === '*' && css[index] === '/') {
				isComment = false;
				index++;
				if (comment === 'auto*')
					output += '/*auto*/';
			}
			continue;
		}

		if (a === '\n' || a === '\r')
			continue;

		if (a === '$' && variable)
			variable();

		if (a === '@' && css[index] === '{')
			skipView = true;

		if (skipView) {
			plus += a;
			if (a === '}')
				skipView = false;
			continue;
		}

		if (a === '\'' || a === '"') {
			if (a === skipType && css[index] !== '\\')
				skipType = '';
			else if (!skipType) {
				skipType = a;
			}
		}

		if (skipType) {
			plus += a;
			continue;
		}

		if (a === '@') {
			begAt = index;
			skip = true;
		}

		if (skip && !skipImport && (a === ';' || a === '{')) {
			skipImport = a;
			if (a === ';') {
				output += css.substring(begAt - 1, index);
				skip = false;
				plus = '';
				continue;
			}
		}

		plus += a;

		if (a === '{') {

			if (A) {
				count++;
				continue;
			}

			A = true;
			count = 0;
			beg = index;
			valid = false;
			continue;
		}

		if (a === '}') {

			if (count > 0) {
				count--;
				valid = true;
				continue;
			}

			if (!valid) {
				output += plus;
				plus = '';
				A = false;
				skip = false;
				skipImport = '';
				continue;
			}

			if (skip) {

				if (plus.indexOf('@keyframes') !== -1) {
					output += plus;
				} else {
					begAt = plus.indexOf('{');
					output += plus.substring(0, begAt + 1) + cssnested_process(plus.substring(begAt), id).trim() + '}';
				}

				A = false;
				skip = false;
				skipImport = '';
				plus = '';

				continue;
			}

			var ni = beg - 1;
			var name = '';

			while (true) {
				var b = css[ni--];
				if (b === '{')
					continue;
				if (b === '}' || b === '\n' || b === '\r' || b === undefined || (skipImport && skipImport === b))
					break;
				name = b + name;
			}

			A = false;
			skip = false;
			skipImport = '';
			plus = '';
			output += cssnested_process(css.substring(beg - 1, index), (id || '') + name.trim());
		}
	}

	return output + plus;
}

function cssautovendor(css) {
	return css.replace(REG_CSS_0, ' ').replace(REG_CSS_1, '').replace(REG_CSS_2, '{').replace(REG_CSS_3, '}').replace(REG_CSS_4, ':').replace(REG_CSS_5, ';').replace(REG_CSS_6, function(search, index, text) {
		for (var i = index; i > 0; i--) {
			if ((text[i] === '\'' || text[i] === '"') && (text[i - 1] === ':'))
				return search;
		}
		return ',';
	}).replace(REG_CSS_7, '}').replace(REG_CSS_8, '{').replace(REG_CSS_9, '}').replace(REG_CSS_12, cssmarginpadding).replace(REG_CSS_13, csscolors).replace(REG_CSS_14, '>').trim();
}

function csscolors(text) {
	return text.substring(0, 4) + text.charAt(text.length - 1);
}

function cssmarginpadding(text) {

	// margin
	// padding

	var prop = '';
	var val;
	var l = text.length - 1;
	var last = text[l];

	if (text[0] === 'm') {
		prop = 'margin:';
		val = text.substring(7, l);
	} else {
		prop = 'padding:';
		val = text.substring(8, l);
	}

	var a = val.split(' ');

	for (var i = 0; i < a.length; i++) {
		if (a[i][0] === '0' && a[i].charCodeAt(1) > 58)
			a[i] = '0';
	}

	// 0 0 0 0 --> 0
	if (a[0] === '0' && a[1] === '0' && a[2] === '0' && a[3] === '0')
		return prop + '0' + last;

	// 20px 0 0 0 --> 20px 0 0
	if (a[0] !== '0' && a[1] === '0' && a[2] === '0' && a[3] === '0')
		return prop + a[0] + ' 0 0' + last;

	// 20px 30px 20px 30px --> 20px 30px
	if (a[1] && a[2] && a[3] && a[0] === a[2] && a[1] === a[3])
		return prop + a[0] + ' ' + a[1] + last;

	// 20px 30px 10px 30px --> 20px 30px 10px
	if (a[2] && a[3] && a[1] === a[3] && a[0] !== a[2])
		return prop + a[0] + ' ' + a[1] + ' ' + a[2] + last;

	return text;
}

function cssnested_process(css, name) {
	css = css.trim();
	css = cssnested_make(css.substring(1, css.length - 1), name);
	return cssnested(css, name);
}

function cssnested_make(css, name) {

	var index = 0;
	var plus = '';
	var output = '';
	var count = 0;
	var A = false;
	var valid = false;

	while (true) {
		var a = css[index++];

		if (!a)
			break;

		if (a === '\n' || a === '\r')
			continue;

		if (a !== ' ' || plus[plus.length -1] !== ' ')
			plus += a;

		if (a === '{') {

			if (A) {
				count++;
				continue;
			}

			A = true;
			count = 0;
			valid = false;
			continue;
		}

		if (a === '}') {

			if (count > 0) {
				count--;
				valid = true;
				continue;
			}

			if (!valid) {
				output += name + ' ' + plus.trim();
				plus = '';
				A = false;
				continue;
			}

			output += plus;
		}
	}

	return output;
}

function cssvariables(value) {

	if (!value)
		return value;

	var variables = {};

	value = value.replace(REG_CSS_10, function(text) {
		var index = text.indexOf(':');
		if (index === -1)
			return text;
		var key = text.substring(0, index).trim();
		variables[key] = text.substring(index + 1, text.length - 1).trim();
		return '';
	});

	value = value.replace(REG_CSS_11, function(text) {

		var index = text.indexOf('||');
		var variable = '';
		var last = text[text.length - 1];
		var len = text.length;

		if (last === ';' || last === '}' || last === '!' || last === ' ')
			len = len - 1;
		else
			last = '';

		if (index !== -1)
			variable = variables[text.substring(0, index).trim()] || text.substring(index + 2, len).trim();
		else
			variable = variables[text.substring(0, len).trim()];

		return variable ? (variable + last) : text;
	}).trim();

	return value;
}

exports.htmljs = function(html, index = 0) {

	if (!F.config.$minifyjs)
		return html;

	var strFrom = '<script type="text/javascript">';
	var strTo = '</script>';

	var indexBeg = html.indexOf(strFrom, index);
	if (indexBeg === -1) {
		strFrom = '<script>';
		indexBeg = html.indexOf(strFrom, index);
		if (indexBeg === -1)
			return html;
	}

	var indexEnd = html.indexOf(strTo, indexBeg + strFrom.length);
	if (indexEnd === -1)
		return html;

	var js = html.substring(indexBeg, indexEnd + strTo.length).trim();
	var beg = html.indexOf(js);
	if (beg === -1)
		return html;

	var val = js.substring(strFrom.length, js.length - strTo.length).trim();
	var compiled = exports.js(val);
	html = replacer(html, js, strFrom + compiled.trim() + strTo.trim());
	return exports.htmljs(html, indexBeg + compiled.length + 9);
};

exports.htmlcss = function(html, index = 0) {

	if (!F.config.$minifycss)
		return html;

	var strFrom = '<style';
	var strTo = '</style>';

	var indexBeg = html.indexOf(strFrom, index);
	if (indexBeg === -1)
		return html;

	var indexBeg2 = html.indexOf('>', indexBeg + strFrom.length);
	if (indexBeg2 === -1)
		return html;

	strFrom = html.substring(indexBeg, indexBeg2 + 1);
	var indexEnd = html.indexOf(strTo, indexBeg2 + strFrom.length);
	if (indexEnd === -1)
		return html;

	var css = html.substring(indexBeg, indexEnd + strTo.length);
	var val = css.substring(strFrom.length, css.length - strTo.length).trim();
	var compiled = exports.css(val);
	html = replacer(html, css, (strFrom + compiled.trim() + strTo).trim());
	return exports.htmlcss(html, indexBeg2 + compiled.length + 8);
};

function replacer(str, find, text) {
	var beg = str.indexOf(find);
	return beg === -1 ? str : (str.substring(0, beg) + text + str.substring(beg + find.length));
}