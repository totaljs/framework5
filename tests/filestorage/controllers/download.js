exports.install = function() {
	ROUTE('FILE /downloads/*.*', download);
};

function download(req, res) {
	var filename = req.split[1];
	var id = filename.substring(0, filename.lastIndexOf('.'));
	res.filefs(CONF.fs, id);
}