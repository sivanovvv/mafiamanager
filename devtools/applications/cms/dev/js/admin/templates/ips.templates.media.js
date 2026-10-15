ips.templates.set( 'templates.media.grid', "\
	<ul class='ipsGrid ipsGrid--pages-media'>\
		{{{contents}}}\
	</ul>\
");

ips.templates.set( 'templates.media.noItems', "\
	<div class='i-text-align_center i-font-size_2 i-color_soft i-padding_4'>\
		{{#lang}}mediaEmptyFolder{{/lang}}\
	</div>\
");

ips.templates.set( 'templates.media.noSearchResults', "\
	<div class='i-text-align_center i-font-size_2 i-color_soft i-padding_4'>\
		{{#lang}}mediaNoResults{{/lang}}\
	</div>\
");