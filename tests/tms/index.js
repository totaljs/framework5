require('../../index');
require('../../test');

F.http({ port: 8000, release: false });

NEWPUBLISH('users_create', 'name:String,email:Email');
NEWSUBSCRIBE('users_create', 'name:String,email:Email');
NEWCALL('to_slug', 'input:String', function (data, next) {
    next(null, { success: true, value: data.input.slug() });
});

ON('ready', function () {
    var token = 'u0eH4l6k2JmfVdn0kyGp05i989x4byJcqZa';
    var url = 'http://localhost:8000/$tms/';
    MAIN.client = TMSCLIENT(url, token);

    var value = { name: 'Peter Sirka', email: 'petersirka@gmail.com' };
    var response;

    Test.push('TMS - ', function (next) {
        var arr = [];

        arr.push(function (resume) {
            MAIN.client.subscribe('users_create', function (data) {
                Test.print('Subscribe test', JSON.stringify(data) === JSON.stringify(value) ? null : 'Expected ' + JSON.stringify(value));
                response = data;
            });
            setTimeout(resume, 1000);
        });

        arr.push(function (resume) {
            Test.print('Create client', MAIN.client ? null : 'Failed to create client');
            PUBLISH('users_create', value);
            setTimeout(resume, 1000);
        });

        arr.push(function (resume) {
            SUBSCRIBE('users_create', function (data) {
                Test.print('Subscribe test', JSON.stringify(data) === JSON.stringify(value) ? null : 'Expected ' + JSON.stringify(value));
                response = data;
            });

            Test.print('Subscribe', MAIN.client ? null : 'Client not found');
            setTimeout(() => resume(), 1000);
        });

        arr.push(function (resume) {
            Test.print('Publish', response && JSON.stringify(response) === JSON.stringify(value) ? null : 'Expected ' + JSON.stringify(value));
            resume();
        });

        arr.push(function (resume) {
            var correct = 'peter-sirka';
            MAIN.client.call('to_slug', { input: value.name }, function (err, response) {
                Test.print('Remote action Call', response && response.value === correct ? null : 'expected ' + correct);
                resume();
            });
        });

        arr.async(next);

    });

    setTimeout(function () {
        Test.run(function () {
            process.exit(0);
        });
    }, 5000);
});
