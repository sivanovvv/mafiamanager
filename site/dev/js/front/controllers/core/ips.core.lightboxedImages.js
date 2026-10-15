/**
 * Invision Community
 * (c) Invision Power Services, Inc. - https://www.invisioncommunity.com
 *
 * ips.core.lightboxedImages.js
 *
 * Author: Rikki Tissier
 */
;( function($){
	"use strict";

	const IMAGE_EXTENSIONS = new Set(['gif', 'jpeg', 'jpe', 'jpg', 'png', 'svg', 'webp', 'avif'])
	const DISABLE_LIGHTBOX_ROTATE = true;

	ips.controller.register('core.front.core.lightboxedImages', {

		_random: null,

		initialize() {
			this.on( 'initializeImages', this.refreshContent );
			this.on( 'refreshContent', this.refreshContent );
			this.on( document, 'imageRotated', (e, data)=> {
				const attachment = this.elem.querySelector( '.ipsAttachLink_image img[data-fileId=' + data.fileId + ']' );
				this._updateAttachmentImage( attachment, data );
			});
			this.setup();
		},

		/**
		 * Setup method
		 *	
		 * @returns 	{void}
		 */
		setup() {
			this._random = 'g' + ( Math.round( Math.random() * 100000 ) );
			this._initializeAttachments();
			this._initializeImages();
		},

		/**
		 * Refresh the content in this container
		 *
		 * @param {Event}		e
		 *
		 * @returns 	{Promise<void>}
		 */
		async refreshContent(e) {
			Debug.log("Refreshing content in lightboxedImages");
			delete this.elem.dataset.loaded;
			e.stopPropagation();
			await Promise.allSettled([
				this._initializeAttachments(),
				this._initializeImages()
			]);
		},

		/**
		 * Build the attachment display inside content
		 *	
		 * @returns 	{Promise<void>}
		 */
		async _initializeAttachments() {
			const fileIDsToFetch = {};
			const attachments = this.elem.querySelectorAll('[data-fileid]:not([data-loaded], audio, source, video, :has(audio, source, video))')
			if( !attachments.length ){
				return;
			}

			/** @type {WeakMap<HTMLElement, boolean>}*/
			const isInlineCache = new WeakMap();
			/**
			 * To prevent multiple redundant calculations, cache the result per parent block node
			 * @param {HTMLElement}	attachment
			 */
			const calcIsInline = attachment => {
				// we need to see if this is inside a list
				const listAncestor = attachment.closest('li');
				if (listAncestor && (this.elem.contains(listAncestor) || this.elem === listAncestor)) {
					return true;
				}

				let parent = attachment;
				const ancestors = [attachment];
				while (parent && this.elem.contains(parent) && (parent === attachment || parent.matches('[data-fileid]:not([data-loaded], audio, source, video, :has(audio, source, video)), a, span, b, i, u, strong, strike'))) {
					if (isInlineCache.has(parent)) {
						return isInlineCache.get(parent);
					}
					ancestors.push(parent)
					parent = parent.parentElement;
				}

				// no inline parent? This shouldn't really happen in theory, but return
				if (!parent) {
					ancestors.forEach(ancestor => isInlineCache.set(ancestor, false));
					return false;
				}

				// Is there 'innerText' for the closest block-level parent beyond other attachments? In this case, the attachment is inline
				const clone = parent.cloneNode(true);
				clone.querySelectorAll('[data-fileid]').forEach(cloneAttachment => cloneAttachment.remove());

				const hasText = !!clone.innerText.trim();
				ancestors.forEach(ancestor => isInlineCache.set(ancestor, hasText));
				return hasText;
			}

			// Loop through each attachment and build the initial HTML for it
			attachments.forEach((attachment) => {
				// we can skip all of this for images because we are not loading metadata here
				if (attachment.matches( ':not(img, .ipsAttachLink_image)')) {
					// If this attachment is part of a list
					if (!calcIsInline(attachment)) {
						// This is a BLOCK attachment
						attachment.classList.add('ipsAttachLink_block');
						if (attachment.children.length) {
							return;
						}

						attachment.innerHTML = ips.templates.render('core.attachments.attachmentPreview', {
							title: attachment.textContent
						});
					} else {
						// This is an INLINE attachment
						attachment.classList.add('ipsAttachLink_inline');
						attachment.setAttribute('title', ips.getString('attachmentPending'));
						attachment.dataset.ipstooltip = "true";
					}
				}

				fileIDsToFetch[attachment.dataset.fileid] = true;
			});

			// If we have no files to fetch, we can bail
			if (![...Object.keys(fileIDsToFetch)].length) {
				return;
			}

			try {
				// Get the file info for each block attachment in this post
				/** @type {Object<string, ({rotate: *}|object)>} response */
				const response = await ips.fetch(ips.getSetting('baseURL') + 'index.php?app=core&module=system&controller=ajax&do=attachmentInfo', {
					dataType: 'json',
					data: {
						attachIDs: fileIDsToFetch
					}
				});

				if (typeof response !== 'object' || response instanceof Array) {
					throw new RangeError("Expected response to be an object mapping file ids to details");
				}

				attachments.forEach(attachment => {
					const attachmentID = attachment.dataset.fileid;
					if (!(attachmentID in response) || typeof response[attachmentID] !== 'object' || response[attachmentID] instanceof Array) {
						this._updateAttachmentMetaDataError(attachment);
					} else if ('rotate' in response[attachmentID]) {
						this._updateAttachmentImage(attachment, response[attachmentID]);
					} else {
						this._updateAttachmentMetaData(attachment, response[attachmentID]);
					}
				});
			} catch (e) {
				Debug.warn("Failed to get attachment info for one or more lightboxed attachments on the page");
				attachments.forEach(attachment => this._updateAttachmentMetaDataError(attachment));
			}
		},

		/**
		 * Update an attachment with the provided metadata
		 *
		 * @param {HTMLElement}		attachment
		 * @param {object|{size?:number, downloads?:number, rotate?:*}}			response
		 *	
		 * @returns 	{void}
		 */
		_updateAttachmentMetaData(attachment, response) {
			if (attachment.classList.contains('ipsAttachLink_block')) {
				const infoEl = attachment.querySelector('.ipsAttachLink_metaInfo')
				if (infoEl) {
					infoEl.innerHTML = ips.templates.render('core.attachments.metaInfo', {
						size: response.size,
						downloads: ips.pluralize(ips.getString('attachmentDownloads'), response.downloads)
					});
				}
			} else {
				attachment.setAttribute('title', response.size + ' - ' + ips.pluralize( ips.getString('attachmentDownloads'), response.downloads ));
			}
			attachment.dataset.loaded = 'true';
		},

		/**
		 * Update an image attachment with provided info
		 *
		 * @param {HTMLElement}		attachment
		 * @param {object|{size?:number, downloads?:number, rotate?:*}}			response
		 *
		 * @return 		{void}
		 */
		_updateAttachmentImage(attachment, response){
			if (DISABLE_LIGHTBOX_ROTATE) {
				return;
			}

			//todo if this is ever needed, convert the logic to use native JS DOM instead of jquery. The provided attachment element should always be a native HTMLElement
			attachment = $(attachment);
			if( ! ( attachment.is( 'img' ) ) ){
				return;
			}

			if( response.rotate !== undefined && response.rotate !== null ){
				attachment.attr( 'data-rotate', response.rotate )
					.css( 'transform', '' );
				attachment.parents( 'a.ipsAttachLink_image' ).css( {
					'transform': 'rotate(' + response.rotate + 'deg)',
					'position': 'absolute',
					'top': 0
				} );

				if( response.rotate == 90 || response.rotate == -270 ){
					if( attachment.width() > attachment.height() ){
						attachment.parents( 'a.ipsAttachLink_image' ).css({
							'right': '40%',
							'height': '100%'
						});
					} else {
						attachment.parents( 'a.ipsAttachLink_image' ).css({
							'left': '5%',
							'transform-origin': 'right'
						});
					}
				} else if( response.rotate == -90 || response.rotate == 270 ){
					if( attachment.width() > attachment.height() ){
						attachment.parents('a.ipsAttachLink_image').css({
							'right': '40%',
							'height': '100%'
						} );
					} else {
						attachment.parents( 'a.ipsAttachLink_image' ).css({
							'left': '40%',
							'transform-origin': 'left'
						});
					}
				}

				/* get the current height of the parent and adjust if necessary */
				var containerHeight = attachment.height();
				if( response.rotate != 0 && response.rotate != 180 && response.rotate != -180 ){
					containerHeight = attachment.width();
				}
				var parent = attachment.parents( 'p:first' );
				if( $( parent ).height() < containerHeight ){
					$( parent ).css( { 'height': parseInt( containerHeight + 5 ).toString() + 'px', 'position': 'relative' } );
				}
			}
		},

		/**
		 * Update an attachment with an 'unavailable' message
		 *
		 * @param {HTMLElement}		attachment
		 *	
		 * @returns 	{void}
		 */
		_updateAttachmentMetaDataError(attachment) {
			if (attachment.classList.contains('ipsAttachLink_block')) {
				attachment.querySelector('.ipsAttachLink_metaInfo').innerHTML = ips.getString('attachmentUnavailable');
			} else {
				attachment.setAttribute('title', ips.getString('attachmentUnavailable') );
			}

			attachment.dataset.loaded = 'true';
		},
		
		/**
		 * Given an image, either updates the wrapping link or adds one, before adding lightbox attrs
		 *
		 * @param {HTMLImageElement}		image
		 *
		 * @returns 	{Promise<void>}
		 */
		async _addOrUpdateWrappingLink(image) {
			const closestLink = image.closest(':is(a, i-lightbox):is([data-wrapped-link], .ipsAttachLink.ipsAttachLink_image)');
			const imageSrc = 'fullImage' in image.dataset ? image.dataset.fullImage : image.getAttribute('src');
			const fileId = image.dataset.fileid;

			if (closestLink) {
				const href = closestLink.getAttribute('href');
				const ext = href?.includes('.') ? href.split('.').pop() : '';

				if (IMAGE_EXTENSIONS.has(ext) || (await ips.ui.lightbox.getImageDimensions(imageSrc)).solid) {
					closestLink.dataset.fileid = fileId;
					closestLink.dataset.ipslightbox = '';
					closestLink.dataset.ipslightboxGroup = this._random;

					if (href) {
						closestLink.dataset.fullurl = href;
					}
				}
			} else {
				const link = document.createElement('i-lightbox');
				link.dataset.wrappedlink = '';
				link.dataset.ipslightbox = '';
				link.setAttribute('href', imageSrc )
				if (image.hasAttribute('title')) {
					image.setAttribute('data-original-title', image.getAttribute('title'));
				}
				image.setAttribute('title', ips.getString('enlargeImage') )
				link.dataset.fileid = fileId
				link.dataset.ipslightboxGroup = this._random;
				image.parentElement.insertBefore(link,image)
				link.append(image);
			}
		},

		/**
		 * Event handler for main event
		 *	
		 * @returns 	{Promise<void>}
		 */
		async _initializeImages() {
			const images = this.elem.querySelectorAll('img:not(.ipsEmoji *, .tiptap *, [data-emoticon] *, .ipsEmoji, [data-emoticon], [data-ipslightbox] *, a *)');
			const promises = [];
			if (images.length) {
				images.forEach(image => {
					// open up a lightboxed preview for link preview images
					const embedAncestor = image?.closest('.ipsEmbedded_og[data-og-url]')
					if (embedAncestor) {
						if (!('linkified' in embedAncestor.dataset)) {
							const toLink = embedAncestor.querySelector(`.ipsEmbedded_og__title`) || image
							const toWrap = document.createElement('a')
							toWrap.href = embedAncestor.dataset.ogUrl
							toWrap.target = "_blank"
                            toWrap.rel = "noopener noreferrer"
							toWrap.classList.add('ipsEmbedded_og__link')
							toLink.parentElement.insertBefore(toWrap, toLink)
							toWrap.append(toLink)
							embedAncestor.dataset.linkified = ''
						}
						return;
					}

					// Wrap image in a link
					promises.push(this._addOrUpdateWrappingLink(image));
				});
			}

            // If we don't have any images, but we may still have an embed that needs to be linked to the source using data-og-url
            this.elem.querySelectorAll('.ipsEmbedded_og[data-og-url]:not([data-linkified])').forEach(embedAncestor => {
                const toLink = embedAncestor.querySelector('.ipsEmbedded_og__title');

                if (!toLink) {
                    return;
                }

                const toWrap = document.createElement('a');
                toWrap.href = embedAncestor.dataset.ogUrl;
                toWrap.target = '_blank';
                toWrap.rel = "noopener noreferrer"
                toWrap.classList.add('ipsEmbedded_og__link');
                toLink.parentElement.insertBefore(toWrap, toLink);
                toWrap.append(toLink);
                embedAncestor.dataset.linkified = '';
            });

			await Promise.allSettled(promises);
		}
	});
}(jQuery));