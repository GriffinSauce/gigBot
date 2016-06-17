var slackTokenEditable = false;

$(document).ready(function(){

    // Collapsing
    $('.gig').bind('click', function(e) {
        if($(e.target).closest('.btn, .modal').length === 0) {
            $(this).toggleClass('collapsed');
        }
    });

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
                var error = data && data.responseJSON && data.responseJSON.error;
                alert('Shit\'s broken yo, error: '+error);
            });
        }
    });

    // Request buttons
    $('.gig .btn-request').click(function(){
        var id = $(this).data('id');
        if(!id) {
            return alert('Shit\'s broken yo');
        }
        if(confirm('Ik ga alle leden vragen of ze kunnen, weet je het zeker?')) {
            $.ajax({
                url: '/gigs/'+id+'/request',
                method: 'POST'
            }).done(function(data){
                location.reload();
            }).fail(function(data){
                console.log(arguments);
                var error = data && data.responseJSON && data.responseJSON.error;
                alert('Shit\'s broken yo, error: '+error);
            });
        }
    });

    // Cancel request btns
    $('.gig .btn-request-cancel').click(function(){
        var id = $(this).data('id');
        if(!id) {
            return alert('Shit\'s broken yo');
        }
        if(confirm('Weet je het zeker?')) {
            $.ajax({
                url: '/gigs/'+id+'/request/cancel',
                method: 'DELETE'
            }).done(function(data){
                location.reload();
            }).fail(function(data){
                var error = data && data.responseJSON && data.responseJSON.error;
                alert('Shit\'s broken yo, error: '+error);
            });
        }
    });

    // Be annoying when user tries to edit system-critical settings
    $('input[name=slackToken]').click(function(e){
        if(slackTokenEditable) {
            return;
        }
        if(confirm("Weet je zeker dat je hiermee wilt kloten?")) {
            return slackTokenEditable = true;
        }
        return $(this).blur();
    });
});
