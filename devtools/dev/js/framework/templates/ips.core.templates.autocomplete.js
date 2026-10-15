
ips.templates.set('core.autocomplete.field', " \
	<div class='ipsInput ipsField_autocomplete ipsAutoComplete' id='{{id}}_wrapper' role='combobox' aria-autocomplete='list' aria-owns='{{id}}_results' style='anchor-name: --{{id}}'>\
		<span class='ipsField_autocomplete_loading' style='display: none' id='{{id}}_loading'></span>\
		<ul class='ipsAutoComplete__list' role='listbox'><li class='ipsAutoComplete__add' id='{{id}}_inputItem' role='option'>{{content}}</li></ul>\
	</div>\
");

ips.templates.set('core.autocomplete.addToken', " \
	<a href='#' data-action='addToken'><i class='fa-solid fa-tag i-margin-end_icon'></i>{{text}}</a> \
");

ips.templates.set('core.autocomplete.resultWrapper', " \
	<div class='ipsAutocompleteMenu' id='{{id}}_results' aria-expanded='false' style='display: none; position-anchor: --{{id}}'>\
		<ul class='ipsAutocompleteMenu_itemWrapper' role='listbox' aria-expanded='false' data-role='items'></ul>\
		<div class='ipsAutocompleteMenu_empty' data-role='noresults' hidden>{{#lang}}autocomplete_no_results{{/lang}}</div>\
	</div>\
");

ips.templates.set('core.autocomplete.searchTypeAhead', " \
	<div class='ipsAutocompleteMenu__search' data-role='autocompleteSearch'>\
		<input type='search' name='autocompleteSearch' placeholder='{{#lang}}autocomplete_search_placeholder{{/lang}}'>\
	</div>\
");

ips.templates.set('core.autocomplete.resultItem', " \
	<li class='ipsAutocompleteMenu_item' data-value='{{value}}' role='option'>\
		{{{html}}}\
	</li>\
");

ips.templates.set('core.autocomplete.tagsResultItem', " \
	<li class='ipsAutocompleteMenu_item' data-value='{{value}}' role='option'>\
		<div class='i-flex i-align-items_center'>\
			<div class='i-flex_11'>{{{html}}}</div>\
			{{#recommended}}\
				<span class='i-flex_00 i-color_positive'>{{#lang}}tag_recommended{{/lang}}\
			{{/recommended}}\
		</div>\
	</li>\
");

ips.templates.set('core.autocomplete.token', " \
	<li class='cToken' data-value='{{value}}' role='option'>\
		{{{title}}} <span class='cToken_close' data-action='delete'>&times;</span>\
	</li>\
");

ips.templates.set('core.autocomplete.assignmentAddToken', " \
	<a href='#' data-action='addToken'><i class='fa-regular fa-paper-plane'></i> {{text}}</a> \
");

ips.templates.set( 'core.autocomplete.assignmentResultItem', " \
	<li class='ipsAutocompleteMenu_item' data-value=\"{{value}}\" role='option'>\
	    {{#team}}\
		<div class='ipsPhotoPanel i-align-items_center'>\
			<i class='fa-solid fa-user-group i-font-size_3 i-text-align_center i-color_soft'></i>\
			<div>\
				<div><strong>{{{name}}}</strong></div>\
				<span class='ipsBadge ipsBadge--positive'>{{#lang}}assignment_team{{/lang}}</span>\
			</div>\
		</div>\
	    {{/team}}\
	    {{^team}}\
		<div class='ipsPhotoPanel'>\
			<span class='ipsUserPhoto ipsUserPhoto--tiny'><img src='{{{photo}}}' alt='' loading='lazy'></span>\
			<div>\
				<strong>{{{name}}}</strong><br>\
				<span class='i-color_soft'>{{{extra}}}</span>\
			</div>\
		</div>\
		{{/team}}\
	</li>\
");

ips.templates.set('core.autocomplete.memberItem', " \
	<li class='ipsAutocompleteMenu_item' data-value=\"{{value}}\" role='option'>\
		<div class='ipsPhotoPanel'>\
			<span class='ipsUserPhoto ipsUserPhoto--tiny'><img src='{{{photo}}}' alt='' loading='lazy'></span>\
			<div>\
				<strong>{{{name}}}</strong><br>\
				<span class='i-color_soft'>{{{extra}}}</span>\
			</div>\
		</div>\
	</li>\
");

ips.templates.set('core.autocomplete.optional', " \
	<a href='#' data-action='showAutocomplete' class='ipsButton i-font-size_-1 ipsButton--inherit'><i class='fa-solid fa-tags'></i><span>{{langString}}...</span></a>\
");