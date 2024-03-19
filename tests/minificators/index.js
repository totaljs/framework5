/* eslint-disable */

require('../../index');
require('../../test');

// .js
// .css
// .html
// with and without comments

Test.push('Minifactors', function(next) {
	// Test.print('String.slug()', [error]);
	var value, response, correct;

	var arr = [];

    arr.push(function(next_fn) {
        correct = 'var arr=[1,2,3,4,5,6,7,8];arr.wait(function(item){console.log(item)},function(){console.log(data)});';
        Total.Fs.readFile(PATH.public('script.js'), function(err, data) {
            if (data)
                value = data.toString();
            var response = U.minify_js(value);
            Test.print(' Minify - JS (without comments)', response !== null && response === correct ? null : 'Something went rong');
            next_fn();
        });
    });

    arr.push(function(next_fn) {
        correct = 'var arr=[1,2,3,4,5,6,7,8];arr.wait(function(item){console.log(item)},function(){console.log(data)});';
        Total.Fs.readFile(PATH.public('script2.js'), function(err, data) {
            if (data)
                value = data.toString();
            var response = U.minify_js(value);
            Test.print(' Minify - JS (with comments)', response !== null && response === correct ? null : 'Something went rong');
            next_fn();
        });
    });
    arr.push(function(next_fn) {
        correct = '.circle{width:40px;height:40px;border-radius:100%}';
        Total.Fs.readFile(PATH.public('style.css'), function(err, data) {
            if (data)
                value = data.toString();

            var response = U.minify_js(value);
            Test.print(' Minify - CSS (without comments)', response !== null && response === correct ? null : 'Something went rong');
            next_fn();
        });
    });

    arr.push(function(next_fn) {
        correct = '.circle{width:40px;height:40px;border-radius:100%}';
        Total.Fs.readFile(PATH.public('style2.css'), function(err, data) {
            if (data)
                value = data.toString();

            var response = U.minify_js(value);
            Test.print(' Minify - CSS (with comments)', response !== null && response === correct ? null : 'Something went rong');
            next_fn();
        });
    });


    arr.push(function(next_fn) {
        correct = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport"content="width=device-width, initial-scale=1.0"><title>Document</title></head><body></body></html>';
        Total.Fs.readFile(PATH.public('index.html'), function(err, data) {
            if (data)
                value = data.toString();

            var response = U.minify_js(value);
            Test.print(' Minify - HTML (without comments)', response !== null && response === correct ? null : 'Something went rong');
            next_fn();
        });
    });

    arr.push(function(next_fn) {
        correct = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport"content="width=device-width, initial-scale=1.0"><title>Document</title><!--this is a comment--></head><body><!--Now put whatever you want here--></body></html>';
        Total.Fs.readFile(PATH.public('index2.html'), function(err, data) {
            if (data)
                value = data.toString();

            var response = U.minify_js(value);
            Test.print(' Minify - HTML (with comments)', response !== null && response === correct ? null : 'Something went rong');
            next_fn();
        });
    });
    arr.async(function() {
        next();
    });
});

Test.run();