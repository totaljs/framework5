exports.install = function() {
	ROUTE('FILE /downloads/*.*', download);
};

function download($) {
	var filename = $.split[1];
	var id = filename.substring(0, filename.lastIndexOf('.'));
	$.filefs(CONF.fs, id);
}