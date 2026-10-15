/* MENUS */
ips.templates.set('core.appMenu.reorder', " \
	<span data-role='reorder' style='display: none'><i class='fa-solid fa-bars'></i></span>\
");

/* CONTROL STRIP TEMPLATES */
ips.templates.set('core.controlStrip.menuItem', " \
	<li class='ipsMenu_item ipsControlStrip_menuItem' role='menuitem' id='{{id}}'>\
		{{{item}}}\
	</li>\
");

/* TREES */
ips.templates.set('core.trees.childWrapper', " \
	{{{content}}}\
");

ips.templates.set('core.trees.loadingRow', " \
	<ol class='ipsTree'><li class='ipsTree_loadingRow ipsLoading ipsLoading--tiny'>{{#lang}}loading{{/lang}}</li></ol>\
");

ips.templates.set('core.trees.loadingPane', " \
	<div class='ipsLoading' style='height: 150px'>&nbsp;</div>\
");

ips.templates.set('core.trees.noRows', " \
	<div class='i-text-align_center i-padding_3 i-color_soft'>{{#lang}}no_results{{/lang}}</div>\
");

/* LIVE SEARCH */
ips.templates.set('core.livesearch.noResults', " \
	<li class='i-text-align_center i-padding_3 i-color_soft' data-role='result'>\
		<br><br>\
	</li>\
");

/* LANGUAGES */
ips.templates.set('languages.translateString', " \
	<div class='cTranslateTable_field'>\
		<textarea class='ipsInput'>{{value}}</textarea>\
		<button type='button' href='#' data-action='saveWords' tabindex='-1' class='ipsButton ipsButton--positive ipsButton--tiny ipsButton--icon'><i class='fa-solid fa-check'></i> {{#lang}}languageSave{{/lang}}</button>\
	</div>\
");

/* Guide search result */
ips.templates.set('support.guideSearch', " \
	<li>\
		<a href=\"{{link}}\" target='_blank' rel='noopener'>{{title}}</a>\
	</li>\
");
ips.templates.set('support.guideSearch.noResults', " \
	<li class='i-color_soft'>\
		{{#lang}}no_results{{/lang}}\
	</li>\
");

ips.templates.set('support.ticket.supportSummary', " \
	<div class='i-padding-top_3'>\
		{{#lang}}health_ticket_beforeproceeding{{/lang}}\
	</div>\
");