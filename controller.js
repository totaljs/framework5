// Total.js Controller
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const REG_FILETMP = /\//g;
const REG_RANGE = /bytes=/;
const REG_ROBOT = /search|agent|bot|crawler|spider/i;
const REG_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;
const REG_ENCODINGCLEANER = /[;\s]charset=utf-8/g;

const CHECK_DATA = { POST: 1, PUT: 1, PATCH: 1, DELETE: 1 };
const CHECK_COMPRESSION = { 'text/plain': true, 'text/javascript': true, 'text/css': true, 'text/jsx': true, 'application/javascript': true, 'application/x-javascript': true, 'application/json': true, 'application/xml': true, 'text/xml': true, 'image/svg+xml': true, 'text/x-markdown': true, 'text/html': true };
const CHECK_CHARSET =  { 'text/plain': true, 'text/javascript': true, 'text/css': true, 'text/jsx': true, 'application/javascript': true, 'application/x-javascript': true, 'application/json': true, 'text/xml': true, 'text/x-markdown': true, 'text/html': true };
const CHECK_NOCACHE = { zip: 1, rar: 1 };

const GZIP_FILE = { memLevel: 9 };
const GZIP_STREAM = { memLevel: 1 };

const NOCACHE = 'private, no-cache, no-store, max-age=0';

function Controller(req, res) {

	var ctrl = this;

	req.controller = ctrl;

	ctrl.req = req;
	ctrl.res = res;
	ctrl.method = ctrl.req.method;
	ctrl.route = null;
	ctrl.uri = F.TUtils.parseURI2(req.url);
	ctrl.isfile = ctrl.uri.file;
	ctrl.language = '';
	ctrl.headers = req.headers;
	ctrl.ext = ctrl.uri.ext;
	ctrl.split = ctrl.uri.split;
	ctrl.split2 = [];
	ctrl.url = ctrl.uri.key;
	ctrl.released = false;
	ctrl.downloaded = false;
	ctrl.protocol = req.connection.encrypted || (req.headers['x-forwarded-protocol'] || req.headers['x-forwarded-proto']) === 'https' ? 'https' : 'http';

	for (let path of ctrl.split)
		ctrl.split2.push(path.toLowerCase());

	ctrl.params = {};
	ctrl.query = ctrl.uri.search.parseEncoded();
	ctrl.files = [];
	ctrl.body = {};

	if (ctrl.isfile)
		F.stats.performance.file++;
	else
		F.stats.performance.request++;

	// ctrl.payload = null;
	// ctrl.payloadsize = 0;
	// ctrl.user = null;
	ctrl.datatype = ''; // json|xml|multipart|urlencoded

	ctrl.response = {
		status: 200,
		cache: global.DEBUG != true,
		minify: true,
		// minifyjson: false
		// encrypt: false
		headers: {}
	};

	if (CHECK_DATA[ctrl.method]) {

		if (ctrl.isfile) {
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
		let ua = this.headers['user-agent'];
		return ua ? REG_MOBILE.test(ua) : false;
	},

	get robot() {
		let ua = this.headers['user-agent'];
		return ua ? REG_ROBOT.test(ua) : false;
	},

	get xhr() {
		return this.headers['x-requested-with'] === 'XMLHttpRequest';
	},

	get extension() {
		return this.ext;
	},

	get ua() {
		if (this.$ua != null)
			return this.$ua;
		let ua = this.headers['user-agent'];
		this.$ua = ua ? ua.parseUA() : '';
		return this.$ua;
	},

	get ip() {

		if (this.$ip != null)
			return this.$ip;

		// x-forwarded-for: client, proxy1, proxy2, ...
		let proxy = this.headers['x-forwarded-for'];
		if (proxy)
			this.$ip = proxy.split(',', 1)[0] || this.req.connection.remoteAddress;
		else if (!this.$ip)
			this.$ip = this.req.connection.remoteAddress;

		return this.$ip;
	},

	get referrer() {
		return this.headers.referer;
	},

	get host() {
		return this.headers.host;
	}

};

Controller.prototype.callback = function(err, value) {

	var ctrl = this;

	if (arguments.length == 0) {
		return function(err, response) {
			if (err)
				ctrl.invalid(err);
			else
				ctrl.json(response);
		};
	}

	if (err)
		ctrl.invalid(err);
	else {
		if (value === undefined)
			ctrl.success();
		else
			ctrl.json(value);
	}

};

Controller.prototype.csrf = function() {
	return F.def.onCSRFcreate(this);
};

Controller.prototype.redirect = function(value, permanent) {
	var ctrl = this;

	if (ctrl.destroyed)
		return;

	ctrl.response.headers.Location = value;
	ctrl.response.status = permanent ? 301 : 302;
	ctrl.flush();
	F.stats.response.redirect++;
};

Controller.prototype.html = function(value) {
	var ctrl = this;

	if (ctrl.destroyed)
		return;

	ctrl.response.headers['content-type'] = 'text/html';

	if (value != null)
		ctrl.response.value = ctrl.response.minify && F.config.$minifyhtml ? F.TMinificators.html(value) : value;

	ctrl.flush();
	F.stats.response.html++;
};

Controller.prototype.text = Controller.prototype.plain = function(value) {
	var ctrl = this;

	if (ctrl.destroyed)
		return;

	ctrl.response.headers['content-type'] = 'text/plain';

	if (value != null)
		ctrl.response.value = value;

	ctrl.flush();
	F.stats.response.text++;
};

Controller.prototype.json = function(value, beautify, replacer) {
	var ctrl = this;

	if (ctrl.destroyed)
		return;

	var response = ctrl.response;
	response.headers['content-type'] = 'application/json';
	response.headers['cache-control'] = NOCACHE;
	response.headers.vary = 'Accept-Encoding, Last-Modified, User-Agent';
	response.headers.expires = '-1';
	response.value = JSON.stringify(value, beautify ? '\t' : null, replacer);
	ctrl.flush();
	F.stats.response.json++;
};

Controller.prototype.jsonstring = function(value) {
	var ctrl = this;

	if (ctrl.destroyed)
		return;

	var response = ctrl.response;
	response.headers['content-type'] = 'application/json';
	response.headers['cache-control'] = NOCACHE;
	response.headers.vary = 'Accept-Encoding, Last-Modified, User-Agent';
	response.headers.expires = '-1';
	response.value = value;
	response.type = 'json';
	ctrl.flush();
	F.stats.response.json++;
};

Controller.prototype.empty = function() {
	var ctrl = this;

	if (ctrl.destroyed)
		return;

	ctrl.response.status = 204;
	ctrl.flush();
	F.stats.response.empty++;
};

Controller.prototype.invalid = function(value) {

	var ctrl = this;

	if (ctrl.destroyed)
		return;

	var response = ctrl.response;
	var err;

	if (value instanceof F.TBuilders.ErrorBuilder) {
		err = value;
	} else {
		err = new F.TBuilders.ErrorBuilder();
		err.push(value);
	}

	response.headers['content-type'] = 'application/json';
	response.headers['cache-control'] = NOCACHE;
	response.headers.vary = 'Accept-Encoding, Last-Modified, User-Agent';
	response.value = JSON.stringify(err.output(ctrl.language));
	response.status = err.status === 408 ? 503 : err.status;
	ctrl.flush();

	var key = 'error' + err.status;

	if (F.stats.response[key] != null)
		F.stats.response[key]++;
};

Controller.prototype.flush = function() {

	var ctrl = this;

	if (ctrl.destroyed)
		return;

	let accept = ctrl.headers['accept-encoding'];
	let response = ctrl.response;
	let buffer = response.value ? response.value instanceof Buffer ? response.value : Buffer.from(response.value, 'utf8') : null;
	let type = response.headers['content-type'];

	if (F.config.$xpoweredby)
		response.headers['x-powered-by'] = F.config.$xpoweredby;

	// GZIP compression
	if (F.config.$httpcompress && buffer && accept && buffer.length > 256 && accept.indexOf('gzip') !== -1) {
		if (CHECK_COMPRESSION[type]) {

			if (CHECK_CHARSET[type])
				response.headers['content-type'] += '; charset=utf-8';

			F.Zlib.gzip(buffer, function(err, buffer) {
				if (err) {
					ctrl.fallback(400, err.toString());
				} else {
					response.headers['content-encoding'] = 'gzip';
					ctrl.res.writeHead(response.status, response.headers);
					ctrl.res.end(buffer, 'utf8');
					ctrl.free();
					F.stats.performance.upload += buffer.length / 1024 / 1024;
				}
			});
			return;
		}
	}

	if (CHECK_CHARSET[type])
		response.headers['content-type'] += '; charset=utf-8';

	ctrl.res.writeHead(response.status, response.headers);
	ctrl.res.end(buffer);
	ctrl.free();
};

Controller.prototype.fallback = function(code, err) {
	var ctrl = this;

	if (ctrl.destroyed)
		return;

	let key = code + '';
	var route = F.routes.fallback[key];
	if (route) {
		ctrl.route = route;
		ctrl.route.action(ctrl);
	} else {

		var view;

		if (ctrl.xhr) {
			if (code === 999)
				code = 503;
			ctrl.invalid(code);
			return;
		}

		// Paused
		if (code === 999) {
			view = F.temporary.views.$pause;
			ctrl.response.status = 503;
			if (!view) {
				F.temporary.views.$pause = view = new F.TViewEngine.View();
				view.compiled = F.TViewEngine.compile('$pause', F.Fs.readFileSync(F.Path.join(F.config.$nodemodules, 'total5/pause.html'), 'utf8'), false);
			}
			view.model = F.paused;
		} else {
			ctrl.response.status = code === 408 ? 503 : code;
			view = F.temporary.views.$error;
			if (!view) {
				F.temporary.views.$error = view = new F.TViewEngine.View();
				view.compiled = F.TViewEngine.compile('$error', F.Fs.readFileSync(F.Path.join(F.config.$nodemodules, 'total5/error.html'), 'utf8'), false);
			}
			view.model = { code: code, status: F.TUtils.httpstatus(code), error: err ? (DEBUG ? err.toString() : '') : '' };
		}

		ctrl.html(view.compiled(view));
	}
};

Controller.prototype.view = function(name, model) {

	var ctrl = this;

	if (ctrl.destroyed)
		return;

	var view = new F.TViewEngine.View(ctrl);
	var output = view.render(name, model);
	ctrl.html(output);
};

Controller.prototype.file = function(path, download) {

	var ctrl = this;

	if (ctrl.destroyed)
		return;

	var response = ctrl.response;

	if (download) {
		if (typeof(download) !== 'string')
			download = F.TUtils.getName(path);
		response.headers['content-disposition'] = 'attachment; filename*=utf-8\'\'' + encodeURIComponent(download);
	}

	var ext = F.TUtils.getExtension(path);

	if (ext === 'js') {
		if (response.minify)
			response.minify = F.config.$minifyjs;
	} else if (ext === 'css') {
		if (response.minify)
			response.minify = F.config.$minifycss;
	} else if (ext === 'html') {
		if (response.minify)
			response.minify = F.config.$minifyhtml;
	}

	if (response.minify) {
		switch (ext) {
			case 'js':
				send_js(ctrl, path);
				break;
			case 'css':
				send_css(ctrl, path);
				break;
			case 'html':
				send_html(ctrl, path);
				break;
			default:
				send_file(ctrl, path, ext);
				break;
		}
	} else
		send_file(ctrl, path, ext);

	F.stats.response.file++;
};

Controller.prototype.stream = function(type, stream, download) {

	var ctrl = this;

	if (ctrl.destroyed)
		return;

	var response = ctrl.response;

	if (download && typeof(download) === 'string')
		response.headers['content-disposition'] = 'attachment; filename*=utf-8\'\'' + encodeURIComponent(download);

	var accept = ctrl.headers['accept-encoding'];
	var compress = F.config.$httpcompress && accept && CHECK_COMPRESSION[type] && accept.indexOf('gzip') !== -1;

	if (response.headers.expires)
		delete response.headers.expires;

	response.headers.etag = '858' + F.config.$httpetag;

	if (CHECK_CHARSET[type])
		type += '; charset=utf-8';

	response.headers['content-type'] = type;

	if (compress)
		response.headers['content-encoding'] = 'gzip';

	ctrl.res.writeHead(response.status, response.headers);

	if (compress)
		stream.pipe(F.Zlib.createGzip(GZIP_STREAM)).pipe(ctrl.res);
	else
		stream.pipe(ctrl.res);

	F.stats.response.stream++;
};

Controller.prototype.filefs = function(name, id, download, checkmeta) {

	var ctrl = this;

	if (ctrl.destroyed)
		return;

	var opt = {};

	opt.id = id;
	opt.download = download;
	opt.check = checkmeta;

	F.filestorage(name).http(ctrl, opt);
};

Controller.prototype.binary = function(buffer, type, download) {

	var ctrl = this;

	if (ctrl.destroyed)
		return;

	var response = ctrl.response;

	response.headers['content-type'] = type;
	response.type = 'binary';

	if (typeof(download) === 'string')
		response.headers['content-disposition'] = 'attachment; filename*=utf-8\'\'' + encodeURIComponent(download);

	response.value = buffer;
	ctrl.flush();

	F.stats.response.binary++;
};

Controller.prototype.proxy = function(opt) {

	var ctrl = this;

	if (ctrl.destroyed)
		return;

	if (typeof(opt) === 'string')
		opt = { url: opt };

	if (!opt.headers)
		opt.headers = {};

	if (!opt.method)
		opt.method = ctrl.method;

	opt.resolve = true;
	opt.encoding = 'binary';
	opt.body = ctrl.payload;

	var tmp;

	if (opt.url.indexOf('?') === -1) {
		tmp = F.TUtils.toURLEncode(ctrl.query);
		if (tmp)
			opt.url += '?' + tmp;
	}

	for (let key in ctrl.headers) {
		switch (key) {
			case 'x-forwarded-for':
			case 'x-forwarded-protocol':
			case 'x-forwarded-proto':
			case 'x-nginx-proxy':
			case 'connection':
			case 'host':
			case 'accept-encoding':
				break;
			default:
				opt.headers[key] = ctrl.headers[key];
				break;
		}
	}

	if (!opt.timeout)
		opt.timeout = 10000;

	var prepare = opt.callback;

	opt.callback = function(err, response) {

		prepare && prepare(err, response);

		if (err) {
			ctrl.invalid(err);
			return;
		}

		ctrl.response.status = response.status;
		ctrl.binary(response.body, (response.headers['content-type'] || 'text/plain').replace(REG_ENCODINGCLEANER, ''));
	};

	REQUEST(opt);

};

Controller.prototype.done = function(arg) {
	var ctrl = this;
	return function(err, response) {
		if (err)
			ctrl.invalid(err);
		else
			ctrl.json(DEF.onSuccess(arg === true ? response : arg));
	};
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

Controller.prototype.cookie = function(name, value, expires, options) {

	var ctrl = this;
	var arr;

	if (value === undefined) {

		if (ctrl.cookies)
			return F.TUtils.decodeURIComponent(ctrl.cookies[name] || '');

		var cookie = ctrl.headers.cookie;
		if (!cookie) {
			ctrl.cookies = F.EMPTYOBJECT;
			return '';
		}

		ctrl.cookies = {};

		arr = cookie.split(';');
		for (let i = 0; i < arr.length; i++) {
			let line = arr[i].trim();
			let index = line.indexOf('=');
			if (index !== -1)
				ctrl.cookies[line.substring(0, index)] = line.substring(index + 1);
		}

		return name ? F.TUtils.decodeURIComponent(ctrl.cookies[name] || '') : '';
	}

	var cookiename = name + '=';
	var builder = [cookiename + value];
	var type = typeof(expires);

	if (expires && type === 'object') {
		options = expires;
		expires = options.expires || options.expire || null;
	}

	if (type === 'string')
		expires = expires.parseDateExpiration();

	if (!options)
		options = {};

	if (!options.path)
		options.path = '/';

	expires && builder.push('Expires=' + expires.toUTCString());
	options.domain && builder.push('Domain=' + options.domain);
	options.path && builder.push('Path=' + options.path);

	if (options.secure == true || (options.secure == null && F.config.$cookiesecure))
		builder.push('Secure');

	if (options.httpOnly || options.httponly || options.HttpOnly)
		builder.push('HttpOnly');

	var same = options.security || options.samesite || F.config.$cookiesamesite;

	switch (same) {
		case 1:
			same = 'Lax';
			break;
		case 2:
			same = 'Strict';
			break;
	}

	builder.push('SameSite=' + same);

	arr = ctrl.response.headers['set-cookie'] || [];

	// Cookie, already, can be in array, resulting in duplicate 'set-cookie' header
	if (arr.length) {
		var l = cookiename.length;
		for (let i = 0; i < arr.length; i++) {
			if (arr[i].substring(0, l) === cookiename) {
				arr.splice(i, 1);
				break;
			}
		}
	}

	arr.push(builder.join('; '));
	ctrl.response.headers['set-cookie'] = arr;

	return ctrl;
};

Controller.prototype.custom = function() {
	this.destroyed = true;
};

Controller.prototype.autoclear = function(value) {
	this.preventclearfiles = value === false;
};

Controller.prototype.resume = function() {

	var ctrl = this;

	if (ctrl.isfile) {

		var path = ctrl.uri.key;
		if (path[1] === '_') {

			let tmp = path.substring(1);
			let index = tmp.indexOf('/', 1);
			if (index === -1) {
				ctrl.fallback(404);
				return;
			}

			path = F.path.root('plugins/' + tmp.substring(1, index) + '/public/' + tmp.substring(index + 1));
		} else
			path = F.path.public(path.substring(1));

		switch (ctrl.ext) {
			case 'js':
				send_js(ctrl, path);
				break;
			case 'css':
				send_css(ctrl, path);
				break;
			case 'html':
				send_html(ctrl, path);
				break;
			default:
				send_file(ctrl, path, ctrl.ext);
				break;
		}

	} else
		ctrl.fallback(404);
};

Controller.prototype.free = function() {

	var ctrl = this;

	if (ctrl.released)
		return;

	ctrl.released = true;
	ctrl.destroyed = true;
	ctrl.payload = null;

	// Potential problem
	// ctrl.body = null;
	// ctrl.params = null;
	// ctrl.query = null;

	if (ctrl.preventclearfiles != true)
		ctrl.clear();

	// Clear resources
	ctrl.req.controller = null;

};

Controller.prototype.hostname = function(path) {
	var ctrl = this;
	return ctrl.protocol + '://' + ctrl.headers.host + (path ? path : '');
};

Controller.prototype.$route = function() {

	var ctrl = this;
	if (ctrl.isfile) {

		if (F.routes.files.length) {
			let route = F.TRouting.lookupfile(ctrl);
			if (route) {
				ctrl.route = route;
				if (route.middleware.length)
					middleware(ctrl);
				else
					route.action(ctrl);
				return;
			}
		}

		if (F.config.$httpfiles[ctrl.ext])
			ctrl.resume();
		else
			ctrl.fallback(404);

		return;
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
			ctrl.toolarge = false;
			ctrl.downloaded = false;

			ctrl.req.on('data', function(chunk) {
				ctrl.payloadsize += chunk.length;
				if ((ctrl.payloadsize / 1024) > ctrl.route.size) {
					if (!ctrl.toolarge) {
						ctrl.toolarge = true;
						delete ctrl.payload;
					}
				} else
					ctrl.payload.push(chunk);
			});

			ctrl.req.on('abort', () => ctrl.free());
			ctrl.req.on('end', function() {

				ctrl.downloaded = true;

				if (ctrl.toolarge) {
					ctrl.fallback(431);
					return;
				}

				ctrl.payload = Buffer.concat(ctrl.payload);
				F.stats.performance.download += ctrl.payload.length / 1024 / 1024;

				switch (ctrl.datatype) {
					case 'json':
						ctrl.body = F.def.parsers.json(ctrl.payload.toString('utf8'));
						break;
					case 'urlencoded':
						ctrl.body = F.def.parsers.urlencoded(ctrl.payload.toString('utf8'));
						break;
				}

				authorize(ctrl);
			});

		} else
			authorize(ctrl);

	} else
		ctrl.fallback(404);

};

function readfile(filename, callback) {
	F.stats.performance.open++;
	F.Fs.lstat(filename, function(err, stats) {

		if (err) {
			callback(err);
			return;
		}

		F.stats.performance.open++;
		F.Fs.readFile(filename, 'utf8', function(err, text) {
			if (err) {
				callback(err);
			} else {
				let obj = {};
				obj.date = stats.mtime.toUTCString();
				obj.body = text.ROOT();
				callback(null, obj);
			}
		});
	});
}

Controller.prototype.notmodified = function(date) {
	var ctrl = this;
	if (ctrl.headers['if-modified-since'] === date) {
		ctrl.response.status = 304;
		ctrl.response.headers['cache-control'] = 'public, must-revalidate, max-age=' + F.config.$httpmaxage; // 5 min.
		ctrl.response.headers['last-modified'] = date;
		ctrl.flush();
		F.stats.response.notmodified++;
		return true;
	}
};

Controller.prototype.httpcache = function(date) {
	var ctrl = this;

	if (date instanceof Date)
		date = date.toUTCString();

	if (!ctrl.response.headers.expires)
		ctrl.response.headers.expires = F.config.$httpexpire;

	if (!ctrl.response.headers['cache-control'])
		ctrl.response.headers['cache-control'] = 'public, must-revalidate, max-age=' + F.config.$httpmaxage; // 5 minute cache for revalidate (304)

	ctrl.response.headers['last-modified'] = date;
	ctrl.response.headers.etag = '858' + F.config.$httpetag;
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
	var parser = F.TUtils.multipartparser(boundary, ctrl.req, function(err, meta) {

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

	parser.skipcheck = !F.config.$httpchecktypes;
	parser.limits.total = ctrl.route.size * 1024; // to bytes
}

function authorize(ctrl) {
	if (F.def.onAuthorize) {
		var opt = new F.TBuilders.Options(ctrl);
		opt.TYPE = 'auth'; // important
		opt.query = ctrl.query;
		opt.next = opt.callback;
		opt.$callback = function(err, user) {
			let auth = user ? 1 : 2;
			ctrl.user = user;
			if (ctrl.route.auth === auth) {
				execute(ctrl);
			} else {
				ctrl.route = F.TRouting.lookup(ctrl, auth);
				if (ctrl.route)
					execute(ctrl);
				else
					ctrl.fallback(401);
			}
		};
		F.def.onAuthorize(opt);
	} else
		execute(ctrl);
}

function execute(ctrl) {

	ctrl.timeout = ctrl.route.timeout || F.config.$httptimeout;

	for (let param of ctrl.route.params) {
		let value = ctrl.split[param.index];
		ctrl.params[param.name] = value;
	}

	if (!ctrl.language && F.def.onLocalize)
		ctrl.language = F.def.onLocalize(ctrl);

	if (ctrl.route.middleware.length) {
		middleware(ctrl);
	} else {
		if (ctrl.route.api) {
			let body = ctrl.body;
			if (body && typeof(body) === 'object' && body.schema && typeof(body.schema) === 'string') {

				let index = body.schema.indexOf('?');
				let query = null;

				if (index !== -1) {
					query = body.schema.substring(index + 1);
					body.schema = body.schema.substring(0, index);
				}

				let schema = body.schema.split('/');
				let endpoint = ctrl.route.api[schema[0]];
				if (endpoint) {

					if ((endpoint.auth === 1 && ctrl.user == null) || (endpoint.auth === 2 && ctrl.user)) {
						ctrl.fallback(401);
						return;
					}

					let params = {};
					if (endpoint.params) {
						for (let m of endpoint.params)
							params[m.name] = schema[m.index] || '';
					}
					body = body.data;
					if (!body || typeof(body) === 'object') {
						ctrl.params = params;
						ctrl.query = query ? query.parseEncoded() : {};
						F.action(endpoint.actions, body || {}, ctrl).autorespond();
						return;
					}
				}
				ctrl.fallback(400, 'Invalid data');
			}
		} else {
			if (ctrl.route.actions) {
				F.action(ctrl.route.actions, ctrl.body, ctrl).autorespond();
			} else {
				if (ctrl.route.view) {
					ctrl.view(ctrl.route.view);
					return;
				}
				let action = ctrl.route.action;
				if (!action)
					action = auto_view;
				action(ctrl);
			}
		}
	}
}

function auto_view(ctrl) {
	ctrl.view(ctrl.split[0] || 'index');
}

function send_html(ctrl, path) {

	if (F.temporary.notfound[ctrl.uri.key]) {
		ctrl.fallback(404);
		return;
	}

	let filename = F.temporary.minified[ctrl.uri.key];
	if (filename) {
		send_file(ctrl, filename, 'html');
		return;
	}

	readfile(path, function(err, output) {

		if (err) {

			if (!DEBUG)
				F.temporary.notfound[ctrl.uri.key] = 1;

			ctrl.fallback(404);
			return;
		}

		if (!ctrl.language && F.def.onLocalize)
			ctrl.language = F.def.onLocalize(ctrl);

		output.body = F.translate(ctrl.language, output.body);

		if (ctrl.response.minify && F.config.$minifyhtml)
			output.body = F.TMinificators.html(output.body);

		if (DEBUG) {
			ctrl.response.headers['cache-control'] = NOCACHE;
			ctrl.response.headers['last-modified'] = output.date;
			ctrl.response.headers['content-type'] = 'text/html';
			ctrl.response.value = output.body;
			ctrl.flush();
		} else {
			let filename = F.path.tmp(F.clusterid + (ctrl.language ? (ctrl.language + '-') : '') + ctrl.uri.key.substring(1).replace(REG_FILETMP, '-') + '-min.html');
			F.Fs.writeFile(filename, output.body, function(err) {
				if (err) {
					F.temporary.notfound[ctrl.uri.key] = 1;
					ctrl.fallback(404, err.toString());
				} else {
					F.temporary.minified[ctrl.uri.key] = filename;
					send_file(ctrl, filename, 'html');
				}
			});
		}
	});
}

function send_css(ctrl, path) {

	if (F.temporary.notfound[ctrl.uri.key]) {
		ctrl.fallback(404);
		return;
	}

	let filename = F.temporary.minified[ctrl.uri.key];
	if (filename) {
		send_file(ctrl, filename, 'css');
		return;
	}

	readfile(path, function(err, output) {

		if (err) {

			if (!DEBUG)
				F.temporary.notfound[ctrl.uri.key] = 1;

			ctrl.fallback(404);
			return;
		}

		if (ctrl.response.minify && F.config.$minifycss)
			output.body = F.TMinificators.css(output.body);

		if (DEBUG) {
			ctrl.response.headers['cache-control'] = NOCACHE;
			ctrl.response.headers['last-modified'] = output.date;
			ctrl.response.headers['content-type'] = 'text/css';
			ctrl.response.value = output.body;
			ctrl.flush();
		} else {
			let filename = F.path.tmp(F.clusterid + ctrl.uri.key.substring(1).replace(REG_FILETMP, '-') + '-min.css');
			F.Fs.writeFile(filename, output.body, function(err) {
				if (err) {
					F.temporary.notfound[ctrl.uri.key] = 1;
					ctrl.fallback(404, err.toString());
				} else {
					F.temporary.minified[ctrl.uri.key] = filename;
					send_file(ctrl, filename, 'css');
				}
			});
		}
	});
}

function send_js(ctrl, path) {

	if (F.temporary.notfound[ctrl.uri.key]) {
		ctrl.fallback(404);
		return;
	}

	let filename = F.temporary.minified[ctrl.uri.key];
	if (filename) {
		send_file(ctrl, filename, 'js');
		return;
	}

	readfile(path, function(err, output) {

		if (err) {

			if (!DEBUG)
				F.temporary.notfound[ctrl.uri.key] = 1;

			ctrl.fallback(404);
			return;
		}

		if (ctrl.response.minify && F.config.$minifyjs)
			output.body = F.TMinificators.js(output.body);

		if (DEBUG) {
			ctrl.response.headers['cache-control'] = NOCACHE;
			ctrl.response.headers['last-modified'] = output.date;
			ctrl.response.headers['content-type'] = 'text/javascript';
			ctrl.response.value = output.body;
			ctrl.flush();
		} else {
			let filename = F.path.tmp(F.clusterid + ctrl.uri.key.substring(1).replace(REG_FILETMP, '-') + '-min.js');
			F.Fs.writeFile(filename, output.body, function(err) {
				if (err) {
					F.temporary.notfound[ctrl.uri.key] = 1;
					ctrl.fallback(404, err.toString());
				} else {
					F.temporary.minified[ctrl.uri.key] = filename;
					send_file(ctrl, filename, 'js');
				}
			});
		}
	});
}

function send_file(ctrl, path, ext) {

	// Check the file existence
	if (F.temporary.notfound[ctrl.uri.key]) {
		ctrl.fallback(404);
		return;
	}

	var cache = F.temporary.tmp[ctrl.uri.key];

	// HTTP Cache
	if (ctrl.response.cache && cache && ctrl.notmodified(cache.date))
		return;

	var accept = ctrl.headers['accept-encoding'];
	var type = F.TUtils.getContentType(ext);
	var compress = F.config.$httpcompress && accept && CHECK_COMPRESSION[type] && accept.indexOf('gzip') !== -1;
	var range = ctrl.headers.range;
	var httpcache = ctrl.response.cache && !CHECK_NOCACHE[ext] && F.config.$httpexpire;

	var loadstats = function(err, stats, cache) {

		if (err) {

			if (!DEBUG && ctrl.response.cache)
				F.temporary.notfound[ctrl.uri.key] = true;

			ctrl.fallback(404);
			return;
		}

		if (httpcache) {
			if (!ctrl.response.headers.expires)
				ctrl.response.headers.expires = F.config.$httpexpire;
			if (!ctrl.response.headers['cache-control'])
				ctrl.response.headers['cache-control'] = 'public, must-revalidate, max-age=' + F.config.$httpmaxage; // 5 minute cache for revalidate (304)
		} else if (ctrl.response.headers.expires)
			delete ctrl.response.headers.expires;

		if (!httpcache)
			ctrl.response.headers['cache-control'] = NOCACHE;

		if (!cache)
			cache = { date: stats.mtime.toUTCString(), size: stats.size };

		ctrl.response.headers['last-modified'] = cache.date;
		ctrl.response.headers.etag = '858' + F.config.$httpetag;

		var type = F.TUtils.contentTypes[ext] || F.TUtils.contentTypes.bin;

		if (CHECK_CHARSET[type])
			type += '; charset=utf-8';

		ctrl.response.headers['content-type'] = type;
		F.temporary.tmp[ctrl.uri.key] = cache;

		F.stats.performance.open++;

		var reader;

		if (range) {

			let size = range.replace(REG_RANGE, '').split('-');
			let beg = +size[0] || 0;
			let end = +size[1] || 0;

			if (end <= 0)
				end = beg + (1024 * F.config.$httprangebuffer); // 5 MB

			if (beg > end) {
				beg = 0;
				end = cache.size - 1;
			}

			if (end > cache.size)
				end = cache.size - 1;

			ctrl.response.headers['content-length'] = (end - beg) + 1;
			ctrl.response.headers['content-range'] = 'bytes ' + beg + '-' + end + '/' + cache.size;
			ctrl.res.writeHead(206, ctrl.response.headers);
			reader = F.Fs.createReadStream(path, { start: beg, end: end });
			reader.pipe(ctrl.res);
			F.stats.response.streaming++;

		} else {

			reader = F.Fs.createReadStream(path);

			if (compress)
				ctrl.response.headers['content-encoding'] = 'gzip';

			ctrl.res.writeHead(ctrl.response.status, ctrl.response.headers);

			if (compress)
				reader.pipe(F.Zlib.createGzip(GZIP_FILE)).pipe(ctrl.res);
			else
				reader.pipe(ctrl.res);

			F.stats.response.file++;
		}
	};

	if (cache) {
		loadstats(null, null, cache);
	} else {
		F.stats.performance.open++;
		F.Fs.lstat(path, loadstats);
	}
}

function middleware(ctrl) {
	var run = function(index) {
		var name = ctrl.route.middleware[index];
		if (name) {
			let fn = F.routes.middleware[name];
			if (fn)
				fn(ctrl, () => run(index + 1));
			else
				run(index + 1);
		} else
			ctrl.route.action(ctrl);
	};
	run(0);
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

HttpFile.prototype = {
	get extension() {
		return this.ext;
	},
	get isImage() {
		return this.type.indexOf('image/') !== -1;
	},
	get isVideo() {
		return this.type.indexOf('video/') !== -1;
	},
	get isAudio() {
		return this.type.indexOf('audio/') !== -1;
	}
};

HttpFile.prototype.rename = HttpFile.prototype.move = function(filename, callback) {
	var self = this;
	if (callback)
		return self.$move(filename, callback);
	else
		return new Promise((resolve, reject) => self.$move(filename, err => err ? reject(err) : resolve()));
};

HttpFile.prototype.$move = function(filename, callback) {
	var self = this;
	F.stats.performance.open++;
	F.Fs.rename(self.path, filename, function(err) {
		if (err && err.code === 'EXDEV') {
			F.stats.performance.open++;
			self.copy(filename, function(err){

				F.stats.performance.open++;
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
		F.stats.performance.open++;
		F.Fs.createReadStream(self.path).pipe(F.Fs.createWriteStream(filename));
		return;
	}

	F.stats.performance.open++;
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
	F.stats.performance.open++;
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
	F.stats.performance.open++;

	stream.on('data', buffer => md5.update(buffer));
	stream.on('error', function(error) {
		if (callback) {
			callback(error, null);
			callback = null;
		}
	});

	F.cleanup(stream, function() {
		if (callback) {
			callback(null, md5.digest('hex'));
			callback = null;
		}
	});

	return self;
};

HttpFile.prototype.stream = function(opt) {
	F.stats.performance.open++;
	return F.Fs.createReadStream(this.path, opt);
};

HttpFile.prototype.pipe = function(stream, opt) {
	F.stats.performance.open++;
	return F.Fs.createReadStream(this.path, opt).pipe(stream, opt);
};

HttpFile.prototype.image = function(shell) {
	return F.TImages.load(this.path, shell, this.width, this.height);
};

HttpFile.prototype.fs = function(storage, fileid, callback, custom, expire) {
	return F.filestorage(storage).save(fileid, this.filename, this.path, callback, custom, expire);
};

exports.Controller = Controller;
