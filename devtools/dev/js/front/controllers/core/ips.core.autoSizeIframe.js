/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.autoSizeIframe.js - Controller to automatically adjust the height of an iframe
 *
 * Author: Mark Wade
 */
;( function($){
	"use strict";

	const PREINITIALIZED_DIMS_FLAG = Symbol('PREINITIALIZED_DIMS_FLAG');

	// Query and set sizing before registering the controller to try to minimize load time
	if (ips?.utils?.db?.get instanceof Function) {
		document.querySelectorAll('iframe[data-controller*="core.front.core.autosizeiframe"][src]').forEach(embed => {
			if (!embed.src || embed.src === window.location.href) {
				return;
			}
			const currentDims = ips.utils.db.get("embedDimsCache", embed.src);
			if (typeof currentDims?.height === 'number' && currentDims.height > 0) {
				Debug.log(`(EMBED) - Filling in width and height before registering controller for embed ${embed.src}`);
				embed[PREINITIALIZED_DIMS_FLAG] = {
					width: typeof currentDims.width === 'number' ? currentDims.width : 0,
					height: typeof currentDims.height === 'number' ? currentDims.height : 0
				};
				if (typeof currentDims.width === 'number' && currentDims.width > 0) {
					requestAnimationFrame(() => {
						embed.style.height = currentDims.height + "px";
						embed.style.width = currentDims.style.width + "px";
					})
				} else {
					requestAnimationFrame(() => {
						embed.style.height = currentDims.height + "px";
					});
				}
			}
		})
	}

	ips.controller.register('core.front.core.autoSizeIframe', {

		_origin: ips.utils.url.getOrigin(),
		_embedId: '',
		_iframe: null,
		_border: { vertical: 0, horizontal: 0 },

		initialize() {
			if( !this.scope.is('iframe') ){
				return;
			}

			this.on( window, 'message', this.receiveMessage );
			this.on( document, 'breakpointChange', this.breakpointChange );
			this.setup();
		},

		getEmbedSrc() {
			return this.elem.src;
		},

		/**
		 * Sets some basic styles on the iframe, and sets up an interval
		 * to constantly check for any change in sizing
		 *
		 * @param	{event} 	e 		Event object
		 * @returns {void}
		 */
		setup() {
			this._lastDims = { height: 0, width: 0 };
			let cachedDims;
			if (PREINITIALIZED_DIMS_FLAG in this.elem) {
				Object.assign(this._lastDims, this.elem[PREINITIALIZED_DIMS_FLAG]);
			} else if (this.getEmbedSrc() && (cachedDims = ips.utils.db.get('embedDimsCache', this.getEmbedSrc())) && cachedDims) {
				if (typeof cachedDims?.height === 'number' && cachedDims.height > 0) {
					Debug.log(`(EMBED) - Using cached height and width while the embed initializes`);
					if (typeof cachedDims?.width === 'number' && cachedDims.width > 0) {
						this.dims(cachedDims);
					} else {
						this.height({height: cachedDims.height});
					}
				}
			}

			var iframe = this.scope.get(0);
			iframe.style.overflow = 'hidden';

			this._getBorderAdjustment();

			// Make sure the built-in height is reasonable
			if( this.scope.height() > 800 ){
				this.scope.css({
					height: '800px'
				});
			}

			this._iframe = iframe.contentWindow;

			// Do we have an embed ID? If not, we need to generate one
			this._embedId = 'embed' + parseInt( Math.random() * (10000000000 - 1) + 1 );
			this.scope.attr('data-embedId', this._embedId );

			// Check for postMessage and JSON support
			if( !window.postMessage || !window.JSON.parse ){
				this.scope.css({
					height: '400px'
				});
				Debug.error("Can't resize embed: " + this._embedId );
				return;
			}

			// We can now tell the iframe we are ready
			this._intersectionObserver = new IntersectionObserver(entries => {
				if (entries.some(entry => entry.isIntersecting)) {
					this._intersectionObserver.disconnect();
					this._startReadyTimeout();
				}
			}, {threshold: 0});

			this._intersectionObserver.observe(iframe);
		},

		/**
		 * Sets an interval that pings the iframe with a ready message
		 * This needs to repeat because the iframe might not immediately be ready to receive messages.
		 *
		 * @returns {void}
		 */
		_startReadyTimeout() {
			this._readyTimeout = setInterval( function () {
				this._postMessage('ready');
			}.bind(this), 100 );

			// We'll just give it 10 seconds, then stop trying
			setTimeout( function () {
				this._stopReadyTimeout();
			}.bind(this), 10000 );
		},

		/**
		 * Stops the ready message interval from firing
		 *
		 * @returns {void}
		 */
		_stopReadyTimeout() {
			if( this._readyTimeout !== null ){
				Debug.log("Stopped posting to embed " + this._embedId);
				clearInterval( this._readyTimeout );
				this._readyTimeout = null;
			}
		},

		/**
		 * Event handler for this controller being destructed
		 *
		 * @returns {void}
		 */
		destruct() {
			Debug.log('Destruct autoSizeIframe ' + this._embedId);
			this._intersectionObserver?.disconnect();
			this._stopReadyTimeout();
			this._postMessage('stop');
		},

		/**
		 * Event handler for this controller receiving a messgae.
		 * Actually, all messages to this window are handled here, so we have to check the origin,
		 * and whether it's a message for this controller in particular (i.e. the embedIds match)
		 *
		 * @returns {void}
		 */
		receiveMessage(e) {
			if (e.originalEvent.origin !== this._origin) {
				return;
			}

			try {
				const pmData = typeof e.originalEvent.data === 'string' ? JSON.parse(e.originalEvent.data) : e.originalEvent.data;
				const method = pmData.method;

				if( pmData.embedId === undefined || pmData.embedId !== this._embedId ){
					return;
				}

				// Stop telling it we're ready now
				this._stopReadyTimeout();
				this[method]?.call( this, pmData );

			} catch (err) {
				Debug.error(err.message);
			}

		},

		/**
		 * Post a message to the iframe
		 *
		 * @returns {void}
		 */
		_postMessage(method, obj) {
			// Send to iframe
			Debug.log("Posting to iframe " + this._embedId);

			this._iframe.postMessage( JSON.stringify( Object.assign( obj || {}, {
				method: method,
				embedId: this._embedId
			} ) ), this._origin );
		},

		/**
		 * Get the border widths, which we'll use to adjust the widths we set on the iframe
		 *
		 * @returns {void}
		 */
		_getBorderAdjustment() {
			this._border.vertical = parseInt( this.scope.css('border-top-width') ) + parseInt( this.scope.css('border-bottom-width') );
			this._border.horizontal = parseInt( this.scope.css('border-left-width') ) + parseInt( this.scope.css('border-right-width') );
		},

		/**
		 * Event handler for the breakpoint changing
		 *
		 * @returns {void}
		 */
		breakpointChange(e, data) {
			// Now send the frame our responsive state
			this._postMessage('responsiveState', {
				currentIs: data.curBreakName
			});
		},

		/**********************************/
		/* Events from the iframe */

		/**
		 * Display a dialog
		 *
		 * @returns {void}
		 */
		dialog(data) {
			var options = ips.ui.getAcceptedOptions('dialog');
			var dialogOptions = {};

			for (const opt of options ) {
				if( data.options['data-ipsdialog-' + opt.toLowerCase() ] !== undefined ){
					dialogOptions[ opt ] = data.options['data-ipsdialog-' + opt.toLowerCase() ];
				}
			};

			if( dialogOptions['url'] === undefined ){
				dialogOptions['url'] = data.url;
			}

			var dialogRef = ips.ui.dialog.create( dialogOptions );

			dialogRef.show();
		},

		/**
		 * Set the height of the iframe
		 *
		 * @returns {void}
		 */
		height(data) {
			if( this._lastDims.height !== data.height ){
				this.scope.css({
					height: parseInt( data.height ) + this._border.vertical + 'px'
				});

				// Leaving this in, just in case it's helpful, but it isn't defined in either the internal nor external embed handler we use
				// this._postMessage('setDimensions', {
				// 	height: parseInt( data.height )
				// });

				this._lastDims.height = data.height;
				if (this.getEmbedSrc()) {
					ips.utils.db.set('embedDimsCache', this.getEmbedSrc(), this._lastDims);
				}
			}
		},

		/**
		 * Set the dimensions of the iframe
		 *
		 * @returns {void}
		 */
		dims(data) {
			if( parseInt( this._lastDims.height ) !== parseInt( data.height ) || this._lastDims.width !==  data.width ){
				this.scope.css({
					height: parseInt( data.height ) + this._border.vertical + 'px',
					maxWidth: ( data.width.toString().indexOf('%') == -1 ) ? parseInt( data.width ) + this._border.horizontal + 'px' : '100%'
				});

				this._lastDims.height = data.height;
				this._lastDims.width = data.width;

				if (this.getEmbedSrc()) {
					ips.utils.db.set('embedDimsCache', this.getEmbedSrc(), this._lastDims);
				}
			}
		},

		/**
		 * The iframe received our Ready message
		 *
		 * @returns {void}
		 */
		ok() {
			this._stopReadyTimeout();
			this.scope.addClass('ipsEmbed_finishedLoading');

			// Now send the frame our responsive state
			this._postMessage('responsiveState', {
				currentIs: ips.utils.responsive.getCurrentKey()
			});
		}
	});
}(jQuery));
