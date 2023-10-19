// Total.js Controller
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

const REG_DOUBLESLASH = /\/{2}/g;
const CHECK_DATA = { POST: 1, PUT: 1, PATCH: 1, DELETE: 1 };

function parseURI(url) {

	let index = url.indexOf('?');
	let search = '';

	if (index !== -1) {
		search = url.substring(index);
		url = url.substring(0, index);
	}

	url = url.replace(REG_DOUBLESLASH, '');
	index = url.lastIndexOf('.', 10); // max. 10 chars for extension

	if (index == -1 && url[url.length - 1] !== '/')
		url += '/';

	let split = null;

	if (url === '/') {
		split = [];
	} else {
		if (index == -1)
			split = url.substring(1, url.length - 1).split('/');
		else
			split = url.split('/').slice(1);
	}

	return { pathname: url, search: search, file: index != -1, ext: index == -1 ? '' : url.substring(index + 1), split: split };
}

function Controller(req, res) {

	var ctrl = this;

	ctrl.req = req;
	ctrl.res = res;
	ctrl.method = ctrl.req.method;
	ctrl.route = null;
	ctrl.isfile = false;
	ctrl.uri = parseURI(req.url);
	ctrl.language = '';
	ctrl.headers = req.headers;
	ctrl.split = ctrl.uri.split;
	ctrl.split2 = [];
	ctrl.released = false;
	ctrl.downloaded = false;

	for (let path of ctrl.split)
		ctrl.split2.push(path.toLowerCase());

	ctrl.params = {};
	ctrl.query = {};
	ctrl.files = [];
	ctrl.body = {};

	// ctrl.payload = null;
	// ctrl.payloadsize = 0;
	// ctrl.user = null;
	ctrl.datatype = ''; // json|xml|multipart|urlencoded

	ctrl.response = {
		status: 200,
		headers: {}
	};

	if (CHECK_DATA[ctrl.method]) {

		if (ctrl.uri.file) {
			ctrl.destroyed = true;
			ctrl.req.destroy();
			return;
		}

		let type = ctrl.headers['content-type'] || '';
		let index = type.indexOf(';', 10);

		if (index != -1)
			type = type.substring(0, index);

		switch (type) {
			case 'application/json':
			case 'text/json':
				ctrl.datatype = 'json';
				break;
			case 'application/x-www-form-urlencoded':
				ctrl.datatype = 'urlencoded';
				break;
			case 'multipart/form-data':
				ctrl.datatype = 'multipart';
				break;
			case 'application/xml':
			case 'text/xml':
				ctrl.datatype = 'xml';
				break;
			case 'text/html':
			case 'text/plain':
				ctrl.datatype = 'text';
				break;
			default:
				ctrl.datatype = 'binary';
				break;
		}
	}
}

Controller.prototype = {

	get mobile() {
		return null;
	},

	get robot() {
		return null;
	},

	get ua() {
		return null;
	},

	get ip() {
		return null;
	},

	get referrer() {
		return null;
	},

	get buffer() {
		return null;
	}

};

Controller.prototype.csrf = function() {
	return DEF.onCSRFcreate(this);
};

Controller.prototype.redirect = function(value, permanent) {
	var ctrl = this;
	ctrl.response.headers.Location = value;
	ctrl.response.status = permanent ? 301 : 302;
	ctrl.flush();
	F.stats.response.redirect++;
};

Controller.prototype.html = function(value) {
	var ctrl = this;
	ctrl.response.headers['content-type'] = 'text/html; charset=utf-8';
	if (value != null)
		ctrl.response.value = value;
	ctrl.flush();
	F.stats.response.html++;
};

Controller.prototype.text = function(value) {
	var ctrl = this;
	ctrl.response.headers['content-type'] = 'text/plain; charset=utf-8';
	if (value != null)
		ctrl.response.value = value;
	ctrl.flush();
	F.stats.response.text++;
};

Controller.prototype.json = function(value, beautify, replacer) {
	var ctrl = this;
	ctrl.response.headers['content-type'] = 'application/json; charset=utf-8';
	ctrl.response.value = JSON.stringify(value, beautify ? '\t' : null, replacer);
	ctrl.flush();
	F.stats.response.json++;
};

Controller.prototype.jsonstring = function(value) {
	var ctrl = this;
	ctrl.response.headers['content-type'] = 'application/json; charset=utf-8';
	ctrl.response.value = value;
	ctrl.flush();
	F.stats.response.json++;
};

Controller.prototype.empty = function() {
	var ctrl = this;
	ctrl.response.status = 204;
	ctrl.flush();
	F.stats.response.empty++;
};

Controller.prototype.invalid = function(value) {
	var ctrl = this;
	var err = new F.TBuilders.ErrorBuilder();
	err.push(value);
	ctrl.response.headers['content-type'] = 'application/json; charset=utf-8';
	ctrl.response.value = JSON.stringify(err.output(ctrl.language));
	ctrl.response.status = err.status;
	ctrl.flush();
	var key = 'error' + err.status;
	if (F.stats.response[key] != null)
		F.stats.response[key]++;
};

Controller.prototype.flush = function() {
	var ctrl = this;
	if (!ctrl.destroyed) {
		var response = ctrl.response;
		ctrl.res.writeHead(response.status, response.headers);
		ctrl.res.end(response.value);
		ctrl.free();
	}
};

Controller.prototype.fallback = function(code, error) {
	var ctrl = this;
	ctrl.res.writeHead(code);
	ctrl.res.end();
};

Controller.prototype.view = function(value, model) {

};

Controller.prototype.file = function(path) {

};

Controller.prototype.stream = function(path) {

};

Controller.prototype.filefs = function(id) {

};

Controller.prototype.binary = function(buffer, type, download) {

	var ctrl = this;

	ctrl.response.headers['content-type'] = type;

	if (download)
		ctrl.response.headers['content-disposition'] = 'attachment; filename*=utf-8\'\'' + encodeURIComponent(download);

	ctrl.response.value = buffer;
	ctrl.flush();

	F.stats.response.binary++;
};

Controller.prototype.proxy = function() {

};

Controller.prototype.success = function(value) {
	F.TUtils.success.value = value;
	this.json(F.TUtils.success);
};

Controller.prototype.clear = function() {

	var ctrl = this;

	if (ctrl.files.length) {
		let remove = [];
		for (var file of ctrl.files) {
			if (file.removable)
				remove.push(file.path);
		}
		F.path.unlink(remove);
		ctrl.files.length = 0;
	}

};

Controller.prototype.autoclear = function(value) {
	this.preventclearfiles = value === false;
};

Controller.prototype.free = function() {

	var ctrl = this;

	if (ctrl.released)
		return;

	ctrl.released = true;

	if (ctrl.preventclearfiles != true)
		ctrl.clear();

	// Clear resources

};

Controller.prototype.$route = function() {

	var ctrl = this;

	if (ctrl.uri.file) {
		ctrl.fallback(404);
		return;
	}

	// Check CORS
	if (F.routing.cors.length) {
		if (!F.TRouting.cors(ctrl)) {
			ctrl.fallback(404);
			return;
		}
	}

	let route = F.TRouting.lookup(ctrl);
	if (route) {

		ctrl.route = route;

		// process data
		// call action

		if (ctrl.datatype === 'multipart') {
			multipart(ctrl);
		} else if (ctrl.datatype) {

			ctrl.payload = [];
			ctrl.payloadsize = 0;
			ctrl.downloaded = false;

			ctrl.req.on('data', function(chunk) {
				// @TODO: add a check of the body size
				ctrl.payloadsize += chunk.length;
				ctrl.payload.push(chunk);
			});

			ctrl.req.on('close', () => ctrl.free());
			ctrl.req.on('end', function() {

				ctrl.payload = Buffer.concat(ctrl.payload);

				switch (ctrl.datatype) {
					case 'json':
						ctrl.body = ctrl.payload.toString('utf8').parseJSON(true);
						break;
					case 'urlencoded':
						ctrl.body = ctrl.payload.toString('utf8').parseEncoded();
						break;
				}

				ctrl.downloaded = true;
				authorize(ctrl);
			});

		} else
			authorize(ctrl);

	} else
		ctrl.fallback(404);

};

function multipart(ctrl) {

	var type = ctrl.headers['content-type'];
	var index = type.indexOf('boundary=');
	if (index === -1) {
		ctrl.fallback(400);
		return;
	}

	var end = type.length;

	for (var i = (index + 10); i < end; i++) {
		if (type[i] === ';' || type[i] === ' ') {
			end = i;
			break;
		}
	}

	var boundary = type.substring(index + 9, end);
	var parser = U.multipartparser(boundary, ctrl, function(err, meta) {

		F.stats.performance.download += meta.size / 1024 / 1024;

		for (var i = 0; i < meta.files.length; i++) {

			var item = meta.files[i];
			var file = new HttpFile(item);

			// IE9 sends absolute filename
			var index = file.filename.lastIndexOf('\\');

			// For Unix like senders
			if (index === -1)
				index = file.filename.lastIndexOf('/');

			if (index !== -1)
				file.filename = file.filename.substring(index + 1);

			ctrl.files.push(file);
		}

		// Error
		if (err) {
			ctrl.clear();
			switch (err[0][0]) {
				case '4':
				case '5':
				case '6':
					ctrl.fallback(431, err[0]);
					break;
				default:
					ctrl.fallback(400, err[0]);
					break;
			}
		} else {
			ctrl.body = meta.body;
			authorize(ctrl);
		}
	});

	parser.skipcheck = !F.config.$uploadchecktypes;
	parser.limits.total = ctrl.route.size || F.config.$uploadsize;
}

function authorize(ctrl) {
	if (DEF.onAuthorize) {
		var opt = new F.TBuilders.AuthOptions(ctrl);
		opt.$callback = function(user) {
			let auth = user ? 1 : 2;
			ctrl.user = user;
			if (ctrl.route.auth !== auth) {
				ctrl.route = F.TRouting.lookup(ctrl, auth);
				if (ctrl.route)
					execute(ctrl.route);
				else
					ctrl.fallback(401);
			}
		};
		DEF.onAuthorize(opt);
	} else
		execute(ctrl);
}

function execute(ctrl) {

	ctrl.timeout = ctrl.route.timeout || 5;

	for (let param of ctrl.route.params) {
		let value = ctrl.split[param.index];
		ctrl.params[param.name] = value;
	}

	if (ctrl.route.action) {
		ctrl.route.action(ctrl);
	} else {
		// schema/actions?
		// ctrl.route.action(ctrl);
	}

}

function HttpFile(meta) {
	var self = this;
	self.path = meta.path;
	self.name = meta.name;
	self.filename = meta.filename;
	self.size = meta.size || 0;
	self.width = meta.width || 0;
	self.height = meta.height || 0;
	self.type = meta.type;
	self.removable = true;
}

HttpFile.prototype.rename = HttpFile.prototype.move = function(filename, callback) {
	var self = this;
	if (callback)
		return self.$move(filename, callback);
	else
		return new Promise((resolve, reject) => self.$move(filename, err => err ? reject(err) : resolve()));
};

HttpFile.prototype.$move = function(filename, callback) {
	var self = this;
	F.Fs.rename(self.path, filename, function(err) {
		if (err && err.code === 'EXDEV') {
			self.copy(filename, function(err){

				F.path.unlink(self.path, NOOP);

				if (!err) {
					self.path = filename;
					self.removable = false;
				}

				callback && callback(err);
			});
		} else {
			if (!err) {
				self.path = filename;
				self.rem = false;
			}
			callback && callback(err);
		}
	});
	return self;
};

HttpFile.prototype.copy = function(filename, callback) {
	var self = this;
	if (callback)
		return self.$copy(filename, callback);
	else
		return new Promise((resolve, reject) => self._copy(filename, err => err ? reject(err) : resolve()));
};

HttpFile.prototype.$copy = function(filename, callback) {

	var self = this;

	if (!callback) {
		F.Fs.createReadStream(self.path).pipe(F.Fs.createWriteStream(filename));
		return;
	}

	var reader = F.Fs.createReadStream(self.path);
	var writer = F.Fs.createWriteStream(filename);

	reader.on('close', callback);
	reader.pipe(writer);

	return self;
};

HttpFile.prototype.read = function(callback) {
	var self = this;
	if (callback)
		return self.$read(callback);
	else
		return new Promise((resolve, reject) => self.$read((err, res) => err ? reject(err) : resolve(res)));
};

HttpFile.prototype.$read = function(callback) {
	var self = this;
	F.Fs.readFile(self.path, callback);
	return self;
};

HttpFile.prototype.md5 = function(callback) {
	var self = this;
	if (callback)
		return self.$md5(callback);
	else
		return new Promise((resolve, reject) => self.$md5((err, res) => err ? reject(err) : resolve(res)));
};

HttpFile.prototype.$md5 = function(callback) {

	var self = this;
	var md5 = F.Crypto.createHash('md5');
	var stream = F.Fs.createReadStream(self.path);

	stream.on('data', (buffer) => md5.update(buffer));
	stream.on('error', function(error) {
		if (callback) {
			callback(error, null);
			callback = null;
		}
	});

	CLEANUP(stream, function() {
		if (callback) {
			callback(null, md5.digest('hex'));
			callback = null;
		}
	});

	return self;
};

HttpFile.prototype.stream = function(opt) {
	return F.Fs.createReadStream(this.path, opt);
};

HttpFile.prototype.pipe = function(stream, opt) {
	return F.Fs.createReadStream(this.path, opt).pipe(stream, opt);
};

HttpFile.prototype.isImage = function() {
	return this.type.indexOf('image/') !== -1;
};

HttpFile.prototype.isVideo = function() {
	return this.type.indexOf('video/') !== -1;
};

HttpFile.prototype.isAudio = function() {
	return this.type.indexOf('audio/') !== -1;
};

HttpFile.prototype.image = function(im) {
	if (im === undefined)
		im = F.config.default_image_converter === 'im';
	return F.TImage.init(this.path, im, this.width, this.height);
};

HttpFile.prototype.fs = function(storage, fileid, callback, custom, expire) {
	return FILESTORAGE(storage).save(fileid, this.filename, this.path, callback, custom, expire);
};

exports.Controller = Controller;
exports.HttpFile = HttpFile;