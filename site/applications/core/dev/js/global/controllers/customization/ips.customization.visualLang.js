/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.customization.visualLang.js - Visual language editor controller
 *
 * Author: Mark Wade & Rikki Tissier
 */
;( function($){
	"use strict";

	ips.controller.register('core.global.customization.visualLang', {

		timeout: null,

		initialize: function () {
			this.on( document, 'mousedown', 'span[data-vle]', this.mouseDownLang );
			this.on( document, 'mouseup mouseleave', 'span[data-vle]', this.mouseUpLang );
			this.on( document, 'keypress', 'input[type="text"][data-role="vle"]', this.keyPressEditBox );
			this.on( document, 'blur', 'input[type="text"][data-role="vle"]', this.blurEditBox );
			this.on( document, 'contentChange', this.contentChange );
			this.setup();
		},

		/**
		 * Set up visual editor
		 * Prepares text nodes for editing, and removes any stragglers
		 *
		 * @returns {void}
		 */
		setup: function () {
			var self = this;

			this._boundHandler = this._preventDefaultHandler.bind(this);

			// Remove the VLE tag from the title
			this._removeLangTag('title');

			$( document ).ready( function () {
				self._setUpTextNodes('body');
				self._removeLangTag('body');
				self.scope.trigger('vleDone');
			});
		},

		/**
		 * Inits VLE on a changed dom element
		 *
		 * @returns {void}
		 */
		contentChange: function (e, data) {
			this._setUpTextNodes( data );
			this._removeLangTag( data );
		},

		/**
		 * Event handler for mousedown on document
		 * Sets a timeout so that editing only happens after 1 second
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		mouseDownLang: function (e) {
			this.timeout = setTimeout(() => this._enableLangEditing(e), 1000);
		},

		/**
		 * Event handler for mouseup on document
		 * Clears timeout
		 *
		 * @returns {void}
		 */
		mouseUpLang: function () {
			clearTimeout( this.timeout );
		},

		/**
		 * Event handler for keypress in an editing input box
		 * Blurs input if enter is pressed
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		keyPressEditBox: function (e) {
			if( e.keyCode == ips.ui.key.ENTER ){
				e.stopPropagation();
				$( e.currentTarget ).trigger('blur');
				return false;
			}
		},

		/**
		 * Event handler for blur on editing input box
		 * Sends the new value via ajax, and removes the editing box
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		blurEditBox: function (e) {
			var inputNode = $( e.currentTarget );
			var value = inputNode.val();
			var safeValue = encodeURIComponent( value );
			var elem = inputNode.closest('[data-vle]');
			var url = '?app=core&module=system&controller=vle&do=set';

			if( value == elem.attr('data-original') || value == '' ){
				elem.html( elem.attr('data-original') );				
			} else {
				inputNode
					.val('')
					.addClass('ipsField_loading');
								
				ips.getAjax()( url + '&key=' + elem.attr('data-vle') + '&value=' + safeValue )
					.done( function (response) {
						// Update the original value
						ipsVle[ elem.attr('data-vle') ] = response;
						elem.attr('data-original', response);
						$(document).find('[data-vle="' + elem.attr('data-vle') + '"]').html( response );
					})
					.fail( function () {
						Debug.log( url + '&key=' + elem.attr('data-vle') + '&value=' + safeValue );
					 	
					 	elem.html( inputNode.attr('data-original') );

						ips.ui.alert.show( {
							type: 'alert',
							icon: 'warn',
							message: ips.getString('js_login_both'),
						});
					});
			}

			var parentLink = elem.closest('a');

			if( parentLink.length ){
				parentLink.off( 'click', this._boundHandler );

				if( parentLink.attr('data-vleHref') ){
					parentLink.attr('href', parentLink.attr('data-vleHref') ).removeAttr('data-vleHref');
				}
			}
		},

		/**
		 * Event handler we can assign to prevent links from navigating
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		_preventDefaultHandler: function (e) {
			e.preventDefault();
		},

		/**
		 * Called when mouse has clicked on a string for 1 second
		 * Replaces the elem with a textbox containing the value to allow editing
		 *
		 * @param 	{event} 	e 	Event object
		 * @returns {void}
		 */
		_enableLangEditing: function (e) {
			var elem = $( e.currentTarget );
			var parentLink = elem.closest('a');

			if( parentLink.length ){
				parentLink
					.on( 'click', this._boundHandler )
					.attr( 'data-vleHref', parentLink.attr('href') )
					.attr( 'href', '#' );
			}

			var inputNode = $('<input/>')
								.attr( { type: 'text' } )
								.addClass( 'ipsField_loading ipsField_vle' )
								.attr( 'data-role', 'vle' );

			elem.html('').append( inputNode );

			// Fire an ajax request to get the raw language string, then update the text box with the returned value
			ips.getAjax()( '?app=core&module=system&controller=vle&do=get&key=' + elem.attr('data-vle') )
				.done( function (response) {
					console.log( elem.attr('data-vle') );
					inputNode
						.val( response )
						.attr( { 'data-original': response } )
			 			.removeClass('ipsField_loading')
			 			.trigger('focus')
			 			.select()
				})
				.fail( function () {
					ips.ui.alert.show( {
						type: 'alert',
						icon: 'warn',
						message: ips.getString('js_login_both'),
					});
				});

		},

		/**
		 * Removes stray language tags from the provided element
		 *
		 * @param 	{element} 	element 	Element from which to remove tags
		 * @returns {void}
		 */
		_removeLangTag: function (element) {
			// element may be undefined
			if( element === undefined )
			{
				return;
			}

			var elem = $( element );
			elem.contents().filter(function() { return this.nodeType === 3 || this.tagName === "LABEL" || this.tagName === "SPAN"; }).each(function(){
				$(this).replaceWith( $(this).text().replace( /#VLE#(.+?)#!#/gm, function(match, key) {
					return ( ipsVle.hasOwnProperty(key) && ipsVle[key] !== undefined ) ? ipsVle[key] : '';
				} ) );
			});
			elem.find('i[class]').each(function(){
				$(this).attr( 'class', $(this).attr('class').replace( /#VLE#(.+?)#!#/gm, function(match, key) {
					return ( ipsVle.hasOwnProperty(key) && ipsVle[key] !== undefined ) ? ipsVle[key] : '';
				} ) );
			});
			elem.find('[placeholder]').each(function(){
				$(this).attr( 'placeholder', $(this).attr('placeholder').replace( /#VLE#(.+?)#!#/gm, function(match, key) {
					return ( ipsVle.hasOwnProperty(key) && ipsVle[key] !== undefined ) ? ipsVle[key] : '';
				} ) );
			});
			elem.find('[title]').each(function(){
				$(this).attr( 'title', $(this).attr('title').replace( /#VLE#(.+?)#!#/gm, function(match, key) {
					return ( ipsVle.hasOwnProperty(key) && ipsVle[key] !== undefined ) ? ipsVle[key] : '';
				} ) );
			});
			elem.find('[aria-label]').each(function(){
				$(this).attr( 'aria-label', $(this).attr('aria-label').replace( /#VLE#(.+?)#!#/gm, function(match, key) {
					return ( ipsVle.hasOwnProperty(key) && ipsVle[key] !== undefined ) ? ipsVle[key] : '';
				} ) );
			});
		},

		/**
		 * Turns strings into editable spans in the provided element
		 *
		 * @param 	{element} 	element 	Element in which to replace language strings
		 * @returns {void}
		 */
		_setUpTextNodes: function ( element ) {
			// element may be undefined
			if( element === undefined )
			{
				return;
			}

			var regex = /#VLE#([0-9a-z_-]+?)#!#/igm;

			$( element )
				.find('*')
				.contents()
				.filter( function () {
					var elem = $( this );
					return !elem.is('iframe') && !elem.closest('[data-ipsEditor]').length && !elem.is('textarea') && ( elem.is('[value]') || this.nodeType == 3 );
				})
				.each( function (idx, elem) {
					var elem = $( elem );
					if( elem.get(0).nodeType === 3 ){
						// Text inputs
						elem.replaceWith( elem.text().replace( regex, function(match, key) {
							// Only replace if we know this key exists and isn't something made up
							if ( ipsVle.hasOwnProperty(key) && ipsVle[key] !== undefined ) {
								return '<span data-vle="' + key + '" data-original="' + ipsVle[key] + '">' + ipsVle[key] + '</span>';
							} else {
								return Debug.isEnabled() ? key : '';
							}
						} ) );
					} else if( elem.is('[value]') ){
						// Inputs
						if( elem.val() !== '' && elem.val().length){
							elem.attr( 'data-vle', elem.val().replace( regex, '$1' ) ).val( elem.val().replace( regex, function(match, key) {
								// Only replace if we know this key exists and isn't something made up
								if ( ipsVle.hasOwnProperty(key) && ipsVle[key] !== undefined ) {
									return ipsVle[key];
								} else {
									return Debug.isEnabled() ? key : '';
								}
							} ) );
						}
					}
				});
		}
	});
}(jQuery));