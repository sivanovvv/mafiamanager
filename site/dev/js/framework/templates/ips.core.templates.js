/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 */
/* GENERAL TEMPLATES */
ips.templates.set('core.general.loading', " \
	&nbsp;<span class='i-color_soft'><i class='ipsLoadingIcon'></i>&nbsp;&nbsp;&nbsp;</span> {{text}}</span>\
");

ips.templates.set('core.general.ajax', " \
	<div id='elAjaxLoading'><i class='ipsLoading ipsLoading--tiny'></i> {{#lang}}loading{{/lang}}...</div>\
");

ips.templates.set('core.general.flashMsg', " \
	<div id='elFlashMessage'><div data-role='flashMessage' class='i-text-align_center'></div><a href='#' data-action='dismissFlashMessage'>&times;</a></div>\
");

ips.templates.set('core.hovercard.loading', " \
	<i class='ipsLoadingIcon'></i>\
");

/* POST CONTENT */
ips.templates.set('core.posts.multiQuoteOff', " \
	<i class='fa-solid fa-plus'></i>\
");

ips.templates.set('core.posts.multiQuoteOn', " \
	<i class='fa-solid fa-check'></i>\
");

ips.templates.set('core.posts.multiQuoter', " \
	<div id='ipsMultiQuoter' data-commentsContainer='{{commentFeedId}}' popover='manual'>\
		<button type='button' data-role='multiQuote_{{commentFeedId}}'><i class='fa-solid fa-comments'></i> <span>{{{count}}}</span></button> <button type='button' data-action='clearQuoted_{{commentFeedId}}'><i class='fa-solid fa-xmark'></i></button>\
	</div>\
");

ips.templates.set('core.menus.menuItem', " \
	<li>\
		<a href='{{link}}' {{#checked}}aria-selected='true'{{/checked}} data-ipsMenuValue='{{value}}'>{{title}}</a>\
	</li>\
");

ips.templates.set('core.menus.menuSep', " \
	<li><hr></li>\
");

ips.templates.set('core.posts.quotedSpoiler', " \
	<p><em>{{#lang}}quotedSpoiler{{/lang}}</em></p>\
");

/* NOTIFICATION TEMPLATE */
ips.templates.set('core.postNotify.single', " \
	<div class='i-flex i-align-items_center i-gap_2 i-link-color_inherit' data-role='newPostNotification'>\
		<span class='ipsUserPhoto ipsUserPhoto--tiny'><img src='{{photo}}' alt='' loading='lazy'></span>\
		<div>\
			<span class='i-font-weight_500'>{{{text}}}</span>&nbsp;&nbsp;\
			<a href='#' data-action='loadNewPosts' class='i-opacity_8'>{{#lang}}showReply{{/lang}}</a>\
		</div>\
	</div>\
");

ips.templates.set('core.postNotify.multiple', " \
	<div class='i-flex i-align-items_center i-gap_2 i-link-color_inherit' data-role='newPostNotification'>\
		<i class='fa-solid fa-comments'></i>\
		<div>\
			<span class='i-font-weight_500'>{{{text}}}</span>&nbsp;&nbsp;\
			<a href='#' data-action='loadNewPosts' class='i-opacity_8'>{{#lang}}showReplies{{/lang}}</a>\
		</div>\
	</div>\
");

ips.templates.set('core.postNotify.multipleSpillOver', " \
	<div class='i-flex i-align-items_center i-gap_2 i-link-color_inherit' data-role='newPostNotification'>\
		<i class='fa-solid fa-comments'></i>\
		<div>\
			{{text}}\
			{{#canLoadNew}}\
				&nbsp;&nbsp;&nbsp;<a href='#' data-action='loadNewPosts'>{{showFirstX}}</a>\
				&nbsp;&nbsp;&nbsp;<span class='i-opacity_8'>{{#lang}}showRepliesOr{{/lang}}</span>\
			{{/canLoadNew}}\
			&nbsp;&nbsp;&nbsp;<a href='{{spillOverUrl}}'>{{#lang}}goToNewestPage{{/lang}}</a>\
		</div>\
	</div>\
");

ips.templates.set('core.notification.flashSingle', " \
	<a href='{{url}}' data-role='newNotification'>\
		<div class='i-flex i-align-items_center i-gap_2 i-link-color_inherit'>\
			{{#icon}}<div class='i-flex_00'><span class='ipsUserPhoto ipsUserPhoto--tiny'><img src='{{icon}}' alt='' loading='lazy'></span></div>{{/icon}}\
			<div class='i-flex_11 i-text-align_start'>\
				{{text}}\
				<p class='i-opacity_8 ipsTruncate_1 i-font-weight_600'>{{{body}}}</p>\
			</div>\
		</div>\
	</a>\
");

ips.templates.set('core.notification.flashMultiple', " \
	<div class='i-flex i-align-items_center i-gap_2 i-link-color_inherit' data-role='newNotification'>\
		<i class='fa-solid fa-bell'></i>\
		<div class='i-flex_11 i-text-align_start'>\
			{{text}}\
			<p class='i-opacity_8 ipsTruncate_1 i-font-weight_600'>{{{body}}}</p>\
		</div>\
	</div>\
");

/* ALERTS */
ips.templates.set('core.alert.box', " \
<dialog class='ipsAlert' aria-labelledby='{{id}}_label'>\
	<div class='ipsAlert__message'>\
		<div class='ipsAlert__icon'>{{{icon}}}</div>\
		<strong class='ipsAlert__title' id='{{id}}_label'>{{{text}}}</strong>\
		{{{subtext}}}\
	</div>\
	<div class='ipsButtons ipsButtons--fill'>\
		{{{buttons}}}\
	</div>\
</dialog>\
");

ips.templates.set('core.alert.subText', " \
<div class='ipsAlert__desc'>{{text}}</div>\
");

ips.templates.set('core.alert.subTextHtml', " \
<div class='ipsAlert__desc'>{{{text}}}</div>\
");

ips.templates.set('core.alert.icon', " \
<i class='{{icon}}'></i>\
");

ips.templates.set('core.alert.button', " \
<button data-action='{{action}}' class='ipsButton {{extra}}'>{{title}}</button>\
");

ips.templates.set('core.alert.prompt', " \
<br><br>\
<input type='text' value='{{value}}' class='ipsInput ipsInput--text ipsInput--wide' data-role='promptValue'>\
<br><br>\
");

/* LIGHTBOX TEMPLATES */
ips.templates.set('core.lightbox.meta', "{{title}}");

ips.templates.set('core.lightbox.toolsMenu', " \
<a href='{{url}}&amp;direction=right' class='ipsButton ipsButton--text ipsButton--small' title='Rotate Right' data-ipsTooltip data-action='rotateImage'>\
    <i class='fa-solid fa-rotate-right'></i>\
</a>\
<a href='{{url}}&amp;direction=left' class='ipsButton ipsButton--text ipsButton--small' title='Rotate Left' data-ipsTooltip data-action='rotateImage'>\
    <i class='fa-solid fa-rotate-left'></i>\
</a>\
");

/* DIALOG TEMPLATES */
ips.templates.set('core.dialog.main', " \
<dialog class='ipsDialog {{#size}}ipsDialog_{{size}}{{/size}} {{extraClass}}' id='{{id}}' {{#title}}aria-labelledby='{{id}}_label'{{/title}}>\
	{{#close}}\
		<button type='button' command='close' commandfor='{{id}}' class='ipsDialog_lightDismiss' tabindex='-1'><span class='ipsInvisible'>{{#lang}}close{{/lang}}</span></button>\
	{{/close}}\
	<div class='ipsDialog_box'>\
		{{#title}}\
			<div class='ipsDialog_title'>\
				<p id='{{id}}_label'>{{title}}</p>\
				{{#close}}\
					<button type='button' command='close' commandfor='{{id}}' class='ipsDialog_close'><i class='fa-solid fa-xmark' aria-hidden='true'></i><span class='ipsInvisible'>{{#lang}}close{{/lang}}</span></button>\
				{{/close}}\
			</div>\
		{{/title}}\
		{{^title}}\
			{{#close}}\
				<button type='button' command='close' commandfor='{{id}}' class='ipsDialog_close'><i class='fa-solid fa-xmark' aria-hidden='true'></i><span class='ipsInvisible'>{{#lang}}close{{/lang}}</span></button>\
			{{/close}}\
		{{/title}}\
		<div class='ipsDialog_content'>\
			{{content}}\
		</div>\
		<div class='ipsDialog_loading ipsLoading' hidden></div>\
	</div>\
</dialog>\
")

/* TOOLTIP TEMPLATE */
ips.templates.set('core.tooltip', " \
	<div id='{{id}}' class='ipsTooltip' role='tooltip' popover='manual'>{{content}}</div>\
");

/* EDITOR TEMPLATES */
ips.templates.set('core.editor.pixabayThumb', `
<div class='ipsPixabayThumb' {{#width}}{{#height}}style="--i-ratio: {{width}} / {{height}}"{{/height}}{{/width}}>
	<img loading="lazy" {{#width}}width='{{width}}'{{/width}} {{#height}}height='{{height}}'{{/height}} src="{{thumb}}" class="ipsPixabayImage" data-url="{{url}}" data-id="{{imgid}}" alt="">
</div>
`);

ips.templates.set('core.editor.quote', "<blockquote class='ipsQuote' data-ipsQuote data-gramm='false' cite='{{citeurl}}'><div class='ipsQuote_citation'>{{{citation}}}</div><div class='ipsQuote_contents ipsClearfix' data-gramm='false'>{{{contents}}}</div></blockquote>");

ips.templates.set('core.editor.citation', " \
	<div class='ipsQuote_citation ipsQuote_open'>\
		<a href='#' data-action='toggleQuote' aria-label='{{#lang}}toggle_quote{{/lang}}'>&nbsp;</a>\
		{{#contenturl}}\
			<a href='{{contenturl}}' class='ipsQuote_citation-origin' rel='nofollow'><i class='fa-solid fa-share'></i></a>\
		{{/contenturl}}\
		{{{citation}}}\
	</div>\
");

ips.templates.set('core.editor.citationLink', " \
	<a href='{{baseURL}}?app=core&module=members&controller=profile&id={{userid}}' data-ipsHover data-ipshover-target='{{baseURL}}?app=core&module=members&controller=profile&id={{userid}}&do=hovercard'>{{username}}</a>\
");

ips.templates.set('core.editor.spoiler', "<div class='ipsSpoiler' data-ipsSpoiler><div class='ipsSpoiler_header'><span>{{#lang}}editorSpoiler{{/lang}}</span></div><div class='ipsSpoiler_contents ipsClearfix'></div></div>");
ips.templates.set('core.editor.spoilerHeader', " \
	<summary class='ipsSpoiler_header ipsSpoiler_closed'>\
		<span>{{#lang}}spoilerClickToReveal{{/lang}}</span>\
	</summary>\
");

/* ATTACHMENT TEMPLATES */
ips.templates.set('core.attachments.metaInfo', " \
	<span>{{size}}</span> <span>&middot;</span> <span>{{downloads}}</span>\
");

ips.templates.set('core.attachments.attachmentPreview', " \
	<span class='ipsAttachLink_box'><span class='ipsAttachLink_title'>{{title}}</span><span class='ipsAttachLink_metaInfo'>{{#lang}}attachmentPending{{/lang}}</span></span>\
");

ips.templates.set('core.attachments.fileItemWrapper', " \
	<div class='ipsUploader__container ipsUploader__container--files'>{{{content}}}</div>\
");

ips.templates.set('core.attachments.fileItem', " \
	<div class='ipsUploader__row ipsUploader__row--file ipsAttach {{#done}}ipsAttach_done{{/done}}' id='{{id}}' data-role='file' data-fileid='{{id}}' data-filesize='{{sizeRaw}}' data-filekey='{{securityKey}}'>\
		<div class='ipsUploader__rowPreview' data-role='preview' {{#insertable}}data-action='insertFile'{{/insertable}}>\
			{{#thumb}}\
				{{{thumb}}}\
			{{/thumb}}\
			<div class='ipsUploader__rowPreview__generic' {{#thumb}}style='display: none'{{/thumb}}>\
				<i class='fa-solid fa-{{extIcon}}'></i>\
			</div>\
		</div>\
		<div class='ipsUploader_rowMeta' {{#insertable}}data-action='insertFile'{{/insertable}}>\
			<h2 class='ipsUploader_rowTitle' data-role='title'>{{title}}</h2>\
			<p class='ipsUploader_rowDesc'>\
				{{size}} {{#statusText}}&middot; <span class='i-color_soft' data-role='status'>{{statusText}}</span>{{/statusText}}\
			</p>\
			{{#status}}<meter class='ipsMeter' data-role='progressbar' max='100'></meter>{{/status}}\
			<div data-role='insert' class='ipsUploader__rowInsert' {{#insertable}}style='display: none'{{/insertable}}>\
				<a href='#' data-ipsTooltip title='{{#lang}}insertIntoPost{{/lang}}'>\
					{{#lang}}insert{{/lang}}\
				</a>\
			</div>\
		</div>\
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
	</div>\
");

ips.templates.set('core.attachments.imageItem', " \
	<div class='ipsUploader__row ipsUploader__row--image ipsAttach {{#done}}ipsAttach_done{{/done}}' id='{{id}}' data-role='file' data-fileid='{{id}}' data-fullsizeurl='{{imagesrc}}' data-thumbnailurl='{{thumbnail}}' data-fileType='image'>\
		<div class='ipsUploader__rowPreview' data-role='preview' {{#insertable}}data-action='insertFile'{{/insertable}}>\
			{{#thumb}}\
				{{{thumb}}}\
			{{/thumb}}\
			<div class='ipsUploader__rowPreview__generic' {{#thumb}}style='display: none'{{/thumb}}>\
				<i class='fa-solid fa-{{extIcon}}'></i>\
			</div>\
		</div>\
		<div class='ipsUploader_rowMeta' {{#insertable}}data-action='insertFile'{{/insertable}}>\
			<h2 class='ipsUploader_rowTitle' data-role='title'>{{title}}</h2>\
			<p class='ipsUploader_rowDesc'>\
				{{size}} {{#statusText}}&middot; <span class='i-color_soft' data-role='status'>{{statusText}}</span>{{/statusText}}\
			</p>\
			{{#status}}<meter class='ipsMeter' data-role='progressbar' max='100'></meter>{{/status}}\
			<div data-role='insert' class='ipsUploader__rowInsert' {{#insertable}}style='display: none'{{/insertable}}>\
				<a href='#' data-ipsTooltip title='{{#lang}}insertIntoPost{{/lang}}'>\
					{{#lang}}insert{{/lang}}\
				</a>\
			</div>\
		</div>\
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
	</div>\
");

ips.templates.set('core.attachments.videoItem', " \
	<div class='ipsUploader__row ipsUploader__row--image ipsAttach {{#done}}ipsAttach_done{{/done}}' id='{{id}}' data-role='file' data-fileid='{{id}}' data-fullsizeurl='{{imagesrc}}' data-thumbnailurl='{{thumbnail}}' data-fileType='video' data-mimeType='{{mime}}'>\
		<div class='ipsUploader__rowPreview' data-role='preview' {{#insertable}}data-action='insertFile'{{/insertable}}>\
			{{#thumb}}\
				<video>\
					<source src='{{{thumb}}}' type='{{mime}}'>\
				</video>\
			{{/thumb}}\
			<div class='ipsUploader__rowPreview__generic' {{#thumb}}style='display: none'{{/thumb}}>\
				<i class='fa-solid fa-{{extIcon}}'></i>\
			</div>\
		</div>\
		<div class='ipsUploader_rowMeta' {{#insertable}}data-action='insertFile'{{/insertable}}>\
			<h2 class='ipsUploader_rowTitle' data-role='title'>{{title}}</h2>\
			<p class='ipsUploader_rowDesc'>\
				{{size}} {{#statusText}}&middot; <span class='i-color_soft' data-role='status'>{{statusText}}</span>{{/statusText}}\
			</p>\
			{{#status}}<meter class='ipsMeter' data-role='progressbar' max='100'></meter>{{/status}}\
			<div data-role='insert' class='ipsUploader__rowInsert' {{#insertable}}style='display: none'{{/insertable}}>\
				<a href='#' data-ipsTooltip title='{{#lang}}insertIntoPost{{/lang}}'>\
					{{#lang}}insert{{/lang}}\
				</a>\
			</div>\
		</div>\
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
	</div>\
");

ips.templates.set('core.attachments.audioItem', " \
	<div class='ipsUploader__row ipsUploader__row--image ipsAttach {{#done}}ipsAttach_done{{/done}}' id='{{id}}' data-role='file' data-fileid='{{id}}' data-fullsizeurl='{{imagesrc}}' data-thumbnailurl='{{thumbnail}}' data-fileType='audio' data-mimeType='{{mime}}'>\
		<div class='ipsUploader__rowPreview' data-role='preview' {{#insertable}}data-action='insertFile'{{/insertable}}>\
			{{#thumb}}\
				<audio src='{{{thumb}}}' type='{{mime}}'>\
				</audio>\
			{{/thumb}}\
			<div class='ipsUploader__rowPreview__generic' {{#thumb}}style='display: none'{{/thumb}}>\
				<i class='fa-solid fa-{{extIcon}}'></i>\
			</div>\
		</div>\
		<div class='ipsUploader_rowMeta' {{#insertable}}data-action='insertFile'{{/insertable}}>\
			<h2 class='ipsUploader_rowTitle' data-role='title'>{{title}}</h2>\
			<p class='ipsUploader_rowDesc'>\
				{{size}} {{#statusText}}&middot; <span class='i-color_soft' data-role='status'>{{statusText}}</span>{{/statusText}}\
			</p>\
			{{#status}}<meter class='ipsMeter' data-role='progressbar' max='100'></meter>{{/status}}\
			<div data-role='insert' class='ipsUploader__rowInsert' {{#insertable}}style='display: none'{{/insertable}}>\
				<a href='#' data-ipsTooltip title='{{#lang}}insertIntoPost{{/lang}}'>\
					{{#lang}}insert{{/lang}}\
				</a>\
			</div>\
		</div>\
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
	</div>\
");

/* FORM TEMPLATES */
ips.templates.set('core.forms.validationWrapper', " \
	<ul id='{{id}}' class='i-font-size_-2 ipsForm_errorList'>{{content}}</ul>\
");

ips.templates.set('core.forms.validationItem', " \
	<li class='i-color_warning'>{{message}}</li>\
");

ips.templates.set('core.forms.advicePopup', "\
<div class='ipsHovercard' data-role='advicePopup' id='elPasswordAdvice_{{id}}'>\
	<div class='i-padding_3'>\
		<h2 class='ipsTitle ipsTitle--h4'>{{#lang}}password_advice_title{{/lang}}</h2>\
		<p class='i-margin-top_2'>\
			{{#min}}\
				{{min}} \
			{{/min}}\
			{{{text}}}\
		</p>\
	</div>\
	<span class='ipsHovercard_stem'></span>\
</div>\
");

ips.templates.set('core.forms.validateFail', "\
<span data-ipsTooltip='{{message}}'>\
	<i class='fa-solid fa-circle-xmark i-color_negative'></i>\
</span>\
");

ips.templates.set('core.forms.validateFailText', "\
<p data-el='validate-fail' class='i-margin-top_2 i-color_negative i-font-weight_500'>\
	<i class='fa-solid fa-circle-xmark'></i> {{message}}\
</p>\
");

/* TRUNCATE TEMPLATE */
ips.templates.set('core.truncate.expand', " \
	<button type='button' class='ipsTruncate_more' data-action='expandTruncate'><span>{{text}}</span><i class='fa-solid fa-caret-down'></i></button>\
");

/* NODE SELECT */
ips.templates.set('core.selectTree.token', " \
<li><span class='ipsSelectTree_token cToken' data-nodeID='{{id}}'>{{title}}</span></li>\
");

ips.templates.set('core.pageAction.actionMenuItem', " \
	<li>\
		<button type='button' class='ipsPageAction__button' id='{{id}}_{{action}}' popovertarget='{{id}}_{{action}}_menu' data-role='actionMenu' data-action='{{action}}' data-ipsTooltip title='{{title}}'>\
			<span>\
				{{#icon}}\
					<i class='fa-solid fa-{{icon}} ipsPageAction_icon'></i> <i class='fa-solid fa-caret-up'></i>\
				{{/icon}}\
				{{^icon}}\
					<span class='ipsPageAction_text'>{{title}} <i class='fa-solid fa-caret-up'></i></span>\
				{{/icon}}\
			</span>\
		</button>\
		<i-dropdown popover id='{{id}}_{{action}}_menu'>\
			<div class='iDropdown'>\
				<ul class='iDropdown__items'>\
					{{{menucontent}}}\
				</ul>\
			</div>\
		</i-dropdown>\
	</li>\
");

/* INFINITE SCROLL */
ips.templates.set('core.infScroll.loading', " \
	<li class='i-padding_3 i-text-align_center' data-role='infScroll_loading'>\
		{{#lang}}loading{{/lang}}...\
	</li>\
");

ips.templates.set('core.infScroll.pageBreak', " \
	<li class='i-padding_2 i-background_3' data-role='infScroll_break' data-infScrollPage='{{page}}'>\
		{{#lang}}page{{/lang}} {{page}}\
	</li>\
");

ips.templates.set('core.pageAction.actionItem', " \
	<li>\
		<button type='button' class='ipsPageAction__button' data-role='actionButton' data-action='{{action}}' id='{{id}}_{{action}}' data-ipsTooltip title='{{title}}'>\
			<span>\
				{{#icon}}\
					<i class='fa-solid fa-{{icon}} ipsPageAction_icon' data-ipsTooltip='{{title}}'></i></i>\
				{{/icon}}\
				{{^icon}}\
					<span class='ipsPageAction_text'>{{title}}</span>\
				{{/icon}}\
			</span>\
		</button>\
	</li>\
");

/* PAGE ACTIONS */
ips.templates.set('core.pageAction.wrapper', " \
	<div class='ipsPageAction' data-role='actionBar' id='{{id}}_bar'>\
		<ul data-role='actionItems'>\
			<li class='ipsPageAction__title'><span>{{{selectedLang}}}</span></li>\
			{{{content}}}\
		</ul>\
	</div>\
");

/* RATINGS */
ips.templates.set('core.rating.wrapper', "\
	<div class='ipsRating'>\
		<ul class='{{className}}' data-role='ratingList'>\
			{{{content}}}\
		</ul>\
		<div data-role='ratingStatus' class='i-color_soft i-font-size_-1'>{{status}}</div>\
	</div>\
")

ips.templates.set('core.rating.star', "\
	<li class='{{className}}' data-ratingValue='{{value}}'><a href='#'><i class='fa-solid fa-star'></i></a></li>\
");

ips.templates.set('core.rating.halfStar', "\
	<li class='ipsRating_half' data-ratingValue='{{value}}'><i class='fa-solid fa-star-half'></i><i class='fa-solid fa-star-half fa-flip-horizontal'></i></li>\
");

ips.templates.set('core.rating.loading', "\
	<i class='ipsLoadingIcon'></span>\
");

/* SIDEBAR MANAGER */
ips.templates.set('core.sidebar.managerWrapper', `\
	<div id='elSidebarManager' data-role='manager' class='ipsToolbox' hidden>
		<div class='ipsToolbox__tools'>
			<div class='i-padding_2' id="elSidebarManager_header">
				<div data-role="title">
                    <h3 class='ipsToolbox_title'>{{#lang}}sidebarManager{{/lang}}</h3>
				    <span data-role="info">
				        <i class="fa-solid fa-info-circle"></i>
                        <div data-role="description" class="ipsBox i-padding_2" >
                            <p class='i-color_soft'>{{#lang}}sidebarManagerDesc{{/lang}}</p>
                            <p class='i-color_soft i-margin-top_2'>{{#lang}}sidebarManagerDesc2{{/lang}}</p>
                        </div>
                    </span>
                </div>
				<input type="text" data-role="widgetSearch" placeholder="{{#lang}}sidebarManagerSearchPlaceholder{{/lang}}" class="ipsInput ipsInput--widget-search" />
			</div>
			<div data-role='availableBlocks' data-unloaded="true" class='ipsLoading ipsScrollbar'></div>
			<div data-role="emptyMessage" class="i-padding_2" hidden>{{#lang}}sidebarManagerSearchEmpty{{/lang}}</div>
		</div>
		<div id='elSidebarManager_submit' class='i-flex_00 i-padding_3 ipsButtons i-gap_2'>
			<button class='ipsButton ipsButton--positive ipsButton--wide' data-action='closeSidebar'><i class='fa-regular fa-floppy-disk'></i><span>{{#lang}}finishEditing{{/lang}}</span></button>
		</div>
	</div>
`);

/* FOLLOW BUTTON LOADING */
ips.templates.set('core.follow.loading', " \
<div class='ipsLoading ipsLoading--tiny'></div>\
");

/* STACKS */
ips.templates.set('core.forms.stack', " \
	<li class='ipsField_stackItem' data-role='stackItem'>\
		<span class='ipsField_stackDrag ipsDrag' data-action='stackDrag'>\
			<i class='fa-solid fa-bars ipsDrag_dragHandle'></i>\
		</span>\
		<a href='#' class='ipsField_stackDelete i-cursor_pointer' data-action='stackDelete'>\
			&times;\
		</a>\
		<div data-ipsStack-wrapper>\
			{{{field}}}\
		</div>\
	</li>\
");

/* POLLS */
ips.templates.set('core.pollEditor.question', " \
	<div class='' data-role='question' data-questionID='{{questionID}}'>\
		<div class='i-margin-bottom_2'>\
			<input type='text' data-role='questionTitle' name='{{pollName}}[questions][{{questionID}}][title]' placeholder='{{#lang}}questionPlaceholder{{/lang}}' class='ipsInput ipsInput--text ipsInput--wide' value='{{question}}'>\
		</div>\
		<div>\
			<ul class='cPollChoices i-grid' data-role='choices'>\
				<li class='i-padding-block_1 i-flex i-align-items_center i-gap_2 ipsResponsive_hidePhone'>\
					<span class='i-basis_30 i-flex_00'></span>\
					<div class='i-flex_11'><strong>{{#lang}}choicesTitle{{/lang}}</strong></div>\
					{{#showCounts}}\
						<span class='i-flex_00'><strong>{{#lang}}votesTitle{{/lang}}</strong></span>\
					{{/showCounts}}\
					<span class='i-basis_60'></span>\
				</li>\
				{{{choices}}}\
			</ul>\
			<div class='i-padding-block_1 i-flex i-align-items_center i-gap_2 i-flex-wrap_wrap'>\
				<span class='i-basis_30 i-flex_00'></span>\
				<a href='#' data-action='addChoice' class='ipsButton ipsButton--inherit'>{{#lang}}addChoice{{/lang}}</a>\
				<div class='i-flex_11 i-flex i-align-items_center i-gap_1'>\
					<input type='checkbox' id='elPoll_{{pollName}}_{{questionID}}multi' name='{{pollName}}[questions][{{questionID}}][multichoice]' {{#multiChoice}}checked{{/multiChoice}} class='ipsInput ipsInput--toggle'>\
					<label for='elPoll_{{pollName}}_{{questionID}}multi'>{{#lang}}multipleChoiceQuestion{{/lang}}</label></li>\
				</div>\
				{{#removeQuestion}}<div class='i-flex_00'><a href='#' data-action='removeQuestion' class='ipsButton ipsButton--inherit i-color_negative'>{{#lang}}removeQuestion{{/lang}}</a></div>{{/removeQuestion}}\
			</div>\
		</div>\
	</div>\
");

ips.templates.set('core.pollEditor.choice', " \
	<li class='i-padding-block_1 i-flex i-align-items_center i-gap_2' data-choiceID='{{choiceID}}'>\
		<span class='i-basis_30 i-flex_00 i-text-align_center cPollChoiceNumber'>\
			<strong data-role='choiceNumber'>{{choiceID}}</strong>\
		</span>\
		<div class='i-flex_11'>\
			<input type='text' name='{{pollName}}[questions][{{questionID}}][answers][{{choiceID}}][value]' value='{{choiceTitle}}' class='ipsInput ipsInput--text ipsInput--wide'>\
		</div>\
		<div class='i-flex_00'>\
			<a href='#' data-action='removeChoice' class='ipsButton ipsButton--inherit i-color_negative'><i class='fa-solid fa-xmark'></i></a>\
		</div>\
	</li>\
");

/* COVER PHOTOS */
ips.templates.set('core.coverPhoto.controls', " \
	<ul class='ipsCoverPhoto__overlay-buttons' data-role='coverPhotoControls'>\
		<li><a href='#' class='ipsButton ipsButton--overlay' data-action='cancelPosition'><i class='fa-solid fa-xmark'></i><span>{{#lang}}cancel{{/lang}}</span></a></li>\
		<li><a href='#' class='ipsButton ipsButton--soft' data-action='savePosition'><i class='fa-solid fa-check'></i><span>{{#lang}}save_position{{/lang}}</span></a></li>\
	</ul>\
");

/* Pagination */
ips.templates.set('core.pagination', " \
	<ul class='ipsPagination' data-ipsPagination data-ipsPagination-pages='{{pages}}'>\
		<li class='ipsPagination__prev'>\
			<a href='#' data-page='prev'><i class='fa-solid fa-caret-left'></i> {{#lang}}prev_page{{/lang}}</a>\
		</li>\
		<li class='ipsPagination__next'>\
			<a href='#' data-page='next'>{{#lang}}next_page{{/lang}} <i class='fa-solid fa-caret-right'></i></a>\
		</li>\
	</ul>\
");

/* selective quoting */
ips.templates.set('core.selection.quote', " \
	<div class='ipsTooltip ipsTooltip_{{direction}} ipsTooltip--inlineQuoteTooltip' data-role='inlineQuoteTooltip' popover='manual'>\
	    <button type='button' data-action='quoteSelection'>\
			<i class='fa-solid fa-quote-left'></i> {{#lang}}quote_selected_text{{/lang}}\
	    </button>\
    </div>\
");

/* Content item selector */
ips.templates.set('core.contentItem.resultItem', " \
	<li class='ipsAutocompleteMenu_item' data-id='{{{id}}}' role='option' role='listitem'>\
		{{{html}}}\
	</li>\
");

ips.templates.set('core.contentItem.field', " \
	<div class='ipsInput ipsField_autocomplete' id='{{id}}_wrapper' role='combobox' aria-autocomplete='list' aria-owns='{{id}}_results'>\
		<span class='ipsField_autocomplete_loading' style='display: none' id='{{id}}_loading'></span>\
		<ul class='ipsList ipsList--inline'><li id='{{id}}_inputItem'>{{content}}</li></ul>\
	</div>\
");

ips.templates.set('core.contentItem.resultWrapper', " \
	<div class='ipsAutocompleteMenu' id='{{id}}_results' aria-expanded='false' style='display: none'>\
		<ul class='ipsAutocompleteMenu_itemWrapper' data-role='items'></ul>\
	</div>\
");

ips.templates.set('core.contentItem.item', " \
	<li data-id='{{id}}'>\
		<span class='cContentItem_delete' data-action='delete'>&times;</span> {{{html}}} \
	</li>\
");

/* PROMOTES */
ips.templates.set('promote.imageUpload', " \
	<div class='cPromote_attachImage' id='{{id}}' data-role='file' data-fileid='{{id}}' data-fullsizeurl='{{imagesrc}}' data-thumbnailurl='{{thumbnail}}' data-fileType='image'>\
		<div data-role='preview'>\
			{{#thumbnail}}<img src='{{thumbnail}}' alt='' loading='lazy'>{{/thumbnail}}\
		</div>\
		<ul class='ipsImageAttach_controls'>\
			<li class='' {{#newUpload}}style='display: none'{{/newUpload}} data-role='deleteFileWrapper'>\
				<input type='hidden' name='{{field_name}}_keep[{{id}}]' value='1'>\
				<a href='#' data-role='deleteFile' class='ipsButton ipsButton--small ipsButton--soft' data-ipsTooltip title='{{#lang}}attachRemove{{/lang}}'><i class='fa-regular fa-trash-can'></i></a>\
			</li>\
		</ul>\
		<meter class='ipsMeter' data-role='progressbar' max='100'></meter>\
	</div>\
");

/* TABLE ROW LOADING */
ips.templates.set('table.row.loading', `
	<li class='ipsData__item ipsData__item--loading'>
		<div class='ipsData__image'></div>
		<div class='ipsData__content'>
			<div class='ipsData__main'>
				<div class='ipsData__title'></div>
				<div class='ipsData__meta'></div>
			</div>
			<div class='ipsData__stats'></div>
			<div class='ipsData__last'></div>
		</div>
	</li>
`);

/* LICENSE RENEWAL */
ips.templates.set('licenseRenewal.wrapper', " \
	<div class='acpLicenseRenewal' data-role='licenseRenewal'>\
		<div class='acpLicenseRenewal_wrap'>\
			<div class='acpLicenseRenewal_inner'>\
				<div class='acpLicenseRenewal_content i-padding_3'>\
					<h4 class='i-font-size_3 i-font-weight_600 i-color_hard i-margin-bottom_2' data-role='mainTitle'>{{#lang}}licenseRenewalTitle{{/lang}}</h4>\
					<p class='i-color_soft'>{{#lang}}licenseRenewalText{{/lang}}</p>\
					<div class='i-margin-top_2 i-flex i-align-items_center i-gap_1 i-font-weight_500'><input type='checkbox' checked='checked' name='hideRenewalNotice' id='hideRenewalNotice' class='ipsInput ipsInput--toggle'> <label for='hideRenewalNotice'>{{#lang}}licenseRenewalCheckbox{{/lang}}</label></div>\
				</div>\
				<ul class='ipsButtons i-background_2 i-border-top_1 i-border-end-start-radius_box i-border-end-end-radius_box i-padding_2'>\
					<li>\
						<a href='#' class='ipsButton ipsButton--inherit' data-action='closeLicenseRenewal'>{{#lang}}licenseRenewalNo{{/lang}}</a>\
					</li>\
					<li>\
						<a href='#' class='ipsButton ipsButton--primary' data-role='survey' data-action='closeLicenseRenewal' target='_blank'>{{#lang}}licenseRenewalYes{{/lang}}</a>\
					</li>\
				</ul>\
			</div>\
		</div>\
	</div>\
");

/* Browser Notifications Notices */
ips.templates.set( 'core.browserNotification.prompt' , "\
	<div class='cNotifcationPrompt'>\
		<div class='i-padding_3'>\
			<div class='ipsPhotoPanel ipsPhotoPanel--mini'>\
				<span class='cNotifcationPrompt_icon'></span>\
				<div>\
					<a href='#' class='cNotifcationPrompt_dismiss' data-role=\"dismissNotification\">×</a>\
					<h3 class='cNotifcationPrompt_title i-font-size_2 ipsType_sectionHead'>{{#lang}}notificationsCallout{{/lang}}</h3>\
					<p class='cNotifcationPrompt_text i-margin-top_2'>\
						{{#lang}}notificationsDefaultBlurb{{/lang}}\
					</p>\
					<div class='ipsButtons i-margin-top_3'>\
						<button data-action='browserNotificationPrompt' class='ipsButton ipsButton--small ipsButton--soft ipsButton--wide'>{{#lang}}notificationsAllow{{/lang}}</button>\
					</div>\
					<p class='i-font-size_-2 i-margin-block_2 ipsHide' data-role='promptMessage'>\
						{{#lang}}notificationsAllowPrompt{{/lang}}\
					</p>\
				</div>\
			</div>\
		</div>\
	</div>\
");

ips.templates.set( 'core.browserNotification.missingSubscription' , "\
	<div class='cNotifcationPrompt'>\
		<div class='i-padding_3'>\
			<div class='ipsPhotoPanel ipsPhotoPanel--mini'>\
				<span class='cNotifcationPrompt_icon'></span>\
				<div>\
					<a href='#' class='cNotifcationPrompt_dismiss' data-role=\"dismissNotification\">×</a>\
					<h3 class='cNotifcationPrompt_title i-font-size_2 ipsType_sectionHead'>{{#lang}}notificationsCalloutPush{{/lang}}</h3>\
					<p class='cNotifcationPrompt_text i-margin-block_2'>\
						{{#lang}}notificationsDefaultBlurb{{/lang}}\
					</p>\
					<div class='ipsButtons i-margin-top_3'>\
						<button data-action='browserNotificationPrompt' class='ipsButton ipsButton--small ipsButton--soft i-flex_11'>{{#lang}}notificationsAllow{{/lang}}</button>\
						<a href='#' data-action='rejectPush' class='ipsButton ipsButton--small ipsButton--text i-color_white i-flex_00'>{{#lang}}notificationsNoThanks{{/lang}}</a>\
					</div>\
					<p class='i-font-size_-2 i-margin-block_2 ipsHide' data-role='promptMessage'>\
						{{#lang}}notificationsAllowPrompt{{/lang}}\
					</p>\
				</div>\
			</div>\
		</div>\
	</div>\
");

/* Warning form pre-set action list */
ips.templates.set('system.warningpenalty.nomodify', "\
	<ul class='ipsList ipsList--bullets' id='elWarningPenalties'>\
		{{#penalties}}\
		<li>{{.}}</li>\
		{{/penalties}}\
	</ul>\
");

ips.templates.set('core.edittags.default', "\
	<div class='i-padding_3'>\
		<span><i class='ipsLoadingIcon'></i>  &nbsp;{{#lang}}loading{{/lang}}</span>\
	</div>\
");

ips.templates.set('core.iconpicker.selectedicon', `\
<li
    data-role="iconpicker_item"
    data-ips-tooltip
    title="{{#disabled}}{{#lang}}iconpicker_icon_cannot_add{{/lang}}{{/disabled}}{{^disabled}}{{title}}{{/disabled}}"
    data-icon-type="{{type}}"
    data-icon-title="{{title}}"
    data-icon-key="{{key}}"
    data-icon-hair-style="{{hairStyle}}"
    data-icon-skin-tone="{{skinTone}}"
>
    <div class="ipsIconPicker__content">
        {{{raw}}}
    </div>
    <div class="ipsIconPicker__title">{{title}}</div>
</li>\
`)


/**
 * Table of Contents
 */
ips.templates.set('tableOfContents.linkOptions', `\
<span class="ipsTableOfContents__linkOptions">
	<a href="#{{id}}" class="ipsButton ipsButton--text" data-role="link" aria-label="{{#lang}}table_of_contents_link{{/lang}}" data-ipstooltip title="{{#lang}}table_of_contents_link{{/lang}}" >
		<i class="fa-solid fa-link"></i>
	</a>
	{{#canEdit}}
		<button type="button" class="ipsButton ipsButton--primary" data-ipstooltip title="{{#lang}}table_of_contents_add{{/lang}}" data-role="add" aria-label="{{#lang}}table_of_contents_add{{/lang}}" >
			<i class="fa-solid fa-plus"></i>
		</button>
		<span class="ipsTableOfContents__incrementOptions">
			<button type="button" class="ipsButton ipsButton--text" data-ipstooltip title="{{#lang}}table_of_contents_decrement{{/lang}}" data-role="decrement" aria-label="{{#lang}}table_of_contents_decrement{{/lang}}" >
				<i class="fa-solid fa-outdent"></i>
			</button>
			<button type="button" class="ipsButton ipsButton--text" data-ipstooltip title="{{#lang}}table_of_contents_increment{{/lang}}" data-role="increment" aria-label="{{#lang}}table_of_contents_increment{{/lang}}" >
				<i class="fa-solid fa-indent"></i>
			</button>
		</span>
		<button type="button" class="ipsButton ipsButton--negative" data-ipstooltip title="{{#lang}}table_of_contents_remove{{/lang}}" data-role="remove" aria-label="{{#lang}}table_of_contents_remove{{/lang}}" >
			<i class="fa-solid fa-times"></i>
		</button>
	{{/canEdit}}
</span>
`);

/**
 * Controls ajax load failed
 */
ips.templates.set('ips.ui.controls.cannot_load', `
<div class="{{{classList}}} ipsControls__fail-message">{{message}}</div>
`, {
    classList: 'ipsMessage ipsMessage--info',
    get message() {
        return ips.getString('ips.ui.controls.cannot_load')
    }
})