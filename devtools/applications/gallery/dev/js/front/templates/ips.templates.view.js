ips.templates.set('gallery.notes.wrapper', " \
<div class='cGalleryNote' data-controller='gallery.front.view.note' data-noteID='{{id}}' data-note=\"{{note}}\" {{#editable}}data-editable{{/editable}} data-posLeft='{{left}}' data-posTop='{{top}}' data-dimWidth='{{width}}' data-dimHeight='{{height}}'>\
	<div class='cGalleryNote_border'></div>\
	<div class='cGalleryNote_note' style='display: none'>\
		<div>{{note}}</div>\
	</div>\
</div>\
");

ips.templates.set('gallery.notes.delete', " \
	<a href='#' data-action='delete' class='cGalleryNote_delete' data-ipsTooltip title='{{#lang}}delete_note{{/lang}}'>&times;</a>\
");

ips.templates.set('gallery.notes.edit', " \
	<textarea>{{note}}</textarea>\
	<ul class='ipsButtons i-justify-content_start i-margin-top_2'>\
		<li><button data-action='save' class='ipsButton ipsButton--positive'>{{#lang}}save_note{{/lang}}</button></li>\
		<li><a href='#' class='ipsButton ipsButton--inherit' data-action='cancel'>{{#lang}}cancel_note{{/lang}}</a></li>\
	</ul>\
");