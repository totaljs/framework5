// FileStorage
// The MIT License
// Copyright 2016-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const IMAGES = { jpg: 1, png: 1, gif: 1, svg: 1, jpeg: 1, heic: 1, heif: 1, webp: 1, tiff: 1, bmp: 1 };
const HEADERSIZE = 2000;
const MKDIR = { recursive: true };
const GZIP_FILE = { memLevel: 9 };

const REG_RANGE = /bytes=/;
const REG_CLEAN = /^[\s]+|[\s]+$/g;

var CONCAT = [null, null];

function FileStorage(name, directory) {

	var t = this;

	t.name = name;

	// t.directory = directory;
	// t.logger = directory + '/files.log';

	t.cache = {};
	t.total = 0;
	t.size = 0;
	t.ext = '.file';
	t.pause = false;

	t.retrysave = function(id, name, filename, callback, custom, expire, headers) {
		t._save(id, name, filename, callback, custom, expire, headers);
	};

	t.retryread = function(id, callback, nostream) {
		t._read(id, callback, nostream);
	};

	t.storage(directory);
}

const FP = FileStorage.prototype;

FP.storage = function(value) {
	var self = this;
	self.cache = {};
	self.directory = value;
	self.logger = F.Path.join(value, 'files.log');
	return self;
};

FP.count = function(callback) {
	var self = this;
	NOSQL(self.logger).scalar('sum', 'size').callback(function(err, response) {
		response.size = response.sum;
		self.size = response.size;
		self.total = response.count;
		response.sum = undefined;
		callback && callback(err, response);
	});
	return self;
};

FP.makedirectory = function(id) {
	return F.Path.join(this.directory, F.TUtils.groupify(id));
};

FP.readfilename = function(id) {
	var self = this;
	var directory = self.makedirectory(id);
	return F.Path.join(directory, id + '.file');
};

FP.savejson = function(id, value, callback, custom, expire) {
	return this.save(id, id + '.json', Buffer.from(JSON.stringify(value), 'utf8'), callback, custom, expire);
};

FP.readjson = function(id, callback) {
	return this.read(id, function(err, meta) {

		if (err) {
			callback(err);
			return;
		}

		var buffer = [];
		meta.stream.on('data', chunk => buffer.push(chunk));
		meta.stream.on('end', function() {
			meta.stream = null;
			callback(null, Buffer.concat(buffer).toString('utf8').parseJSON(true), meta);
		});

	});
};

FP.save = FP.insert = function(id, name, filename, custom, callback, expire, headers) {
	var self = this;

	if (typeof(custom) === 'function') {
		headers = expire;
		expire = callback;
		callback = custom;
		custom = null;
	}

	if (callback)
		return self._save(id, name, filename, callback, custom, expire, headers);
	else
		return new Promise((resolve, reject) => self._save(id, name, filename, (err, res) => err ? reject(err) : resolve(res), custom, expire, headers));
};

FP._save = function(id, name, filename, callback, custom, expire, headers) {

	var self = this;

	if (self.pause) {
		setTimeout(self.retrysave, 500, id, name, filename, callback, custom, expire, headers);
		return self;
	}

	if (!filename) {
		filename = name;
		name = F.TUtils.getName(name);
	}

	var directory = self.makedirectory(id);
	var filenameto = F.Path.join(directory, id + '.file');

	var index = name.lastIndexOf('/');
	if (index !== -1)
		name = name.substring(index + 1);

	if (self.cache[directory]) {
		if (typeof(filename) === 'string' && filename[0] === 'h' && filename[1] === 't' && filename[7] === '/') {
			// URL address
			var opt = {};
			opt.url = filename;
			opt.custom = true;
			opt.headers = headers;
			opt.callback = function(err, response) {

				if (err) {
					callback(err);
					return;
				}

				if (response.status < 400)
					self.saveforce(id, name, response.stream, filenameto, callback, custom, expire);
				else
					callback(F.TUtils.httpstatus(response.status));
			};

			F.TUtils.request(opt);
		} else
			self.saveforce(id, name, filename, filenameto, callback, custom, expire);

	} else {
		F.Fs.mkdir(directory, MKDIR, function(err) {
			if (err)
				callback(err);
			else {
				self.cache[directory] = 1;
				if (typeof(filename) === 'string' && filename[0] === 'h' && filename[1] === 't' && filename[7] === '/') {
					// URL address
					var opt = {};
					opt.url = filename;
					opt.custom = true;
					opt.headers = headers;
					opt.callback = function(err, response) {

						if (err) {
							callback(err);
							return;
						}

						if (response.status < 400)
							self.saveforce(id, name, response.stream, filenameto, callback, custom, expire);
						else
							callback(F.TUtils.httpstatus(response.status));
					};
					F.TUtils.request(opt);
				} else
					self.saveforce(id, name, filename, filenameto, callback, custom, expire);
			}
		});
	}

	return self;
};

FP.saveforce = function(id, name, filename, filenameto, callback, custom, expire) {

	if (!callback)
		callback = NOOP;

	F.stats.performance.open++;

	var isbuffer = filename instanceof Buffer;
	var self = this;
	var header = Buffer.alloc(HEADERSIZE, ' ');
	var reader = isbuffer ? null : filename instanceof F.Stream.Readable ? filename : F.Fs.createReadStream(filename);
	var writer = F.Fs.createWriteStream(filenameto);
	var ext = F.TUtils.getExtension(name);
	var meta = { name: name, size: 0, ext: ext, custom: custom, type: F.TUtils.contentTypes[ext] };
	var tmp;

	writer.write(header, 'binary');

	if (IMAGES[meta.ext]) {
		if (isbuffer) {
			switch (meta.ext) {
				case 'gif':
					tmp = F.TImages.measureGIF(filename);
					break;
				case 'png':
					tmp = F.TImages.measurePNG(filename);
					break;
				case 'jpg':
				case 'jpeg':
					tmp = F.TImages.measureJPG(filename);
					break;
				case 'svg':
					tmp = F.TImages.measureSVG(filename);
					break;
			}
		} else {
			reader.once('data', function(buffer) {
				switch (meta.ext) {
					case 'gif':
						tmp = F.TImages.measureGIF(buffer);
						break;
					case 'png':
						tmp = F.TImages.measurePNG(buffer);
						break;
					case 'jpg':
					case 'jpeg':
						tmp = F.TImages.measureJPG(buffer);
						break;
					case 'svg':
						tmp = F.TImages.measureSVG(buffer);
						break;
				}
			});
		}
	}

	if (isbuffer) {
		writer.end(filename);
	} else {
		reader.pipe(writer);
		if (typeof(filename) !== 'string')
			reader.resume();
	}

	F.cleanup(writer, function() {

		F.Fs.open(filenameto, 'r+', function(err, fd) {

			if (err) {
				// Unhandled error
				callback(err);
				return;
			}

			if (tmp) {
				meta.width = tmp.width;
				meta.height = tmp.height;
			}

			meta.size = writer.bytesWritten - HEADERSIZE;
			meta.date = NOW = new Date();

			if (expire)
				meta.expire = NOW.add(expire);

			self.total++;
			self.size += meta.size;

			if (meta.name.length > 250)
				meta.name = meta.name.substring(0, 250);

			header.write(JSON.stringify(meta));

			// Update header
			F.Fs.write(fd, header, 0, header.length, 0, function(err) {
				if (err) {
					callback(err);
					F.Fs.close(fd, NOOP);
				} else {
					meta.id = id;
					F.Fs.appendFile(self.logger, JSON.stringify(meta) + '\n', NOOP);
					F.Fs.close(fd, () => callback(null, meta));
				}
			});
		});
	});
};

FP.read = function(id, callback, nostream) {
	var self = this;
	if (callback)
		return self._read(id, callback, nostream);
	else
		return new Promise((resolve, reject) => self._read(id, (err, res) => err ? reject(err) : resolve(res), nostream));
};

FP._read = function(id, callback, nostream) {

	var self = this;

	if (self.pause) {
		setTimeout(self.retryread, 500, id, callback, nostream);
		return self;
	}

	var filename = F.Path.join(self.makedirectory(id), id + '.file');
	F.stats.performance.open++;
	F.Fs.open(filename, 'r', function(err, fd) {

		if (err) {
			callback(err);
			return;
		}

		var buffer = Buffer.alloc(HEADERSIZE);
		F.Fs.read(fd, buffer, 0, HEADERSIZE, 0, function(err) {

			if (err) {
				F.Fs.close(fd, NOOP);
				callback(err);
				return;
			}

			var str = buffer.toString('utf8').replace(REG_CLEAN, '');
			if (!str) {
				// Invalid file
				F.Fs.close(fd, function() {
					if (buffer.length === HEADERSIZE)
						F.Fs.unlink(filename, NOOP);
				});
				callback('File not found');
				return;
			}

			var meta = str.parseJSON(true);
			if (!meta) {
				F.Fs.close(fd, NOOP);
				callback('Invalid file');
				return;
			}

			meta.id = id;

			if (meta.expire && meta.expire < NOW) {
				F.Fs.close(fd, NOOP);
				callback('File is expired');
				return;
			}

			if (!nostream) {
				F.stats.performance.open++;
				meta.stream = F.Fs.createReadStream(filename, { fd: fd, start: HEADERSIZE });
				F.cleanup(meta.stream, () => F.Fs.close(fd, NOOP));
			} else
				F.Fs.close(fd, NOOP);

			callback(err, meta);
		});
	});

	return self;
};

FP.readbuffer = function(id, callback) {
	var self = this;
	if (callback)
		return self._readbuffer(id, callback);
	else
		return new Promise((resolve, reject) => self._readbuffer(id, (err, res) => err ? reject(err) : resolve(res)));
};

FP._readbuffer = function(id, callback) {

	var self = this;

	if (self.pause) {
		setTimeout(self._readbuffer, 500, id, callback);
		return self;
	}

	var filename = F.Path.join(self.makedirectory(id), id + '.file');
	F.stats.performance.open++;
	F.Fs.open(filename, 'r', function(err, fd) {

		if (err) {
			callback(err);
			return;
		}

		var buffer = Buffer.alloc(HEADERSIZE);
		F.Fs.read(fd, buffer, 0, HEADERSIZE, 0, function(err) {

			if (err) {
				F.Fs.close(fd, NOOP);
				callback(err);
				return;
			}

			var meta = buffer.toString('utf8').replace(REG_CLEAN, '').parseJSON(true);
			meta.id = id;

			if (meta.expire && meta.expire < NOW) {
				F.Fs.close(fd, NOOP);
				callback('File is expired');
				return;
			}

			buffer = [];
			F.stats.performance.open++;

			var stream = F.Fs.createReadStream(filename, { fd: fd, start: HEADERSIZE });
			stream.on('data', chunk => buffer.push(chunk));

			F.cleanup(stream, function() {
				F.Fs.close(fd, NOOP);
				callback(err, Buffer.concat(buffer), meta);
			});
		});
	});

	return self;
};

FP.browse = function(callback) {
	var db = NOSQL(this.logger).find();
	if (callback)
		db.$callback = callback;
	return db;
};

FP.move = function(id, newid, callback) {
	var self = this;
	if (callback)
		return self._move(id, newid, callback);
	else
		return new Promise((resolve, reject) => self._move(id, newid, (err, res) => err ? reject(err) : resolve(res)));
};

FP._move = function(id, newid, callback) {

	var self = this;
	var filename = F.Path.join(self.makedirectory(id), id + '.file');

	F.stats.performance.open++;

	F.Fs.lstat(filename, function(err) {

		if (err) {
			callback(err);
			return;
		}

		var directory = self.makedirectory(newid);
		var filenamenew = F.Path.join(directory, newid + '.file');

		if (self.cache[directory]) {
			F.Fs.rename(filename, filenamenew, err => callback && callback(err));
		} else {
			F.Fs.mkdir(directory, MKDIR, function(err) {

				if (err) {
					callback(err);
					return;
				}

				self.cache[directory] = 1;
				F.Fs.rename(filename, filenamenew, err => callback && callback(err));
			});
		}

	});

	return self;
};

FP.rename = function(id, newname, callback) {
	var self = this;
	if (callback)
		return self._rename(id, newname, callback);
	else
		return new Promise((resolve, reject) => self._rename(id, newname, (err, res) => err ? reject(err) : resolve(res)));
};

FP._rename = function(id, newname, callback) {

	var self = this;
	var filename = F.Path.join(self.makedirectory(id), id + '.file');
	F.stats.performance.open++;

	F.Fs.open(filename, 0o666, function(err, fd) {

		if (err) {
			callback(err);
			return;
		}

		var buffer = Buffer.alloc(HEADERSIZE);
		F.Fs.read(fd, buffer, 0, HEADERSIZE, 0, function(err) {

			if (err) {
				F.Fs.close(fd, NOOP);
				callback(err);
				return;
			}

			var meta = buffer.toString('utf8').replace(REG_CLEAN, '').parseJSON(true);
			meta.name = newname;

			if (meta.name.length > 250)
				meta.name = meta.name.substring(0, 250);

			buffer = Buffer.alloc(HEADERSIZE, ' ');
			buffer.write(JSON.stringify(meta));

			// Update header
			F.Fs.write(fd, buffer, 0, buffer.length, 0, function(err) {
				if (err) {
					callback(err);
					F.Fs.close(fd, NOOP);
				} else {
					meta.id = id;
					NOSQL(self.logger).modify(meta).id(id);
					F.Fs.close(fd, () => callback(null, meta));
				}
			});
		});
	});

	return self;
};

FP.remove = function(id, callback) {
	var self = this;
	if (callback)
		return self._remove(id, callback);
	else
		return new Promise((resolve, reject) => self._remove(id, (err, res) => err ? reject(err) : resolve(res)));
};

FP._remove = function(id, callback) {
	var self = this;
	var filename = F.Path.join(self.makedirectory(id), id + '.file');
	F.Fs.unlink(filename, function(err) {
		NOSQL(self.logger).remove().id(id);
		callback && callback(err);
	});
	return self;
};

FP.clean = function(callback) {
	var self = this;
	if (callback)
		return self._clean(callback);
	else
		return new Promise((resolve, reject) => self._clean((err, res) => err ? reject(err) : resolve(res)));
};

FP._clean = function(callback) {

	var self = this;
	var db = NOSQL(self.logger);

	db.find().where('expire', '<', NOW).callback(function(err, files) {

		if (err || !files || !files.length) {
			callback && callback(err, 0);
			return;
		}

		var id = [];
		for (let file in files)
			id.push(file.id);

		db.remove().in('id', id);

		files.wait(function(item, next) {
			var filename = F.Path.join(self.makedirectory(item.id), item.id + '.file');
			F.Fs.unlink(filename, next);
		}, function() {
			self.count();
			db.clean();
			callback && callback(err, files.length);
		});
	});

	return self;
};

FP.backup = function(filename, callback) {
	var self = this;
	if (callback)
		return self._backup(filename, callback);
	else
		return new Promise((resolve, reject) => self._backup(filename, (err, res) => err ? reject(err) : resolve(res)));
};

FP._backup = function(filename, callback) {

	var self = this;
	var writer = typeof(filename) === 'string' ? F.Fs.createWriteStream(filename) : filename;
	var totalsize = 0;
	var counter = 0;
	var padding = 50;

	writer.on('finish', () => callback && callback(null, { filename: filename, files: counter, size: totalsize }));

	F.Fs.readdir(self.directory, function(err, response) {

		if (err) {
			callback(err);
			return;
		}

		for (let dir of response) {
			if (dir.length === 4) {
				let tmp = Buffer.from(('/' + dir + '/').padRight(padding) + ': #\n', 'utf8');
				writer.write(tmp);
				totalsize += tmp.length;
			}
		}

		response.wait(function(item, next) {

			if (item.length !== 4) {
				next();
				return;
			}

			var dir = F.Path.join(self.directory, item);
			F.Fs.readdir(dir, function(err, response) {
				response.wait(function(name, next) {

					var filename = F.Path.join(dir, name);
					var data = Buffer.alloc(0);
					var tmp = Buffer.from(('/' + F.Path.join(item, name)).padRight(padding) + ': ');

					totalsize += tmp.length;
					writer.write(tmp);

					F.Fs.createReadStream(filename).pipe(F.Zlib.createGzip(GZIP_FILE)).on('data', function(chunk) {

						CONCAT[0] = data;
						CONCAT[1] = chunk;
						data = Buffer.concat(CONCAT);

						var remaining = data.length % 3;
						if (remaining) {
							let tmp = data.slice(0, data.length - remaining).toString('base64');
							writer.write(tmp, 'utf8');
							data = data.slice(data.length - remaining);
							totalsize += tmp.length;
						}

					}).on('end', function() {
						let tmp = data.length ? data.toString('base64') : '';
						data.length && writer.write(tmp);
						writer.write('\n', 'utf8');
						totalsize += tmp.length + 1;
						counter++;
						setImmediate(next);
					}).on('error', () => setImmediate(next));

				}, next);
			});

		}, () => writer.end());
	});
};

FP.restore = function(filename, callback) {
	var self = this;
	if (callback)
		return self._restore(filename, callback);
	else
		return new Promise((resolve, reject) => self._restore(filename, (err, res) => err ? reject(err) : resolve(res)));
};

FP._restore = function(filename, callback) {
	var self = this;
	self.pause = true;
	self.clear(function() {
		self.pause = true;
		F.restore(filename, self.directory, function(err, meta) {
			self.cache = {};
			self.pause = false;
			callback && callback(err, meta);
		});
	});
};

FP.drop = FP.clear = function(callback) {
	var self = this;
	if (callback)
		return self._clear(callback);
	else
		return new Promise((resolve, reject) => self._clear((err, res) => err ? reject(err) : resolve(res)));
};

FP._clear = function(callback) {

	var self = this;
	var count = 0;

	self.pause = true;

	F.Fs.readdir(self.directory, function(err, response) {

		if (err) {
			callback && callback(err);
			return;
		}

		F.Fs.unlink(self.logger, NOOP);
		response.wait(function(item, next) {
			var dir = F.Path.join(self.directory, item);
			F.Fs.readdir(dir, function(err, response) {
				if (response instanceof Array) {
					count += response.length;
					response.wait((file, next) => F.Fs.unlink(F.Path.join(self.directory, item, file), next), () => F.Fs.rmdir(dir, next));
				} else
					next();
			});
		}, function() {
			F.Fs.unlink(self.logger, NOOP);
			self.pause = false;
			self.cache = {};
			callback && callback(null, count);
		});

	});

	return self;
};

FP.stream = function(onfile, callback, workers) {

	var self = this;

	F.Fs.readdir(self.directory, function(err, response) {

		if (err) {
			callback();
			return;
		}

		var count = 0;

		response.wait(function(item, next) {

			if (item.length !== 4) {
				next();
				return;
			}

			F.Fs.readdir(F.Path.join(self.directory, item), function(err, files) {
				if (files instanceof Array) {
					files.wait(function(item, next) {
						var id = item.substring(0, item.lastIndexOf('.'));
						self.read(id, function(err, meta) {
							if (meta) {
								meta.id = id;
								meta.index = count++;
								onfile(meta, next);
							} else
								next();
						}, true);
					}, next, workers);
				} else
					next();
			});
		}, callback);
	});

	return self;
};

FP.browse2 = function(callback) {
	var self = this;
	if (callback)
		return self._browse2(callback);
	else
		return new Promise((resolve, reject) => self._browse2((err, res) => err ? reject(err) : resolve(res)));
};

FP._browse2 = function(callback) {
	var self = this;
	var files = [];
	self.stream(function(item, next) {
		files.push(item);
		next();
	}, () => callback(null, files), 5);
	return self;
};

FP.rebuild = function(callback) {
	var self = this;
	if (callback)
		return self._rebuild(callback);
	else
		return new Promise((resolve, reject) => self._rebuild((err, res) => err ? reject(err) : resolve(res)));
};

FP._rebuild = function(callback) {

	var self = this;

	self.browse2(function(err, files) {

		self.pause = true;

		F.Fs.unlink(self.logger, NOOP);

		var builder = [];
		self.size = 0;
		self.total = 0;

		for (var i = 0; i < files.length; i++) {
			var item = files[i];
			self.size += item.size;
			self.total++;
			builder.push(JSON.stringify(item));
		}

		builder.limit(500, (items, next) => F.Fs.appendFile(self.logger, items.join('\n'), next), function() {
			F.Fs.appendFile(self.logger, '\n', NOOP);
			self.pause = false;
			callback && callback();
		});
	});

	return self;
};

FP.count2 = function(callback) {
	var self = this;
	if (callback)
		return self._count2(callback);
	else
		return new Promise((resolve, reject) => self._count2((err, res) => err ? reject(err) : resolve(res)));
};

FP._count2 = function(callback) {
	var self = this;
	var count = 0;
	F.Fs.readdir(self.directory, function(err, response) {
		response.wait(function(item, next) {
			F.Fs.readdir(F.Path.join(self.directory, item), function(err, response) {
				if (response instanceof Array)
					count += response.length;
				next();
			});
		}, () => callback(null, count));
	});
	return self;
};

function jsonparser(key, value) {
	return typeof(value) === 'string' && value.isJSONDate() ? new Date(value) : value;
}

FP.readmeta = function(id, callback, keepfd) {
	var self = this;
	if (callback)
		return self._readmeta(id, callback, keepfd);
	else
		return new Promise((resolve, reject) => self._readmeta(id, (err, res) => err ? reject(err) : resolve(res), keepfd));
};

FP._readmeta = function(id, callback, keepfd) {

	var self = this;
	var filename = F.Path.join(self.makedirectory(id), id + self.ext);

	F.stats.performance.open++;

	F.Fs.open(filename, function(err, fd) {

		if (err) {
			callback(err);
			return;
		}

		var buffer = Buffer.alloc(HEADERSIZE);

		F.Fs.read(fd, buffer, 0, buffer.length, 0, function(err, bytes, buffer) {

			if (err) {
				F.Fs.close(fd, NOOP);
				callback(err);
				return;
			}

			var json = buffer.toString('utf8').replace(REG_CLEAN, '');

			try {
				json = JSON.parse(json, jsonparser);
			} catch (e) {
				F.Fs.close(fd, NOOP);
				callback(e, null, filename);
				return;
			}

			if (!keepfd)
				F.Fs.close(fd, NOOP);

			callback(null, json, filename, fd);
		});

	});

	return self;
};

FP.image = function(id, callback) {
	var self = this;
	if (callback)
		return self._image(id, callback);
	else
		return new Promise((resolve, reject) => self._image(id, (err, res) => err ? reject(err) : resolve(res)));
};

FP._image = function(id, callback) {
	var self = this;
	self.readmeta(id, function(err, obj, filename, fd) {

		if (err) {
			callback(err);
			return;
		}

		var stream = F.Fs.createReadStream(filename, { fd: fd, start: HEADERSIZE });
		var image = Image.load(stream);
		stream.$totalfd = fd;
		callback(err, image, obj);
		F.cleanup(stream);

	}, true);

	return self;
};

FP.http = function(ctrl, opt) {

	var self = this;

	if (F.temporary.notfound[ctrl.uri.key]) {
		ctrl.fallback(404);
		return;
	}

	var id = opt.id || '';

	self.readmeta(id, function(err, obj, filename, fd) {

		fd && F.Fs.close(fd, NOOP);

		if (err || (obj.expire && obj.expire < NOW) || (opt.check && opt.check(obj) == false)) {
			F.temporary.notfound[ctrl.uri.key] = true;
			ctrl.fallback(404);
			return;
		}

		F.stats.performance.open++;

		var date = obj.date ? obj.date.toUTCString() : '';
		var response = ctrl.response;

		if (!opt.download && date && ctrl.notmodified(date))
			return;

		// Resized image?
		if (!DEBUG && F.temporary.path[ctrl.uri.key]) {
			ctrl.resume();
			return;
		}

		F.stats.performance.open++;

		if (opt.download) {
			response.headers['content-disposition'] = 'attachment; filename*=utf-8\'\'' + encodeURIComponent(opt.download === true ? obj.name : typeof(opt.download) === 'function' ? opt.download(obj.name, obj.type) : opt.download);
		} else
			response.headers['last-modified'] = date;

		if (obj.width && obj.height) {
			response.headers['x-width'] = obj.width;
			response.headers['x-height'] = obj.height;
		}

		response.headers['x-size'] = obj.size;

		if (opt.image) {
			/*
			res.opt.stream = { filename: filename, start: HEADERSIZE, custom: true };
			res.opt.make = opt.make;
			res.opt.cache = opt.cache !== false;
			res.opt.persistent = false;
			res.$image();
			*/
		} else {

			var range = ctrl.headers.range;
			if (range) {

				var arr = range.replace(REG_RANGE, '').split('-');
				var beg = (arr[0] ? +arr[0] : 0);
				var end = (arr[1] ? +arr[1] : 0);

				if (isNaN(beg) || isNaN(end)) {
					ctrl.fallback(404);
					return;
				}

				if (end <= 0)
					end = beg + ((1024 * 1024) * 5); // 5 MB

				if (beg > end) {
					beg = 0;
					end = obj.size - 1;
				}

				if (end > obj.size)
					end = obj.size - 1;

				if (beg >= end || beg < 0) {
					ctrl.fallback(404);
					return;
				}

				var length = (end - beg) + 1;

				response.status = 206;
				response.headers['accept-ranges'] = 'bytes';

				if (!opt.download && !DEBUG && date)
					ctrl.httpcache(date);

				response.headers['content-length'] = length;
				response.headers['content-range'] = 'bytes ' + beg + '-' + end + '/' + obj.size;
				response.headers['content-type'] = obj.type;

				if (F.config.$xpoweredby)
					response.headers['x-powered-by'] = F.config.$xpoweredby;

				ctrl.res.writeHead(response.status, response.headers);
				F.Fs.createReadStream(filename, { flags: 'r', mode: '0666', autoClose: true, start: HEADERSIZE + beg, end: end + HEADERSIZE }).pipe(ctrl.res);

			} else {
				var stream = F.Fs.createReadStream(filename, { start: HEADERSIZE });

				if (!opt.download && !DEBUG && date)
					ctrl.httpcache(date);

				ctrl.stream(obj.type, stream);
			}
		}

	}, true);
};

FP.readbase64 = function(id, callback) {
	var self = this;
	if (callback)
		return self._readbase64(id, callback);
	else
		return new Promise((resolve, reject) => self._readbase64(id, (err, res) => err ? reject(err) : resolve(res)));
};

FP._readbase64 = function(id, callback) {
	var self = this;
	self._readbuffer(id, (err, buffer, meta) => callback(err, buffer ? buffer.toString('base64') : null, meta));
	return self;
};

exports.create = function(name, directory) {
	if (!directory)
		directory = F.path.databases('fs-' + name + '/');
	return new FileStorage(name, directory);
};