// Total.js NoSQL embedded database
// The MIT License
// Copyright 2014-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const NoSQLStream = require('./nosql-stream');
const NoSQLReader = require('./nosql-reader');
const NoSQLQueryBuilder = require('./nosql-builder').NoSQLQueryBuilder;

require('./nosql-querybuilder');

const MAXREADERS = 3;
const JSONBUFFER = 40;

const JSONBOOL = '":true ';
const NEWLINE = '\n';
const REG_BOOL = /":true/g; // for updates of boolean types
const REG_DATE = /"\d{4}-\d{2}-\d{2}T[0-9.:]+Z"/g;

function NoSQL(filename) {
	var t = this;
	t.filename = filename;
	t.duration = [];
	t.pending_count = 0;
	t.pending_update = [];
	t.pending_append = [];
	t.pending_reader = [];
	t.pending_remove = [];
	t.pending_reader2 = [];
	t.pending_streamer = [];
	t.pending_clean = [];
	t.pending_clear = [];
	t.step = 0;
	t.pending_drops = false;
	t.$timeoutmeta;
	t.$writing = false;
	t.$reading = 0;
	t.total = 0;
	t.inmemory = false;
	t.next2 = () => t.next(0);
}

NoSQL.prototype.memory = function(count, size) {
	var self = this;
	count && (self.buffercount = count + 1);      // def: 15 - count of stored documents in memory while reading/writing
	size && (self.buffersize = size * 1024);      // def: 32 - size of buffer in kB
	return self;
};

function next_operation(self, type) {
	self.next(type);
}

NoSQL.prototype.drop = function(callback) {
	var self = this;
	self.pending_drops = true;
	setImmediate(next_operation, self, 7);
	callback && callback(F.TUtils.success);
	return self;
};

NoSQL.prototype.clear = function(callback) {
	var self = this;
	self.pending_clear.push(callback || NOOP);
	setImmediate(next_operation, self, 12);
	return self;
};

NoSQL.prototype.clean = function(callback) {
	var self = this;
	self.pending_clean.push(callback || NOOP);
	setImmediate(next_operation, self, 13);
	return self;
};

NoSQL.prototype.remove = function() {
	var self = this;
	var builder = new NoSQLQueryBuilder(self);
	self.pending_remove.push(builder);
	setImmediate(next_operation, self, 3);
	return builder;
};

NoSQL.prototype.find = function(builder) {
	var self = this;
	if (builder instanceof NoSQLQueryBuilder)
		builder.db = self;
	else
		builder = new NoSQLQueryBuilder(self);
	self.pending_reader.push(builder);
	setImmediate(next_operation, self, 4);
	return builder;
};

NoSQL.prototype.update = function(builder) {
	var self = this;
	if (builder instanceof NoSQLQueryBuilder)
		builder.db = self;
	else
		builder = new NoSQLQueryBuilder(self);
	self.pending_update.push(builder);
	setImmediate(next_operation, self, 2);
	return builder;
};

NoSQL.prototype.find2 = function(builder) {
	var self = this;
	if (builder instanceof NoSQLQueryBuilder)
		builder.db = self;
	else
		builder = new NoSQLQueryBuilder(self);
	self.pending_reader2.push(builder);
	setImmediate(next_operation, self, 11);
	return builder;
};

NoSQL.prototype.stream = function(fn, arg, callback) {
	var self = this;

	if (typeof(arg) === 'function') {
		callback = arg;
		arg = null;
	}

	self.pending_streamer.push({ fn: fn, callback: callback, arg: arg || {} });
	setImmediate(next_operation, self, 10);
	return self;
};

NoSQL.prototype.recount = function() {
	var self = this;
	self.pending_count++;
	setImmediate(next_operation, self, 5);
};

//  1 append
//  2 update
//  3 remove
//  4 reader
//  5 counting
//  7 drop
//  8 backup
//  9 restore
// 10 streamer
// 11 reader reverse
// 12 clear
// 13 clean

const NEXTWAIT = { 7: true, 8: true, 9: true, 12: true, 13: true };

NoSQL.prototype.next = function(type) {

	if (type && NEXTWAIT[this.step])
		return;

	if (!this.$writing && !this.$reading) {

		if (this.step !== 12 && this.pending_clear.length) {
			this.$clear();
			return;
		}

		if (this.step !== 13 && this.pending_clean.length) {
			this.$clean();
			return;
		}

		if (this.step !== 7 && this.pending_drops) {
			this.$drop();
			return;
		}

		if (this.step !== 5 && this.pending_count) {
			this.$count();
			return;
		}
	}

	if (!this.$writing) {

		if (this.step !== 1 && this.pending_append.length) {
			this.$append();
			return;
		}

		if (this.step !== 2 && !this.$writing && this.pending_update.length) {
			this.$update();
			return;
		}

		if (this.step !== 3 && !this.$writing && this.pending_remove.length) {
			this.$remove();
			return;
		}

	}

	if (this.$reading < MAXREADERS) {

		// if (this.step !== 4 && this.pending_reader.length) {
		if (this.pending_reader.length) {
			this.$reader();
			return;
		}

		// if (this.step !== 11 && this.pending_reader2.length) {
		if (this.pending_reader2.length) {
			this.$reader2();
			return;
		}

		// if (this.step !== 10 && this.pending_streamer.length) {
		if (this.pending_streamer.length) {
			this.$streamer();
			return;
		}
	}

	if (this.step !== type) {
		this.step = 0;
		setImmediate(next_operation, this, 0);
	}
};

// ======================================================================
// FILE OPERATIONS
// ======================================================================

NoSQL.prototype.$append = function() {
	var self = this;
	self.step = 1;

	if (!self.pending_append.length) {
		self.next(0);
		return;
	}

	self.$writing = true;

	self.pending_append.splice(0).limit(JSONBUFFER, function(items, next) {

		var json = '';
		var now = Date.now();

		for (var i = 0; i < items.length; i++) {
			var builder = items[i];
			json += JSON.stringify(builder.payload) + NEWLINE;
			self.oninsert && self.oninsert(builder.payload);
		}

		F.Fs.appendFile(self.filename, json, function(err) {

			err && F.error(err, 'NoSQL insert: ' + self.filename);

			var diff = Date.now() - now;

			if (self.duration.push({ type: 'insert', duration: diff }) > 20)
				self.duration.shift();

			for (var i = 0; i < items.length; i++) {
				var builder = items[i];
				builder.duration = diff;
				builder.response = builder.counter = builder.count = 1;
				builder.logrule && builder.logrule();
				builder.done();
			}

			self.total += items.length;
			next();
		});

	}, () => setImmediate(next_append, self));
};

function next_append(self) {
	self.$writing = false;
	self.next(0);
}

NoSQL.prototype.$update = function() {

	var self = this;
	self.step = 2;

	if (!self.pending_update.length) {
		self.next(0);
		return self;
	}

	self.$writing = true;

	var filter = self.pending_update.splice(0);
	var filters = NoSQLReader.make();
	var fs = new NoSQLStream(self.filename);
	var change = false;

	filters.type = 'update';
	filters.db = self;

	for (var i = 0; i < filter.length; i++)
		filters.add(filter[i], true);

	if (self.buffersize)
		fs.buffersize = self.buffersize;

	if (self.buffercount)
		fs.buffercount = self.buffercount;

	var update = function(docs, doc, dindex, f) {
		try {
			f.modifyrule(docs[dindex], f.modifyarg);
			f.backuprule && f.backuprule(fs.docsbuffer[dindex].doc);
		} catch (e) {
			f.canceled = true;
			f.error = e + '';
		}
	};

	var updateflush = function(docs, doc, dindex) {

		doc = docs[dindex];

		var rec = fs.docsbuffer[dindex];
		var upd = JSON.stringify(doc).replace(REG_BOOL, JSONBOOL);

		if (upd === rec.doc)
			return;

		!change && (change = true);
		var was = true;

		if (rec.doc.length === upd.length) {
			var b = Buffer.byteLength(upd);
			if (rec.length === b) {
				fs.write(upd + NEWLINE, rec.position);
				was = false;
			}
		}

		if (was) {
			var tmp = fs.remchar + rec.doc.substring(1) + NEWLINE;
			fs.write(tmp, rec.position);
			fs.write2(upd + NEWLINE);
		}

		self.onupdate && self.onupdate(doc);
	};

	fs.ondocuments = function() {
		try {
			var docs = (new Function('return [' + fs.docs.replace(REG_DATE, 'new Date($&)') + ']'))();
			filters.compare2(docs, update, updateflush);
		} catch (e) {
			F.error('TextDB("' + self.filename + '").update()', e);
			return false;
		}
	};

	fs.$callback = function() {

		fs = null;
		self.$writing = false;
		self.next(0);

		for (var i = 0; i < filters.builders.length; i++) {
			var builder = filters.builders[i];
			builder.logrule && builder.logrule();
			builder.done();
		}

		if (filters.total > 0)
			filters.db.total = filters.total;

	};

	fs.openupdate();
	return self;
};

NoSQL.prototype.$reader = function(items, reader) {

	var self = this;
	self.step = 4;

	if (!self.pending_reader.length) {
		self.next(0);
		return self;
	}

	var filters = NoSQLReader.make(self.pending_reader.splice(0));

	filters.type = 'read';
	filters.db = self;
	filters.inmemory = false;

	var fs = new NoSQLStream(self.filename);

	self.$reading++;

	if (self.buffersize)
		fs.buffersize = self.buffersize;

	if (self.buffercount)
		fs.buffercount = self.buffercount;

	var memory = !filters.cancelable && self.inmemory ? [] : null;

	fs.ondocuments = function() {

		try {

			var docs = (new Function('return [' + fs.docs.replace(REG_DATE, 'new Date($&)') + ']'))();

			if (memory) {
				for (var i = 0; i < docs.length; i++)
					memory.push(docs[i]);
			}

			return filters.compare(docs);

		} catch (e) {
			F.error('TextDB("' + self.filename + '").read()', e);
			return false;
		}
	};

	fs.$callback = function() {
		self.filesize = fs.stats.size;
		self.$reading--;
		filters.done();
		fs = null;
		self.next(0);
	};

	if (reader)
		fs.openstream(reader);
	else
		fs.openread();

	return self;
};

NoSQL.prototype.$reader2 = function() {

	var self = this;
	self.step = 11;

	if (!self.pending_reader2.length) {
		self.next(0);
		return self;
	}

	var filters = NoSQLReader.make(self.pending_reader2.splice(0));
	filters.type = 'readreverse';
	filters.db = self;
	filters.inmemory = false;

	self.$reading++;

	var fs = new NoSQLStream(self.filename);

	if (self.buffersize)
		fs.buffersize = self.buffersize;

	if (self.buffercount)
		fs.buffercount = self.buffercount;

	fs.ondocuments = function() {
		try {
			var data = (new Function('return [' + fs.docs.replace(REG_DATE, 'new Date($&)') + ']'))();
			data.reverse();
			return filters.compare(data);
		} catch (e) {
			F.error('TextDB("' + self.filename + '").read()', e);
			return false;
		}
	};

	fs.$callback = function() {
		self.filesize = fs.stats.size;
		filters.done();
		self.$reading--;
		fs = null;
		self.next(0);
	};

	fs.openreadreverse();
	return self;
};

NoSQL.prototype.$streamer = function() {

	var self = this;
	self.step = 10;

	if (!self.pending_streamer.length) {
		self.next(0);
		return self;
	}

	self.$reading++;

	var filter = self.pending_streamer.splice(0);
	var length = filter.length;
	var count = 0;
	var fs = new NoSQLStream(self.filename);

	if (self.buffersize)
		fs.buffersize = self.buffersize;

	if (self.buffercount)
		fs.buffercount = self.buffercount;

	fs.ondocuments = function() {
		try {
			var docs = (new Function('return [' + fs.docs.replace(REG_DATE, 'new Date($&)') + ']'))();
			for (var j = 0; j < docs.length; j++) {
				var json = docs[j];
				count++;
				for (var i = 0; i < length; i++)
					filter[i].fn(json, filter[i].arg, count);
			}
		} catch (e) {
			F.error('TextDB("' + self.filename + '").stream()', e);
			return false;
		}
	};

	fs.$callback = function() {
		for (var i = 0; i < length; i++)
			filter[i].callback && filter[i].callback(null, filter[i].arg, count);
		self.$reading--;
		self.next(0);
		fs = null;
	};

	fs.openread();
	return self;
};

NoSQL.prototype.$remove = function() {

	var self = this;
	self.step = 3;

	if (!self.pending_remove.length) {
		self.next(0);
		return;
	}

	self.$writing = true;

	var fs = new NoSQLStream(self.filename);
	var filter = self.pending_remove.splice(0);
	var filters = NoSQLReader.make(filter);
	var change = false;

	filters.type = 'remove';
	filters.db = self;

	if (self.buffersize)
		fs.buffersize = self.buffersize;

	if (self.buffercount)
		fs.buffercount = self.buffercount;

	var remove = function(docs, d, dindex, f) {
		filters.total--;
		f.backuprule && f.backuprule(fs.docsbuffer[dindex].doc);
		self.onremove && self.onremove(fs.docsbuffer[dindex].doc);
		return 1;
	};

	var removeflush = function(docs, d, dindex) {
		var rec = fs.docsbuffer[dindex];
		!change && (change = true);
		fs.write(fs.remchar + rec.doc.substring(1) + NEWLINE, rec.position);
	};

	fs.ondocuments = function() {
		try {
			var docs = (new Function('return [' + fs.docs.replace(REG_DATE, 'new Date($&)') + ']'))();
			filters.compare2(docs, remove, removeflush);
		} catch (e) {
			F.error('TextDB("' + self.filename + '").read()', e);
			return false;
		}
	};

	fs.$callback = function() {
		filters.done();
		fs = null;
		self.$writing = false;
		self.next(0);
	};

	fs.openupdate();
};

NoSQL.prototype.$clear = function() {

	var self = this;
	self.step = 12;

	if (!self.pending_clear.length) {
		self.next(0);
		return;
	}

	var filter = self.pending_clear.splice(0);
	F.Fs.unlink(self.filename, function() {

		self.total = 0;

		for (var i = 0; i < filter.length; i++)
			filter[i]();

		self.total = 0;
		self.filesize = 0;
		self.next(0);
	});
};

NoSQL.prototype.$clean = function() {

	var self = this;
	self.step = 13;

	if (!self.pending_clean.length) {
		self.next(0);
		return;
	}

	var filter = self.pending_clean.splice(0);
	var length = filter.length;

	var fs = new NoSQLStream(self.filename);
	var writer = F.Fs.createWriteStream(self.filename + '-tmp');

	if (self.buffersize)
		fs.buffersize = self.buffersize;

	if (self.buffercount)
		fs.buffercount = self.buffercount;

	fs.divider = NEWLINE;

	fs.ondocuments = function() {
		fs.docs && writer.write(fs.docs + NEWLINE);
	};

	fs.$callback = function() {
		writer.end();
	};

	writer.on('finish', function() {
		F.Fs.rename(self.filename + '-tmp', self.filename, function() {
			for (var i = 0; i < length; i++)
				filter[i]();
			self.next(0);
			fs = null;
		});
	});

	fs.openread();
};

NoSQL.prototype.$drop = function() {
	var self = this;
	self.step = 7;

	if (!self.pending_drops) {
		self.next(0);
		return;
	}

	self.pending_drops = false;

	var remove = [self.filename];
	remove.wait((filename, next) => F.Fs.unlink(filename, next), function() {
		self.total = 0;
		self.filesize = 0;
		self.next(0);
	}, 5);
};

NoSQL.prototype.insert = function() {
	var self = this;
	var builder = new NoSQLQueryBuilder(self);
	self.pending_append.push(builder);
	setImmediate(next_operation, self, 1);
	return builder;
};

NoSQL.prototype.$count = function() {

	var self = this;
	self.step = 5;

	if (!self.pending_count) {
		self.next(0);
		return self;
	}

	self.pending_count = 0;
	self.$reading++;

	var fs = new NoSQLStream(self.filename);

	// Table
	if (self.$header) {
		fs.start = self.$header;
		fs.linesize = self.$size;
	}

	fs.divider = '\n';

	if (self.buffersize)
		fs.buffersize = self.buffersize;

	if (self.buffercount)
		fs.buffercount = self.buffercount;

	fs.ondocuments = NOOP;

	fs.$callback = function() {

		self.filesize = fs.stats.size;
		self.total = fs.indexer;

		fs = null;
		self.$reading--;
		self.next(0);
	};

	fs.openread();
	return self;
};

exports.create = filename => new NoSQL(filename);


function NoSQLWrapper(filename) {
	this.filename = filename;
}

NoSQLWrapper.prototype.insert = function(data) {
	return DATA.insert('nosql/' + this.filename, data);
};

NoSQLWrapper.prototype.update = NoSQLWrapper.prototype.modify = function(data) {
	return DATA.update('nosql/' + this.filename, data);
};

NoSQLWrapper.prototype.remove = function() {
	return DATA.remove('nosql/' + this.filename);
};

NoSQLWrapper.prototype.find = function() {
	return DATA.find('nosql/' + this.filename);
};

NoSQLWrapper.prototype.read = function() {
	return DATA.read('nosql/' + this.filename);
};

NoSQLWrapper.prototype.clear = function() {
	return DATA.clear('nosql/' + this.filename);
};

exports.nosql = function(filename) {
	return new NoSQLWrapper(filename);
};