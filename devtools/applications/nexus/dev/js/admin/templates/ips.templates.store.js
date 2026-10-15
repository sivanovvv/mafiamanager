ips.templates.set('nexus.store.images', `
	<div class='ipsUploader__row ipsUploader__row--image ipsAttach {{#done}}ipsAttach_done{{/done}}' id='{{id}}' data-role='file' data-fileid='{{id}}' data-fullsizeurl='{{imagesrc}}' data-thumbnailurl='{{thumbnail}}' data-fileType='image'>
		<div class='ipsUploader__rowPreview' data-role='preview'>
			{{#thumb}}
				{{{thumb}}}
			{{/thumb}}
			<div class='ipsUploader__rowPreview__generic' {{#thumb}}style='display: none'{{/thumb}}>
				<i class='fa-solid fa-{{extIcon}}'></i>
			</div>
		</div>
		<div class='ipsUploader_rowMeta'>
			<h2 class='ipsUploader_rowTitle' data-role='title'>{{title}}</h2>
			<p class='ipsUploader_rowDesc'>
				{{size}} {{#statusText}}&middot; <span class='i-color_soft' data-role='status'>{{statusText}}</span>{{/statusText}}
			</p>
			{{#status}}<meter class='ipsMeter' data-role='progressbar' max='100'></meter>{{/status}}
		</div>
		<div data-role='deleteFileWrapper'>
			<input type='hidden' name='{{field_name}}_keep[{{id}}]' value='1'>
			<a href='#' data-role='deleteFile' class='ipsUploader__rowDelete' data-ipsTooltip title='{{#lang}}removeProductImage{{/lang}}'>
				&times;
			</a>
		</div>
		<label class='cNexusPrimaryRadio' data-ipsTooltip title='{{#lang}}makePrimaryProductImage{{/lang}}'>
			<input type='radio' class='ipsInput ipsInput--toggle' name='{{field_name}}_primary_image' value='{{id}}' {{#default}}checked{{/default}}>
			{{#lang}}makePrimary{{/lang}}
		</label>
	</div>
`);

ips.templates.set('nexus.store.imagesWrapper', `
	<div class='ipsUploader__container ipsUploader__container--images'>{{{content}}}</div>
`);