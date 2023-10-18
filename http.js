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

	// @TODO: check PAUSE()
	// @TODO: check blacklist
	// @TODO: check allow_reqlimit

	if (DEF.blacklist[req.ip]) {
		F.stats.request.blocked++;
		req.destroy();
		return;
	}

	var ctrl = new TController.Controller(req, res);

	// Pending requests
	if (!ctrl.uri.file)
		F.temporary.pending.push(ctrl);

	ctrl.$route();

	// stream.headers
	// stream.url

	// respond(opt);
	// opt.status = 200;
	// opt.headers = {};
	// opt.stream = '';
	// opt.end = '';

};
