
ips.templates.set( 'moderatorPermissions.checkUncheckAll', "\
	<li class='ipsFieldRow'>\
		<div class='ipsFieldRow__label'>\
		</div>\
		<div class='ipsFieldRow__content'>\
			<ul class='ipsList ipsList--inline i-font-weight_500'>\
				<li><button type='button' data-role='checkAll'>{{#lang}}check_all{{/lang}}</button></li>\
				<li><button type='button' data-role='uncheckAll'>{{#lang}}uncheck_all{{/lang}}</button></li>\
			</ul>\
		</div>\
	</li>\
");