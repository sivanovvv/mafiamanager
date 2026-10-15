/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.system.upgradeManualQuery.js - Widget to run a query with a check for timeouts
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	ips.controller.register('core.admin.system.upgradeManualQuery', {

		initialize: function () {
			this.scope.find('[data-role="runManualButton"]').css({'display':'inline'});
			
			this.on( 'click', '[data-action="runQuery"]', this.runQuery );
		},
		
		runQuery: function (e) {
			this.scope.find('[data-role="querySuccessButtons"]').hide();
			this.scope.css({'opacity':"0.5"}).addClass('ipsLoading');
			
			ips.getAjax()( this.scope.attr('data-url'), { timeout: 30000 } )
				.done(function(response){
					if ( response.runManualQuery ) {
						this.scope.find('[data-action="redirectContinue"]').trigger('click');
					} else {
						this.runQueryFailed();
					}
				}.bind(this))
				.fail(function(a,b,c){
					this.runQueryFailed();
				}.bind(this));
		},
		
		runQueryFailed: function() {
			this.scope.css({'opacity':"1"}).removeClass('ipsLoading');
			this.scope.find('[data-role="querySuccessButtons"]').show();
			this.scope.find('[data-role="runManualButton"]').hide();
			
			ips.ui.alert.show( {
				type: 'alert',
				icon: 'warn',
				message: ips.getString('delta_upgrade_run_manual_query_fail_title'),
				subText: ips.getString('delta_upgrade_run_manual_query_fail_desc')
			});
		}
	});
}(jQuery));