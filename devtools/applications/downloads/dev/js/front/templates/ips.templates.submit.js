/* VIEW TEMPLATES */
ips.templates.set('downloads.submit.screenshot', " \
	<div class='ipsUploader__row ipsUploader__row--image ipsAttach {{#done}}ipsAttach_done{{/done}}' id='{{id}}' data-role='file' data-fileid='{{id}}' data-filesize='{{sizeRaw}}' data-fullsizeurl='{{imagesrc}}' data-thumbnailurl='{{thumbnail}}' data-fileType='image'>\
		<div class='ipsUploader__rowPreview' data-role='preview'>\
			<label for='{{field_name}}_primary_screenshot_{{id}}' class='i-cursor_pointer'>\
				{{#thumb}}\
					{{{thumb}}}\
				{{/thumb}}\
				<div class='ipsUploader__rowPreview__generic' {{#thumb}}style='display: none'{{/thumb}}>\
					<i class='fa-solid fa-{{extIcon}}'></i>\
				</div>\
			</label>\
		</div>\
		<div class='ipsUploader_rowMeta'>\
			<h2 class='ipsUploader_rowTitle' data-role='title'>{{title}}</h2>\
			<p class='ipsUploader_rowDesc'>\
				{{size}} {{#statusText}}&middot; <span class='i-color_soft' data-role='status'>{{statusText}}</span>{{/statusText}}\
			</p>\
			{{#status}}<meter class='ipsMeter' data-role='progressbar' max='100'></meter>{{/status}}\
		</div>\
		<span data-role='insert' {{#insertable}}style='display: none'{{/insertable}}>\
			<a href='#' class='ipsAttach_selection' data-ipsTooltip title='{{#lang}}insertIntoPost{{/lang}}'>\
				<i class='fa-solid fa-plus'></i>\
			</a>\
		</span>\
		{{#supportsDelete}}\
			<div data-role='deleteFileWrapper' {{#newUpload}}style='display: none'{{/newUpload}}>\
				<input type='hidden' name='{{field_name}}_keep[{{id}}]' value='1'>\
				<a href='#' data-role='deleteFile' class='ipsUploader__rowDelete' data-ipsTooltip title='{{#lang}}attachRemove{{/lang}}'>\
					&times;\
				</a>\
			</div>\
		{{/supportsDelete}}\
		{{^supportsDelete}}\
			<div data-role='deleteFileWrapper' style='display: none'>\
				<input type='hidden' name='{{field_name}}_keep[{{id}}]' value='1'>\
				<a href='#' class='ipsUploader__rowDelete' data-role='deleteFile' data-ipsTooltip title='{{#lang}}attachRemove{{/lang}}'>&times;</a>\
			</div>\
		{{/supportsDelete}}\
		<label for='{{field_name}}_primary_screenshot_{{id}}' class='cDownloadsPrimaryRadio' data-ipsTooltip title='{{#lang}}makePrimaryScreenshot{{/lang}}'>\
			<input type='radio' name='{{field_name}}_primary_screenshot' id='{{field_name}}_primary_screenshot_{{id}}' value='{{id}}' {{#default}}checked{{/default}} class='ipsInput ipsInput--toggle'>\
			{{#lang}}makePrimary{{/lang}}\
		</label>\
	</div>\
");

ips.templates.set('downloads.submit.screenshotWrapper', " \
	<div class='ipsUploader__container ipsUploader__container--images'>{{{content}}}</div>\
");

ips.templates.set('downloads.submit.linkedScreenshot', " \
	<li class='i-flex i-gap_2 cDownloadsLinkedScreenshotItem'>\
		<input class='ipsInput i-flex_00 i-align-self_center' type='radio' name='screenshots_primary_screenshot' value='{{id}}' title='{{#lang}}makePrimaryScreenshot{{/lang}}' data-ipsTooltip {{extra}}>\
		<input class='ipsInput i-flex_11' type='url' name='{{name}}[{{id}}]' value='{{value}}'>\
		<button class='ipsButton ipsButton--text i-flex_00' type='button' data-action='removeField' title='{{#lang}}removeScreenshot{{/lang}}' data-ipsTooltip><i class='fa-solid fa-xmark'></i></button>\
	</li>\
");