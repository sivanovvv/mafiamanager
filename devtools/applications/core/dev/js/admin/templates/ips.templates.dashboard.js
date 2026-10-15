/* DASHBOARD TEMPLATES */
ips.templates.set('dashboard.widget', `
	<li id='elWidget_{{key}}' data-widgetKey='{{key}}' data-widgetName='{{name}}' data-widgetBy='{{by}}' style='display: none'>
		<div class='ipsBox acpWidget_item' data-ips-template='dashboard'>
			<h2 class='ipsBox__header' data-widgetcollapse>
				<span>{{name}} {{#by}}<span class='i-color_soft i-font-size_1 i-font-weight_normal'>By {{by}}</span>{{/by}}</span>
				<ul class='acpWidget_tools'>
					<li>
						<a href='#' class='acpWidget_reorder ipsJS_show i-cursor_move' data-ipsTooltip title='Reorder widget'><i class='fa-solid fa-arrows-up-down-left-right'></i></a>
					</li>
					<li>
						<a href='#' class='acpWidget_close' data-ipsTooltip title='Close widget'><i class='fa-solid fa-xmark'></i></a>
					</li>
				</ul>
			</h2>
			<div class='' data-role='widgetContent'>
				{{content}}
			</div>
		</div>
	</li>
`);