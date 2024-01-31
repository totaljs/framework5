
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

if (!MAIN.items) 
    MAIN.items = items;


exports.install = function () {
    
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
}


