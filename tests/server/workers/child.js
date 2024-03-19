require('../../../index');
var worker = NEWTHREAD();

var opt = worker.data;
F.http(opt);

ROUTE('GET /exit/', function($) {
    $.success();
    setTimeout(function() {
        process.exit(0);
    }, 500);
});

ON('ready', function() {
    setTimeout(function() {
        worker.postMessage({ ready: true });
    }, 3000);
});