/* VIEW TEMPLATES */
ips.templates.set('messages.view.placeholder', " \
<div class='ipsEmpty'>\
	<i class='fa-solid fa-inbox i-opacity_2'></i>\
	<p class='i-margin-top_1'>{{#lang}}no_message_selected{{/lang}}</p>\
</div>\
");

ips.templates.set('messages.main.folderMenu', "\
<li data-role='folderInMenu'><button type='button' data-ipsMenuValue='{{key}}'><span data-role='folderName'>{{name}}</span> <span class='ipsMenu_itemCount' data-role='folderCount'>{{count}}</span></button></li>\
");