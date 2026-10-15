/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.nav.js - AdminCP Nav
 *
 * Author: Rikki Tissier
 */
;( function($, _){
	"use strict";

	ips.controller.register('core.admin.core.nav', {

		_reordering: false,
		_orderChanged: false,
		_currentMenu: null,
		_menuTimer: null,

		initialize: function () {
			this.setup();

			this.on( document, 'click', '#acpMainArea', this.clickMainArea );
			this.on( 'click', '[data-action="reorder"]', this.startReorder );
			this.on( 'click', '[data-action="saveOrder"]', this.saveOrder );
		},

		setup: function () {
			const self = this;
			let activating;

			this._currentMenu = this.scope.find('.acpAppList_active');

			if( ips.utils.responsive.enabled() && ips.utils.events.isTouchDevice() && ips.utils.responsive.currentIs('tablet') ){
				this.on('click', '> li > a', this.handleTouchMenu);
			} else {
				$('#acpAppMenu').menuAim({
					rowSelector: "> #acpAppList > li:not( #elLogo )",
					enter: function (row) {
						if( $( row ).attr('id') === 'elReorderAppMenu' || $( row ).attr('id') === 'elHideMenu' ){
							activating = self.scope.find('.acpAppList_active');
						}

						if( self._menuTimer ){
							clearTimeout( self._menuTimer );
						}
					},
					activate: function (row) {
						if( $( row ).attr('id') === 'elReorderAppMenu' || $( row ).attr('id') === 'elHideMenu' ){
							activating.addClass('acpAppList_active');
						} else {
							$( row ).addClass('acpAppList_active');
						}
					},
					deactivate: function (row) {
						$( row ).removeClass('acpAppList_active');
					},
					exitMenu: function () {
						self._menuTimer = setTimeout( function () {
							self.scope.find('.acpAppList_active').removeClass('acpAppList_active');
							self._currentMenu.addClass('acpAppList_active');
						}, 2000 );

						return false;
					}
				});
			}
		},

		/**
		 * Event handler for touch devices; shows the sub menu on first tap
		 *
		 * @param {Event} e
		 *
		 * @returns 	{void}
		 */
		handleTouchMenu(e) {
			// If we've already activated it, just go to the link
			if( $( e.currentTarget ).hasClass('acpAppList_active') && $( e.currentTarget ).find('> .acpAppList__sub:visible').length ){
				return;
			}

			e.preventDefault();

			// Otherwise, deactivate other menus, show this one
			this.scope.find('.acpAppList_active').removeClass('acpAppList_active').find('> .acpAppList__sub').hide();
			$( e.currentTarget )
				.closest('li')
					.addClass('acpAppList_active')
					.find('> .acpAppList__sub').show();
		},

		/**
		 * Hides the submenu when the main body is clicked on
		 *
		 * @returns 	{void}
		 */
		clickMainArea() {
			if( ips.utils.responsive.enabled() && ips.utils.events.isTouchDevice() && ips.utils.responsive.currentIs('tablet') ){
				this.scope.find('.acpAppList_active .acpAppList__sub').hide();
			} else {
				if( !this._reordering ){
					$('#acpAppList')
					.removeClass('acpAppList_childHovering')
					.find('> li')
						.trigger('mouseleave');
				}
			}
		},

		/**
		 * Starts the tab reordering interface by building drag handles for each tab
		 * and setting up sortable
		 *
		 * @returns 	{void}
		 */
		startReorder() {
			const self = this;

			this.scope.find('> li:not( #elReorderAppMenu ):not( #elHideMenu ) > a').each( function () {
				$( this ).append( ips.templates.render('core.appMenu.reorder') );
			});

			this.scope.find('h3').each( function () {
				$( this ).prepend( ips.templates.render('core.appMenu.reorder') );
			});

			ips.utils.anim.go( 'zoomIn', this.scope.find('[data-role="reorder"]') );

			this.scope
				.addClass('acpAppList_reordering')
				.sortable({
					start(e, ui) {
						ui.item.addClass('acpAppList_dragging');
					},
					stop(e, ui) {
						ui.item.removeClass('acpAppList_dragging');
					},
					update() {
						self._orderChanged = true;
					}
				})
				.find('#elReorderAppMenu')
					.find('[data-action="reorder"]')
						.prop('hidden', true)
					.end()
					.find('[data-action="saveOrder"]')
						.prop('hidden', false)

			this.getSubMenus()
				.sortable({
					start(e, ui) {
						ui.item.addClass('acpAppList_dragging');
					},
					stop(e, ui) {
						ui.item.removeClass('acpAppList_dragging');
					},
					update() {
						self._orderChanged = true;
					}
				});

			this._reordering = true;
			this._orderChanged = false;
		},

		/**
		 * Gets a jquery selector containing the submenus of the tab
		 * @param {string|undefined}	[tab]	the tab to get the submenu of
		 * @return {*}
		 */
		getSubMenus(tab) {
			return this.scope.find('> li[data-tab' + (tab ? `="${tab}"` : ``) + ']').find("> ul, > .acpAppList__sub > ul");
		},

		/**
		 * Saves the new order of tabs, sending an ajax request with the new order
		 *
		 * @returns 	{void}
		 */
		saveOrder() {
			// Remove drag handles
			this.scope.find('[data-role="reorder"]').remove();

			// Get serialized list
			const tabOrder = this.scope.sortable('toArray', {attribute: 'data-tab'}).filter(i => !!i);
			const menuOrder = {};
			const self = this;

			// Get each submenu
			for (const val of tabOrder ) {
				if( val ){
					menuOrder[ val ] = self.getSubMenus(val).sortable( 'toArray', { attribute: 'data-menuKey' } )?.filter(i => !!i); // the first submenu item is an invisible header which is sorted as "".
					if (!Array.isArray(menuOrder[val])) {
						// delete menuOrder[val];
						ips.ui.alert.show({
							icon: 'warning',
							message: ips.getString('tab_order_not_saved')
						});
						throw new TypeError(`Couldn't get the submenu sortable`);
					}
				}
			};

			// Switch tbe buttons around
			this.scope
				.removeClass('acpAppList_reordering')
				.find('#elReorderAppMenu')
					.find('[data-action="reorder"]')
						.prop('hidden', false)
					.end()
					.find('[data-action="saveOrder"]')
						.prop('hidden', true);

			if( this._orderChanged ){
				ips.getAjax()('?app=core&module=system&controller=ajax&do=saveTabs', {
					data: {
						tabOrder,
						menuOrder
					},
					dataType: 'json',
					type: 'post'
				})
				.done(function () {
					ips.ui.flashMsg.show( ips.getString('tab_order_saved') );
				})
				.fail( function ( ) {
					ips.ui.alert.show({
						icon: 'warning',
						message: ips.getString('tab_order_not_saved')
					});
				});
			}
			this.scope.sortable( 'destroy' );
			this._reordering = false;
		}
	});
}(jQuery));