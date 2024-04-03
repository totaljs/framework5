const REG_HTML_2 = /\s{2,}/g;
const REG_HTML_4 = /\n\s{2,}./g;
const REG_HTML_5 = />\n\s{1,}</g;


var arr = [1, 2, 3, 4, 5, 6, 7, 8];



arr.wait(function(item) {
    console.log(item);
}, function() {
    console.log(data);
});