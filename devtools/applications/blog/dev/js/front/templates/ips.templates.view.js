/* CLASS LIST TEMPLATES */
ips.templates.set('blog.view.addButton', "\
<li><button type=\"button\" class=\"ipsButton ipsButton--primary ipsHide\" data-action=\"addNew\">{{#lang}}manage_cats_new_row{{/lang}}</button></li>\
");

ips.templates.set('blog.view.categoryRow', "\
<li class=\"ipsData__item\" itemprop=\"itemListElement\" data-category-id=\"{{cat}}\">\
	<span data-role=\"sortHandle\" class=\"i-cursor_move\"><i class=\"fa-solid fa-bars\"></i></span>\
	<div class=\"ipsData__main i-flex i-gap_1\">\
		<span class=\"ipsData__title\" data-role=\"title_{{cat}}\">{{name}}</span>\
		<input type=\"text\" name=\"blog_name_{{cat}}\" value=\"\" data-role=\"input_{{cat}}\" class=\"ipsInput ipsHide\">\
		<button type='button' data-role=\"saveChanges\" data-category-id=\"{{cat}}\" class=\"ipsHide i-flex_00 ipsButton ipsButton--positive\">{{#lang}}save{{/lang}}</button>\
		<button type='button' data-role=\"cancelChanges\" data-category-id=\"{{cat}}\" class=\"ipsHide i-flex_00 ipsButton ipsButton--negative\">{{#lang}}cancel{{/lang}}</button>\
	</div>\
	<div class=\"cBlog_manage_edit ipsButtonGroup\">\
		<button type='button data-action=\"delete\" data-category-id=\"{{cat}}\" class=\"ipsButton\" data-ipstooltip title=\"{{#lang}}delete{{/lang}}\"><i class=\"fa-solid fa-circle-xmark\"></i></button>\
		<button type='button data-action=\"edit\" data-category-id=\"{{cat}}\" class=\"ipsButton\" data-ipstooltip title=\"{{#lang}}edit{{/lang}}\"><i class\=\"fa-solid fa-pencil\"></i></button>\
	</div>\
</li>\
");
