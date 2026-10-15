/* global ips, _, Debug */
/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.alert.js - Alert widget for alerts, prompts, confirms.
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.alert', function(){

		var respond = function (elem, options) {
			alertObj( options, elem );
		},

		show = function (options) {
			alertObj( options );
		};

		ips.ui.registerWidget('alert', ips.ui.alert, 
			[ 'message', 'type', 'icon', 'focus' ]
		);

		return {
			respond: respond,
			show: show
		};
	});

	/**
	 * Alert instance
	 *
	 * @param	{object} 	options 	The options passed into this instance
	 * @returns {void}
	 */
	var alertObj = function (options) {

		var alert = null,
			modal = null;

		var _defaults = {
			type: 'alert', // alert, confirm, prompt, verify
			message: ips.getString('generic_confirm'),
			buttons: {
				ok: ips.getString('ok'),
				cancel: ips.getString('cancel'),
				yes: ips.getString('yes'),
				no: ips.getString('no')
			},
			icon: 'info',
			showIcon: true,
			callbacks: {}
		};

		var _icons = {
			warn: 'fa-solid fa-triangle-exclamation',
			success: 'fa-solid fa-check-circle',
			info: 'fa-solid fa-circle-info',
			ok: 'fa-solid fa-check-circle',
			question: 'fa-solid fa-circle-question'
		};

		options = { ..._defaults, ...(options || {}) };

		/**
		 * Initialization
		 *
		 * @returns {void}
		 */
		var init = function () {
			// Build alert
			_buildAlert();
			_setUpEvents();
		},

		/**
		 * Set up events for the alert - button clicks, and document events for keyboard accessibility
		 *
		 * @returns {void}
		 */
		_setUpEvents = function () {
			alert.on( 'click', '[data-action]', _clickButton );
		},

		/**
		 *
		 * @param {KeyboardEvent}	e
		 * @private
		 */
		_keyPress = function(e) {
			if (!alert.get(0) || !document.documentElement.contains(alert.get(0))) {
				$(document).off('click', _keyPress);
			}
			let toClick;
			switch (e.key) {
				case 'Escape':
					toClick = alert.find(options.type === 'alert' ? '[data-action="ok"]' : '[data-action="cancel"], [data-action="no"]').get(0);
					break;
				case 'Enter':
					toClick = alert.find('[data-action="ok"], [data-action="yes"]').get(0);
					break;
			}

			if (toClick) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation?.();
				toClick.click();
			}
		},

		/**
		 * Event handler for clicking a button in the alert
		 * Looks for a callback to execute, then removes the alert from the dom
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		_clickButton = function (e) {
			var button = $( e.currentTarget );
			var action = button.attr('data-action');
			var value = null;

			if( options.type == 'prompt' ){
				value = alert.find('[data-role="promptValue"]').val();
			}

			if( typeof options.callbacks[ action ] === "function" ){
				options.callbacks[ action ]( value );
			}

			_remove();
		},

		/**
		 * Removes the alert from the dom
		 *
		 * @returns {void}
		 */
		_remove = function () {
			alert[0].close();
			// Remove alert from DOM once CSS transition has finished. We could use transitionend here, but a timeout is a simple approach for the moment.
			setTimeout(() => {
				alert.remove();
			}, 500);
		},

		/**
		 * Builds the alert element based on options
		 *
		 * @returns {void}
		 */
		_buildAlert = function () {

			var parts = {},
				buttons = [];

			// Icon
			if( options.showIcon ){
				parts.icon = ips.templates.render( 'core.alert.icon', {
					icon: _icons[ options.icon ] || options.icon
				});
			}

			parts.id = 'alert_' + ( Math.round( Math.random() * 10000000 ) );
			parts.text = options.message;

			if( options.subText ){
				parts.subtext = ips.templates.render( 'core.alert.subText', {
					text: options.subText
				});
			}

			if( options.subTextHtml ){
				parts.subtext = ips.templates.render( 'core.alert.subTextHtml', {
					text: options.subTextHtml
				});
			}

			// Build buttons
			switch( options.type ){
				case 'alert':
					buttons.push( ips.templates.render( 'core.alert.button', {
						action: 'ok',
						title: options.buttons.ok,
						extra: 'ipsButton--primary'
					}));
				break;
				case 'confirm':
				case 'prompt':
					buttons.push( ips.templates.render( 'core.alert.button', {
						action: 'ok',
						title: options.buttons.ok,
						extra: 'ipsButton--primary'
					}));
					buttons.push( ips.templates.render( 'core.alert.button', {
						action: 'cancel',
						title: options.buttons.cancel,
						extra: 'ipsButton--inherit'
					}));
				break;
				case 'verify':
					buttons.push( ips.templates.render( 'core.alert.button', {
						action: 'yes',
						title: options.buttons.yes,
						extra: 'ipsButton--primary'
					}));
					if( options.buttons.no ){
						buttons.push( ips.templates.render( 'core.alert.button', {
							action: 'no',
							title: options.buttons.no,
							extra: 'ipsButton--inherit'
						}));
					}
					if( options.buttons.cancel ){
						buttons.push( ips.templates.render( 'core.alert.button', {
							action: 'cancel',
							title: options.buttons.cancel,
							extra: 'ipsButton--inherit'
						}));
					}
				break;
			}

			parts.buttons = buttons.join('');

			// Prompt?
			if( options.type == 'prompt' ){
				parts.text += ips.templates.render( 'core.alert.prompt');
			}

			// Build box
			var tmpAlert = $.parseHTML( ips.templates.render( 'core.alert.box', parts ).trim() );
			alert = $( tmpAlert[0] );
			$('body').append( alert );
			alert[0].showModal();

			// Focus the appropriate element
			if( options.focus ){
				alert
					.find('[data-action="' + options.focus + '"]')
						.trigger('focus');
			} else {
				if( options.type == 'prompt' ){
					alert
						.find('[data-role="promptValue"]')
							.val( options.value || '' )
							.trigger('focus');
				} else {
					alert
						.find('[data-action="ok"], [data-action="yes"]')
							.trigger('focus');
				}
			}
		};

		init();

	};
}(jQuery));