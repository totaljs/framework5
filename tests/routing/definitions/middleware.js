MIDDLEWARE('middlewaresuccess', ($, next) => next());
MIDDLEWARE('middlewareinvalid', ($, next) => $.invalid(400));
MIDDLEWARE('middlewaresocket', ($, next) => {
    EMIT('middlewaresocket_close', { command: 'close' });
    next();
});
// F.use('middlewarefuse', '/middleware/fuse');
// @TODO: F.use is not a function
// var timeout_fail = setTimeout(() => 'Middleware not emitted', 1000);
// ON('fuse', () => clearTimeout(timeout_fail));







