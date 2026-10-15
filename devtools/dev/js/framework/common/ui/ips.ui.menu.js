/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.menu.js - Menu component
 *
 * Author: Rikki Tissier
 */
;( function($){

	ips.createModule('ips.ui.menu', function(){

		var defaults = {
			className: 'ipsMenu',
			activeClass: '',
			closeOnClick: true,
			closeOnBlur: true,
			selectable: false,
			withStem: true,
			stemOffset: 16, // half the stem width
			stopLinks: false,
			above: 'auto'
		};

		var stems = ['topLeft', 'topRight', 'topCenter', 'bottomLeft', 'bottomRight', 'bottomCenter'];

		if( !defaults.withStem ){
			defaults.stemOffset = 0;
		}

		var _menuRegistry = {};

		/**
		 * Respond to a menu trigger being clicked
		 *
		 * @param	{element} 	elem 		The element this widget is being created on
		 * @param	{object} 	options 	The options passed into this instance
		 * @param	{event} 	e 		 	The event object
		 * @returns {void}
		 */
		var respond = function (elem, options, e) {
			e.preventDefault();

			var elemID = $( elem ).identify().attr('id'),
				options = { ...defaults, ...options };

			if( $( elem ).attr('data-disabled') || $( elem ).is(':disabled') ){
				return;
			}

			if( !$( elem ).data('_menuBody') ){
				var menu = _getMenu(elem, elemID, options);
				$( elem ).data('_menuBody', menu);
			} else {
				var menu = $( elem ).data('_menuBody');
			}

			if( !menu.length ){
				Debug.warn( "Couldn't find or build a menu for " + elemID );
				return;
			}

			$( window ).on( 'resize', function (e) {
				if( menu.is(':visible') ){
					menu.hide();
					_positionMenu( elem, elemID, options, menu, true );
					menu.show();
				} 				
			});

			// Show or hide the menu depending on visibility
			if( !menu.is(':visible') ){
				_showMenu( elem, elemID, options, menu, e );
			} else {
				_hideMenu( elem, elemID, options, menu, false );
			}
		},

		/**
		 * Shows the menu, and sets necessary events
		 *
		 * @param	{element} 	elem 		The element this widget belongs to
		 * @param	{string} 	elemID 		ID of the trigger element
		 * @param	{object} 	options 	The options passed into this instance
		 * @param	{element} 	menu 		The menu itself
		 * @param	{event} 	e 			The original event
		 * @returns {void}
		 */
		_showMenu = function ( elem, elemID, options, menu, e ) {
			if( options.closeOnBlur ){
				$( document ).on('click.' + elemID, (e) => _closeOnBlur(elem, menu, e));
			}

			$( menu )
				.on( 'closeMenu', (e) => _hideMenu(elem, elemID, options, menu, e ))
				.on( 'mouseenter', '.ipsMenu_subItems', _showSubMenu.bind( this, elem, elemID, options, menu ) );
				

			$( elem ).on( 'closeMenu', (e) => _hideMenu( elem, elemID, options, menu, false ) ); 

			menu.get(0).style.opacity = 0;
			menu.show();

			// Move it into place
			_positionMenu( elem, elemID, options, menu );

			menu.get(0).style.opacity = '';

			// Add active class to trigger
			$( elem ).addClass( options.activeClass );
			$( elem ).trigger('menuOpened', {
				elemID,
				originalEvent: e,
				menu
			});
			// in the transition to native events for v5, we also dispatch a native event
			$(elem).each((i, el) => {
				$(el).get(0)?.dispatchEvent(new MenuOpenedEvent(elemID, e, menu))
			})
		},

		/**
		 * Shows a submenu
		 *
		 * @param	{element} 	elem 		The element this widget belongs to
		 * @param	{string} 	elemID 		ID of the trigger element
		 * @param	{object} 	options 	The options passed into this instance
		 * @param	{element} 	menu 		The menu itself
		 * @param	{event} 	e 			The original event
		 * @returns {void}
		 */
		_showSubMenu = function ( elem, elemID, options, menu, e ) {
			var menuItem = $( e.currentTarget ).find('> a');
			var subMenu = menuItem.next('.ipsMenu');

			// Set the mouseleave event on this item
			$( e.currentTarget ).on( 'mouseleave', _hideSubMenu.bind( this, elem, elemID, options, menu ) );

			// Try and position the menu
			var itemPosition = ips.utils.position.getElemPosition( menuItem );
			var itemSize = ips.utils.position.getElemDims( menuItem );
			var subMenuSize = ips.utils.position.getElemDims( subMenu );
			
			// If we're in RTL, we should open to the left #attentionToDetail
			if( $('html').attr('dir') == 'rtl' ) {
				
				var left = ( itemSize.outerWidth - 5 );
				var top = menuItem.position()['top'] - 5;

				// If the submenu won't fit to the left of the item...
				if( ( itemPosition.viewportOffset.left - subMenuSize.outerWidth - 5 ) < 0 ){
					// ... See if it will fit to the right of the item...
					if( ( itemPosition.viewportOffset.right + 5 + subMenuSize.outerWidth ) <= $( window ).width() ){
						left = ( itemSize.outerWidth + 5 );
					} else {
						// ... but if not, position it *under* the item.
						// Since the submenu is pos relative to the parent item, we need to subtract the parent item pos from the ideal left pos
						left = 15 - itemPosition.absPos.left; 
						top = menuItem.position()['top'] + itemSize.height + 15;
					}
				}
	
				subMenu
					.css({
						left: left + 'px',
						top: top + 'px'
					})
					.show();
				
			} else {
							
				var left = ( itemSize.outerWidth - 5 );
				var top = menuItem.position()['top'] - 5;
	
				// If the submenu won't fit to the right of the item...
				if( ( itemPosition.viewportOffset.left + itemSize.outerWidth + subMenuSize.outerWidth - 5 ) > $( window ).width() ){
					// ... See if it will fit to the left of the item...
					if( ( itemPosition.viewportOffset.left + 5 - subMenuSize.outerWidth ) >= 0 ){
						left = ( ( subMenuSize.outerWidth * -1 ) + 5 );
					} else {
						// ... but if not, position it *under* the item.
						// Since the submenu is pos relative to the parent item, we need to subtract the parent item pos from the ideal left pos
						left = ( $( window ).width() - subMenuSize.outerWidth ) - itemPosition.absPos.left - 15; 
						top = menuItem.position()['top'] + itemSize.height + 15;
					}
				}
	
				subMenu
					.css({
						left: left + 'px',
						top: top + 'px'
					})
					.show();
			
			}
		},

		/**
		 * Hides submenus within the item identified by e.currentTarget
		 *
		 * @param	{element} 	elem 		The element this widget belongs to
		 * @param	{string} 	elemID 		ID of the trigger element
		 * @param	{object} 	options 	The options passed into this instance
		 * @param	{element} 	menu 		The menu itself
		 * @param	{event} 	e 			The original event
		 * @returns {void}
		 */
		_hideSubMenu = function ( elem, elemID, options, menu, e ) {
			var subMenus = $( e.currentTarget ).closest('.ipsMenu_item').find('.ipsMenu');
			subMenus.hide();
		},

		/**
		 * Hides the menu, and unsets necessary events
		 *
		 * @param	{element} 	elem 		The element this widget belongs to
		 * @param	{string} 	elemID 		ID of the trigger element
		 * @param	{object} 	options 	The options passed into this instance
		 * @param	{element} 	menu 		The menu itself
		 * @param	{boolean} 	immediate 	Whether to hide this immediately, or animate
		 * @returns {void}
		 */
		_hideMenu = async function ( elem, elemID, options, menu, immediate) {
			if( options.closeOnBlur ){
				$( document ).off('click.' + elemID );
			}

			if (!$(menu).is(":visible")) {
				return;
			}

			// Remove active class on trigger element
			$( elem ).removeClass( options.activeClass );

			// Cancel any animations, then hide it. After any animations created by hiding it are done, remove the event listeners
			await Promise.all(
				$(menu)
					.get(0)
					.getAnimations()
					.filter(() => !!immediate) // we only need to cancel if it's going to be immediately hidden
					.map(animation => {
						animation.pending && animation.cancel();
						return animation.finished;
					})
			);

			if (!immediate) {
				ips.utils.anim.go('fadeOut fast', menu);
				await Promise.all($(menu).get(0).getAnimations().map(animation => animation.finished));
			}

			$(menu).hide();
			$(elem).off('closeMenu');
			$(menu).off('closeMenu');

			$( elem ).trigger('menuClosed', { 
				elemID: elemID,
				menu: menu 
			});
		},

		/**
		 * Positions the menu correctly
		 *
		 * @param	{element} 	elem 		The element this widget belongs to
		 * @param	{string} 	elemID 		ID of the trigger element
		 * @param	{object} 	options		Options object
		 * @param	{element} 	menu 	 	The menu element
		 * @param 	{boolean}	repositioning	Whether we're repositioning a menu rather than showing it for the first time
		 *
		 * @returns {void}
		 */
		_positionMenu = function (elem, elemID, options, menu, repositioning) {
			ips.utils.position.startCaching();
			let above = options.above;
			const element = $(elem).get(0);
			const menuElement = $(menu).get(0);
			const {rect: docRect} = ips.utils.position.getElemRectAndStyle(document.documentElement);
			if (above === 'auto') {
				const {rect} = ips.utils.position.getElemRectAndStyle(element);
				const {rect: menuRect} = ips.utils.position.getElemRectAndStyle(menuElement);
				above = (rect.top + menuRect.height > window.innerHeight);
			}

			const positionInfo = {
				trigger: elem,
				target: menu,
				center: true,
				above,
				stemOffset: {left: options.stemOffset, top: -2}
			};

			// Reset menu positioning
			Object.assign(menuElement.style, {
				left: menuElement.style.left || '',
				top: menuElement.style.top || '',
				// position: 'static'
			});

			if (menuElement.dataset.originalwidth) {
				Object.assign(menuElement.style, {
					width: menuElement.dataset.originalwidth + 'px'
				});
			}

			const appendTo = options.appendTo ? _getAppendContainer( elem, options.appendTo ) : undefined;
			if (options.appendTo && appendTo?.length) {
				positionInfo.targetContainer = appendTo;
			}

			const menuPosition = ips.utils.position.positionElem(positionInfo);

			// Position the menu with the resulting styles
			Object.assign(menuElement.style, {
				left: menuPosition.left + 'px',
				top: menuPosition.top + 'px',
				position: ( menuPosition.fixed ) ? 'fixed' : 'absolute',
			});

			ips.utils.position.endCaching(menuElement);
			const menuDims = ips.utils.position.getElemDims(menu);

			// Only update zindex if we're showing afresh, rather than simply repositioning
			if (!repositioning) {
				ips.ui.zIndex();
			}

			// If the menu is wider than the window, reset some styles
			if ((menuDims.width > docRect.clientWidth) || (ips.utils.position.getElemRectAndStyle(menuElement).rect.left < 0)) {
				options.noStem = true;

				let left = "10px";

				// If we're appending somewhere else, we need to subtract the offset of it to get a value relative to the window
				if (options.appendTo && appendTo?.length) {
					left = (10 - $(appendTo).get(0).getBoundingClientRect().left) + 'px';
				}

				menuElement.dataset.originalwidth = menuDims.width;
				Object.assign(menuElement.style, {
					left,
					width: (docRect.width - 20) + 'px'
				})
			}

			// Remove existing stems
			_removeExistingStems(menu, options);

			// Add a stem if needed
			if (!menuElement.classList.contains(options.className + '_noStem') && !options.noStem) {
				menuElement.classList.add(options.className +
					'_' +
					menuPosition.location.vertical +
					menuPosition.location.horizontal.charAt(0).toUpperCase() +
					menuPosition.location.horizontal.slice(1)
				);
			}
			ips.utils.position.endCaching();
		},

		/**
		 * Removes any existing stem classes
		 *
		 * @param	{element} 	menu 	 	The menu element
		 * @param	{object} 	options		Options object
		 * @returns {void}
		 */
		_removeExistingStems = function (menu, options) {
			var stemClasses = [];

			$.each( stems, function (idx, value) {
				stemClasses[ idx ] = options.className + '_' + value;
			});

			menu.removeClass( stemClasses.join(' ') );
		},

		/**
		 * Returns the menu dom node, after setting appropriate events 
		 *
		 * @param	{element} 	elem 		The element this widget is being created on
		 * @param	{string} 	elemID 		ID of the trigger element
		 * @param	{object} 	options 	The options passed into this instance
		 * @returns {*} 	Returns the menu node, or false if it can't be found
		 */
		_getMenu = function (elem, elemID, options) {

			// We can find a menu either by ID, or by an option param
			let menu;

			// We can also build it from a provided JSON object
			if( $( '#'+options.menuID ).length ){
				menu = $( '#'+options.menuID );
			} else if( $( '#'+elemID+'_menu' ).length ){
				menu = $('#' + elemID + '_menu');
			} else if( options.menuContent ) {
				menu = buildMenuFromJSON( elem, elemID, options.menuContent );
			} else {
				return false;
			}

			// Move menu to appropriate place
			if( options.appendTo ){
				var appendTo = _getAppendContainer( elem, options.appendTo );

				if( appendTo.length ){
					appendTo.append( menu );	
				}				
			} else {
				ips.getContainer().append( menu );
			}

			// Event handler for clicking within the menu
			$( menu ).on('click.' + elemID, (e) => _menuClicked( elem, elemID, options, menu, e ) );

			// Add a reference to our trigger
			$( menu ).data('_owner', elem);

			// Add to registry
			_menuRegistry[ elemID ] = { elem: elem, options: options, menu: menu };

			return $(menu);
		},

		/**
		 * Event handler for clicking on the document, outside of the menu or trigger
		 *
		 * @param	{element} 	elem 		The element this widget is being created on
		 * @param	{element} 	menu 		The menu element
		 * @param	{Event} 	e 			The event object
		 * @returns {void} 	
		 */
		_closeOnBlur = function (elem, menu, e) {
			// Element isn't in the tree anymore? We don't care
			if (e?.target?.closest?.('body') !== document.body) {
				return;
			}

			// This function returns the trigger element that was clicked on, if any
			const clickedOnTrigger = function () {
				if ($(e.target).is('[data-ipsMenu]')) {
					return e.target;
				} else if ($(e.target).parent('[data-ipsMenu]')) {
					return $(e.target).parent('[data-ipsMenu]').get(0);
				}
			}();

			// Here we loop through each menu we have registered in order to close them
			// Don't hide the menu if:
			// 		- We clicked inside this menu, or
			// 		- We clicked the trigger element for this menu
			// If we have clicked on a trigger, we tell _hideMenu to do an immediate hide
			// so that it feels snappy to the user.
			$.each( _menuRegistry, function (key, value){
				var clickInMenu = _clickIsChildOfMenu( e.target, value.elem, value.menu.get(0) );

				if( value.elem ){
					if( clickInMenu || value.elem === clickedOnTrigger || $.contains( value.elem, e.target ) ){
						return;
					}
				}

				if( value.menu.is(':visible') ){
					_hideMenu( value.elem, key, value.options, value.menu, !!clickedOnTrigger );
				}
			});
		},

		/**
		 * Determines whether the clicked element is within a menu element
		 *
		 * @param	{element} 	clickTarget		The element directly clicked on
		 * @param	{element} 	triggerElem 	An element that triggers a menu
		 * @param	{element} 	menuElem 		The menu element opened by triggerElem
		 * @returns {boolean} 	Whether the click occurred within this menu 	
		 */
		_clickIsChildOfMenu = function (clickTarget, triggerElem, menuElem) {

			// Also check if this is within a jQuery date picker
			// Some jQUI elements are detatched from the dom by the time we get here, so we can't easily check its ancestors to 
			// figure out if it's in a datepicker. Instead, we'll check the classname applied to the clickTarget.
			if( typeof $( clickTarget ).get(0).className.valueOf() === "string" && ( $( clickTarget ).get(0).className.startsWith('ui-datepicker') || $( clickTarget ).closest('#ui-datepicker-div').length ) ) {
				return true;
			}

			if( clickTarget == menuElem || $.contains( menuElem, clickTarget ) ){
				return true;
			}			

			return false;
		},

		/**
		 * Main event handler for the menu itself
		 *
		 * @param	{event} 	e 		The event object
		 * @returns {void}
		 */
		_menuClicked = function (elem, elemID, options, menu, e) {


			if( $( e.target ).hasClass( options.className + '_item' ) ){
				var itemClicked = $( e.target );
			} else {
				var itemClicked = $( e.target ).parents( '.' + options.className + '_item' );
			}

			if( itemClicked.length === 0 ){
				return;
			}

			if( options.stopLinks ){
				e.preventDefault();
			}

			if( itemClicked.hasClass( options.className + '_itemDisabled') || itemClicked.is(':disabled') ){
				return;
			}
			
			if( options.closeOnClick ){
				if( itemClicked.find('[data-action="ipsMenu_ping"]').length ){
					e.preventDefault();
					itemClicked.find('[data-action="ipsMenu_ping"]').each( function () {
						ips.getAjax()( $( this ).attr('href') ).done( function () {
							$( elem ).trigger( 'menuPingSuccessful', {} );
						});
					});
				}
				
				// Cause the selected item to blink briefly, then add
				// a short delay before hiding the menu				
				var addItemClicked = function () {
					itemClicked.addClass( options.className + '_itemClicked');
				};

				var removeItemClicked = function () {
					itemClicked.removeClass( options.className + '_itemClicked');
				};

				if( e.button !== 1 ){
					setTimeout(addItemClicked, 100);
					setTimeout(removeItemClicked, 200);
					setTimeout(() => _hideMenu(elem, elemID, options, menu, false), 300);
				}
			}
			
			if( itemClicked.find('[data-role="ipsMenu_selectedText"]').length ){
				$( elem ).find('[data-role="ipsMenu_selectedText"]').html( itemClicked.find('[data-role="ipsMenu_selectedText"]').html() );
			}

			if( itemClicked.find('[data-role="ipsMenu_selectedIcon"]').length ){
				$( elem ).find('[data-role="ipsMenu_selectedIcon"]').replaceWith( itemClicked.find('[data-role="ipsMenu_selectedIcon"]').clone() );
			}

			var data = {
				triggerElem: elem,
				triggerID: elemID,
				menuElem: $( menu[0] ),
				originalEvent: e
			};

			if( options.selectable ){
				Object.assign( data, _handleSelectableClick( elem, elemID, options, menu, e ) );
			}
			
			if( itemClicked.attr('data-ipsmenuvalue') !== undefined ){
				Object.assign( data, { selectedItemID: itemClicked.attr('data-ipsmenuvalue') } );
			}

			$( elem ).trigger('menuItemSelected', data);
		},

		/**
		 * Handles toggling settings if this is a selectable menu
		 *
		 * @param	{event} 	e 		The event object
		 * @returns {void}
		 */
		_handleSelectableClick = function (elem, elemID, options, menu, e) {

			var thisItem = $( e.target ).closest( '.' + options.className + '_item' );

			if( !thisItem.length ){
				return;
			}
			if ( thisItem.attr('data-noselect') ){
				return;
			}

			if( options.selectable == 'radio' ){
				menu
					.find( '.' + options.className + '_itemChecked' )
					.removeClass( options.className + '_itemChecked' );
					
				thisItem
					.addClass( options.className + '_itemChecked' )
					.find('input[type="radio"]').prop( 'checked', true )
						.trigger('change');
			} else {
				if( thisItem.hasClass( options.className + '_itemChecked' ) ){
					thisItem
						.removeClass( options.className + '_itemChecked' )
						.find('input[type="checkbox"]').prop( 'checked', false )
							.trigger('change');
				} else {
					thisItem
						.addClass( options.className + '_itemChecked' )
						.find('input[type="checkbox"]').prop( 'checked', true )
							.trigger('change');
				}					
			}			

			// Get selected items
			var selectedItems = menu.find( '.' + options.className + '_itemChecked' ),
				selected = {};

			$.each( selectedItems, function (idx, item) {
				selected[ $( item ).identify().attr( 'id' ) ] = item;
			});

			return {
				selectedItems: selected
			};
		},

		/**
		 * Gets the element into which the menu will be inserted.
		 * We support a comma-delimited list of selectors, and will choose the first that exists.
		 * If an ID is provided, match it explicitly. Other selectors are based on a match with .closest().
		 *
		 * @param 	{element} 	elem 		The trigger element
		 * @param	{string} 	appendTo 	The value from options.appendTo
		 * @returns {element}
		 */
		_getAppendContainer = function (elem, appendTo) {
			const appends = appendTo.split(',');
			elem = $( elem );

			for (let append of appends) {
				const selector = append.trim();
				const jq = elem.closest(selector);
				if (jq.length) {
					return jq;
				}

				if (selector.startsWith('#')) {
					const jq = $(selector);
					if (jq.length) {
						return jq;
					}
				}
			}
		};

		// Register menu as a widget
		ips.ui.registerWidget('menu', ips.ui.menu, 
			[ 'className', 'menuID', 'closeOnClick', 'closeOnBlur', 'menuContent', 'appendTo',
				'activeClass', 'selectable', 'withStem', 'stemOffset', 'stopLinks', 'above' ],
			{ lazyLoad: true, lazyEvents: 'click' } 
		);

		return {
			respond
		};
	});

	class MenuOpenedEvent extends Event {
		/**
		 * An event that fires after a menu has been opened
		 *
		 * @param 	{string}	elemID				The html ID of the menu
		 * @param 	{Event}		originalEvent		The event that let to the opening of the menu
		 * @param 	{jQuery}	menu				The menu itself
		 */
		constructor(elemID, originalEvent, menu) {
			super('ipsMenuOpened');
			this.elemID = elemID;
			this.originalEvent = originalEvent;
			this.menu = menu
		}
	}

}(jQuery));