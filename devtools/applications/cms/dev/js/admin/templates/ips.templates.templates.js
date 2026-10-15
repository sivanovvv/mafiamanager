/* TEMPLATE EDITOR TEMPLATES */
/* TEMPLATECEPTION */
ips.templates.set('templates.editor.newTab', " \
	<a href='#' class='ipsTabs__tab' id='ipsTabs_elTemplateEditor_tabbar_tab_{{fileid}}' role='tab' aria-controls='ipsTabs_elTemplateEditor_tabbar_tab_{{fileid}}_panel' aria-selected='false' data-fileid='{{fileid}}' data-location='{{location}}'>{{title}} <span data-action='closeTab'><i class='fa-solid fa-xmark'></i></span></a>\
");

ips.templates.set('templates.editor.tabPanel', " \
	<div class='ipsTabs__panel' id='ipsTabs_elTemplateEditor_tabbar_tab_{{fileid}}_panel' role='tabpanel' aria-labelledby='ipsTabs_elTemplateEditor_tabbar_tab_{{fileid}}' hidden data-fileid='{{fileid}}' data-location='{{location}}' data-type='{{type}}' data-group='{{group}}' data-name='{{name}}' data-type='{{type}}' data-itemID='{{id}}' data-inherited-value='{{inherited}}'>\
		{{{content}}}\
	</div>\
");

ips.templates.set('templates.editor.tabContent', " \
	<input data-role='group' type='hidden' name='group_{{fileid}}' value=\"{{{group}}}\">\
	<input data-role='variables' type='hidden' name='variables_{{fileid}}' value=\"{{{variables}}}\">\
	<input data-role='title' type='hidden' name='title_{{fileid}}' value=\"{{{title}}}\">\
	<input data-role='description' type='hidden' name='description_{{fileid}}' value=\"{{{description}}}\">\
	<textarea data-fileid='{{fileid}}' id='editor_{{fileid}}'>{{{content}}}</textarea>\
");

ips.templates.set('templates.editor.unsaved', " \
	<i class='fa-solid fa-circle'></i>\
");

ips.templates.set('templates.editor.saved', " \
	<i class='fa-solid fa-xmark'></i>\
");

ips.templates.set('templates.editor.pagesDiffHeaders', " \
<div class='cTemplateMergeHeaders i-background_2'>\
	<div class='cTemplateMergeHeader'>\
		<div class='i-padding_2'><strong>{{#lang}}theme_diff_original_header{{/lang}}</strong> <span class='i-font-size_-1 i-color_soft'>{{#lang}}theme_diff_original_desc{{/lang}}</span></div>\
	</div>\
	<div class='cTemplateMergeHeader'>\
		<div class='i-padding_2'><strong>{{#lang}}theme_diff_custom_header{{/lang}}</strong> <span class='i-font-size_-1 i-color_soft'>{{#lang}}theme_diff_custom_desc{{/lang}}</span></div>\
	</div>\
</div>\
");