ips.templates.set('follow.frequency', "\
	{{#hasNotifications}}\
		<i class='fa-regular fa-bell'></i>\
	{{/hasNotifications}}\
	{{^hasNotifications}}\
		<i class='fa-regular fa-bell-slash'></i>\
	{{/hasNotifications}}\
	{{text}}\
");