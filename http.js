// Total.js HTTP Server handler
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const TController = require('./controller');

exports.listen = function(req, res) {

	// req.ip
	// req.headers
	// req.url
	// req.method
	// req.on('data', function(chunk))
	// req.destroy()

	// res.writeHead(status, headers)
	// res.pipe();
	// res.write();
	// res.end()

	// Not supported
	if (req.method === 'HEAD') {
		F.stats.request.blocked++;
		req.destroy();
		return;
	}

	var ctrl = new TController.Controller(req, res);

	if (F.paused.length) {
		ctrl.fallback(999);
		return;
	}

	if (F.config.$blacklist && F.config.$blacklist.indexOf(ctrl.ip) !== -1) {
		F.stats.request.blocked++;
		ctrl.fallback(400, 'IP address is blocked');
		return;
	}

	if (F.config.$httpreqlimit) {
		if (F.temporary.ddos[ctrl.ip] > F.config.$httpreqlimit) {
			F.stats.response.ddos++;
			ctrl.fallback(503);
			return;
		}
		if (F.temporary.ddos[ctrl.ip])
			F.temporary.ddos[ctrl.ip]++;
		else
			F.temporary.ddos[ctrl.ip] = 1;
	}

	if (F.routes.proxies.length && F.TRouting.lookupproxy(ctrl))
		return;

	if (F.routes.virtual[ctrl.url]) {
		F.routes.virtual[ctrl.url](ctrl);
		return;
	}

	// Pending requests
	F.temporary.pending.push(ctrl);

	if (ctrl.headers.origin && (F.def.onCORS || F.config.$cors)) {
		if (F.TRouting.lookupcors(ctrl))
			ctrl.$route();
	} else
		ctrl.$route();

	// stream.headers
	// stream.url

	// respond(opt);
	// opt.status = 200;
	// opt.headers = {};
	// opt.stream = '';
	// opt.end = '';

};