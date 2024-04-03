var arr = [1, 2, 3, 4, 5, 6, 7, 8];

var html = `<p>
This is just a good job
</p>`;

arr.wait(function(item) {
    console.log(item);
}, function() {
    console.log(html);
});