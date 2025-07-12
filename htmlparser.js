// Total.js HTML Parser
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

function HTMLElement() {
	this.children = [];
}

HTMLElement.prototype = {
	get innerHTML() {
		return this.toString();
	},
	get outerHTML() {
		return this.toString(false, true);
	},
	get innerText() {
		return this.toString().removeTags();
	}
};

function parseRule(selector, output) {

	let rule = {};

	rule.attrs = [];
	rule.output = output || [];

	// > div
	// div div[name="Peter Sirka"]
	// div > div[name="Peter Sirka"]

	let cache = [];

	selector = selector.replace(/\[.*?\]/gi, text => '[' + (cache.push(text) - 1) + ']').replace(/(\s)?>(\s)?/, '>').replace(/\s{2}/g, '').trim();

	rule.notravelse = selector[0] === '>';

	if (rule.notravelse)
		selector = selector.substring(1);

	let m = selector.match(/>|\s/);
	if (m) {
		let nested = selector.substring(m.index).trim().replace(/\[\d+\]/g, text => cache[+text.substring(1, text.length - 1)]);
		rule.nested = parseRule(nested, rule.output);
		selector = selector.substring(0, m.index).trim();
	}

	selector = selector.replace(/\[\d+\]/, text => cache[+text.substring(1, text.length - 1)]);

	// attribute search
	let match = selector.match(/\[.*?\]/i);
	if (match) {
		for (let m of match) {
			let index = m.indexOf('=');
			rule.attrs.push({ id: m.substring(1, index).trim(), value: m.substring(index + 2, m.length - 2).trim() });
		}
		selector = selector.replace(match, '');
	}

	// #id or .class
	match = selector.match(/[#|.][a-z-_0-9]+/i);
	if (match) {
		for (let m of match) {
			let val = m.substring(1);
			rule.attrs.push({ id: m[0] === '#' ? 'id' : 'class', value: val });
		}
		selector = selector.replace(match, '');
	}

	selector = selector.trim();

	if (selector[selector.length - 1] === ':') {
		rule.prefix = selector.toUpperCase();
		rule.tagName = '';
	} else {
		if (selector.substring(0, 2) === '*:') {
			rule.prefix = '*';
			selector = selector.substring(2);
		}
		rule.tagName = selector[0] === '*' ? '' : selector.toUpperCase();
	}

	return rule;
}

HTMLElement.prototype.browse = function(fn, reverse) {

	let self = this;

	let browse = function(children) {
		for (let node of children) {
			if (node && node.tagName) {
				let a = fn(node);
				if (a !== true)
					browse(reverse ? [node.parentNode] : node.children);
			}
		}
	};

	if (reverse && !self.parentNode)
		return;

	browse(reverse ? [self.parentNode] : self.children);
	return self;
};

function extendarr(output) {

	output.aclass = function(cls) {
		for (let item of this)
			item.aclass(cls);
		return this;
	};

	output.rclass = function(cls) {
		for (let item of this)
			item.rclass(cls);
		return this;
	};

	output.tclass = function(cls, value) {
		for (let item of this)
			item.tclass(cls, value);
		return this;
	};

	output.attr = function(key, value) {
		for (let item of this)
			item.attr(key, value);
		return this;
	};

	output.attrd = function(key, value) {
		for (let item of this)
			item.attrd(key, value);
		return this;
	};

	output.find = function(selector) {
		let arr = [];
		for (let item of this) {
			let result = item.find(selector);
			if (result.length)
				arr.push.apply(arr, result);
		}
		extendarr(arr);
		return arr;
	};

	output.toString = output.html = function(formatted) {
		let builder = [];
		for (let item of this)
			builder.push(item.toString(formatted));
		return builder.join(formatted ? '\n' : '');
	};

	output.text = function() {
		return output.html().removeTags();
	};

	return output;
}

function compare(rule, node) {

	if (rule.prefix === '*') {
		let tagName = node.tagName;
		if (node.prefix)
			tagName = tagName.substring(node.prefix.length);
		if (tagName !== rule.tagName)
			return false;
	} else {
		if (rule.tagName && rule.tagName !== node.tagName)
			return false;
		if (rule.prefix && rule.prefix !== node.prefix)
			return false;
	}

	if (rule.attrs.length) {
		for (let attr of rule.attrs) {
			switch (attr.id) {
				case 'class':
					let tmp = node.attrs[attr.id];
					if (tmp) {
						tmp = tmp.split(' ');
						if (!tmp.includes(attr.value))
							return false;
					} else
						return false;
					break;
				default:
					if (attr.value) {
						if (node.attrs[attr.id] !== attr.value)
							return false;
					} else if (node.attrs[attr.id] === undefined)
						return false;

					break;
			}
		}
	}

	return true;
}

function browserule(rule, children, reverse) {

	for (let node of children) {

		if (!node.tagName)
			continue;

		let children = reverse ? [node.parentNode] : node.children;

		if (!compare(rule, node)) {
			if (!rule.notravelse)
				browserule(rule, children);
			continue;
		}

		// types complexType attribute
		// types > complexType attribute
		// types complexType > attribute

		if (rule.nested) {
			browserule(rule.nested, children);
		} else {

			rule.output.push(node);

			if (!rule.notravelse)
				browserule(rule, children);
		}
	}
}

HTMLElement.prototype.find = function(selector, reverse) {

	let self = this;
	let selectors = selector.split(',');
	let rules = [];
	let output = [];

	for (let sel of selectors)
		rules.push(parseRule(sel.trim()));

	if (reverse && !self.parentNode)
		return output;

	for (let rule of rules) {
		browserule(rule, reverse ? [self.parentNode] : self.children, reverse);
		if (rule.output.length)
			output.push.apply(output, rule.output);
	}

	extendarr(output);
	return output;
};

HTMLElement.prototype.parent = function() {
	return this.parentNode;
};

HTMLElement.prototype.closest = function(selector) {
	return this.find(selector, true);
};

HTMLElement.prototype.attrd = function(name, value) {
	return this.attr('data-' + name, value);
};

HTMLElement.prototype.parsecache = function() {

	let self = this;
	if (self.cache)
		return self;

	self.cache = {};
	self.cache.css = {};
	self.cache.cls = {};

	let tmp = self.attrs.class;
	let arr;

	if (tmp) {
		arr = tmp.split(' ');
		for (let c of arr)
			self.cache.cls[c] = 1;
	}

	tmp = self.attrs.style;
	if (tmp) {
		arr = tmp.split(';');
		for (let c of arr) {
			let a = c.split(':');
			self.cache.css[a[0]] = a[1];
		}
	}

	return self;
};

HTMLElement.prototype.stringifycache = function() {
	let self = this;
	self.attrs.class = Object.keys(self.cache.cls).join(' ');

	let tmp = [];

	for (let key in self.cache.css)
		self.cache.css[key] && tmp.push(key + ':' + self.cache.css[key]);

	if (tmp.length)
		self.attrs.style = tmp.join(';');
	else if (self.attrs.style != null)
		delete self.attrs.style;

	return self;
};

HTMLElement.prototype.attr = function(name, value) {

	let self = this;

	if (value === undefined)
		return self.attrs[name];

	if (value == null || value == '')
		delete self.attrs[name];
	else
		self.attrs[name] = value + '';

	return self;
};

HTMLElement.prototype.aclass = function(cls) {
	let self = this;
	self.parsecache();
	let arr = cls.split(/\s|,/);
	for (let m of arr)
		self.cache.cls[m] = 1;
	self.stringifycache();
	return self;

};

HTMLElement.prototype.hclass = function(cls) {
	let self = this;
	self.parsecache();
	return self.cache.cls[cls] === 1;
};

HTMLElement.prototype.tclass = function(cls, value) {
	let self = this;
	self.parsecache();
	let arr = cls.split(/\s|,/);
	for (let m of arr) {
		if (self.cache.cls[m]) {
			if (!value)
				delete self.cache.cls[m];
		} else {
			if (value || value === undefined)
				self.cache.cls[m] = 1;
		}
	}
	self.stringifycache();
	return self;
};

HTMLElement.prototype.rclass = function(cls) {
	let self = this;
	self.parsecache();

	let arr = cls.split(/\s|,/);
	for (let m of arr)
		delete self.cache.cls[m];

	self.stringifycache();
	return self;
};

HTMLElement.prototype.css = function(key, value) {
	let self = this;
	self.parsecache();
	if (typeof(key) === 'object') {
		for (let k of Object.keys(key)) {
			value = key[k];
			if (value)
				self.cache.css[k] = value;
			else
				delete self.cache.css[k];
		}
	} else {
		if (value)
			self.cache.css[key] = value;
		else
			delete self.cache.css[key];
	}
	self.stringifycache();
	return self;
};

HTMLElement.prototype.remove = function() {
	let self = this;
	if (self.parentNode) {
		let index = self.parentNode.children.indexOf(self);
		if (index !== -1)
			self.parentNode.children.splice(index, 1);
	}
	return self;
};

HTMLElement.prototype.append = function(str) {

	let self = this;
	let dom = parseHTML(str, null, null, self.xml);

	for (let item of dom.children)
		self.children.push(item);

	return dom.children.length === 1 ? dom.children[0] : dom.children;
};

HTMLElement.prototype.prepend = function(str) {

	let self = this;
	let dom = parseHTML(str, null, null, self.xml);

	for (let item of dom.children)
		self.children.unshift(item);

	return dom;
};

HTMLElement.prototype.text = function(formatted) {
	let self = this;
	let builder = [];
	let browse = function(children, level) {
		for (let item of children) {
			switch (item.tagName) {
				case 'TEXT':
					if (item.textContent)
						builder.push(item.textContent);
					break;
			}
		}
	};
	browse(self.children, 0);
	return builder.join('\n');
};

HTMLElement.prototype.toString = HTMLElement.prototype.html = function(formatted, outer) {

	let self = this;
	let builder = [];

	let browse = function(children, level) {

		for (let item of children) {

			let indent = formatted && level ? ''.padLeft(level, '\t') : '';
			let tag = item.tagName.toLowerCase();
			let attrs = [];

			for (let key in item.attrs) {
				let val = item.attrs[key];
				if (!val && (key === 'class' || key.substring(0, 5) === 'data-' || key === 'id'))
					continue;
				attrs.push(key + (val ? ('="' + (val || '') + '"') : ''));
			}

			switch (item.tagName) {
				case 'TEXT':
					if (item.textContent)
						builder.push((item.cdata ? '<![CDATA[' : '') + indent + item.textContent + (item.cdata ? ']]>' : ''));
					break;
				default:
					tag = item.raw;
					if (item.unpair) {
						builder.push(indent + '<' + tag + (attrs.length ? (' ' + attrs.join(' ')) : '') + ' />');
					} else {
						builder.push(indent + '<' + tag + (attrs.length ? (' ' + attrs.join(' ')) : '') + '>' + (item.children.length ? '' : ('</' + tag + '>')));
						if (item.children.length) {
							browse(item.children, level + 1);
							builder.push(indent + '</' + tag + '>');
						}
					}
					break;
			}
		}
	};

	// browse(self.tagName ? [self] : self.children, 0);
	browse(outer && self.tagName ? [self] : self.children, 0);
	return builder.join(formatted ? '\n' : '');
};

function removeComments(html) {
	let tagBeg = '<!--';
	let tagEnd = '-->';
	let beg = html.indexOf(tagBeg);
	let end = 0;
	while (beg !== -1) {
		end = html.indexOf(tagEnd, beg + 4);

		if (end === -1)
			break;

		let comment = html.substring(beg, end + 3);
		html = html.replaceAll(comment, '');
		beg = html.indexOf(tagBeg, beg);
	}

	return html;
}

function parseHTML(html, trim, onerror, isxml) {

	let makeText = function(parent, str) {
		let obj = new HTMLElement();
		obj.xml = isxml;
		obj.tagName = 'TEXT';
		obj.children = [];
		obj.attrs = {};
		obj.textContent = str;
		obj.parentNode = parent;
		return obj;
	};

	let parseAttrs = function(str) {
		let attrs = str.match(/[a-z-0-9A-Z\:_-]+(=("|').*?("|'))?/g);
		let obj = {};
		if (attrs) {
			for (let m of attrs) {
				m = m.trim();
				let index = m.indexOf('=');
				let key, val;
				key = (index === -1 ? m : m.substring(0, index)).trim();
				val = index === -1 ? '' : m.substring(m.indexOf('"', index) + 1, m.lastIndexOf('"')).trim();
				obj[key] = val;
			}
		}
		return obj;
	};

	let parseElements = function(str, parent) {

		let counter = 0;
		let count = 0;
		let beg = str.indexOf('<');
		let end = -1;
		let tmp;
		let cdata = false;

		if (beg !== -1) {
			if (str.substring(beg, beg + 5) === '<![CD') {
				// CDATA
				cdata = true;
				end = str.indexOf(']]>', beg + 6)
			} else
				end = str.indexOf('>', beg + 1);
		}

		if (beg === -1 || end === -1) {
			if (parent) {
				tmp = str;
				if (trim)
					tmp = tmp.trim();
				tmp && parent.children.push(makeText(parent, tmp));
			}
			return '';
		}

		if (beg > 0) {
			tmp = str.substring(0, beg);
			if (trim)
				tmp = tmp.trim();

			if (tmp)
				parent.children.push(makeText(parent, tmp));
		}

		let node = str.substring(beg + (cdata ? 9 : 1), end);
		let dom = new HTMLElement();

		dom.xml = isxml;

		// Doctype or xml?
		if (!cdata && (node[0] === '!' || node[0] === '?'))
			return str.substring(end + 1);

		if (!cdata && node[node.length - 1] === '/') {
			node = node.substring(0, node.length - 1);
			dom.unpair = true;
		}

		if (cdata) {
			let txt = makeText(dom, node);
			txt.cdata = true;
			parent.children.push(txt);
			return str.substring(end + 3);
		}

		let tag = node;
		let index = -1;

		for (let i = 0; i < tag.length; i++) {
			let c = tag[i];
			if (c === '\n' || c === ' ' || c === '/' || c === '>') {
				index = i;
				break;
			}
		}

		if (index > 0) {
			tag = tag.substring(0, index);
			node = node.substring(index + 1);
		} else
			node = '';

		if (tag.indexOf('/') !== -1) {
			onerror && onerror(tag);
			return;
		}

		dom.tagName = tag.toUpperCase();
		index = dom.tagName.indexOf(':');

		if (index !== -1)
			dom.prefix = dom.tagName.substring(0, index + 1);

		dom.children = [];
		dom.attrs = node ? parseAttrs(node) : {};
		dom.raw = tag;
		dom.parentNode = parent;

		parent.children.push(dom);
		str = str.substring(end + 1);

		// Unpair tags
		if (isxml) {
			if (dom.unpair)
				return str;
		} else {
			switch (dom.tagName) {
				case 'SOURCE':
				case 'AREA':
				case 'COL':
				case 'EMBED':
				case 'TRACK':
					dom.unpair = true;
					return str;
			}
		}

		let pos = -1;
		let tagBeg = '<' + dom.raw;
		let tagEnd = '</' + dom.raw + '>';
		let unpair = false;

		// Tries to parse the content of the "dom.raw" element
		while (true) {

			if (counter++ > 10000)
				break;

			if (unpair)
				unpair = false;
			else
				end = str.indexOf(tagEnd, pos);

			// Tries to find the same tag
			beg = str.indexOf(tagBeg, pos);

			if (beg !== -1) {

				let nextcharpos = beg + tagBeg.length;
				let nextchar = str.charAt(nextcharpos);

				if (!(nextchar === ' ' || nextchar === '/' || nextchar === '>')) {
					pos = nextcharpos + 1;
					beg = -1;
				} else {

					// another one with the same type
					// check unpair

					let posend = str.indexOf('>', beg + tagBeg.length);
					if (posend === -1) {
						// tag is not closed
						return '';
					}

					if (str[posend - 1] === '/') {
						// unpair
						pos = posend + 1;
						unpair = true;
						continue;
					}
				}
			}

			// Fallback for the non-exists end tag
			if (end === -1) {
				end = str.length;
				pos = end;
				break;
			}

			if (beg !== -1 && beg < end) {
				count++;
				pos = str.indexOf('>', beg);
			}

			if (beg === -1 || end < beg) {
				pos = end + tagEnd.length;
				if (count) {
					count--;
					continue;
				}
				break;
			}

		}

		let inner = str.substring(0, pos - tagEnd.length);
		if (inner.indexOf('<') === -1 || (!isxml && (/\<(script|style|template)/).test(tag))) {
			if (trim)
				inner = inner.trim();
			if (inner)
				dom.children.push(makeText(dom, inner));
		} else {
			while (inner)
				inner = parseElements(inner, dom);
		}

		str = str.substring(end + tagEnd.length, str.length);

		if (str && str.indexOf('<') === -1) {
			if (trim)
				str = str.trim();
			// Commented because it inserts the same textContent twice
			// str && parent.children.push(makeText(parent, str));
		}

		return str;
	};

	html = removeComments(html);

	let dom = new HTMLElement();
	dom.xml = isxml;

	while (html)
		html = parseElements(html, dom);

	return dom;
}

exports.parseHTML = parseHTML;