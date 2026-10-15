ips.templates.set('core.streams.teaser', `
	<li data-action='insertNewItems' class='ipsStream__loadMore' style='display: none'>
		<button>{{{words}}}</button>
	</li>
`);

ips.templates.set('core.streams.unreadBar', `
	<li data-role='unreadBar' class='ipsStreamItem_bar'><hr class='ipsHr'></li>
`);

ips.templates.set('core.streams.noMore', `
	<div class='ipsEmptyMessage i-padding_0' data-role="loadMoreContainer">
		{{#lang}}noMoreActivity{{/lang}}
	</div>
`);

ips.templates.set('core.streams.loadMore', `
	<a href='#' class='ipsButton ipsButton--inherit' data-action='loadMore'>{{#lang}}loadNewActivity{{/lang}}</a>
`);