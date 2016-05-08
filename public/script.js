$(document).ready(function(){

    // Textarea autosizing
    var textareas = $('textarea');
    autosize(textareas);
    textareas.on('focus', function(){
        autosize.update($(this));
    });

    // Datepicker
    $('.input-group.date').each(function(){
        var value = $(this).data('default');
        $(this).datetimepicker({
            allowInputToggle: true,
            format: 'D MMM YYYY',
            locale: 'nl_NL',
            defaultDate: value
        });
    });

    // Delete btns
    $('.gig .btn-delete').click(function(){
        var id = $(this).data('id');
        if(!id) {
            return alert('Shit\'s broken yo');
        }
        if(confirm('Weet je het zeker?')) {
            $.ajax({
                url: '/gigs/'+id,
                method: 'DELETE'
            }).done(function(data){
                location.reload();
            }).fail(function(data){
                alert('Shit\'s broken yo');
            });
        }
    });
});
