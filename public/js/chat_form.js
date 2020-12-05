$(document).ready(() => {
    $('#send-button').prop('disabled', true);
    $('#message-container').scrollTop = $('#message-container').scrollHeight;
});

$('#message-input').on('keyup change', () => {
    if ($('#message-input').val()) {
        $('#send-button').prop('disabled', false);
    } else {
        $('#send-button').prop('disabled', true);
    }
});