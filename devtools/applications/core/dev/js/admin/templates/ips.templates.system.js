ips.templates.set( 'menuManager.temporaryDropdown', "\
	<li class='ipsMenu_item {{#selected}}cMenuManager_active{{/selected}}' data-itemID='temp' data-role='menuItem'>\
		<span>\
			{{#lang}}menuManagerNewItem{{/lang}}\
			<ul class='cMenuManager_tools'>\
				<li>\
					<a href='#' data-action='removeItem' data-ipsTooltip title='{{#lang}}menuManagerRemoveItem{{/lang}}'>\
						<i class='fa-solid fa-xmark'></i></i>\
					</a>\
				</li>\
			</ul>\
		</span>\
	</li>\
");

ips.templates.set( 'menuManager.temporaryMenuItem', "\
	<li id='menu_{{id}}' data-role='menuNode'>\
		<div class='cMenuManager_leaf {{#selected}}cMenuManager_active{{/selected}}' data-itemID='temp' data-role='menuItem'>\
			<h3 class='cMenuManager_leafTitle'>{{#lang}}menuManagerNewItem{{/lang}}</h3>\
			<ul class='cMenuManager_tools'>\
				<li>\
					<a href='#' data-action='removeItem' data-ipsTooltip title='{{#lang}}menuManagerRemoveItem{{/lang}}'>\
						<i class='fa-solid fa-xmark'></i></i>\
					</a>\
				</li>\
			</ul>\
		</div>\
	</li>\
");


ips.templates.set( 'menuManager.emptyList', "\
	<li class='cMenuManager_emptyList i-color_soft i-text-align_center'>{{#lang}}menuManagerEmptyList{{/lang}}</li>\
");