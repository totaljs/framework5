DEF.helpers.custom = function(str, num) {
    // this === controller
    return str + ' = ' + num;
};

DEF.helpers.isTrue = function(value) {
    return value ? true : false;
};
