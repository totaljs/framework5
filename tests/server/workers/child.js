require('../../../index');
require('../../../test');
var worker = NEWTHREAD();

var opt = worker.data;
F.http(opt);

ROUTE('GET /exit/', $ => success());

ON('ready', function() {
    console.log('FROM child process: ', worker.data);
    worker.postMessage({ ready: true });
});