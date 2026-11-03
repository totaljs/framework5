Total.js framework 5
====================

[![Made in EU](https://cdn.componentator.com/eu-small.png)](https://european-union.europa.eu/)

- [Website](https://www.totaljs.com/)
- [__Documentation__](https://docs.totaljs.com/total5/)
- [Chat support](https://platform.totaljs.com/?open=messenger)
- [Join __Total.js Telegram__](https://t.me/totalplatform)
- [Support](https://www.totaljs.com/support/)

__Total.js framework v5__ is the framework for Node.js platform written in `pure` JavaScript similar to PHP's Laravel or Python's Django or ASP.NET MVC. It can be used as a web, desktop, service, or IoT application.

```bash
$ npm install total5
```

## Cancelling outgoing HTTP requests

`REQUEST(opt)` accepts an optional standard `AbortSignal` as `opt.signal`. `RESTBuilder` passes it through with the chainable `.signal(signal)` method:

```js
var controller = new AbortController();
var pending = REQUEST({ url: 'https://example.com/data', signal: controller.signal });

// Or use RESTBuilder:
var builder = RESTBuilder.GET('https://example.com/data').signal(controller.signal);
var response = builder.promise();

controller.abort();
```

Cancellation rejects a pending promise, or completes its callback once, with an error named `AbortError` and code `ABORT_ERR`. `error.cause` contains `signal.reason`. The existing callback/promise return values are unchanged. Configure the builder's signal before calling `.exec()`, `.promise()` or `.stream()`.

An already-aborted signal prevents network I/O. Cancelling during DNS resolution prevents a later connection; it does not claim to cancel the operating system's DNS operation. Cancellation closes the current request and its owned upload/download/decompression streams, including requests made after redirects and HTTPS proxy setup. Shared keep-alive agents are not destroyed. One signal can cancel several requests.

For `custom: true` / `.stream()`, the callback is delivered once when headers arrive. The signal stays active until that response stream ends or closes. Aborting after headers destroys the stream with `AbortError`; consume its error event as with other Node.js streams. It does not call the already-delivered callback a second time. Completing an ordinary response or closing a custom stream removes its abort listener. Existing `.timeout()` behavior is unchanged; use `AbortSignal.timeout(ms)` if an absolute deadline must also cover the response body.

Run the focused tests with `node --test tests/common/request-cancellation.js`, or use `npm test` to include them in the framework suite.

## Social networks

Please support the framework on social networks.

- [Follow Total.js on Gitter](https://gitter.im/totaljs/framework)
- [Follow Total.js on GitHub](https://github.com/totaljs)
- [Follow Total.js on Twitter - __@totalframework__](https://twitter.com/totalframework)
- [Follow Total.js on Facebook](https://www.facebook.com/totaljs.web.framework)
- [Follow Total.js on LinkedIn](https://www.linkedin.com/company/total-avengers/)

## Contact

- Contact <https://www.totaljs.com/contact/>
- [Chat support](https://platform.totaljs.com/?open=messenger)
- [Join to __Total.js Telegram__](https://t.me/totalplatform)
