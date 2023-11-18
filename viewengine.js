// Total.js ViewEngine
// The MIT License
// Copyright 2014-2023 (c) Peter Širka <petersirka@gmail.com>

const REG_NOCOMPRESS = /@\{nocompress\s\w+}/gi;
const REG_TAGREMOVE = /[^>](\r)\n\s{1,}$/;
const REG_HELPERS = /helpers\.[a-z0-9A-Z_$]+\(.*?\)+/g;
const REG_CHECKCSS = /\.css(\s|\+)?/;
const VIEW_IF = { 'if ': 1, 'if(': 1 };

exports.cache = [];
exports.compile = function(name, content, debug = true) {

	if (F.$events.$view) {
		let meta = { name: name, body: content, debug: debug };
		F.emit('$view', meta);
		content = meta.body;
	}

	content = F.TMinificators.htmlremovecomments(content).ROOT();

	var nocompressHTML = false;
	var nocompressJS = false;
	var nocompressCSS = false;

	content = content.replace(REG_NOCOMPRESS, function(text) {

		var index = text.lastIndexOf(' ');
		if (index === -1)
			return '';

		switch (text.substring(index, text.length - 1).trim()) {
			case 'all':
				nocompressHTML = true;
				nocompressJS = true;
				nocompressCSS = true;
				break;
			case 'html':
				nocompressHTML = true;
				break;
			case 'js':
			case 'script':
			case 'javascript':
				nocompressJS = true;
				break;
			case 'css':
			case 'style':
				nocompressCSS = true;
				break;
		}

		return '';

	}).trim();

	if (!nocompressJS)
		content = F.TMinificators.htmljs(content);

	if (!nocompressCSS)
		content = F.TMinificators.htmlcss(content);

	if (!nocompressHTML)
		content = minify(content);

	var DELIMITER = '\'';
	var SPACE = ' ';
	var builder = 'var $EMPTY=\'\';var $length=0;var $source=null;var $tmp=index;var $output=$EMPTY';
	var command = findcommand(content, 0);
	var isFirst = false;
	var txtindex = -1;
	var index = 0;
	var isCookie = false;

	function escaper(value) {

		var is = REG_TAGREMOVE.test(value);

		if (!isFirst) {
			isFirst = true;
			value = value.replace(/^\s+/, '');
		}

		if (!value)
			return '$EMPTY';

		if (!nocompressHTML && is)
			value += ' ';

		txtindex = exports.cache.indexOf(value);

		if (txtindex === -1) {
			txtindex = exports.cache.length;
			exports.cache.push(value);
		}

		return 'F.TViewEngine.cache[' + txtindex + ']';
	}

	if (!command)
		builder += '+' + escaper(content);

	index = 0;

	var old = null;
	var newCommand = '';
	var tmp = '';
	var counter = 0;
	var functions = [];
	var functionNames = [];
	var isFN = false;
	var isSECTION = false;
	var isCOMPILATION = false;
	var builderTMP = '';
	var sectionName = '';
	var components = {};
	var text;

	while (command) {

		if (!isCookie && command.command.indexOf('cookie') !== -1)
			isCookie = true;

		if (old) {
			text = content.substring(old.end + 1, command.beg);
			if (text) {
				if (parseplus(builder))
					builder += '+';
				builder += escaper(text);
			}
		} else {
			text = content.substring(0, command.beg);
			if (text) {
				if (parseplus(builder))
					builder += '+';
				builder += escaper(text);
			}
		}

		var cmd = content.substring(command.beg + 2, command.end).trim();

		var cmd8 = cmd.substring(0, 8);
		var cmd7 = cmd.substring(0, 7);

		if (cmd === 'continue' || cmd === 'break') {
			builder += ';' + cmd + ';';
			old = command;
			command = findcommand(content, command.end);
			continue;
		}

		// cmd = cmd.replace
		command.command = command.command.replace(REG_HELPERS, function(text) {
			var index = text.indexOf('(');
			return index === - 1 ? text : text.substring(0, index) + '.call(self' + (text.endsWith('()') ? ')' : ',' + text.substring(index + 1));
		});

		if (cmd[0] === '\'' || cmd[0] === '"') {
			if (cmd[1] === '%') {
				var t = F.config[cmd.substring(2, cmd.length - 1)];
				if (t != null)
					builder += '+' + DELIMITER + (t + '').safehtml().replace(/'/g, "\\'") + DELIMITER;
			}
			//  else
			//	builder += '+' + DELIMITER + (new Function('self', 'return self.import(' + cmd[0] + '!' + cmd.substring(1) + ')'))(controller) + DELIMITER;
		} else if (cmd7 === 'compile' && cmd.lastIndexOf(')') === -1) {

			builderTMP = builder + '+(DEF.onViewCompile.call(self,\'' + (cmd8[7] === ' ' ? cmd.substring(8).trim() : '') + '\',';
			builder = '';
			sectionName = cmd.substring(8);
			isCOMPILATION = true;
			isFN = true;

		} else if (cmd8 === 'section ' && cmd.lastIndexOf(')') === -1) {
			builderTMP = builder;
			builder = '+(function(){var $output=$EMPTY';
			sectionName = cmd.substring(8);
			isSECTION = true;
			isFN = true;
		} else if (cmd7 === 'helper ') {

			builderTMP = builder;
			builder = 'function ' + cmd.substring(7).trim() + '{var $output=$EMPTY';
			isFN = true;
			functionNames.push(cmd.substring(7, cmd.indexOf('(', 7)).trim());

		} else if (cmd8 === 'foreach ') {

			counter++;

			if (cmd.indexOf('foreach var ') !== -1)
				cmd = cmd.replace(' var ', SPACE);

			newCommand = (cmd.substring(8, cmd.indexOf(SPACE, 8)) || '').trim();
			index = cmd.trim().indexOf(SPACE, newCommand.length + 10);

			if (index === -1)
				index = cmd.indexOf('[', newCommand.length + 10);

			builder += '+(function(){var $source=' + cmd.substring(index).trim() + ';if(!($source instanceof Array))$source=self.ota($source);if(!$source.length)return $EMPTY;var $length=$source.length;var $output=$EMPTY;var index=0;for(var $i=0;$i<$length;$i++){index=$i;var ' + newCommand + '=$source[$i];$output+=$EMPTY';
		} else if (cmd === 'end') {

			if (isFN && counter <= 0) {
				counter = 0;

				if (isCOMPILATION) {
					builder = builderTMP + 'unescape($EMPTY' + builder + '),model) || $EMPTY)';
					builderTMP = '';
				} else if (isSECTION) {
					builder = builderTMP + builder + ';repository[\'section_' + sectionName + '\']=repository[\'section_' + sectionName + '\']?repository[\'section_' + sectionName + '\']+$output:$output;return $EMPTY})()';
					builderTMP = '';
				} else {
					builder += ';return $output;}';
					functions.push(builder);
					builder = builderTMP;
					builderTMP = '';
				}

				isSECTION = false;
				isCOMPILATION = false;
				isFN = false;

			} else {
				counter--;
				builder += '}return $output})()';
				newCommand = '';
			}

		} else if (VIEW_IF[cmd.substring(0, 3)]) {
			builder += ';if (' + (cmd.substring(2, 3) === '(' ? '(' : '') + cmd.substring(3) + '){$output+=$EMPTY';
		} else if (cmd7 === 'else if') {
			builder += '} else if (' + cmd.substring(7) + ') {$output+=$EMPTY';
		} else if (cmd === 'else') {
			builder += '} else {$output+=$EMPTY';
		} else if (cmd === 'endif' || cmd === 'fi') {
			builder += '}$output+=$EMPTY';
		} else {
			tmp = prepare(command.command, newCommand, functionNames);
			if (tmp) {
				if (parseplus(builder))
					builder += '+';
				if (tmp.substring(1, 4) !== '@{-' && tmp.substring(0, 11) !== 'self.view')
					builder += trycatch(tmp, command.command, command.line, debug);
				else
					builder += tmp;
			}
		}

		old = command;
		command = findcommand(content, command.end);
	}

	if (old) {
		text = content.substring(old.end + 1);
		if (text)
			builder += '+' + escaper(text);
	}

	if (!debug)
		builder = builder.replace(/(\+\$EMPTY\+)/g, '+').replace(/(\$output=\$EMPTY\+)/g, '$output=').replace(/(\$output\+=\$EMPTY\+)/g, '$output+=').replace(/(\}\$output\+=\$EMPTY)/g, '}').replace(/(\{\$output\+=\$EMPTY;)/g, '{').replace(/(\+\$EMPTY\+)/g, '+').replace(/(>'\+'<)/g, '><').replace(/'\+'/g, '');

	var fn = ('(function(self){var model=self.model;var config=F.config;var ctrl=self.controller;var query=ctrl?.query || EMPTYOBJECT,repository=self.repository,controller=self.controller,files=ctrl?.files || EMPTYARRAY,user=ctrl?.user,session=ctrl?.session,body=ctrl?.body,language=ctrl?.language || \'\'' + (isCookie ? ',cookie=name=>ctrl?ctrl.cookie(name):\'\'' : '') + ';' + (nocompressHTML ? 'if(ctrl)ctrl.response.minify=false;' : '') + builder + ';return $output;})');
	try {
		fn = eval(fn);
	} catch (e) {
		throw new Error(name + ': ' + (e.message + ''));
	}

	return fn;
}

function trycatch(value, command, line) {
	return DEBUG ? ('(function(){try{return ' + value + '}catch(e){throw new Error(unescape(\'' + escape(command) + '\') + \' - Line: ' + line + ' - \' + e.message.toString());}return $EMPTY})()') : value;
}

function parseplus(builder) {
	var c = builder[builder.length - 1];
	return c !== '!' && c !== '?' && c !== '+' && c !== '.' && c !== ':';
}

function prepare(command, dcommand, functions) {

	var a = command.indexOf('.');
	var b = command.indexOf('(');
	var c = command.indexOf('[');

	var max = [];
	var tmp = 0;

	if (a !== -1)
		max.push(a);

	if (b !== -1)
		max.push(b);

	if (c !== -1)
		max.push(c);

	var index = Math.min.apply(this, max);

	if (index === -1)
		index = command.length;

	var name = command.substring(0, index);
	if (name === dcommand)
		return 'self.safehtml(' + command + ', 1)';

	if (name[0] === '!' && name.substring(1) === dcommand)
		return 'self.safehtml(' + command.substring(1) + ')';

	switch (name) {

		case 'foreach':
		case 'end':
			return '';

		case 'section':
			tmp = command.indexOf('(');
			return tmp === -1 ? '' : '(repository[\'section_' + command.substring(tmp + 1, command.length - 1).replace(/'|"/g, '') + '\'] || \'\')';

		case 'console':
		case 'print':
			return '(' + command + '?$EMPTY:$EMPTY)';

		case '!cookie':
			return 'self.safehtml(' + command + ')';

		case 'csrf':
			return 'self.csrf()';

		case 'root':
			var r = CONF.$root;
			return '\'' + (r ? r.substring(0, r.length - 1) : r) + '\'';

		case 'CONF':
		case 'config':
		case 'controller':
		case 'FUNC':
		case 'MAIN':
		case 'model':
		case 'MODS':
		case 'query':
		case 'REPO':
		case 'repository':
		case 'session':
		case 'user':
			return isassign(command) ? ('self.set(' + command + ')') : ('self.safehtml(' + command + ', 1)');

		case 'body':
			return isassign(command) ? ('self.set(' + command + ')') : command.lastIndexOf('.') === -1 ? 'self.output' : ('self.safehtml(' + command + ', 1)');

		case 'break':
		case 'continue':
		case 'files':
		case 'helpers':
		case 'language':
		case 'mobile':
		case 'robot':
			return command;

		case 'cookie':
		case 'functions':
			return 'self.safehtml(' + command + ', 1)';

		case '!body':
		case '!CONF':
		case '!controller':
		case '!FUNC':
		case '!function':
		case '!model':
		case '!MODS':
		case '!query':
		case '!repository':
		case '!session':
		case '!user':
			return 'self.safehtml(' + command.substring(1) + ')';

		case 'host':
		case 'hostname':
			return 'self.hostname';

		case 'href':
			return command.indexOf('(') === -1 ? 'self.href()' : 'self.' + command;

		case 'url':
			return 'self.' + command;

		case 'title':
		case 'description':
		case 'keywords':
		case 'author':
			return command.indexOf('(') === -1 ? '((repository[\'' + command + '\'] || \'\') + \'\').safehtml()' : 'self.' + command;

		case 'title2':
			return 'self.$' + command;

		case '!title':
		case '!description':
		case '!keywords':
		case '!author':
			return '(repository[\'$' + command.substring(1) + '\'] || \'\')';

		case 'place':
			return command.indexOf('(') === -1 ? '(repository[\'' + command + '\'] || \'\')' : 'self.' + command;

		case 'import':
			return 'self.' + command + (command.indexOf('(') === -1 ? '()' : '');

		case 'index':
			return '(' + command + ')';

		case 'json':
		case 'json2':
		case 'helper':
		case 'view':
		case 'layout':
		case 'download':
		case 'selected':
		case 'disabled':
		case 'checked':
		case 'options':
		case 'readonly':
			return 'self.' + command;

		case 'now':
			return '(new Date()' + command.substring(3) + ')';

		default:
			return F.def.helpers[name] ? ('F.def.helpers.' + insertcall(command)) : ('self.safehtml(' + (functions.indexOf(name) === -1 ? command[0] === '!' ? command.substring(1) + ')' : command + ', 1)' : command + ')'));
	}
}

function insertcall(command) {

	var beg = command.indexOf('(');
	if (beg === -1)
		return command;

	var length = command.length;
	var count = 0;

	for (var i = beg + 1; i < length; i++) {

		var c = command[i];

		if (c !== '(' && c !== ')')
			continue;

		if (c === '(') {
			count++;
			continue;
		}

		if (count > 0) {
			count--;
			continue;
		}

		var arg = command.substring(beg + 1);
		return command.substring(0, beg) + '.call(self' + (arg.length > 1 ? ',' + arg : ')');
	}

	return command;
}

function isassign(value) {

	var length = value.length;
	var skip = 0;

	for (var i = 0; i < length; i++) {

		var c = value[i];

		if (c === '[') {
			skip++;
			continue;
		}

		if (c === ']') {
			skip--;
			continue;
		}

		var next = value[i + 1] || '';

		if (c === '+' && (next === '+' || next === '=')) {
			if (!skip)
				return true;
		}

		if (c === '-' && (next === '-' || next === '=')) {
			if (!skip)
				return true;
		}

		if (c === '*' && (next === '*' || next === '=')) {
			if (!skip)
				return true;
		}

		if (c === '=') {
			if (!skip)
				return true;
		}
	}
	return false;
}

function findcommand(content, index, entire) {

	index = content.indexOf('@{', index);

	if (index === -1)
		return null;

	var length = content.length;
	var count = 0;

	for (var i = index + 2; i < length; i++) {
		var c = content[i];

		if (c === '{') {
			count++;
			continue;
		}

		if (c !== '}')
			continue;
		else if (count > 0) {
			count--;
			continue;
		}

		var command = content.substring(index + 2, i).trim();

		// @{{ SKIP }}
		if (command[0] === '{')
			return findcommand(content, index + 1);

		var obj = { beg: index, end: i, line: inlinecounter(content.substr(0, index)), command: command };

		if (entire)
			obj.phrase = content.substring(index, i + 1);

		return obj;
	}

	return null;
}

function inlinecounter(value) {
	var count = value.match(/\n/g);
	return count ? count.length : 0;
}

function minify(html) {

	var cache = [];
	var beg = 0;
	var end;

	while (true) {
		beg = html.indexOf('@{compile ', beg - 1);
		if (beg === -1)
			break;
		end = html.indexOf('@{end}', beg + 6);
		if (end === -1)
			break;
		cache.push(html.substring(beg, end + 6));
		html = html.substring(0, beg) + '#@' + (cache.length - 1) + '#' + html.substring(end + 6);
	}

	while (true) {
		beg = html.indexOf('@{', beg);
		if (beg === -1)
			break;
		end = html.indexOf('}', beg + 2);
		if (end === -1)
			break;
		cache.push(html.substring(beg, end + 1));
		html = html.substring(0, beg) + '#@' + (cache.length - 1) + '#' + html.substring(end + 1);
	}

	html = F.TMinificators.html(html);
	return html.replace(/#@\d+#/g, text => cache[+text.substring(2, text.length - 1)]);
}

function View(controller) {
	var self = this;
	self.controller = controller;
	self.language = controller?.language || '';
	self.repository = { layout: 'layout' };
	self.islayout = false;
}

View.prototype.ota = function(obj) {
	if (obj == null)
		return EMPTYARRAY;
	var output = [];
	for (var key in obj)
		output.push({ key: key, value: obj[key]});
	return output;
};

View.prototype.layout = function(value) {
	this.repository.layout = value;
	return '';
};

View.prototype.json = function(obj, id, beautify, replacer) {

	if (typeof(id) === 'boolean') {
		replacer = beautify;
		beautify = id;
		id = null;
	}

	if (typeof(beautify) === 'function') {
		replacer = beautify;
		beautify = false;
	}

	var value = beautify ? JSON.stringify(obj, replacer == true ? F.TUtils.json2replacer : replacer, 4) : JSON.stringify(obj, replacer == true ? F.TUtils.json2replacer : replacer);
	return id ? ('<script type="application/json" id="' + id + '">' + value + '</script>') : value;
};

View.prototype.view = function(name, model) {
	return this.render(name, model, true);
};

View.prototype.safehtml = function(value, escape) {
	value = value != null ? (value + '') : '';
	return escape && value ? value.safehtml() : value;
};

View.prototype.title = function(value) {
	this.repository.title = value;
	return '';
};

View.prototype.description = function(value) {
	this.repository.description = value;
	return '';
};

View.prototype.keywords = function(value) {
	this.repository.keywords = value instanceof Array ? value.join(', ') : value;
	return '';
};

function querystring_encode(value, def, key) {

	if (value instanceof Array) {
		var tmp = '';
		for (var i = 1; i < value.length; i++)
			tmp += (tmp ? '&' : '') + key + '=' + querystring_encode(value[i], def);
		return querystring_encode(value[0], def) + (tmp ? tmp : '');
	}

	return value != null ? value instanceof Date ? encodeURIComponent(value.format()) : typeof(value) === 'string' ? encodeURIComponent(value) : (value + '') : def || '';
}

// @{href({ key1: 1, key2: 2 })}
// @{href('key', 'value')}
View.prototype.href = function(key, value) {

	var self = this;

	if (!arguments.length) {
		let val = F.TUtils.toURLEncode(self.query);
		return val ? '?' + val : '';
	}

	var type = typeof(key);
	var obj;

	if (type === 'string') {

		var cachekey = '$href' + key;
		var str = self.repository[cachekey] || '';

		if (!str) {

			obj = F.TUtils.copy(self.query);

			for (var i = 2; i < arguments.length; i++)
				obj[arguments[i]] = undefined;

			obj[key] = '\0';

			for (var m in obj) {
				var val = obj[m];
				if (val !== undefined) {
					if (val instanceof Array) {
						for (var j = 0; j < val.length; j++)
							str += (str ? '&' : '') + m + '=' + (key === m ? '\0' : querystring_encode(val[j]));
					} else
						str += (str ? '&' : '') + m + '=' + (key === m ? '\0' : querystring_encode(val));
				}
			}
			self.repository[cachekey] = str;
		}

		str = str.replace('\0', querystring_encode(value, self.query[key], key));

		for (var i = 2; i < arguments.length; i++) {
			var beg = str.indexOf(arguments[i] + '=');
			if (beg === -1)
				continue;
			var end = str.indexOf('&', beg);
			str = str.substring(0, beg) + str.substring(end === -1 ? str.length : end + 1);
		}

		return str ? '?' + str : '';
	}

	if (value) {
		obj = F.TUtils.copy(self.query);
		F.TUtils.extend(obj, value);
	}

	if (value != null)
		obj[key] = value;

	obj = F.TUtils.toURLEncode(obj);

	if (value === undefined && type === 'string')
		obj += (obj ? '&' : '') + key;

	return self.url + (obj ? '?' + obj : '');
};

function makehtmlmeta(self) {

	var builder = '';
	var repo = self.repository;

	var title = '';

	if (repo.title)
		title = repo.title.safehtml();

	if (title) {
		if (!F.config.$customtitles && self?.controller?.url !== '/')
			title += ' - ' + F.config.name;
	} else if (!title)
		title = F.config.name;

	builder += '<title>' + title + '</title>';

	if (repo.description)
		builder += '<meta name="description" content="' + repo.description.safehtml() + '" />';

	if (repo.keywords)
		builder += '<meta name="description" content="' + repo.keywords.safehtml() + '" />';

	if (repo.image) {
		let tmp = repo.image.substring(0, 6);
		let src = tmp === 'http:/' || tmp === 'https:' || tmp.substring(0, 2) === '//' ? repo.image : ((self?.controller.host || '') + repo.image);
		builder += '<meta property="og:image" content="' + src + '" /><meta name="twitter:image" content="' + src + '" />';
	}

	return builder;
}

View.prototype.import = function() {

	var builder = '';
	var self = this;

	for (var m of arguments) {

		switch (m) {
			case 'meta':
				builder += makehtmlmeta(self);
				break;
			case 'head':
				builder += '';
				break;
			case 'favicon.ico':
			case 'favicon.png':
			case 'favicon.gif':
				let ext = m.substring(m.length - 3);
				if (ext === 'ico')
					ext = 'x-icon';
				builder += '<link rel="icon" href="/' + m + '" type="image/' + ext + '" />';
				break;
			default:

				// merging
				let key = 'meta_' + m;
				let tmp = F.temporary.views[key];
				if (tmp != null) {
					builder += tmp;
					continue;
				}

				if (m.indexOf('+') === -1) {
					let absolute = m[0] === '/';
					let key = absolute ? m : ('/' + m);
					if (REG_CHECKCSS.test(m)) {
						tmp = '<link rel="stylesheet" href="' + (absolute ? m : ('/' + (F.routes.virtual[key] ? '' : 'css/') + m)) + '" />';
					} else {
						tmp = '<scri' + 'pt src="' + (absolute ? m : ('/' + (F.routes.virtual[key] ? '' : 'js/') + m)) + '"></scr' + 'ipt>';
					}
				} else {
					let iscss = REG_CHECKCSS.test(m);
					let path = '/' + F.TUtils.random_string(10).toLowerCase() + '-min.' + (iscss ? 'css' : 'js');
					F.merge(path, m);
					if (iscss)
						tmp = '<link rel="stylesheet" href="' + path + '" />';
					else
						tmp = '<scri' + 'pt src="' + path + '"></scr' + 'ipt>';
				}

				F.temporary.views[key] = tmp;
				builder += tmp;
				break;
		}
	}

	return builder;
};

View.prototype.section = function(name, value, replace) {

	var key = '$section_' + name;
	var self = this;

	if (value == null)
		return self.repository[key];

	if (replace) {
		self.repository[key] = value;
		return self;
	}

	if (self.repository[key])
		self.repository[key] += value;
	else
		self.repository[key] = value;

	return self;
};

View.prototype.url = function(hostname = false) {
	var self = this;
	return hostname ? (self.controller ? self.controller.hostname(self.controller.url) : '') : (self.controller ? self.controller.url : '');
};

View.prototype.render = function(name, model, ispartial = false) {

	var self = this;
	var key = name + '_' + self.language;
	var fn = F.temporary.views[key];
	var content;

	self.model = model;

	if (!fn) {
		let path = name[0] === '#' ? F.path.plugins(name.substring(1) + '.html') : F.path.directory('views', name + '.html');
		content = F.translate(self.language, F.Fs.readFileSync(path, 'utf8'));
		fn = exports.compile(name, content, DEBUG);
		if (!DEBUG)
			F.temporary.views[key] = fn;
	}

	content = fn(self);

	if (!ispartial && !self.islayout && self.repository.layout) {
		// render layout
		self.output = content;
		self.islayout = true;
		content = self.render(self.repository.layout);
	}

	return content;
};

exports.View = View;