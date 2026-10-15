ips.templates.set('club.request.approve', "\
	<span class='cClubRequestCover_icon i-background_positive'>\
		<i class='fa-solid fa-check'></i>\
	</span>\
	<br>\
	<span class='ipsBadge ipsBadge--large ipsBadge--positive'>{{#lang}}clubRequestApproved{{/lang}}</span>\
");

ips.templates.set('club.request.decline', "\
	<span class='cClubRequestCover_icon i-background_negative'>\
		<i class='fa-solid fa-xmark'></i>\
	</span>\
	<br>\
	<span class='ipsBadge ipsBadge--large ipsBadge--negative'>{{#lang}}clubRequestDenied{{/lang}}</span>\
");

ips.templates.set('club.menu.dragHandle', "\
	<span data-role='clubMenuDrag' style='display: none'><i class='fa-solid fa-bars'></i> &nbsp;</span>\
");