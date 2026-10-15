/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.sideMenu.js - Side menu widget. Simple widget that adds responsive interactivity to side menus
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.sideMenu', function(){

		var defaults = {
			type: 'radio',
			responsive: true,
			group: false
		};

		var respond = function (elem, options) {
			if( !$( elem ).data('_sidemenu') ){
				$( elem ).data('_sidemenu', sideMenuObj(elem, { ...defaults, ...options } ) );
			}
		};

		ips.ui.registerWidget( 'sideMenu', ips.ui.sideMenu, [
			'responsive', 'type', 'group'
		] );


		/**
		 * Side menu instance
		 *
		 * @param	{element} 	elem 		The element this widget is being created on
		 * @param	{object} 	options 	The options passed into this instance
		 * @returns {void}
		 */
		var sideMenuObj = function (elem, options) {

			var init = function () {
				if( options.responsive && ips.utils.responsive.enabled() ){
					$( elem ).on( 'click', '[data-action="openSideMenu"]', _toggleSideMenu );
				}

				// Set up event
				$( elem ).on( 'click', '.ipsSideMenu_item', _clickEvent );
				$( elem ).on( 'selectItem.sideMenu', _selectItem );
			},

			/**
			 * Handles click events on the items
			 *
			 * @param	{event} 	e 		Event object
			 * @returns {void}
			 */
			_clickEvent = function (e) {
				_doSelectItem( $( e.currentTarget ), e );
				_toggleSideMenu();
			},

			/**
			 * Handles a selectItem event
			 *
			 * @param	{event} 	e 		Event object
			 * @param	{object} 	data	Event data object
			 * @returns {void}
			 */
			_selectItem = function (e, data) {
				_doSelectItem( elem.find('[data-ipsMenuValue="' + data.value + '"]'), e );
			},

			/**
			 * Selects an item in the menu
			 *
			 * @param 	{element} 	item 	jQuery object containing the menu item to be selected
			 * @param	{event} 	e 		Event object
			 * @returns {void}
			 */
			_doSelectItem = function (item, e) {

				// We'll only handle the click in this widget if the item has a menu value attribute
				if( ( item.attr('data-ipsMenuValue') === undefined && !item.find('input[type="radio"], input[type="checkbox"]').length ) ||
						!item.length ){
					return;
				}

				if( e ){
					e.preventDefault();
				}

				// If this item is disabled, bail out
				if( item.hasClass('ipsSideMenu_itemDisabled') ){
					return;
				}

				var workingItems;

				if( !options.group ){
					workingItems = $( elem ).find('.ipsSideMenu_item');
				} else {
					workingItems = item.closest('.ipsSideMenu__list').find('.ipsSideMenu_item');
				}

				if( options.type === 'check' ){
					/** @type {HTMLElement} item */
					item = $(item).get(0);
					item
						.classList[item.classList.contains('ipsSideMenu_itemActive') ? 'remove' : 'add']('ipsSideMenu_itemActive');

					item
						.querySelectorAll('input[type="radio"], input[type="checkbox"]')
						.forEach(input => {
							input.checked = !input.checked;
							input.dispatchEvent(new CustomEvent('change', {bubbles: true}));
						});
				} else {
					const items = [...workingItems]
					items.forEach(item => {
						item.classList.remove('ipsSideMenu_itemActive')
						item.querySelectorAll('input[type="radio"], input[type="checkbox"]')
							.forEach(input => {
								if (input.checked) {
									input.checked = false;
									input.dispatchEvent(new CustomEvent('change', {bubbles: true}))
								}
							});
					});

					item = $(item).get(0);
					item.classList.add('ipsSideMenu_itemActive')
					item.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
						if (!input.checked) {
							input.checked = true;
							input.dispatchEvent(new CustomEvent("change", {bubbles: true}));
						}
					});
				}

				// Get all selected items
				var selectedItems = [];

				workingItems.filter('.ipsSideMenu_itemActive').each( function () {
					selectedItems.push( $( this ).attr('data-ipsMenuValue') );
				});

				$( elem ).trigger('itemClicked.sideMenu', {
					id: $( elem ).identify().attr('id'),
					menuElem: $( elem ),
					selectedElem: $(item),
					selectedItemID: $(item).attr('data-ipsMenuValue'),
					selectedItems: selectedItems
				});
			},

			/**
			 * Toggles the menu when in responsive mode
			 *
			 * @param	{Event} 	e 		Event object
			 * @returns {void}
			 */
			_toggleSideMenu = function (e) {
				if( e ){
					e.preventDefault();	
				}				

				// var menuContainer = $( elem ).find('.ipsSideMenu__menu');
				$(elem).toggleClass('ipsSideMenu_open');
				$(elem)
					.find('.ipsSideMenu__view')
					.each(function() {
						this.scrollIntoView({behavior: "smooth"})}
					);

				/* if( $( elem ).hasClass('ipsSideMenu_open') ){
					$( elem ).removeClass('ipsSideMenu_open');
				} else {
					$( elem ).addClass('ipsSideMenu_open');
					// ips.utils.anim.go('fadeIn', menuContainer );
				}*/
			};

			init();

			return {};
		};

		return {
			respond
		};
	});
}(jQuery));