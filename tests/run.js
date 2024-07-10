require('../index');

var tests = [];

// tests.push('bundles/index.js');
//tests.push('common/cron.js');
tests.push('common/utils.js');
tests.push('common/htmlparser.js');
//tests.push('minificators/index.js');
tests.push('nosql/index.js');
tests.push('proxy/index.js');
tests.push('routing/index.js');
tests.push('schemas/index.js');
tests.push('server/index.js');
tests.push('staticfiles/index.js');

console.log('==========================================');
console.log('Total.js v5 unit tests');
console.log('==========================================');
console.log('');
console.time('DONE');

tests.wait(function(filename, next) {

	var key = '----> ' + filename;
	console.time(key);

	var path = Total.Path.join(process.mainModule.path, Total.Path.dirname(filename));
	var scr = Total.Path.basename(filename);
	SHELL('node ' + scr, function(err) {
		if (err)
			throw new Error(filename + ': ' + err.toString());
		console.timeEnd(key);
		next();
	}, path);
}, function() {
	console.log('');
	console.timeEnd('DONE');
});