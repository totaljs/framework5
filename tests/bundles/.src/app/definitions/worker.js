var worker = NEWTHREAD();

ON('ready', function() {
    worker.postMessage('ready');
});