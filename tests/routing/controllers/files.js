exports.install = function () {
	ROUTE('FILE /downloads/*.html', testinfolder);
	ROUTE('FILE /*.md', testroot);
	ROUTE('FILE *.txt', testall);
}

function testinfolder($) {
	$.plain('testfolder');
}

function testroot($) {
	$.plain('testroot');
}

function testall($) {
	$.plain('testall');
}