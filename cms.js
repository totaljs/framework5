// Total.js CMS compiler
// The MIT License
// Copyright 2021-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const SKIP_CLASSES = { CMS_hidden: 1, CMS_mv: 1, CMS_mh: 1, CMS_expression: 1, CMS_multiple: 1, CMS_keyword: 1, CMS_monospace: 1 };
const WIDGET_TAGS = { settings: '<settings>', css: '<style>', total: '<script total>', html: '<body>', js: '<script>', template: '<template>', readme: '<readme>' };
const REG_CLASS = /CLASS/g;
const VERSION = 1;

function clean(html) {
	var index = html.indexOf('>');
	var tag = html.substring(5, index);
	tag = tag.replace(/data-cms=".*?"(\s)?|data-cms-id=".*?"(\s)?/, '').trim();
	return '<div' + (tag ? (' ' + tag) : '') + '>' + html.substring(index + 1);
}

function expressions_multiple(body) {

	var index = 0;
	var arr = [];

	while (true) {

		index = body.indexOf('CMS_multiple', index + 12);
		if (index === -1)
			break;

		var b = findstart(body, index);
		if (b === -1)
			break;

		var end = body.indexOf(' ', b);
		if (end === -1) {
			index += 13;
			continue;
		}

		var tag = body.substring(b + 1, end);

		var e = body.indexOf('</' + tag + '>', index);
		var size = e + 3 + tag.length;
		var obj = {};

		obj.id = body.substring(b, body.indexOf('>', b + tag.length)).match(/\s(data-cms-|data-)?id=".*?"/);

		if (obj.id) {
			obj.id = obj.id[0];
			var qi = obj.id.indexOf('"');
			obj.id = obj.id.substring(qi + 1, obj.id.length - 1).trim();
		}

		obj.html = body.substring(b, size);
		obj.body = obj.html.substring(obj.html.indexOf('>') + 1, obj.html.lastIndexOf('<'));
		obj.expressions = expressions(obj.body);
		obj.replace = '<!--cmsmultiple' + GUID(10) + '-->';

		arr.push(obj);
		index = e + 3 + tag.length;
	}

	return arr;
}

function findstart(body, index) {

	var notallowed = [';', '.', '>', ':', '\n', '\r', '\t'];

	for (let i = index; i > -1; i--) {

		let c = body[i];
		if (c === '<')
			return i;

		if (notallowed.includes(c))
			break;
	}

	return -1;
}

function expressions(body) {

	var index = 0;
	var arr = [];

	while (true) {

		index = body.indexOf('CMS_expression', index + 10);

		if (index === -1)
			break;

		var b = findstart(body, index);
		if (b === -1)
			break;

		var end = body.indexOf(' ', b);
		if (end === -1) {
			index += 15;
			continue;
		}

		var tag = body.substring(b + 1, end);
		var e = body.indexOf('</' + tag + '>', index);
		var size = e + 3 + tag.length;
		var obj = {};
		obj.replace = obj.html = body.substring(b, size);
		obj.body = obj.html.substring(obj.html.indexOf('>') + 1, obj.html.lastIndexOf('<'));
		obj.text = obj.body.removeTags();
		arr.push(obj);
		index = e + 3 + tag.length;
	}

	return arr;
}

function trash(body) {
	var index = 0;
	var tags = ['CMS_trash', 'CMS_editor'];

	for (var t of tags) {
		while (true) {

			index = body.indexOf(t, index + t.length);

			if (index === -1)
				break;

			var b = findstart(body, index);
			if (b === -1)
				break;

			var end = body.indexOf(' ', b);

			if (end === -1) {
				index += t.length + 1;
				continue;
			}

			var tag = body.substring(b + 1, end);

			if (tag.length > 10) {
				index += tag.length;
				continue;
			}

			var e = body.indexOf('</' + tag + '>', index);
			var size = e + 3 + tag.length;
			body = body.replace(body.substring(b, size), '');
			index = b;
		}
	}

	return body;
}

function layout(body, append) {

	var index = body.indexOf(' id="CMS"');
	if (index === -1)
		return body;

	var beg = body.lastIndexOf('<', index);
	if (beg === -1)
		return body;

	var tag = body.substring(beg + 1, body.indexOf(' ', beg));
	var tagend = '</' + tag + '>';
	var count = 0;
	var end = body.indexOf('>', beg) + 1;

	tag = '<' + tag;

	while (true) {

		var str = body.substring(index, index + tagend.length);

		if (index >= body.length) {
			beg = body.length;
			break;
		}

		if (str === tagend) {
			if (count) {
				count--;
				index++;
				continue;
			}
			return body.substring(0, end) + append + body.substring(index);
		}

		if (str.substring(0, tag.length) === tag)
			count++;

		index++;
	}

	return body;
}

// Cleans CMS markup
function tidy(body) {

	var beg;
	var end;
	var index = 0;
	var count = 0;
	var c = 'CMS_unwrap';
	var tag;
	var tagend;

	body = F.TUtils.minify_html(body);

	while (true) {

		beg = body.indexOf(c, beg);

		if (beg === -1)
			break;

		index = beg;
		while (true) {
			if (body[--index] === '<' || index <= 0)
				break;
		}

		if (index === beg || index <= 0)
			return;

		tag = body.substring(index + 1, body.indexOf('>', index + 1));
		end = index + tag.length + 2;
		tag = tag.substring(0, tag.indexOf(' '));
		tagend = '</' + tag;
		tag = '<' + tag;
		count = 0;
		beg = index;
		index = end;

		while (true) {
			var str = body.substring(index, index + tagend.length);

			if (index >= body.length) {
				beg = body.length;
				break;
			}

			if (str === tagend) {

				if (count) {
					count--;
					index++;
					continue;
				}

				body = body.substring(0, beg) + body.substring(end, index) + body.substring(index + 1 + tagend.length);
				break;
			}

			if (str.substring(0, tag.length) === tag)
				count++;

			index++;
		}
	}

	return body.replace(/(\s)class=".*?"/g, function(text) {

		var is = text[0] === ' ';
		var arr = text.substring(is ? 8 : 7, text.length - 1).split(' ');
		var builder = '';

		for (let cls of arr) {
			if (cls[0] === 'C' && cls[1] === 'M' && cls[2] === 'S' && !SKIP_CLASSES[cls])
				continue;
			builder += (builder ? ' ' : '') + cls;
		}

		return builder ? ((is ? ' ' : '') + 'class="' + builder + '"') : '';

	}).replace(/<div\s>/g, '<div>');
}

// Run a widget instance
exports.run = function(html) {

	let meta = html.parseElements(WIDGET_TAGS);
	let instance = {};

	(new Function('exports', meta.total))(instance);

	if (!instance.id)
		instance.id = instance.name;

	let uid = instance.id.slug().replace(/\-/g, '');

	meta.cls = uid;

	if (meta.css)
		meta.css = meta.css.replace(REG_CLASS, 'w-' + uid);

	if (meta.settings)
		meta.settings = meta.settings.replace(REG_CLASS, 'w-' + uid);

	if (meta.template)
		meta.template = meta.template.replace(REG_CLASS, 'w-' + uid);

	if (meta.js)
		meta.js = meta.js.replace(REG_CLASS, 'w-' + uid);

	if (meta.html)
		meta.html = meta.html.replace(REG_CLASS, 'w-' + uid);

	if (instance.dependencies) {

		if (typeof(instance.dependencies) === 'string')
			instance.dependencies = instance.dependencies.split(/,|;/).trim();

		let arr = [];
		for (let m of instance.dependencies) {
			if (m.includes('<'))
				arr.push(m);
			else if (m.endsWith('.js'))
				arr.push('<script src="{0}"></script>'.format(m));
			else if (m.endsWith('.css'))
				arr.push('<link rel="stylesheet" href="{0}">'.format(m));
		}

		instance.dependencies = arr.join('');
	}

	let index = (meta.html || '').indexOf('<scr' + 'ipt>');

	if (index !== -1)
		meta.editor = meta.html.substring(index + 8, meta.html.indexOf('</scr' + 'ipt>', index + 8));

	if (!instance.uninstall)
		instance.uninstall = NOOP;

	instance.ui = meta;
	return instance;
};

// Parse all widgets from the Total.js CMS HTML
exports.widgets = function(html) {

	let arr = html.match(/data-cms=".*?"/g) || EMPTYARRAY;
	let response = [];
	let indexer = 0;
	let index;
	let beg;
	let end;

	for (let attr of arr) {

		if (html.indexOf(attr) === -1)
			continue;

		let w = attr.substring(10);
		index = w.indexOf('__');
		let id = w.substring(0, index);

		index = html.lastIndexOf('<', html.indexOf(attr));
		beg = '<div';
		end = '</div>';

		let pos = index + 1;
		let count = 0;
		let counter = 0;

		while (true) {

			if (counter++ > 100)
				break;

			let a = html.indexOf(beg, pos);
			let b = html.indexOf(end, pos);

			if (a !== -1 && a < b) {
				count++;
				pos = html.indexOf('>', a);
				continue;
			}

			if (a === -1 || b < a) {

				pos = b + 6;

				if (count) {
					count--;
					continue;
				}

				break;
			}
		}

		let body = html.substring(index, pos);
		html = html.replace(body, clean(body));
		index = body.indexOf('>');
		body = body.substring(0, index + 1) + '~BEG~' + body.substring(index + 1);
		index = body.lastIndexOf('<');
		body = body.substring(0, index) + '~END~' + body.substring(index);

		index = w.indexOf('__');

		let config = decodeURIComponent(w.substring(index + 2, w.length - 1)).parseJSON(true);
		let opt = {};

		opt.id = id;
		opt.indexer = indexer;
		opt.body = tidy(clean(body));
		opt.html = body.substring(body.lastIndexOf('~BEG~') + 5, body.lastIndexOf('~END~'));
		opt.config = config || EMPTYOBJECT;
		opt.beg = opt.body.substring(0, opt.body.indexOf('>') + 1);
		opt.end = opt.body.substring(opt.body.lastIndexOf('<'));

		index = opt.beg.indexOf('data-cms-id="');

		if (index === -1)
			opt.uid = opt.beg.makeid();
		else
			opt.uid = opt.beg.substring(index + 13, opt.beg.indexOf('"', index + 14));

		response.push(opt);
		indexer++;
	}

	return response;
};

// Compile CMS HTML string
exports.compile = function(html, widgets, used) {

	let arr = html.match(/data-cms=".*?"/g) || EMPTYARRAY;
	let response = new CMSRender();
	let indexer = 0;
	let index;
	let beg;
	let end;

	response.css = [];
	response.js = [];
	response.widgets = [];
	response.cache = {};
	response.tangular = [];

	if (!used) {
		for (let widget of widgets) {
			if (widget.css)
				response.css.push(F.TUtils.minify_css(widget.css));
			if (widget.js)
				response.js.push(F.TUtils.minify_js(widget.js));
			if (widget.ui) {
				widget.ui.css && response.css.push(F.TUtils.minify_css(widget.ui.css));
				widget.ui.js && response.js.push(F.TUtils.minify_js(widget.ui.js));
			}
		}
	}

	for (let attr of arr) {

		if (html.indexOf(attr) === -1)
			continue;

		let w = attr.substring(10);
		index = w.indexOf('__');
		let id = w.substring(0, index);

		index = html.lastIndexOf('<', html.indexOf(attr));
		beg = '<div';
		end = '</div>';

		let pos = index + 1;
		let count = 0;
		let counter = 0;

		while (true) {

			if (counter++ > 100)
				break;

			let a = html.indexOf(beg, pos);
			let b = html.indexOf(end, pos);

			if (a !== -1 && a < b) {
				count++;
				pos = html.indexOf('>', a);
				continue;
			}

			if (a === -1 || b < a) {

				pos = b + 6;

				if (count) {
					count--;
					continue;
				}

				break;
			}
		}

		let widget = widgets instanceof Array ? widgets.findItem('id', id) : widgets[id];
		let body = html.substring(index, pos);

		// Widget not found
		if (!widget) {
			html = html.replace(body, '');
			continue;
		}

		if (used) {

			if (widget.css)
				response.css.push(F.TUtils.minify_css(widget.css));

			if (widget.js)
				response.js.push(F.TUtils.minify_js(widget.js));

			if (widget.ui) {
				widget.ui.css && response.css.push(F.TUtils.minify_css(widget.ui.css));
				widget.ui.js && response.js.push(F.TUtils.minify_js(widget.ui.js));
			}

		}

		if (!widget.render) {
			html = html.replace(body, clean(body));
			continue;
		}

		html = html.replace(body, '~WIDGET' + indexer + '~');
		index = body.indexOf('>');
		body = body.substring(0, index + 1) + '~BEG~' + body.substring(index + 1);
		index = body.lastIndexOf('<');
		body = body.substring(0, index) + '~END~' + body.substring(index);

		index = w.indexOf('__');

		let config = decodeURIComponent(w.substring(index + 2, w.length - 1)).parseJSON(true);
		let opt = {};
		opt.id = id;
		opt.indexer = indexer;
		opt.body = tidy(clean(body));
		opt.html = body.substring(body.lastIndexOf('~BEG~') + 5, body.lastIndexOf('~END~'));
		opt.config = config || EMPTYOBJECT;
		opt.render = widget.render;
		opt.beg = opt.body.substring(0, opt.body.indexOf('>') + 1);
		opt.end = opt.body.substring(opt.body.lastIndexOf('<'));

		index = opt.beg.indexOf('data-cms-id="');

		if (index === -1)
			opt.uid = opt.beg.makeid();
		else
			opt.uid = opt.beg.substring(index + 13, opt.beg.indexOf('"', index + 14));

		response.widgets.push(opt);
		indexer++;
	}

	index = 0;

	while (true) {

		index = html.indexOf(' type="text/navigation"', index);

		if (index === -1)
			break;

		let begindex = html.lastIndexOf('<script', index);
		let endindex = html.indexOf('</script>', index);
		let endhead = html.indexOf('>', index);
		let head = html.substring(begindex, endhead);
		let name = head.match(/name=".*?"/i)[0];
		let template = html.substring(html.indexOf('>', endhead) + 1, endindex);

		name = name.substring(6, name.length - 1);
		html = html.replace(html.substring(begindex, endindex + 9), '~WIDGET#' + response.tangular.length + '~');
		response.tangular.push({ id: HASH(name).toString(36), name: name, type: 'nav', template: Tangular.compile(template) });
		index = begindex;

	}

	index = 0;

	while (true) {

		index = html.indexOf(' type="text/breadcrumb"', index);

		if (index === -1)
			break;

		let begindex = html.lastIndexOf('<script', index);
		let endindex = html.indexOf('</script>', index);
		let endhead = html.indexOf('>', index);
		let template = html.substring(html.indexOf('>', endhead) + 1, endindex);
		html = html.replace(html.substring(begindex, endindex + 9), '~WIDGET#' + response.tangular.length + '~');
		response.tangular.push({ type: 'breadcrumb', template: Tangular.compile(template) });
		index = begindex;
	}

	response.html = tidy(trash(layout(html, '~WIDGETLAYOUT~')));
	response.multiple = expressions_multiple(response.html);

	for (let item of response.multiple)
		response.html = response.html.replace(item.html, item.replace);

	response.expressions = expressions(response.html);
	response.widgets.reverse();

	let builder = [];
	let text = [];

	while (true) {

		beg = response.html.indexOf('~WIDGET');

		if (beg !== -1) {
			end = response.html.indexOf('~', beg + 6) + 1;
			let h = response.html.substring(0, beg);
			let windex = response.html.substring(beg + 7, end - 1);
			if (windex[0] === '#') {
				response.html = response.html.substring(end);
				builder.push('text[{0}]+tangular[{1}]'.format(text.push(h) - 1, windex.substring(1)));
			} else if (windex === 'LAYOUT') {
				response.html = response.html.substring(end);
				builder.push('text[{0}]+body'.format(text.push(h) - 1));
			} else {
				indexer = +windex;
				response.html = response.html.substring(end);
				if (h)
					builder.push('text[{0}]+widget[{1}]'.format(text.push(h) - 1, indexer));
				else
					builder.push('widget[{0}]'.format(indexer));
			}
		} else {
			builder.push('text[{0}]'.format(text.push(response.html) - 1));
			break;
		}
	}

	response.js = response.js.length ? response.js.join('\n') : '';
	response.css = response.css.length ? response.css.join('') : '';
	response.toString = new Function('text', 'widget', 'tangular', 'body', 'return ' + builder.join('+'));
	response.text = text;

	delete response.html;
	return response;
};

function CMSRender() {}

CMSRender.prototype.importmeta = function(val) {
	var self = this;
	for (var i = 0; i < self.text.length; i++) {
		var item = self.text[i];
		var index = item.indexOf('</head');
		if (index !== -1) {
			self.text[i] = item.substring(0, index) + val + item.substring(index);
			return self;
		}
	}
	return self;
};

CMSRender.prototype.importcss = function(val) {

	var self = this;

	if (val == null) {
		if (self.css)
			val = '<style>' + self.css + '</style>';
		else
			return self;
	}

	for (var i = 0; i < self.text.length; i++) {
		var item = self.text[i];
		var index = item.indexOf('</head');
		if (index !== -1) {
			self.text[i] = item.substring(0, index) + val + item.substring(index);
			return self;
		}
	}

	self.text[0] += val;
	return self;
};

CMSRender.prototype.importjs = function(val) {
	var self = this;

	if (val == null) {
		if (self.js)
			val = '<script>' + self.js + '</script>';
		else
			return self;
	}

	for (var i = 0; i < self.text.length; i++) {
		var item = self.text[i];
		var index = item.indexOf('</body>');
		if (index !== -1) {
			self.text[i] = item.substring(0, index) + val + item.substring(index);
			return self;
		}
	}

	self.text[self.text.length - 1] += val;
	return self;
};

CMSRender.prototype.render = function(meta, layout, callback) {
	var self = this;
	if (callback)
		self._render(meta, layout, callback);
	else
		return new Promise((resolve, reject) => self._render(meta, layout, (err, res) => err ? reject(err) : resolve(res)));
};

CMSRender.prototype._render = function(meta, layout, callback) {

	// meta.controller {Object}
	// meta.url {String}
	// meta.vars {Object}
	// meta.refs {Object}
	// meta.body {String} targeted for the layout
	// meta.nav {Object Array}
	// meta.breadcrumb {Object Array}
	// meta.widgets {Object Array}

	if (typeof(layout) === 'function') {
		callback = layout;
		layout = null;
	}

	var self = this;
	var widgets = [];
	var opt = {};

	for (var key in meta) {
		if (key !== 'widgets')
			opt[key] = meta[key];
	}

	self.widgets.wait(function(item, next) {

		opt.id = item.uid;
		opt.widget = item.id;
		opt.version = VERSION;
		opt.config = item.config;
		opt.body = item.body || '';
		opt.html = item.html || '';
		opt.template = item.template;
		opt.cacheid = opt.id;

		var render = item.render;
		if (meta.widgets) {
			var w = meta.widgets instanceof Array ? meta.widgets.findItem('id', item.id) : meta.widgets[item.id];
			if (w) {
				render = w.render;
				if (w.cache === 'url' && opt.url)
					opt.cacheid += '_' + HASH(opt.url).toString(36);
			}
		}

		if (self.cache[opt.cacheid]) {
			widgets[item.indexer] = self.cache[opt.cacheid];
			next();
			return;
		}

		render(opt, function(response, replace, cache) {
			widgets[item.indexer] = replace === true ? (response == null || response == '' ? '' : (response + '').replace(/~(BEG|END)~/g, '')) : (item.beg + (response || '') + item.end);
			if (cache)
				self.cache[opt.cacheid] = widgets[item.indexer];
			next();
		});

	}, function() {

		var tangular = [];

		// opt.inlinecache {Object} user defined cache

		for (let i = 0; i < self.tangular.length; i++) {

			let key = i + '';
			let body = opt.inlinecache ? opt.inlinecache[key] : '';

			if (!body) {
				let item = self.tangular[i];
				switch (item.type) {
					case 'nav':
						body = item.template({ value: opt.navigation ? opt.navigation(item.id) : null });
						break;
					case 'breadcrumb':
						body = item.template({ value: opt.breadcrumb || EMPTYARRAY });
						break;
				}

				if (opt.inlinecache) {
					body = body.replace(/\t|\s{2,}/g, '');
					opt.inlinecache[key] = body;
				}
			}

			tangular.push(body);
		}

		var html = self.toString(self.text, widgets, tangular, meta.body || '');
		if (layout) {
			meta.body = html;
			layout.render(meta, callback);
		} else
			callback.call(self, null, html, self);
	});

};