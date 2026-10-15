/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.pageAction.js - Page action widget
 * Converts a select box of actions (e.g. moderator actions) into a fancy floating button bar with menus.
 * The select should be formatted like the following example. Optgroups are turned into a menu, while options are
 * turned into buttons. optgroups and options can have a data-icon attribue to specify the icon to use.
 * @example
 * 
 *	<select>
 *		<optgroup label="Pin" data-action='pin' data-icon='thumb-tack'>
 *			<option value='pin'>Pin</option>
 *			<option value='unpin'>Unpin</option>
 *		</optgroup>
 *		<option value='split' data-icon='code-fork'>Split</option>
 *	</select>
 * 
 * Author: Matt Finger (based on file by Rikki Tissier)
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.pageAction', function() {
		class PageActionWidget extends ips.ui.BaseWidget {
			wrapper = null;
			initialized = false;
			id = "";
			_checkedItems = {};

			constructor(elem, options) {
				super(elem, options);
				this._setUpEvents();
				setTimeout(() => this.elem.trigger('pageActionReady'))
			}

			reset() {
				super.reset();
				this._checkedItems = {};
				this._updateBar();
			}

			/**
			 * Sets up events that this instance will watch for
			 *
			 * @returns 	{void}
			 */
			_setUpEvents() {
				this.on( 'change', 'input[type="checkbox"][data-actions]', this._toggleCheckbox );
				this.on( 'refresh.pageAction', this._refreshPageAction );
				this.on( 'addManualItem.pageAction', this._addManualItem );
			}


			/**
			 * Allows controllers to manually add an ID to the page action widget if necessary
			 *
			 * @param 		{event} 	e 		Event object
			 * @param 		{object} 	data 	Event data object, containing keys 'id' and 'actions'
			 * @returns 	{void}
			 */
			_addManualItem(e, data) {
				this._checkedItems[ data.id ] = data.actions;
				this._updateBar( true );
			}

			/**
			 * Called when the contents are refreshed. Loops through our checkedItems list, and checks any
			 * of the matching checkboxes found on the page.
			 *
			 * @returns 	{void}
			 */
			_refreshPageAction() {
				for (const key in this._checkedItems) {
					if (this.element.querySelector(`input[type="checkbox"][name="${key}"]`)) {
						this
							.elem
							.find(`input[type="checkbox"][name="${key}"]`)
							.prop('checked', true)
							.trigger('change');
					}
				}
			}

			/**
			 * Updates the display of the bar, including available actions and the count
			 *
			 * @param {Event}	e
			 *
			 * @returns 	{void}
			 */
			_toggleCheckbox(e) {
				const checkbox = $( e.currentTarget );

				if (checkbox.is(':checked')) {
					this._checkedItems[ checkbox.attr('name') ] = checkbox.attr('data-actions');
				} else {
					delete this._checkedItems[ checkbox.attr('name') ];
				}

				this._updateBar( true );
			}

			/**
			 * Updates the display of the bar, including available actions and the count
			 *
			 * @param {boolean}		[doImmediate=false]
			 *
			 * @returns 	{void}
			 */
			_updateBar(doImmediate=false) {

				if( !this.initialized ){
					// Build the action bar
					this._buildActionBar();
					doImmediate = true;
					this.initialized = true;
				}

				const possibleValues = this._getActionValues();
				const size = Object.keys(this._checkedItems).length;

				// Update the bar to show/hide appropriate buttons
				this._showCorrectButtons( possibleValues );

				// Update the 'with x selected' text
				this.wrapper.find('[data-role="count"]').text( ips.pluralize( ips.getString('pageActionText_number'), size ) );
				this.wrapper.attr("data-ipspageaction-selected-count", size);

				// Animate the wrapper as needed (fade out if none selected)
				if( !size ){
					if( doImmediate ){
						this.wrapper.hide();
					} else {
						ips.utils.anim.go( 'fadeOut fast', this.wrapper );
					}
				} else if( this.initialized ){
					if( this.wrapper.is(':visible') ){
						ips.utils.anim.go( 'pulseOnce fast', this.wrapper );
					} else {
						if( doImmediate ){
							this.wrapper.show();
						} else {
							ips.utils.anim.go( 'fadeIn', this.wrapper );
						}
					}
				}
			}

			/**
			 * Shows/hides the buttons on the action bar depending on the actions we need
			 *
			 * @param	{array} 	possibleValues		Array of action keys we want to show
			 * @returns {void}
			 */
			_showCorrectButtons(possibleValues) {
				// Hide/show each button as needed
				this.wrapper.get(0).querySelectorAll('[data-role="actionMenu"], [data-role="actionButton"]').forEach(el => {
					let show = false;
					let action = el.dataset.action;

					if (el.dataset.role === 'actionButton') {
						if (possibleValues.includes(action)) {
							show = true;
						}
					} else {
						const menuID = this.id + "_" + action + "_menu";
						document.querySelectorAll(`#${menuID} [data-ipsmenuvalue]`).forEach(menuValItem => {
							const menuAction = menuValItem.dataset.ipsmenuvalue;
							if (possibleValues.includes(menuAction)) {
								show = true;
								menuValItem.removeAttribute("data-disabled");
							} else {
								menuValItem.setAttribute("data-disabled", true);
							}
						});
					}

					// just in case legacy templates still have ipsHide set by default
					el.classList.remove('ipsHide');
					if (show) {
						el.removeAttribute('hidden')
					} else {
						el.setAttribute('hidden', '')
					}
				});
			}


			/**
			 * Event handler for clicking a button in the action bar
			 *
			 * @param	{Event} 	e			Event object
			 *
			 * @returns {void}
			 */
			_selectItem(e) {
				e.preventDefault();
				this._triggerAction( $( e.currentTarget ).attr('data-action') );
			}


			/**
			 * Event handler for a menu item being clicked
			 *
			 * @param	{Event} 	e			Event object
			 * @param	{object} 	data 		Event data object
			 *
			 * @returns {void}
			 */
			_selectMenuItem(e, data = e.detail) {
				e.preventDefault();

				if( data.originalEvent !== undefined ){
					data.originalEvent.preventDefault();
				}

				this._triggerAction( data.selectedItemID );
			}


			/**
			 * Triggers an action by setting the original select value and submitting the form
			 *
			 * @param	{string} 	action 		Action to trigger
			 *
			 * @returns {void}
			 */
			_triggerAction(action) {
				const tools = this.elem.find('[data-role="pageActionOptions"]');

				// Set the select to the value
				tools.find('select').val( action );

				// Add any missing checkboxes as hidden values in the form
				for (const key in this._checkedItems) {
					if ( !this.elem.find('input[type="checkbox"][name="' + key + '"]').length && !this.elem.find('input[type="hidden"][name="' + key + '"]').length ){
						this.elem.append( $('<input/>').attr( 'type', 'hidden' ).attr( 'name', key ).attr( 'data-role', "moderation" ).val(1) );
					}
				}

				// Add page number
				const page = ips.utils.url.getPageNumber('page');

				if (page !== undefined) {
					const pageNumber = $('<input/>').attr( 'type', 'hidden' ).attr( 'name', 'page' ).attr( 'value', ips.utils.url.getPageNumber('page') );
					tools.find('[type="submit"]').before( pageNumber );
					tools.closest('form').attr( 'action', tools.closest('form').attr( 'action' ) + '&page=' +ips.utils.url.getPageNumber('page') );
				}

				// Click submit
				tools.find('[type="submit"]').trigger('click');
			}


			/**
			 * Builds the action bar
			 *
			 * @returns {void}
			 */
			_buildActionBar() {
				let content = '';
				const select = this.element.querySelector('[data-role="pageActionOptions"] select');

				// Get ID of select
				this.id = $(select).identify().attr('id');
				for (const child of select.querySelectorAll(":scope > *")) {
					if (child.tagName.toLowerCase() === 'optgroup') {
						content += this._buildOptGroup(child, this.id);
					} else {
						content += this._buildOption(child, this.id);
					}
				}

				const bar = ips.templates.render('core.pageAction.wrapper', {
					content,
					id: this.id,
					selectedLang: ips.getString('pageActionText')
				});

				this.elem.after( bar );

				this.wrapper = this.elem.next();
				this.on( this.wrapper, 'click', '[data-role="actionButton"]', this._selectItem )
				this.on( this.wrapper, 'menuItemSelected', '[data-role="actionMenu"]', this._selectMenuItem );


				$( document ).trigger( 'contentChange', [ this.wrapper ] );
			}


			/**
			 * Build an option group menu for the action bar
			 *
			 * @param	{Element} 	optgroup	The optgroup element
			 * @param	{string} 	id 			The ID of the select control this optgroup belongs to
			 *
			 * @returns {string}	The built template
			 */
			_buildOptGroup(optgroup, id) {
				let content = '';
				for (const option of optgroup.querySelectorAll('option')) {
					content += ips.templates.render('core.menus.menuItem', {
						value: option.value,
						title: option.innerHTML,
						link: "#"
					});
				}

				return ips.templates.render('core.pageAction.actionMenuItem', {
					icon: optgroup.dataset.icon,
					title: optgroup.getAttribute('label'),
					id,
					action: optgroup.dataset.action,
					menucontent: content
				});
			}

			/**
			 * Build an option menu item for the action bar
			 *
			 * @param	{HTMLOptionElement} 	option 		The option element
			 * @param	{string} 	id 			The ID of the select control this option belongs to
			 *
			 * @returns {string} 	The built template
			 */
			_buildOption(option, id) {
				return ips.templates.render('core.pageAction.actionItem', {
					icon: option.dataset.icon,
					id,
					title: option.innerHTML,
					action: option.value
				});
			}

			/**
			 * Gets the action values from the provided checkboxes
			 *
			 * @returns {Array<string>}
			 */
			_getActionValues() {
				const values = new Set();
				for (const value of Object.values(this._checkedItems)) {
					value.split(" ").forEach(val => values.add(val));
				}

				return [...values];
			}

			/**
			 * Returns a jQuery object of the checked checkboxes
			 *
			 * @returns {jQuery}    Checkbox elements
			 */
			_getCheckedBoxes() {
				return this.elem.find('input[type="checkbox"][data-actions]:checked');
			}
		}

		return PageActionWidget.buildModuleAndRegisterWidget('pageAction', []);
	});
}(jQuery));