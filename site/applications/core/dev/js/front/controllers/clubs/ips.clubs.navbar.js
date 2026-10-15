/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.clubs.navbar.js - Club Navigation Manager
 *
 * Author: Daniel Fatkic
 */
;( function($){
	"use strict";

	ips.controller.register('core.front.clubs.navbar', {

		_interval: null,
		_sortableElem: null,

		initialize: function () {
			this.on( document, 'click', '[data-action="reorderClubmenu"]', this.startReorder );
			this.on( document, 'click', '[data-action="saveClubmenu"]', this.saveOrder );
			this.setup();
		},

		setup: function () {
			this._sortableElem = this.scope.find('[data-club-menu]');
		},

		/**
		 * Starts the tab reordering interface by building drag handles for each tab
		 * and setting up sortable
		 *
		 * @returns 	{void}
		 */
		startReorder: function (e) {
			e.preventDefault();

			$('[data-action="saveClubmenu"]').removeClass('ipsHide');
			$('[data-action="reorderClubmenu"]').parent().addClass('ipsHide');

			var self = this;
			this._sortableElem.find('a')
				.addClass('i-cursor_move')
				.prepend( ips.templates.render('club.menu.dragHandle') );

			ips.loader.get( ['core/interface/jquery/jquery-ui.js'] ).then( function () {
				self._sortableElem
					.sortable({
						items: '>',
						forcePlaceholderSize: true,
						update: function () {
							self._orderChanged = true;
						}
					});

				self._reordering = true;
				self._orderChanged = false;
				self._sortableElem.find('a [data-role="clubMenuDrag"]').fadeIn();
			});
		},

		/**
		 * Finish sorting
		 *
		 * @returns 	{void}
		 */
		_finishReorder: function () {
			this._sortableElem.find('a')
				.removeClass('i-cursor_move')
				.find('[data-role="clubMenuDrag"]')
					.remove();

			$('[data-action="saveClubmenu"]').addClass('ipsHide');
			$('[data-action="reorderClubmenu"]').parent().removeClass('ipsHide');
			this._sortableElem.sortable( 'destroy' );
			this._reordering = false;
		},

		/**
		 * Saves the new order of tabs, sending an ajax request with the new order
		 *
		 * @returns 	{void}
		 */
		saveOrder: function (e) {
			e.preventDefault();
			
			var self = this;
			var tabOrder = this._sortableElem.sortable( 'toArray', { attribute: 'data-tab'} );
			if( this._orderChanged ){
				ips.getAjax()( ips.getSetting('baseURL') + 'index.php?app=core&module=clubs&controller=view&do=saveMenu', {
					data: {
						tabOrder: tabOrder,
						id: this.scope.attr('data-clubID')
					},
					dataType: 'json',
					type: 'post'
				} )
					.done( function (response) {
						ips.ui.flashMsg.show( ips.getString('tab_order_saved') );
					})
					.fail( function ( ) {
						ips.ui.alert.show( {
							type: 'alert',
							icon: 'warning',
							message: ips.getString('tab_order_not_saved'),
							callbacks: {
								ok: function () {}
							}
						});
					})
					.always( function () {
						self._finishReorder();
					});
			} else {
				this._finishReorder();
			}
		}
	});
}(jQuery));