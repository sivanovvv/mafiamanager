ips.templates.set( 'templates.customizationMedia.grid', "\
	<ul class='cMedia_manager__items'>\
		{{{contents}}}\
	</ul>\
");

ips.templates.set( 'templates.customizationMedia.noItems', "\
	<div class='i-text-align_center i-font-size_2 i-color_soft i-padding_4'>\
		{{#lang}}mediaEmptyFolder{{/lang}}\
	</div>\
");

ips.templates.set( 'templates.customizationMedia.noSearchResults', "\
	<div class='i-text-align_center i-font-size_2 i-color_soft i-padding_4'>\
		{{#lang}}mediaNoResults{{/lang}}\
	</div>\
");