
var item = 'HELLO';
var item2 = 'hello2';
var item3 = 'hello3';
var items = [
    { url: `/${item}/`, res: item },
    { url: `/params/${item}/`, res: item },
    { url: `/params/alias/${item}/`, res: item },
    { url: `/params/is/inside/${item}/long/route/`, res: item },
    { url: `/params/is/inside/${item}/long/route/alias/`, res: item },
    { url: `/params/${item}/${item2}/${item3}/alias/`, res: item },
    { url: `/params/${item}/${item2}/${item3}/first`, res: item },
    { url: `/params/${item}/${item2}/${item3}/second/`, res: item2 },
    { url: `/params/${item}/${item2}/${item3}/third/`, res: item3 }
];
var methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];


if (!MAIN.items) 
    MAIN.items = items;

if (!MAIN.methods) 
    MAIN.methods = methods;

exports.install = function () {
    ROUTE('GET /not/existing/path', ($) => $.plain('ok'));
    ROUTE('GET /uPperCase/', ($) => $.success(true));
    ROUTE('GET /middleware/success/ #testmiddleware', ($) => $.success(true));
    ROUTE('GET /middleware/invalid/ #testmiddleware2', ($) => $.success(true));
    ROUTE('GET /schema/methods/validation/  --> Users/list')
    ROUTE('POST /schema/methods/validation/ -->  Users/insert')
    ROUTE('PATCH /schema/methods/validation/  --> Users/update')
    ROUTE('PUT /schema/methods/validation/ -->  Users/update')
    ROUTE('DELETE /schema/methods/validation/ -->  Users/delete')
    ROUTE('GET /xtoken/', $ => $.success($.headers['x-token']));
    ROUTE('GET /auth/', $ => $.success($.user && $.user.id));
    ROUTE('+GET /auth/authorized/', $ => $.user ? $.success($.user.id) : $.invalid());
    ROUTE('-GET /auth/unauthorized/', $ => $.user ? $.success() : $.invalid());

    ROUTE('GET /wildcards/*', $ => $.success());
    ROUTE('GET /wildcards/second/{id}/{page}/{slog}/*', $ => $.success());
    ROUTE('GET /wildcards/overide/overide/', $ => $.success());
    ROUTE('API /v1/ -api_basic --> Users/api_basic');
    ROUTE('API /v1/ +api_basic --> Users/validation');


    ROUTE('#400', $ => $.json({ status: 400, value: 'Bad request' }));
    ROUTE('#404', $ => $.json({ status: 404, value: 'Not found' }));
    ROUTE('#503', $ => $.json({ status: 503, value: 'Server error' }));
    ROUTE('#408', $ => $.json({ status: 408, value: 'Request Timeout' }));


    ROUTE('GET /internal/503/', $ => $.invalid(503))
    ROUTE('GET /internal/408/', $ => '');

    MAIN.items && MAIN.items.forEach(function (item) {
        ROUTE('GET ' + item.url, function ($) {
            $.plain(item.res);
        });
    });

    // Register methods
    MAIN.methods && MAIN.methods.forEach(function (method, next) {
        ROUTE(method + ' /methods/', function ($) {
            $.success(true);
        });
    });
}


