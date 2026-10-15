ips.templates.set('gallery.submit.imageItem', " \
	<div class='ipsAttach ipsImageAttach {{#done}}ipsAttach_done{{/done}}' id='{{id}}' data-role='file' data-fileid='{{id}}' data-fullsizeurl='{{imagesrc}}' data-thumbnailurl='{{thumbnail}}' data-isImage='1'>\
		<ul class='ipsImageAttach_controls'>\
			<li data-role='insert' {{#insertable}}style='display: none'{{/insertable}}><a href='#' data-action='insertFile' class='ipsAttach_selection' data-ipsTooltip title='{{#lang}}insertIntoPost{{/lang}}'><i class='fa-solid fa-plus'></i></a></li>\
			</li>\
			<li class='i-margin-start_auto' {{#newUpload}}style='display: none'{{/newUpload}} data-role='deleteFileWrapper'>\
				<input type='hidden' name='{{field_name}}_keep[{{id}}]' value='1'>\
				<a href='#' data-role='deleteFile' class='ipsButton ipsButton--small ipsButton--soft' data-ipsTooltip title='{{#lang}}attachRemove{{/lang}}'><i class='fa-regular fa-trash-can'></i></a>\
			</li>\
		</ul>\
		<div class='ipsImageAttach_thumb' data-role='preview' data-grid-ratio='65' data-action='insertFile' {{#thumb}}style='background-image: url( \"{{thumbnail}}\" )'{{/thumb}}>\
			{{#status}}\
				<span class='ipsImageAttach_status i-color_soft' data-role='status'>{{{status}}}</span>\
				<meter class='ipsMeter' data-role='progressbar' max='100'></meter>\
			{{/status}}\
			{{#thumb}}\
				{{{thumb}}}\
			{{/thumb}}\
		</div>\
		<h2 class='ipsAttach_title ipsTruncate_1 cGalleryImageAttach_info' data-role='title'>{{title}}</h2>\
		<p class='cGalleryImageAttach_info'>{{size}} {{#statusText}}&middot; <span data-role='status'>{{statusText}}</span>{{/statusText}}</p>\
	</div>\
");

ips.templates.set('gallery.submit.imageItemWrapper', " \
	<div class='cGallerySubmit_fileList'>{{{content}}}</div>\
");