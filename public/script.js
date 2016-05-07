$(document).ready(function(){
    var textareas = $('textarea');
    autosize(textareas);
    textareas.on('focus', function(){
        autosize.update($(this));
    });
});
