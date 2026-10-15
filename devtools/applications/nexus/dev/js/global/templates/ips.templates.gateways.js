ips.templates.set('nexus.gateway.vaultAccount', " \
	<li>\
		<input type='radio' name='{{fieldName}}[stored]' value='{{value}}' id='{{fieldName}}_stored{{random}}' data-control='toggle' data-toggles='{{fieldName}}_existing' class='ipsInput ipsInput--toggle'>\
		<div class='ipsFieldList__content'>\
			<label for='{{fieldName}}_stored{{random}}'>{{label}}</label>\
		</div>\
	</li>\
");