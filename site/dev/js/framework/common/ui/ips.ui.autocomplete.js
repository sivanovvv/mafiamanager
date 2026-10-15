/* global ips, _, Debug */
/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.autocomplete.js - Autocomplete widget for text fields
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.autocomplete', function(){

		const defaults = {
			multiValues: true,
			freeChoice: true,
			itemSep: { chr: ',', keycode: 188, charcode: 44 },
			disallowedCharacters: JSON.stringify( [ "<", ">", "'", "\"" ] ),
			unique: false,
			customValues: true,
			fieldTemplate: 'core.autocomplete.field',
			resultsTemplate: 'core.autocomplete.resultWrapper',
			resultItemTemplate: 'core.autocomplete.resultItem',
			tokenTemplate: 'core.autocomplete.token',
			addTokenTemplate: 'core.autocomplete.addToken',
			addTokenText: ips.getString( 'add_tag' ),
			queryParam: 'q',
			forceLower: false,
			minLength: 1,
			minAjaxLength: 1,
			commaTrigger: true,
			searchFieldThreshold: 10,
			suggestionsOnly: false
		};

		function respond (elem, options) {
			if( !$( elem ).data('_autocomplete') ){
				$( elem ).data('_autocomplete', autocompleteObj(elem, { ...defaults, ...options } ) );
			}
		}

		/**
		 * Destruct the autocomplete widget on this elem
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {void}
		 */
		function destruct (elem) {
			var obj = getObj( elem );

			if( obj !== undefined ){
				obj.destruct();
			}
		}

		/**
		 * Retrieve the autocomplete instance (if any) on the given element
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {mixed} 	The dialog instance or undefined
		 */
		function getObj (elem) {
			elem = $( elem );

			if( elem.data('_autocomplete') ){
				return elem.data('_autocomplete');
			} else if(  $( '[name="' + elem.attr('name') + '_original' + '"]' ).length &&  $( '[name="' + elem.attr('name') + '_original' + '"]' ).data('_autocomplete') ){
				return  $( '[name="' + elem.attr('name') + '_original' + '"]' ).data('_autocomplete');
			}

			return undefined;
		}

		ips.ui.registerWidget('autocomplete', ips.ui.autocomplete, [
			'multiValues',
			'freeChoice',
			'dataSource',
			'maxItems',
			'itemSep',
			'resultsElem',
			'unique',
			'commaTrigger',
			'fieldTemplate',
			'resultsTemplate',
			'resultItemTemplate',
			'tokenTemplate',
			'addTokenTemplate',
			'addTokenText',
			'queryParam',
			'minLength',
			'maxLength',
			'forceLower',
			'disallowedCharacters',
			'minAjaxLength',
			'suggestionsOnly'
		]);

		return {
			respond: respond,
			destruct: destruct,
			getObj: getObj
		};
	});

	/**
	 * autocomplete instance
	 *
	 * @param	{element} 	elem 		The element this widget is being created on
	 * @param	{object} 	options 	The options passed into this instance
	 * @returns {void}
	 */
	function autocompleteObj(elem, options, e) {

		let timer,
			blurTimer,
			lastValue = '',
			originalTextField,
			valueField,
			textField,
			dataSource,
			elemID = $( elem ).identify().attr('id'),
			wrapper,
			inputItem,
			resultsElem,
			selectedToken,
			disabled = false,
			required = false,
			tooltip = null,
			tooltipTimer = null,
			mouseOverResults = false,
			hasError = false;

		let _visible=false;
		let cleanupQueue = [];

		/**
		 * Resize observer that watches for
		 * @type {ResizeObserver}
		 * @private
		 */
		const _resizeObserver = new ResizeObserver(entries => {
			for (const entry of [...entries].reverse()) {
				if (entry.target instanceof HTMLElement && resultsElem && resultsElem.get(0) === entry.target) {
					_visible = !!(entry.borderBoxSize?.[0]?.blockSize && entry.borderBoxSize?.[0]?.inlineSize);
					break;
				}
			}
		});

		cleanupQueue.push(() => _resizeObserver.disconnect());

		/**
		 * Sets up this instance. The datasource object is chosen depending on what options and/or
		 * attributes are provided. We can fetch results from a local <datalist>, remotely via ajax
		 * or not look up results from a data source at all.
		 *
		 * @returns 	{void}
		 */
		function init() {
			if( $( elem ).is('textarea, input[type="text"], input[type="search"]') ){
				originalTextField = $( elem );
			} else {
				originalTextField = $( elem ).find('textarea, input[type="text"], input[type="search"]').first();
			}

			try {
				options.disallowedCharacters = JSON.parse( options.disallowedCharacters );
			} catch (err) {
				Debug.error("Couldn't parse disallowed characters option");
			}

			// Add our autocomplete wrapper to the page, and move the element into it
			_buildWrapper();

			// Set up the data source for this control
			_getDataSource();

			// Remove list from original field
			originalTextField.removeAttr('list');

			// Build the list
			if( dataSource.type != 'none' ){
				_buildResultsList();

				if( dataSource.type == 'local' )
				{
					_initAutocomplete();
				}

				// Set up events
				$([...resultsElem.find('input[type="search"]'), ...textField]).each(function() {
					this.addEventListener('input', _keyupAutocomplete);
					cleanupQueue.push(() => this.removeEventListener('input', _keyupAutocomplete));
				});
			}

			// Not sure why this is here, but it breaks toggles when the field is disabled by default
			// if( originalTextField.is(':disabled') ){
			// 	disabled = true;
			// }

			if( originalTextField.is('[required]') ){
				required = true;
				originalTextField
					.prop('required', false)
					.removeAttr('aria-required');
			}

			// Turn off autocomplete and spellcheck so the browser menu doesn't get in the way
			textField
				.prop( 'autocomplete', 'off' )
				.prop( 'spellcheck', false )
				.prop( 'disabled', disabled )
				.attr( 'aria-autocomplete', 'list' )
				.attr( 'aria-haspopup', 'true' )
				.attr( 'tabindex', originalTextField.attr('tabindex') || '' );

			if( options.maxLength ){
				textField.attr( 'maxlength', options.maxLength + 1 );
			}

            wrapper.on('click', function(e) {
				e.stopPropagation();
				return false;
			});

			// Set up events
			textField
				.on( 'focus', _focusField )
				.on( 'blur', _blurField )
				.on( 'keydown', _keydownField )
				.on( 'keyup', _keyupField )
				.on( 'keypress', _keypressField );

			wrapper
				.on( 'click', '[data-action="addToken"]', _clickAddToken )
				.on( 'keydown', _keydownWrapper )
				.on( 'propChanged', _propChanged )
				.toggleClass( 'ipsField_autocompleteDisabled', disabled );

			cleanupQueue.push(() => {
				// Clean up events
				textField
					.off( 'focus', _focusField )
					.off( 'blur', _blurField )
					.off( 'keydown', _keydownField )
					.off( 'keyup', _keyupField )
					.off( 'keypress', _keypressField );

				wrapper
					.off( 'click', '[data-action="addToken"]', _clickAddToken )
					.off( 'keydown', _keydownWrapper )
					.off( 'propChanged', _propChanged )
			})

			_buildInitialTokens();

			const onBlur = () => {
				// For closed tagging, our text field is the same element as the autocomplete widget
				// In that case, we don't want to blur otherwise we go into a death loop.
				if( textField !== elem ){
					textField.trigger('blur');
				}
			}

			elem
				.on( 'blur', onBlur)
				.trigger( 'autoCompleteReady', {
					elemID: elemID,
					elem: elem,
					currentValues: tokens.getValues()
				});

			// Some widgets like prefixedAutocomplete may not set up until after this UI module runs, so make sure we trigger the 'ready' event when needed
			elem.on( 'reissueReady', function() {
				elem.trigger( 'autoCompleteReady', {
					elemID: elemID,
					elem: elem,
					currentValues: tokens.getValues()
				});
			});

			cleanupQueue.push(() => {
				elem.off('blur', onBlur);
				elem.off('reissueReady');
			});
		}
		
		/**
		 * Destruct
		 * Removes event handlers assosciated with this instance
		 *
		 * @returns {void}
		 */
		function destruct() {
			cleanupQueue.forEach(cb => cb());
			cleanupQueue = [];
			$( document ).off( 'click', _documentClick );
		}

		/**
 		 * Determines whether any errors are present in the autocomplete widget (e.g. duplicates)
		 *
		 * @returns {void}
		 */
		function hasErrors() {
			return hasError;
		}

		/**
 		 * Responds to the propChange event, which we use to determine whether the original field has been toggled
		 *
		 * @returns {void}
		 */
		function _propChanged(e) {
			disabled = originalTextField.is(':disabled');

			wrapper.toggleClass( 'ipsField_autocompleteDisabled', disabled );
		}

		/**
 		 * Builds tokens from whatever values exist in the original text field
		 *
		 * @returns {void}
		 */
		function _buildInitialTokens () {
			var value = _getOriginalValue();
			
			if( !value ){
				return;
			}

			// Get individual values
			var splitValues = value.split("\n").filter(v => v !== '');
			var itemCount = 0;
			itemCount = splitValues.length;
			
			// Clear field, as tokens.add() will re-add value
			originalTextField.val('');

			if( splitValues.length ){
				for( var i = 0; i < itemCount; i++ ){
					_addToken( splitValues[i] );
				}
			}
		}

		/**
 		 * Returns the value from the original text field (i.e. the value provided by the backend on pag load)
		 *
		 * @returns {string}
		 */
		function _getOriginalValue () {
			return originalTextField.val();
			//return ips.utils.unescapeHTML( originalTextField.val() ).replace("&#039;", "'").replace("&apos;", "'");
		}

		/**
 		 * Builds the element that results will appear in
		 *
		 * @returns {void}
		 */
		function _buildResultsList () {
			if( options.resultsElem && $( options.resultsElem ).length ){
				resultsElem = $( options.resultsElem );
				_resizeObserver.observe(resultsElem.get(0), {box: 'border-box'});
				return;
			}

			var resultsList = ips.templates.render( options.resultsTemplate, {
				id: elemID
			});

			wrapper.append( resultsList );

			resultsElem = $('#' + elemID + '_results');

			resultsElem
				.on('mouseover', '[data-value]', function (e) {
					results.select( $( e.currentTarget ) );
				})
				.on('mouseenter', function () {
					mouseOverResults = true;
				})
				.on('mouseleave', function () {
					mouseOverResults = false;
				})
				.on('click', '[data-value]', function (e) {
					_addToken( $( e.currentTarget ).attr('data-value') );
					textField.trigger('focus');
				})
				.attr( 'aria-busy', 'false' );
			_resizeObserver.observe(resultsElem.get(0), {box: "border-box"});
		}

		/**
		 * Builds an autocomplete search field for the list of tokens
		 *
		 * @returns {void}
		 */
		function _initAutocomplete () {
			if( dataSource.totalItems() > options.searchFieldThreshold && !options.freeChoice ){
				var searchField = ips.templates.render( 'core.autocomplete.searchTypeAhead', {} );

				$(resultsElem).prepend( searchField );
			}
		}

		/**
		 * Character entered in the autocomplete field - update our results
		 *
		 * @param {InputEvent}	e
		 *
		 * @returns {void}
		 */
		const _keyupAutocomplete = ips.utils.throttle(function(e) {
			_loadResults(e.target.value);
			return true;
		}, 200);

		/**
 		 * Builds the wrapper element that looks like a text input, but allows us to insert
 		 * items as tokens
		 *
		 * @returns {void}
		 */
		function _buildWrapper () {
			var existingClasses = elem[0].className;
			
			$( elem )
				.after( ips.templates.render( options.fieldTemplate, {
					id: elemID
				}))
				.removeClass( existingClasses );

			wrapper = $(elem).parent().find( '#' + elemID + '_wrapper' );
			inputItem = $(wrapper).find( '#' + elemID + '_inputItem' );

			// If users have to choose from a predefined list, we'll hide the text field
			// and build a link which will show the results panel
			if( !options.freeChoice ){
				var insertElem = ips.templates.render(options.addTokenTemplate, {
					text: options.addTokenText
				});

				textField = elem;
			} else {
				var insertElem = $('<input/>').attr( {
					type: 'text',
					id: elemID + '_dummyInput'
				})
				.prop( 'autocomplete', 'off' );

				textField = insertElem;
			}

			// prevent the submission when the input is invalid
			if (options.suggestionsOnly) {
				const form = $(elem).closest('form').get(0)
				if (form) {
					const onSubmit = e => {
						// If there is a result that is not a token from autocomplete, prevent the submission
						if (_getCurrentValue() && !( $(elem).get(0).closest('.ipsFieldRow[hidden]') )) {
							e.preventDefault()
							e.stopPropagation()
							const warning = $(elem).get(0).closest('.ipsFieldRow__content')?.querySelector(".ipsFieldRow__warning")
							if (warning) {
								warning.innerHTML = ips.getString('form_autocomplete_bad')
							}
						}
					};
					form.addEventListener('submit', onSubmit);
					cleanupQueue.push(() => form.removeEventListener("submit", onSubmit));
				}
			}

			// Make a copy of the original text field using its name. This is because it's difficult to set
			// arbitrary values in the original text field later if it's associated with a datalist.
			var name = originalTextField.attr('name');

			originalTextField.attr( 'name', originalTextField.attr('name') + '_original' );
			valueField = $('<textarea/>').attr( 'name', name ).hide();

			originalTextField.hide();

			// Move any classnames on the original element onto our new wrapper to maintain styling,
			// then move the original element into our reserved list element
			wrapper
				.addClass( existingClasses )
				.append( elem )
				.append( valueField );

			inputItem
				.append( insertElem );

			wrapper.on('click', handleWrapperClick);
			cleanupQueue.push(() => wrapper.off('click', handleWrapperClick));
		}

		/**
		 * Handle a click on the wrapper
		 *
		 * @param {Event} e		The jquery click event
		 */
		function handleWrapperClick(e) {
			if (e.target instanceof HTMLElement && e.target.dataset.action === 'delete') {
				_deleteToken($(e.target.closest(`[data-value]`)));
			} else if (e.target instanceof HTMLElement && e.target.dataset.value !== undefined && !disabled) {
				tokens.select($(e.target));
			}
		}

		/**
 		 * Gets the apprioriate data source for this control
		 *
		 * @returns {void}
		 */
		function _getDataSource () {
			if( ( options.dataSource && options.dataSource.indexOf('#') === 0 && $( options.dataSource ).length ) ||
					originalTextField.is('[list]') ){
				dataSource = localData( 
					originalTextField.is('[list]') ? $('#' + originalTextField.attr('list') ) : options.dataSource,
					options
				);
			} else if( ips.utils.validate.isUrl( options.dataSource ) ){
				dataSource = remoteData( options.dataSource, options );
			} else {
				dataSource = noData();
			}
		}

		/**
 		 * When the wrapper is clicked, we see if a token was clicked. If it was, select it. If not, focus the textbox.
		 *
		 * @returns {void}
		 */
		function _clickWrapper (e) {
			if( $( e.target ).is('[data-token]') || $( e.target ).parents('li[data-token]').length ){
				var token = ( $( e.target )  );
			} else {				
				if( !$( e.target ).is( textField ) && ( !resultsElem || !$.contains( resultsElem.get(0), e.target ) ) ){
					textField.trigger('focus');
				}
			}
		}

		/**
 		 * Event handler for focusing on the text field
		 *
		 * @returns {void}
		 */
		function _clickAddToken (e) {
			e.preventDefault();

			if (_visible) {
				_closeResults();
			} else {
				_loadResults('');
			}
		}

		/**
 		 * Focus the autocomplete field
		 *
		 * @returns {void}
		 */
		function focus (e) {
			textField.trigger('focus');
		}

		/**
 		 * Event handler for focusing on the text field
		 *
		 * @returns {void}
		 */
		function _focusField (e) {
			// If there are no results, or the result panel is already visible, don't show it on focus
			if (dataSource.type === 'none' || _visible) {
				return;
			}

			_timerFocusField();
			// we don't need this; we use a debounced keypress event
			// timer = setInterval( _timerFocusField, 400 );
		}

		/**
 		 * Event handler for blurring on the text field
		 *
		 * @returns {void}
		 */
		function _blurField (e) {
			if( mouseOverResults ){
				return;
			}
			
			clearInterval( timer );

			setTimeout( _timerBlurField, 300 );
		}

		/**
 		 * Timed event hides the results list
		 *
		 * @returns {void}
		 */
		function _timerBlurField () {
			// See #47772
			/*if( dataSource.type == 'none' ){
				return;
			}*/

			if( textField.val() ){
				_addTokenFromCurrentInput();
			}

			_closeResults();
		}

		/**
 		 * Timed event, checks whether the value has changed, and fetches the results
		 *
		 * @returns {void}
		 */
		function _timerFocusField () {
			if( dataSource.type == 'none' ){
				return;
			}

			// Fetch the current item value
			var currentValue = _getCurrentValue();

			// If the value hasn't changed, we can leave
			if( currentValue == lastValue ){
				return;
			}

			lastValue = currentValue;

			_loadResults( currentValue );
		}

		/**
		 * Show the results list
		 * @template T
		 * @param {function:T}		[cb]		Callback to urn after showing/hiding the element. Only called if the element is actually shown
		 * @return {T}
		 * @private
		 */
		function _show(cb) {
			if (!_visible) {
				_visible = true;
				resultsElem?.show();
				return cb?.();
			}
		}

		/**
		 * Hide the results list
		 * @template T
		 * @param {function:T}        [cb]        Callback to urn after showing/hiding the element. Only called if the element is actually hidden
		 * @return {T}
		 * @private
		 */
		function _hide(cb) {
			if (_visible) {
				_visible = false;
				resultsElem?.hide();
				return cb?.();
			}
		}

		/**
 		 * Requests results from the data source, and shows/hides the loading widget
 		 * while that is happening.
		 *
		 * @returns {Promise<void>}
		 */
		async function _loadResults (value) {
			// is the value long enough
			if (dataSource.type === 'remote' && typeof options.minAjaxLength === "number" && value.length < options.minAjaxLength) {
				_hide(() => {
					resultsElem.attr( 'aria-busy', 'false' );
					_toggleLoading('hide');
				});

				return;
			}

			_show(() => {
				_toggleLoading('show');

				// Set elem to busy
				resultsElem.attr( 'aria-busy', 'true' );
			});

			// Get the results
			try {
				let results = (await dataSource.getResults(value));
				if (dataSource.type === 'local') {
					results = results?.slice(0,100);
				}
				_showResults(_processResults(results, value));
			} catch (e) {
				Debug.warn(e)
			}

			resultsElem.attr( 'aria-busy', 'false' );
			_toggleLoading('hide');
		}

		/**
 		 * Toggles the loading thingy in the control to signify data is loading
		 *
		 * @param 	{string} 	doWhat 	 Acceptable values: 'show' or 'hide'
		 * @returns {void}
		 */
		function _toggleLoading (doWhat) {
			if( doWhat == 'show' ){
				wrapper.addClass('ipsField_loading');
			} else {
				wrapper.removeClass('ipsField_loading');
			}
		}

		/**
 		 * Closes the suggestions menu, sets the aria attrib, and tells the data source
 		 * to stop loading new results
		 *
		 * @param {Event}		[e]
		 *
		 * @returns {void}
		 */
		function _closeResults (e) {
			e?.preventDefault();

			if( resultsElem && resultsElem.length ){
				_hide(() => {
					resultsElem.attr('aria-expanded', 'false');
				});

				if( resultsElem.find('input[type="search"]').length ){
					resultsElem.find('input[type="search"]').val('');
				}
			}

			dataSource.stop();
			$(document).off('click', _documentClick)
		}

		/**
 		 * Handles a click on the document, closing the results dropdown
		 *
		 * @param {{originalEvent: PointerEvent|MouseEvent}}	event		The jQuery event
		 *
		 * @returns {void}
		 */
		function _documentClick ({originalEvent: e}) {
			if (!resultsElem && !textField) {
				return;
			}

			if (!_visible) {
				return;
			}
			let target = e.target;
			const _resultElem = resultsElem ? $(resultsElem).get(0) : undefined;
			const _textField = textField ? $(textField).get(0) : undefined;
			while(target instanceof HTMLElement) {
				if (target === _resultElem || target === _textField) {

					return;
				}
				target = target.parentElement;
			}
			_closeResults();
		}

		/**
 		 * Processes the results that are returned by the data source
		 *
		 * @param {AutocompleteResult[]|undefined|null}	results
		 * @param {string}		text
		 *
		 * @returns {AutocompleteResult[]|Object.<string, AutocompleteResult>}
		 */
		function _processResults (results, text) {
			const existingTokens = tokens.getValues(),
				newResults = {};

			if( options.unique ){
				$.each( results, function (key, data) {
					let processedValue = ips.utils.escapeHTML(data.value).trim();
					if( options.forceLower ){
						processedValue = processedValue.toLowerCase();
					}
					if( !data.value || (( existingTokens ).indexOf( data.value ) === -1 && ( existingTokens ).indexOf( processedValue ) === -1 ) ){
						newResults[ key ] = data;
					}
				});

				return newResults;
			}

			return results;
		}

		/**
 		 * Gets the current item value from the text field
		 *
		 * @param {(string|*)[]}	results		The results
		 *
		 * @returns {string}
		 */
		function _showResults (results) {

			var output = '';

			$.each( results, function (idx, value) {
				output += ips.templates.render( options.resultItemTemplate, value );
			});
			
			if( resultsElem.attr('id') == ( elemID + '_results' ) ){
				_positionResults();
			}

			// no need for the following because we just set the inner html
			// We need to clear out the results element, but without removing our search field if it's present
			// resultsElem.find('[data-role="items"] li').remove();

			resultsElem
				.show()
				.attr('aria-expanded', 'true')
				.find('[data-role="items"]')
					.html( output );

			// Toggle the No results message
			resultsElem.find('[data-role="noresults"]').prop('hidden', Boolean(Object.keys(results).length));

			if( resultsElem.find('input[type="search"]').length ){
				resultsElem.find('input[type="search"]').trigger('focus');
			}

			// Allow the results to hide after they are visible; remove then add the listener prevents the listener from being added multiple times
			$( document ).off( 'click', _documentClick )
			let timeout = setTimeout(() => $( document ).on( 'click', _documentClick ));
			cleanupQueue.push(() => clearTimeout(timeout));
		}

		/**
 		 * Sizes and positions the results menu to match the wrapper
		 *
		 * @returns {void}
		 */
		function _positionResults () {
			ips.ui.zIndex();
		}

		/**
 		 * Gets the current item value from the text field
		 *
		 * @returns {string}
		 */
		function _getCurrentValue () {
			var value = textField.val();

			if( options.multiValues ){
				if( value.indexOf( options.itemSep.chr ) === -1 || !options.commaTrigger ){
					// Multi items, but only one entered so far
					return value.trim();
				} else {
					// Get the last-entered item
					var pieces = value.split( options.itemSep.chr );
					return pieces[ pieces.length - 1 ].trim();
				}
			} else {
				return value;
			}
		}

		/**
 		 * Event handler for keydown event in wrapper.
 		 * We check for esape here, because if options.freeChoice is disabled, there's no textbox to
 		 * watch for events. By watching for escape on the wrapper, we can still close the menu.
		 *
		 * @returns {void}
		 */
		function _keydownWrapper (e) {
			if( e.which == ips.ui.key.ESCAPE ){
				keyEvents.escape(e);
			}
		}

		/**
 		 * Event handler for keydown event in text field
		 *
		 * @returns {void}
		 */
		function _keydownField (e) {
			var ignoreKey = false;

			// Ignore irrelevant keycodes
			if( !_( [ ips.ui.key.UP, ips.ui.key.DOWN, ips.ui.key.LEFT, ips.ui.key.RIGHT,
						 ips.ui.key.ENTER, ips.ui.key.TAB, ips.ui.key.BACKSPACE, ips.ui.key.ESCAPE
					 ] ).contains( e.which ) ){
				ignoreKey = true;
			}
			
			var value = textField.val().trim();

			// If this is empty, remove errors
			if( !value.length ){
				hasError = false;
			}

			// If this is a normal key press and we're at our max length, prevent the keypress
			if( options.maxLength && value.length == options.maxLength && ignoreKey ){
				e.preventDefault();
				return;
			}

			// Check for duplicates if we're potentially adding a new tag
			if( _( [ ips.ui.key.ENTER, ips.ui.key.TAB ] ).contains( e.which ) && options.unique && _duplicateValue( value ) ){
				e.preventDefault();
				_showTooltip( ips.getString( 'ac_dupes' ) );
				return;
			}
			
			if( ignoreKey ){
				return;
			}

			switch(e.which){
				// Token keys
				case ips.ui.key.BACKSPACE:
					keyEvents.backspace(e);
				break;
				case ips.ui.key.TAB:
				case ips.ui.key.ENTER:
					keyEvents.enter(e);
				break;

				// Suggestions keys
				case ips.ui.key.UP:
					keyEvents.up(e);
				break;
				case ips.ui.key.DOWN:
					keyEvents.down(e);
				break;
				case ips.ui.key.ESCAPE:
					keyEvents.escape(e);
				break;
			}
		}

		/**
 		 * Event handler for keyup in the text field.
		 *
		 * @param {KeyboardEvent|Event}	e		The event
		 *
		 * @returns {void}
		 */
		function _keyupField (e) {
			// Check for prohibited characters
			var i;
			for( i in options.disallowedCharacters ){
				if ( textField.val().indexOf( options.disallowedCharacters[i] ) !== -1 ) {
					textField.val( textField.val().replace( options.disallowedCharacters[i], '' ) );
					_showTooltip( ips.getString( 'ac_prohibit_special', {
						chars: options.disallowedCharacters.join(' ')
					} ) );
					e.preventDefault();
					return;
				}
			}

			// 229 is the 'input waiting' keycode. We need to check for it here because on IME keyboards,
			// we won't necessarily get a real keycode. e.g. Chrome on android. Instead we need to see if
			// the comma character is in the input, and process it that way.
			var lastCharIsComma = ( textField.val().substr( textField.val().length - 1 ) === ',' );

			if( e.which === 229 && lastCharIsComma ){
				_addTokenFromCurrentInput();
				e.preventDefault();
			}
		}

		/**
 		 * Event handler for keypress in the text field.
		 *
		 * @returns {void}
		 */
		function _keypressField (e) {

			// If we aren't concerned about commas, we can stop here
			if( !options.commaTrigger ){
				return;
			}

			// Get rid of the comma
			textField.val( textField.val().replace(',', '') );

			// Check for duplicates if we're potentially adding a new tag by pressing comma
			if( e.charCode == options.itemSep.charcode && options.unique && _duplicateValue( textField.val() ) ){
				e.preventDefault();
				_showTooltip( ips.getString( 'ac_dupes' ) );
				return;
			}

			if( e.charCode == options.itemSep.charcode ){
				_addTokenFromCurrentInput();
				e.preventDefault();
			}
		}

		/**
 		 * A wrapper method for tokens.add which also clears the text field
 		 * and hides it if options.maxItems is reached
		 *
		 * @returns {void}
		 */
		function _addToken (value) {
			tokens.add( value );
			textField.val('');
			lastValue = '';

			if( options.maxItems && tokens.total() >= options.maxItems ){
				inputItem.hide();
			}

			if( options.unique && options.freeChoice == false && 
				dataSource.totalItems() !== -1 && dataSource.totalItems() <= tokens.total() ){
				wrapper.find('[data-action="addToken"]').hide();
			}

			// If we're here, remove any errors
			hasError = false;
		}

		/**
 		 * A wrapper method for tokens.remove which shows the text field if we're under
 		 * our options.maxItems limit
		 *
		 * @returns {void}
		 */
		function _deleteToken (token) {
			if( disabled ){
				return;
			}
			
			tokens.remove( token );
		}

		/**
 		 * Imperative event handler for handling individual key presses
 		 */
		const keyEvents = {

			/**
	 		 * Backspace handler. If the textfield is empty, we highlight the previous token.
	 		 * If a token is selected, hitting backspace deletes it.
			 *
			 * @param 	{event} 	e 		Event object
			 * @returns {void}
			 */
			backspace(e) {
				if( !textField.val() ){
					if( tokens.selected ){
						tokens.remove( tokens.selected );
					} else {
						if( inputItem.prev().length ){
							tokens.select( inputItem.prev() );
						}
					}
				}
			},

			/**
	 		 * Enter/tab handler. If text has been entered, we add it as a token, otherwise pass through
	 		 * to the browser to handle.
			 *
			 * @param 	{Event} 	e 		Event object
			 * @returns {void|boolean}
			 */
			enter(e) {
				if( e.which == ips.ui.key.TAB && textField.val() == '' ){
					return false;
				}

				e.preventDefault();

				const currentResult = results.getCurrent();
				let value = '';

				if( currentResult ){
					value = currentResult.attr('data-value');
				} else {
					if( options.commaTrigger ){
						value = _stripHTML( textField.val().replace( options.itemSep.chr, '' ) );
					} else {
						value = _stripHTML( textField.val() );
					}
				}

				if( !value ){
					return false;
				}

				_addToken( value );
			},

			/**
	 		 * Handler for 'up' key press. Selects previous item in the results list.
			 *
			 * @param {Event}	e
			 *
			 * @returns {void}
			 */
			up(e) {
				if (!resultsElem || !_visible) {
					return;
				}

				e.preventDefault();

				const selected = results.getCurrent();

				if( !selected ){
					results.selectLast();
				} else {
					const prev = results.getPrevious(selected);
					if (prev) {
						results.select( prev );
					} else {
						results.selectLast();
					}
				}
			},

			/**
	 		 * Handler for 'down' key press. Selects next item in the results list.
			 *
			 * @returns {void}
			 */
			down(e) {
				if (!_visible) {
					return;
				}

				e.preventDefault();

				const selected = results.getCurrent();

				if( !selected ){
					results.selectFirst();
				} else {
					const next = results.getNext(selected);
					if( next ){
						results.select( next );
					} else {
						results.selectFirst();
					}
				}

			},

			/**
	 		 * Handler for 'escape' key press. Closes the suggestions menu, if it's open.
			 *
			 * @param {Event}		e
			 *
			 * @returns {void}
			 */
			escape(e) {
				if (_visible) {
					e.stopPropagation?.();
					_closeResults();
				}
			}

		}

		/**
 		 * Object containing methods for dealing with the results list.
 		 */
		const results = {

			/**
	 		 * Deselects any selected results
			 *
			 * @returns {void}
			 */
			deselectAll() {
				resultsElem
					.find('[data-selected]')
					.removeAttr('data-selected');
			},

			/**
	 		 * Returns the currently selected result
			 *
			 * @returns {jQuery|$|void|boolean} 	Returns the jQuery object containing the selected result, or false
			 */
			getCurrent() {
				if( dataSource.type === 'none' ){
					return;
				}

				const cur = resultsElem.find('[data-selected]');

				if (cur.length && _visible) {
					return cur;
				} 

				return false;
			},

			/**
	 		 * Gets the result preceding the provided result
			 *
			 * @returns {element|boolean} 	Returns the jQuery object containing the selected result, or false
			 */
			getPrevious(result) {
				const prev = $(result).prev('[data-value]');

				if( prev.length ){
					return prev;
				}

				return false;
			},

			/**
	 		 * Gets the result following the provided result
			 *
			 * @returns {element|boolean} 	Returns the jQuery object containing the selected result, or false
			 */
			getNext(result) {
				const next = $(result).next('[data-value]');

				if( next.length ){
					return next;
				}

				return false;
			},

			/**
	 		 * Selects the first result
			 *
			 * @returns {void}
			 */
			selectFirst() {
				results.select( resultsElem.find('[data-value]').first() );
			},

			/**
	 		 * Selects the last result
			 *
			 * @returns {void}
			 */
			selectLast() {
				results.select( resultsElem.find('[data-value]').last() );
			},

			/**
	 		 * Selects the provided item
			 *
			 * @returns {void}
			 */
			select(result) {
				results.deselectAll();
				result.attr('data-selected', true);
			}
		}

		/**
 		 * Object containing token methods
 		 */
		const tokens = {

			selected: null,

			/**
	 		 * Adds a token to the control
			 *
			 * @param 	{string} 	value 	The value of this token
			 *
			 * @returns {boolean}
			 */
			add(value) {
				let html = '';

				value = ips.utils.escapeHTML( value ).trim();

				if( options.minLength && value.length < options.minLength ){
					return false;
				}

				if( options.maxLength && value.length > options.maxLength ){
					return false;
				}

				if( options.forceLower ){
					value = value.toLowerCase();
				}

				tokens.deselectAll();

				inputItem.before( ips.templates.render( options.tokenTemplate, {
					id: elemID,
					value: value,
					title: value
				}));

				if( resultsElem ){
					_closeResults();
				}

				// Update hidden textbox
				valueField.val( tokens.getValues().join( "\n" ) );

				if( dataSource.type !== 'none' ){
					html = resultsElem.find('[data-value="' + value.replace("\\", "\\\\") + '"]').html();
				} else {
					html = value;
				}

				$(elem).trigger('tokenAdded', {
					token: value,
					html: html,
					tokenList: tokens.getValues(),
					totalTokens: tokens.total()
				});

				return true;
			},

			/**
	 		 * Deletes the given token
			 *
			 * @param 	{element} 	token 	The token element to select
			 * @returns {void}
			 */
			remove(token) {
				if( tokens.selected === token ){
					tokens.selected = null;
				}

				const value = $(token).attr('data-value');
				$( token ).remove();

				if( options.maxItems && tokens.total() < options.maxItems ){
					inputItem.show();
				}

				if (options.unique && !options.freeChoice &&
					( dataSource.totalItems() === -1 || dataSource.totalItems() > tokens.total() ) ) {
					wrapper.find('[data-action="addToken"]').show();
				}
				
				// Update text field
				valueField.val( tokens.getValues().join( "\n" ) );

				$(elem).trigger('tokenDeleted', {
					token: value,
					tokenList: tokens.getValues(),
					totalTokens: tokens.total()
				});
			},

			/**
	 		 * Removes all tokens
			 *
			 * @returns {void}
			 */
			removeAll() {
				const allTokens = inputItem.siblings().filter('[data-value]');

				allTokens.each( function () {
					tokens.remove( $( this ) );
				});
			},

			/**
	 		 * Selects a given token
			 *
			 * @param 	{element} 	token 	The token element to select
			 * @returns {void}
			 */
			select(token) {
				tokens.deselectAll();
				tokens.selected = $( token ).addClass('cToken_selected');
			},

			/**
	 		 * Returns total number of tokens entered
			 *
			 * @returns {number}
			 */
			total() {
				return inputItem.siblings().filter('[data-value]').length;
			},

			/**
	 		 * Returns all the values
			 *
			 * @returns {(string|null)[]}
			 */
			getValues() {
				let values = [];
				const allTokens = inputItem.siblings().filter('[data-value]');

				if( allTokens.length ){
					values = Array.from(allTokens).map(item =>
						$(item).attr('data-value')
					);
				}

				return values;
			},

			/**
	 		 * Returns selected token value
			 *
			 * @returns {string|null} 	Value or null if no token selected
			 */
			getSelected() {
				return tokens.selected.attr('data-value');
			},

			/**
	 		 * Deselects all tokens
			 *
			 * @returns {void}
			 */
			deselectAll() {
				wrapper.find('[data-value]').removeClass('cToken_selected');
				tokens.selected = null;
			}
		}

		/**
 		 * Creates a token out of the current value in the text field
		 *
		 * @returns {void}
		 */
		function _addTokenFromCurrentInput () {
			let value = '';

			if( options.commaTrigger ){
				value = _stripHTML( textField.val().replace( options.itemSep.chr, '' ) );
			} else {
				value = _stripHTML( textField.val() );
			}

			if( options.minLength && value.length < options.minLength || options.maxLength && value.length > options.maxLength ){
				if( options.commaTrigger ){
					textField.val( textField.val().replace( options.itemSep.chr, '' ) );
				}
				return;
			}

			if (options.suggestionsOnly) {
				if (!resultsElem) {
					return
				}

				const results = [...resultsElem.find('[data-value]')]
				let valueInResults = false;
				for (const result of results) {
					if (result.dataset.value?.toLowerCase().trim() === value.toLowerCase().trim()) {
						valueInResults = true;
						value = result.dataset.value
						break;
					}
				}

				if (!valueInResults) {
					for (const result of results) {
						if (!options.unique || !_duplicateValue(result.dataset.value)) {
							value = result.dataset.value
							valueInResults = true;
							break;
						}
					}
				}

				// still here?
				if (!valueInResults) {
					return
				}
			}

			if( options.unique && _duplicateValue( value ) ){
				_showTooltip( ips.getString( 'ac_dupes' ) );
				return;
			}

			_addToken( value );
		}

		/**
 		 * Determines whether the value would be a duplicate
		 *
		 * @param 	{string} 	value 	Value to check
		 * @returns {boolean}
		 */
		function _duplicateValue (value) {
			return tokens.getValues().indexOf(value) !== -1;
		}

		/**
 		 * Removes special characters from text
		 *
		 * @returns {string}
		 */
		function _stripHTML (text) {
			return text.replace(/<|>|"|'/g, '');
		}

		/**
 		 * Shows a tooltip on the autocomplete with the provided message
		 *
		 * @param 	{string} 	msg 	Message to show
		 * @returns {void}
		 */
		function _showTooltip (msg) {
			if( !tooltip ){
				_buildTooltip();
			}

			// Set errors to true
			hasError = true;

			// If we're already showing a tooltip, remove the timeout before
			// showing this one.
			if( tooltipTimer ){
				clearTimeout( tooltipTimer );
			}

			tooltip.prop('hidden', true);
			tooltip.text( msg );

			tooltip.prop('hidden', false);

			// Hide it automatically in a few seconds
			tooltipTimer = setTimeout( function () {
				_hideTooltip();
			}, 2500);
		}

		/**
 		 * Hides the tooltip
		 *
		 * @returns {void}
		 */
		function _hideTooltip () {
			if( tooltip ){
				tooltip.prop('hidden', true);
			}
		}

		/**
 		 * Builds the tooltip element
		 *
		 * @returns {void}
		 */
		function _buildTooltip () {
			wrapper.append('<div class="ipsTooltip ipsTooltip--autoComplete" hidden></div>');
			tooltip = wrapper.find('.ipsTooltip--autoComplete');
		}

		init();

		return {
			init: init,
			destruct: destruct,
			hasErrors: hasErrors,
			addToken: tokens.add,
			getTokens: tokens.getValues,
			removeToken: tokens.remove,
			removeAll: tokens.removeAll,
			focus: focus
		};
	}

	/**
	 * @typedef AutocompleteResult
	 * @property {*}	id
	 * @property {*} 	value
	 * @property {string}	html
	 */

	/**
	 * Handler for local data retrieval
	 */
	function localData(source) {
		const valueOrderMap = new Map();
		const searchInterface = {
			type: 'local',

			_items:  $(source).get(0).querySelectorAll('option'),

			/**
			 * Searches through the source element, matching option values to our search string
			 *
			 * @param 	{string} text The text to search for
			 * @returns {Promise<AutocompleteResult[]>}
			 */
			async getResults(text) {
				return [...ips.utils.search.search(this, text)].sort((val1, val2) => valueOrderMap.get(val1) - valueOrderMap.get(val2))
			},

			/**
			 * Returns the number of items in the result set
			 *
			 * @returns {number}
			 */
			totalItems() {
				return ips.utils.search.getSize(this);
			},

			stop: $.noop,
		};

		const secondaryTerms = []
		let i = 0;
		for (const item of $(source).get(0).querySelectorAll('option')) {
			const value = {
				id: item.value,
				value: item.value,
				html: item.innerHTML
			}
			const searchTerms = item
				.innerText
				.trim()
				.replaceAll(/(\p{L}|\p{N})((?:\p{Upper}|_|-)[\p{Lower}\p{N}])/ug, "$1 $2")
				.replaceAll(/(\P{N})(\p{N}{3,})/ug, "$1 $2") // get "numeric" words... e.g. some_content_13435_rest
				.trim()
				.toLowerCase()
				.split(/\s+/)
				.map(term => ips.utils.search.fixTerm(term))
				.filter(term => !!term);

			ips.utils.search.addTerm(searchInterface, searchTerms.join(''), [value])
			valueOrderMap.set(value, i++);
			searchTerms.shift();
			// now, when there are split names, let's add them but AFTER the results where the first word matches. For example, "joe rogan" should always come after "ronald mcdonald" for the search "ro". To do this, "joe rogan" is added twice, once as "joe" then later as "rogan"
			while (searchTerms.length) {
				secondaryTerms.push([searchTerms.join(''), value])
				searchTerms.shift()
			}
		}

		for (const [searchTerm, item] of secondaryTerms) {
			ips.utils.search.addTerm(searchInterface, searchTerm, [item])
		}

		return searchInterface;
	}

	/**
	 * Handler for remote data retrieval
	 */
	function remoteData(source, options) {
		/**
		 * @type {Map<string, AutocompleteResult>}
		 */
		const results = new Map();

		/** @type {Map<string, string[]>} Map of the search string to the results */
		const responseItemCache = new Map();

		return {
			type: 'remote',

			/**
			 * Initiates either a remote search or a remote fetch
			 *
			 * @returns {Promise<AutocompleteResult[]>}
			 */
			async getResults(text) {
				if (!responseItemCache.has(text)) {
					const data = {dataType: 'json', data: {}}
					if (options.freeChoice) {
						if (options.minAjaxLength > text.length) {
							throw new RangeError(`Expected the text to be less than ${options.minAjaxLength} characters, got a string containing ${text.length} characters`);
						}

						data.data[options.queryParam] = text
					}

					/**
					 * @type {AutocompleteResult[]}
					 */
					const response = await ips.fetch(source, data)
					if (!Array.isArray(response) || response.some(item => !(typeof item === 'object' && 'value' in item))) {
						throw new TypeError(`Could not get autocomplete results from response.`);
					}

					response.forEach(item => {
						results.set(item.value, item);
					})

					responseItemCache.set(text, response.map(item => item.value));
				}

				return responseItemCache
					.get(text)
					.map(value => results.get(value));
			},

			/**
			 * Returns the number of items in the result set
			 *
			 * @returns {number}
			 */
			totalItems() {
				if (!options.freeChoice) {
					return results.size;
				}

				return -1;
			},

			stop: $.noop
		};
	}

	function noData() {
		return {
			type: 'none',
			getResults: $.noop,
			totalItems: -1,
			stop: $.noop
		};
	}

}(jQuery));

