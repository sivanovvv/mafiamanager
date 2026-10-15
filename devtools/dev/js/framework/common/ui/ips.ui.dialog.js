/* global ips, _, Debug */
/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.ui.dialog.js - Popup dialog UI component
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	ips.createModule('ips.ui.dialog', function(){

		var defaults = {
			modal: true,
			extraClass: '',
			close: true,
			fixed: false,
			narrow: false,
			callback: null,
			forceReload: false,
			flashMessage: '',
			flashMessageTimeout: 2,
			flashMessageEscape: true,
			remoteVerify: true,
			remoteSubmit: false,
			destructOnClose: false,
			ajax: { type: 'get', data: {} }
		};

		/**
 		 * Respond to a dialog trigger
		 *
		 * @param	{element} 	elem 		The element this widget is being created on
		 * @param	{object} 	options 	The options passed
		 * @returns {void}
		 */
		var respond = function (elem, options, e) {
			e.preventDefault();

			// If no option URL and no local content is specified, see if we can use
			// the href of the source element
			if( !options.url && !options.content && $( elem ).attr('href') ){
				options.url = $( elem ).attr('href');
			}

			if( !$( elem ).data('_dialog') ){
				$( elem ).data('_dialog', dialogObj(elem, { ...defaults, ...options } ) );
			}

			$( elem ).data('_dialog').show();
		},

		/**
		 * Retrieve the dialog instance (if any) on the given element
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {mixed} 	The dialog instance or undefined
		 */
		getObj = function (elem) {
			if( $( elem ).data('_dialog') ){
				return $( elem ).data('_dialog');
			}

			return undefined;
		},

		/**
		 * Destruct this widget on this element
		 *
		 * @param	{element} 	elem 		The element to check
		 * @returns {void}
		 */
		destruct = function (elem) {
			var obj = getObj( elem );

			if( obj !== undefined ){
				obj.destruct();
				$( elem ).removeData('_dialog');
			}
		},

		/**
		 * Creates a dialog that is not attached to a specific element
		 *
		 * @param	{object} 	options 		Options passed to the dialog
		 * @returns {object} 	The dialog instance
		 */
		create = function (options) {
			return dialogObj( null, Object.assign({}, defaults, options ) );
		};

		ips.ui.registerWidget('dialog', ips.ui.dialog, [ 
			'url', 'modal', 'size', 'title', 'close', 'fixed', 'destructOnClose', 'extraClass',
			'callback', 'content', 'forceReload' , 'flashMessage', 'flashMessageTimeout', 'flashMessageEscape', 'remoteVerify', 'remoteSubmit'
		], { lazyLoad: true, lazyEvents: 'click' } );

		return {
			respond: respond,
			destruct: destruct,
			getObj: getObj,
			create: create
		};
	});

	/**
	 * Dialog instance
	 *
	 * @param	{element} 	elem 		The element this widget is being created on
	 * @param	{object} 	options 	The options passed into this instance
	 * @returns {void}
	 */
	var dialogObj = function (elem, options) {

		var dialog,
			ajaxObj,
			dialogID = '',
			elemID = '',
			dialogBuilt = false,
			contentLoaded = false,
			contentProcessors = []
		;

		/**
		 * Sets up this instance
		 *
		 * @returns 	{void}
		 */
		var init = function () {
			
			if( elem === null ){
				elemID = 'elem_' + ( Math.round( Math.random() * 10000000 ) );
			} else {
				elemID = $(elem).identify().attr('id');
			}

			dialogID = elemID + '_dialog';

			// We watch for this on the document, to give our pages a chance
			// to intercept the event and cancel it (e.g. an unsaved form)
			$( document ).on( 'closeDialog', closeDialog );

		},

		/**
		 * Destruct the dialog for this instance
		 *
		 * @returns 	{void}
		 */
		destruct = function () {
			clearTimeout(anchorClickTimeout);
			$( document ).off( 'closeDialog', closeDialog );

			if( dialog ){
				dialog.remove();
			}
		},

		anchorClickTimeout,

		/**
		 * Check if an anchor tag was clicked
		 * @param	{PointerEvent} e
		 */
		checkForAnchorClicks = e => {
			clearTimeout(anchorClickTimeout);
			// if the browser behavior of focusing the anchor is prevented, no need to close
			if (e.defaultPrevented) {
				return;
			}

			const link = e.target?.closest?.(`a[href*="#"]`);
			if (!link) {
				return;
			}

			const pageURL = new URL(window.location.href);
			pageURL.hash = "";

			const linkURL = new URL(link.href, window.location.href);
			const hash = linkURL.hash;
			linkURL.hash = "";

			// Does this link go to an anchor on this page?
			if (!hash || pageURL.toString() !== linkURL.toString()) {
				return;
			}

			// Do we know what the dialog is?
			const dialogEl = dialog[0];
			if (!dialogEl) {
				return;
			}

			// focusing somewhere inside the dialog? leave it open
			try {
				if (hash.startsWith('#') && dialogEl.querySelector(hash)) {
					return;
				}
			} catch (e) {} // possible the hash is not a valid ID, but this is more or less expected

			// Wait for any other click listeners to do their thing before closing the dialog
			anchorClickTimeout = setTimeout(() => {
				if (!e.defaultPrevented) {
					closeDialog(undefined, {dialogID});
				}
			}, 0);
		},

		/**
		 * Event handler for the closeDialog event
		 *
		 * @param 		{Event} 	[e] 		Event object
		 * @param 		{object} 	data 	Event data object
		 * @returns 	{void}
		 */
		closeDialog = function (e, data) {
			if( data && data.originalEvent ){
				data.originalEvent.preventDefault();
			}

			if( data && data.dialogID == dialogID ){
				hide();
			}
		},

		/**
		 * Hides this dialog
		 *
		 * @returns 	{Promise<void>}
		 */
		hide = function () {
			return new Promise(resolve => {
				try {
					clearTimeout(anchorClickTimeout);
					dialog[0]?.removeEventListener('click', checkForAnchorClicks);
					dialog[0]?.removeEventListener('toggle', toggleDialog);
					dialog.animationComplete(function () {
						if (options.forceReload || options.destructOnClose) {
							ips.controller.cleanContentsOf(dialog);
							dialog.find('.ipsDialog_content').html('');
						}

						$(elem || document).trigger('hideDialog', {
							elemID: elemID,
							dialogID: dialogID,
							dialog: dialog
						});

						if (options.destructOnClose) {
							ips.ui.dialog.destruct(elem);
						}

						resolve()
					});

					// Hide the dialog using the native .close() method
					if(dialog[0].open){
						dialog[0].close();
					}

				} catch (e) {}
			});
		},

		/**
		 * Toggle function runs whenever the dialog is opened/closed
		 *
		 * @param		{Event}		[e]	ToggleEvent
		 * @returns 	{void}
		 */
		toggleDialog = function(e){
			if(e.newState === "closed"){
				// Run the hide method when the dialog is closed declaratively
				hide();
			}
		},

		/**
		 * Public method for showing the dialog
		 * Builds local or remote dialog if necessary, then shows it
		 *
		 * @param		{bool}		[initOnly]	If TRUE, will create dialog but not show it
		 * @returns 	{void}
		 */
		show = function ( initOnly ) {
			if( options.url && !contentLoaded ){
				_remoteDialog( initOnly );
			} else if( !contentLoaded ) {
				_localDialog( initOnly );
			} else {
				if ( initOnly ) {
					return;
				}
				if (dialog.find( '.ipsDialog_content').length) {
					for (const processor of contentProcessors) {
						processor($(dialog.find( '.ipsDialog_content')).get(0))
					}
				}
				_showDialog();				
			}
		},

		/**
		 * Remove the dialog
		 *
		 * @returns 	{void}
		 */
		remove = function (hideFirst) {

			var doRemove = function () {
				if( ajaxObj && typeof ajaxObj.abort === "function" ){
					ajaxObj.abort();
				}

				// Remove the elements
				dialog.remove();

				// Not built
				dialog = null;
				dialogBuilt = false;
				contentLoaded = false;
				ajaxObj = null;
			};

			// If we're hiding first, we'll do it after the animation has finished
			if( hideFirst && dialog.is(':visible') ){
				hide().done( function () {
					doRemove();
				});
			} else {
				doRemove();
			}
		},

		/**
		 * Sets the dialog to 'loading' state.
		 * Hides the content, and adds a loading thingy.
		 *
		 * @returns 	{void}
		 */
		setLoading = function (loading) {
			dialog.find('.ipsDialog_loading').prop('hidden', !loading);
			dialog.find('.ipsDialog_content').prop('hidden', loading);
		},

		/**
		 * Updates the contents of the dialog
		 *
		 * @returns 	{void}
		 */
		updateContent = function (newContent) {
			dialog.find( '.ipsDialog_content' ).html( newContent );
			for (const processor of contentProcessors) {
				if (processor instanceof Function) {
					processor(dialog[0])
				}
			}
			
			$( document ).trigger('contentChange', [ dialog ]);
		},

		/**
		 * Add a content processor that accepts the HTML Element of the dialog and runs after the content is set but before the contentChange event fires
		 * This is useful to change the html before controllers and widgets initialize
		 *
		 * @param {function(Element)}		processor
		 */
		addContentProcessor = function(processor) {
			if (!(processor instanceof Function)) {
				throw new TypeError(`A non-function value was passed as a processor`);
			}
			contentProcessors.push(processor)
		},

		/**
		 * Internal method to actually show the dialog
		 * Triggers the openDialog event to let the document know
		 *
		 * @returns 	{void}
		 */
		_showDialog = function () {
			
			// Show dialog using native method
			dialog[0].showModal();

			$( elem || document ).trigger('openDialog', {
				elemID: elemID,
				dialogID: dialogID,
				dialog: dialog,
				contentLoaded: contentLoaded
			});

			// check for clicks on [a] tags where the href is an anchor elsewhere on the page
			dialog[0]?.addEventListener('click', checkForAnchorClicks);
		},

		/**
		 * Builds a dialog from remote content
		 *
		 * @param		{bool}	initOnly	If TRUE, will create dialog but not show it
		 * @returns 	{void}
		 */
		_remoteDialog = function ( initOnly ) {

			// Build dialog wrapper
			if( !dialogBuilt ){
				_buildDialog();
			}
			
			if ( initOnly ) {
				_fetchContent();
			} else {
				setLoading( true );
				_showDialog();			
				_fetchContent();
			}
			
			if( !options.forceReload ){
				contentLoaded = true;
			}
		},

		/**
		 * Builds a dialog from a local element
		 *
		 * @param		{bool}	initOnly	If TRUE, will create dialog but not show it
		 * @returns 	{void}
		 */
		_localDialog = function ( initOnly ) {

			if( !options.content && !$( options.content ).length ){
				Debug.warn("'content' option not specified for dialog, or element doesn't exist");
				return;
			}

			if( !dialogBuilt ){
				_buildDialog();
			}
			
			if ( initOnly ) {
				return;
			}

			dialog.find( '.ipsDialog_content').html( $( options.content ).first().show() );
			for (const processor of contentProcessors) {
				processor(dialog.find( '.ipsDialog_content').get(0))
			}

			_showDialog();

			if( !options.forceReload ){
				contentLoaded = true;
			}
		},

		/**
		 * Sets up this instance
		 *
		 * @returns 	{void}
		 */
		_fetchContent = function () {

			var deferred = $.Deferred();

			// Set content to loading
			setLoading( true );

			// Get the content
			ajaxObj = ips.getAjax()( options.url, {
				type: options.ajax.type,
				data: options.ajax.data
				} )
				.done( function (response) {

					// Set our content
					setLoading( false );
					updateContent( response );
					deferred.resolve();
					
					// Run callback
					if ( options.callback !== null ) {
						options.callback( dialog );
					}
										
					// Send trigger
					$( elem || document ).trigger('dialogContentLoaded', {
						elemID: elemID,
						dialogID: dialogID,
						dialog: dialog,
						contentLoaded: true
					});
				})
				.fail( function (jqXHR, status, errorThrown) {
					if( jqXHR.responseJSON ){
						ips.ui.alert.show({
							message: jqXHR.responseJSON,
						});
						setLoading(false);
						contentLoaded = false;
						hide();
					} else if( Debug.isEnabled() ){
						Debug.error( "Ajax request failed (" + status + "): " + errorThrown );
					} else if ( elem ) {
						window.location = elem.href;
					} else {
						ips.ui.alert.show({
							message: ips.getString('errorLoadingContent'),
						});
						setLoading(false);
						contentLoaded = false;
						hide();
					}

					deferred.reject();
				})
				.always( function () {
					//_removeLoadingWidget();
				});

			return deferred.promise();
		},

		/**
		 * Builds the dialog frame
		 *
		 * @returns 	{void}
		 */
		_buildDialog = function () {

			if( dialogBuilt ){
				return;
			}

			// Build dialog
			$('body').append(
				 ips.templates.render( 'core.dialog.main', {
					title: options.title || '',
					id: dialogID,
					close: options.close,
					size: options.size,
					extraClass: options.extraClass
				})
			);

			dialog = $( '#' + dialogID );

			$( dialog ).on('closeDialog', hide);

			dialog[0].addEventListener("toggle", toggleDialog);

			/* Add this listener for any dialog submission of a form that is intended to return a file. This listener also handles the updating of datalayer events */
			dialog[0]?.addEventListener('submit', async (e) => {
				let target = e.target;
				while (target instanceof HTMLElement && target !== dialog[0]) {
					if (target instanceof HTMLFormElement && target.matches('form[data-form-is-download]')) {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();

						const formData = new FormData(target);
						try {
							await ips.utils.fileDownload.download({
								url: target.action,
								formData,
								blobName: target.dataset.formDownloadName || dialog.find('.ipsDialog_title').text() || 'blob'
							});
							await hide();
							_fetchDataLayerEventsAfterSubmit();
						} catch (e) {
							try {
								Debug.log(e);
								if (e && e.xhr instanceof XMLHttpRequest) {
									let content;
									if (e.xhr.responseType === 'arraybuffer') {
										content = await (new Blob([e.xhr.response])).text()
									} else if (e.xhr.responseType === 'document') {
										content = e.xhr.responseXML;
									} else if (e.xhr.responseType === 'text') {
										content = e.xhr.responseText;
									}

									if (content && e.xhr.getResponseHeader('content-type').match(/^text\/html/)) {
										updateContent(content);
										return;
									} else if (e.xhr.getResponseHeader('content-type').match(/^(?:text|application)\/json/)) {
										if (content) {
											content = JSON.parse(content)
										} else if (e.xhr.responseType === 'json') {
											content = e.xhr.response;
										}

										if (typeof content === 'object' && content.message) {
											ips.ui.alert.show({message: content.message, callbacks: {ok() {hide()}}})
											return;
										}
									}

									throw e;
								}
							} catch (e) {
								ips.ui.alert.show({message: ips.getString('unexpected_error'), callbacks: {ok() {hide()}}})
								Debug.error(e)
							}
						}
						break;
					}
					target = target.parentElement;
				}
			}, {capture: true});

			if( options.remoteVerify || options.remoteSubmit ){
				dialog.find( '.ipsDialog_content' ).on('submit', function(e) {
					_ajaxFormSubmit(e, $( this ) );
				});
			}

			dialogBuilt = true;
		},

		/**
		 *
		 * @private
		 */
		_fetchDataLayerEventsAfterSubmit = function() {
			if (ips.getSetting('memberID')) {
				let redirected = false;
				const listener = () => {
					redirected = true;
				};
				window.addEventListener('popstate', listener, {once: true});
				setTimeout(() => {
					window.removeEventListener('popstate', listener);
					if (!redirected) {
						document.body.dispatchEvent(new CustomEvent('ipsDataLayerSync', {bubbles: true}));
					}
				}, 1000); // wait a sec to make sure that the page wasn't redirected
			}
		},
		
		/**
		 * Submit a form within the dialog using AJAX
		 *
		 * @param		{Event}		e			The submit event
		 * @param		{element} 	form 		The element this widget is being created on
		 * @returns		{void}
		 */
		_ajaxFormSubmit = function(e, form) {
			if (!($(form)?.get?.(0) instanceof HTMLFormElement)) {
				form = $(e.target)
			}
			if (!($(form).get(0) instanceof HTMLFormElement)) {
				return;
			}

			if( form.attr('data-bypassValidation') && !options.remoteSubmit ){
				return;
			}

			e.preventDefault();
			setLoading( true );

			var url = form.attr('action');
			var ajaxUrl = url;

			if( options.remoteVerify ){
				var joinWith = '?';
				
				if ( ajaxUrl.indexOf('?') != -1 ){
					joinWith = '&';
				}
				
				ajaxUrl	= ajaxUrl + joinWith + 'ajaxValidate=1';
			}

			ips.getAjax()( ajaxUrl, {
				data: form.serialize(),
				type: 'post'
			} )
				.done( function (response, status, jqXHR) {

					// If we are verifying remotely, and we haven't already checked everything is fine...
					if( options.remoteVerify && !form.attr('data-bypassValidation') ){
						if( jqXHR.getAllResponseHeaders().indexOf('X-IPS-FormError: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('X-IPS-FormNoSubmit: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('x-ips-formerror: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('x-ips-formnosubmit: true') !== -1 ){
							Debug.log('Validation failed');
							setLoading( false );
							updateContent( response );
							return;
						}
					}
					
					if( options.remoteSubmit ){

						var doneAfterSubmit = function (submitResponse) {

							// If we're submitting via ajax, then we've already done that; just need to trigger an event and hide the dialog
							$( elem || document ).trigger('submitDialog', {
								elemID: elemID,
								dialogID: dialogID,
								dialog: dialog,
								contentLoaded: contentLoaded,
								response: submitResponse
							});

							// and here we dispatch a native event in the push towards a native JS approach
							$(elem || document).get(0)?.dispatchEvent(new DialogSubmissionEvent(elemID, dialogID, dialog, contentLoaded, submitResponse))

							setLoading( false );
							contentLoaded = false; // This will cause the dialog to be reloaded again if we open it again, which we want so our previous values aren't still inputted
							hide();
							_fetchDataLayerEventsAfterSubmit();
							
							if( options.flashMessage ){
								ips.ui.flashMsg.show( options.flashMessage, { timeout: options.flashMessageTimeout, escape: options.flashMessageEscape } );
							}
						};

						// If we verified this submission first, we actually need to submit again, without the verification this time
						if( options.remoteVerify ) {
							ips.getAjax()( url, {
								data: form.serialize(),
								type: 'post',
								bypassRedirect: true
							})
								.done( function (response, status, jqXHR) {
									if( jqXHR.getAllResponseHeaders().indexOf('X-IPS-FormError: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('X-IPS-FormNoSubmit: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('x-ips-formerror: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('x-ips-formnosubmit: true') !== -1 ){
										form.attr( 'data-bypassValidation', true ).trigger('submit');
									} else {
										doneAfterSubmit( response );
									}
								})
								.fail( function (jqXHR, status, errorThrown) {
									form.attr( 'data-bypassValidation', true ).trigger('submit');
								});
						} else {
							doneAfterSubmit( response );
						}
						
					} else if( jqXHR.getAllResponseHeaders().indexOf('X-IPS-FormNoSubmit: true') !== -1 || jqXHR.getAllResponseHeaders().indexOf('x-ips-formnosubmit: true') !== -1 ) {
						// If the response from the verification told us not to submit the form, we'll update the dialog
						setLoading( false );
						updateContent( response );
					} else {
						// Otherwise, we've passed verification and we can submit the form as normal
						form.attr( 'data-bypassValidation', true ).trigger('submit');
						setTimeout(() => _fetchDataLayerEventsAfterSubmit(), 30000); // Do this 30 seconds later in case the content took a long time to load but redirects the page. If the redirect ocurrs after teh datalayer event was loaded but before it's dispatched to GTM, it can cause event loss so we'll just wait until the next page load
					}
				})
				.fail( function () {
					form.attr( 'data-bypassValidation', true ).trigger('submit');
				});
		};

		init();

		return {
			init: init,
			show: show,
			hide: hide,
			remove: remove,
			setLoading: setLoading,
			updateContent: updateContent,
			dialogID: dialogID,
			destruct: destruct,
			addContentProcessor
		};
	};

	class DialogSubmissionEvent extends Event {
		/**
		 * Create a new Native Dialog submission event. The event's key is 'dialogSubmission'
		 *
		 * @param elemID
		 * @param dialogID
		 * @param dialog
		 * @param contentLoaded
		 * @param response
		 */
		constructor(elemID, dialogID, dialog, contentLoaded, response) {
			super('dialogSubmission')
			this.elemID = elemID;
			this.dialogID = dialogID;
			this.dialog = dialog;
			this.contentLoaded = contentLoaded;
			this.response = response;
		}
	}
}(jQuery));