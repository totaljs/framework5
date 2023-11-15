// Total.js NoSQL Builder
// The MIT License
// Copyright 2020-2023 (c) Peter Širka <petersirka@gmail.com>

var PROPCACHE = {};
var FUNCCACHE = {};

F.on('service', function(counter) {
	if (counter % 5 === 0) {
		PROPCACHE = {};
		FUNCCACHE = {};
	}
});

var func = {};

func.in = function(a, b) {
	if (a instanceof Array) {
		for (var i = 0; i < a.length; i++) {
			if (b instanceof Array) {
				for (var j = 0; j < b.length; j++) {
					if (a[i] === b[j])
						return true;
				}
			} else if (a[i] === b)
				return true;
		}
	} else {
		if (b instanceof Array)
			return b.indexOf(a) !== -1;
		else if (a === b)
			return true;
	}
	return false;
};

function search(a, b, pos) {
	switch (pos) {
		case 'beg':
		case 1:
			return a.substring(0, b.length) === b;
		case 'end':
		case 2:
			return a.substring(a.length - b.length) === b;
		default:
			return a.indexOf(b) !== -1;
	}
}

func.search = function(a, b, pos) {

	if (!a || !b)
		return false;

	if (a instanceof Array) {
		for (var i = 0; i < a.length; i++) {
			if (!a[i])
				continue;
			var av = (a[i] + '').toLowerCase();
			if (b instanceof Array) {
				for (var j = 0; j < b.length; j++) {
					if (!b[j])
						continue;
					var bv = (b[j] + '').toLowerCase();
					if (search(av, bv, pos))
						return true;
				}
			} else if (search(av, (b + '').toLowerCase(), pos))
				return true;
		}
	} else {
		if (b instanceof Array) {
			for (var i = 0; i < b.length; i++) {
				if (!b[i])
					continue;
				var bv = (b[j] + '').toLowerCase();
				if (search(a, bv, pos))
					return true;
			}
			return b.indexOf(a) !== -1;
		} else {
			if (search((a + '').toLowerCase(), (b + '').toLowerCase(), pos))
				return true;
		}
	}
	return false;
};

// Dependencies
function NoSQLQueryBuilder(db) {

	var t = this;
	t.tmp = {};
	t.db = db;
	t.response = [];
	t.count = 0;
	t.counter = 0;
	t.scanned = 0;
	t.$take = 9999999;
	t.$skip = 0;

	t.func = func;

	// t.$fields
	// t.$sort
}

NoSQLQueryBuilder.prototype.assign = function(meta) {
	var self = this;
	self.cid = meta.cid;
	self.$first = meta.first;
	meta.fields && self.fields(meta.fields);
	meta.sort && self.sort(meta.sort);
	meta.take && self.take(meta.take);
	meta.skip && self.skip(meta.skip);

	if (meta.paginate)
		self.$paginate = 1;

	meta.modify && self.modify(meta.modify, meta.modifyarg);
	meta.filter && self.filter(meta.filter, meta.filterarg);
	meta.scalar && self.scalar(meta.scalar, meta.scalararg);
	meta.payload && (self.payload = meta.payload);
	meta.log && self.log(meta.log);

	if (meta.filter)
		self.filterid = meta.filter;

	return self;
};

NoSQLQueryBuilder.prototype.fields = function(value) {
	var self = this;
	var tmp = PROPCACHE[value];
	if (!tmp) {
		self.$fieldsremove = [];
		self.$fields = [];
		self.$fieldsall = {};
		var keys = value.split(',').trim();
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var rename = key.split(' as ');
			if (rename[1]) {
				key = rename[0];
				if (!self.$fieldsrename)
					self.$fieldsrename = {};
				self.$fieldsrename[i] = rename[1].trim();
				self.$fieldsall[self.$fieldsrename[i]] = 1;
			} else if (key[0] !== '-')
				self.$fieldsall[key] = 1;

			if (key[0] === '-')
				self.$fieldsremove.push(key.substring(1));
			else
				self.$fields.push(key);
		}
		tmp = { rename: self.$fieldsrename, all: self.$fieldsall, map: self.$fields.length ? self.$fields : null, rem: self.$fieldsremove.length ? self.$fieldsremove : null };
		PROPCACHE[value] = tmp;
		if (!self.$fields.length)
			self.$fields = null;
		if (!self.$fieldsremove.length)
			self.$fieldsremove = null;
	} else {
		self.$fields = tmp.map;
		self.$fieldsall = tmp.all;
		self.$fieldsremove = tmp.rem;
	}
	return self;
};

NoSQLQueryBuilder.prototype.transform = function(rule, arg) {
	var self = this;
	if (arg)
		self.transformarg = arg;

	var key = 'T' + rule;
	var tmp = FUNCCACHE[key];
	if (tmp)
		self.transformrule = tmp;
	else {
		if (isdangerous(rule))
			rule = 'doc';
		FUNCCACHE[key] = self.transformrule = new Function('doc', 'arg', 'tmp', 'func', 'return ' + rule);
	}

	return self;
};

NoSQLQueryBuilder.prototype.prepare = function(doc) {

	var self = this;
	var obj;

	if (self.$fields) {
		obj = {};
		for (var i = 0; i < self.$fields.length; i++) {
			var a = self.$fields[i];
			var b = self.$fields[i];
			if (self.$fieldsrename && self.$fieldsrename[i])
				a = self.$fieldsrename[i];
			obj[a] = doc[b];
		}

	} else if (self.$fieldsremove) {

		obj = {};

		for (var key in doc)
			obj[key] = doc[key];

		for (var i = 0; i < self.$fieldsremove.length; i++)
			obj[self.$fieldsremove[i]] = undefined;
	}

	if (self.transformrule) {

		// Clone data
		if (!obj) {
			obj = {};
			for (var key in doc)
				obj[key] = doc[key];
		}

		self.transformrule(obj, self.transformarg);
	}

	return obj || doc;
};

NoSQLQueryBuilder.prototype.push = function(item) {
	var self = this;
	if (self.$sort)
		return sort(self, item);
	self.response.push(item);
	return true;
};

NoSQLQueryBuilder.prototype.take = function(take) {
	this.$take = take;
	return this;
};

NoSQLQueryBuilder.prototype.skip = function(skip) {
	this.$skip = skip;
	return this;
};

NoSQLQueryBuilder.prototype.sort = function(sort) {

	var self = this;

	self.$sort = F.TUtils.sortcomparer(sort);

	if (self.$fields && self.$fields.length) {
		// Internal hack
		var meta = F.temporary.utils['sort_' + sort];
		for (var i = 0; i < meta.length; i++) {
			var sort = meta[i];
			if (!self.$fieldsall[sort.name]) {
				self.$fieldsall[sort.name] = 1;
				if (self.$fields2)
					self.$fields2.push(sort.name);
				else
					self.$fields2 = [sort.name];
			}
		}
	}

	return self;
};

NoSQLQueryBuilder.prototype.filter = function(rule, arg) {

	var self = this;

	self.filterarg = arg || {};

	var tmp = FUNCCACHE[rule];
	if (tmp)
		self.filterrule = tmp;
	else {
		if (isdangerous(rule))
			rule = 'false';
		try {
			FUNCCACHE[rule] = self.filterrule = new Function('doc', 'arg', 'tmp', 'func', (rule.indexOf('return ') === -1 ? 'return ' : '') + rule);
		} catch (e) {
			self.$sort = null;
			self.error = e + '';
			self.filterrule = filterrule;
		}
	}

	return self;
};

function modifyrule(doc) {
	return doc;
}

function scalarrule() {
}

function filterrule() {
	return false;
}

NoSQLQueryBuilder.prototype.modify = function(rule, arg) {

	var self = this;
	var tmp = FUNCCACHE[rule];

	self.modifyarg = arg || {};

	if (tmp)
		self.modifyrule = tmp;
	else {
		if (isdangerous(rule, true))
			rule = '';
		try {
			FUNCCACHE[rule] = self.modifyrule = rule ? new Function('doc', 'arg', 'tmp', 'func', rule) : modifyrule;
		} catch (e) {
			self.modifyrule = modifyrule;
			self.error = e + '';
		}
	}

	return self;
};

NoSQLQueryBuilder.prototype.scalar = function(rule, arg) {
	var self = this;
	var tmp = FUNCCACHE[rule];

	self.scalararg = arg || {};

	if (tmp)
		self.scalarrule = tmp;
	else {
		if (isdangerous(rule))
			rule = '';
		try {
			FUNCCACHE[rule] = self.scalarrule = new Function('doc', 'arg', 'tmp', 'func', rule);
		} catch (e) {
			self.scalarrule = scalarrule;
			self.error = e + '';
		}
	}

	return self;
};

NoSQLQueryBuilder.prototype.done = function() {

	var self = this;

	if (!self.$callback && !self.$callback2 && !self.$resolve)
		return;

	var meta = {};

	if (self.error)
		meta.error = self.error;

	meta.cid = self.cid;
	meta.count = self.count;
	meta.counter = self.counter;
	meta.scanned = self.scanned;
	meta.duration = self.duration;

	if (self.canceled)
		meta.canceled = true;

	if (!self.$NoSQLReader || self.$NoSQLReader.type === 'update' || self.$NoSQLReader.type === 'remove')
		self.response = meta.counter;
	else if (self.$first)
		self.response = self.response instanceof Array ? self.response[0] : self.response;
	else if (self.scalararg)
		self.response = self.scalararg;

	self.$callback && self.$callback(null, self.response, meta);
	self.$callback2 && self.$callback2(null, self.response, meta);
	self.$resolve && self.$resolve(self.response);
};

NoSQLQueryBuilder.prototype.prepareresponse = function(response) {
	for (var i = 0; i < response.length; i++)
		response[i] = this.prepare(response[i]);
};

NoSQLQueryBuilder.prototype.callback = function(fn) {
	var self = this;
	self.$callback = fn;
	return self;
};

function isdangerous(rule) {
	return (/require|global/).test(rule);
}

function sort(builder, item) {
	var length = builder.response.length;
	if (length <= builder.$take2) {
		length = builder.response.push(item);
		if (length >= builder.$take2) {
			builder.response.sort(builder.$sort);
			builder.$sorted = true;
		}
		return true;
	} else
		return chunkysort(builder, item);
}

function chunkysort(builder, item) {

	var beg = 0;
	var length = builder.response.length;
	var tmp = length - 1;

	var sort = builder.$sort(item, builder.response[tmp]);
	if (sort !== -1)
		return;

	tmp = length / 2 >> 0;
	sort = builder.$sort(item, builder.response[tmp]);
	if (sort !== -1)
		beg = tmp + 1;

	for (var i = beg; i < length; i++) {
		var old = builder.response[i];
		var sort = builder.$sort(item, old);
		if (sort !== 1) {
			for (var j = length - 1; j > i; j--)
				builder.response[j] = builder.response[j - 1];
			builder.response[i] = item;
			return true;
		}
	}
}

exports.NoSQLQueryBuilder = NoSQLQueryBuilder;