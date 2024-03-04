require('../../index');
require('../../test');

F.http();

if (!MAIN.client1)
    MAIN.client1 = {};


if (!MAIN.client2)
    MAIN.client2 = {};


ON('ready', function() {
    var url = 'ws://localhost:8000/$tms/?token=' + CONF.secret_tms;
    TMSCLIENT(url, function(err, client, meta) {
        console.log(err, client, meta);
        client.subscribe('users_create', function(data) {
            console.log('NEW USER');
        });
        MAIN.client1 = client;
    });

    TMSCLIENT(url, function(err, client, meta) {
        console.log(err, meta, client, meta);
        MAIN.client2 = client;
        console.log(err, meta);
    });
    Test.push('TMS - ', function(next) {
        MAIN.client2.publish('users_create', { name: 'Peter Sirka', email: 'petersirka@gmail.com' });
        next();
    });

    setTimeout(function() {
        Test.run(function() {
            console.log('DONE');
        });
    }, 2000);
});