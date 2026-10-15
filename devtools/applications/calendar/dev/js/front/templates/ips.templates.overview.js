ips.templates.set("eventLoading", `
	<li class='ipsData__item ipsData__item--loading'>
		<div class="ipsData__image" aria-hidden="true"></div>
		<div class="ipsData__content">
			<div class="ipsData__main">
				<div class="ipsData__title"></div>
				<div class="ipsData__desc"></div>
			</div>
		</div>
	</li>
`);

ips.templates.set("nearMe", `
	<i-data>
		<ul class='ipsData ipsData--grid ipsData--events-list ipsEventList ipsEventList--nearMe'>
			<li class="ipsData__item ipsEventsNearMe__map"><div class='cEvents__skeleton cEvents__skeleton--map' id='map'></div></li>
			{{{events}}}
		</ul>
	</i-data>
`);