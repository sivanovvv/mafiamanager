/**
 * @module ips.utils.lazyload
 *
 * Legacy support module for v4 JS, intersection-based lazy load HTML. Elements will have a src and a data-src attribute, and used to use an intersection observer to load when they because visible. This JS uses native lazy loading on the old content structures
 *
 * @since Nov 2024
 * @author Matt Finger
 */
;(function($, _) {
    "use strict";

    ips.createModule("ips.utils.lazyload", function() {
        const fixedElements = new WeakSet();
        const imgDimsCache = {
            _cache: new Map(),
            get(key) {
                let value;
                if (!this._cache.has(key)) {
                    try {
                        value = ips.utils.db.get('ips.utils.lazyloadImgDims', key);
                    } catch (e) {}
                } else {
                    value = this._cache.get(key);
                }
                return value;
            },

            set(key, value) {
                ips.utils.db.set('ips.utils.lazyloadImgDims', key, value, false, Math.round(Date.now() / 1000) + 86400);
                return this._cache.set(key, value);
            },

            has(key) {
                return this._cache.has(key);
            },

            delete(key) {
                ips.utils.db.remove('ips.utils.lazyloadImgDims', key);
                return this._cache.delete(key);
            }
        };


        return {
            /**
             * Init - Parse lazy load elements now and on content change
             */
            init() {
                this.parseLazyLoadElements();
                $(document).on('contentChange', function(changedElement) {
                    try {
                        $(changedElement).each(function() {
                            fixedElements.delete(this);
                            ips.utils.lazyload.parseLazyLoadElements(this);
                        });
                    } catch (e) {
                        Debug.warn(`Something went wrong when processing lazy load images`);
                        Debug.warn(e);
                    }
                })
            },

            /**
             * Parse lazy load elements
             * @param {Element} [root]
             * @param {boolean} [useNativeDims=true]
             */
            parseLazyLoadElements(root, useNativeDims=true) {
                root = root instanceof Element ? root : document.body;
                if (root !== document.body && fixedElements.has(root)) {
                    return;
                }

                // Add the root as well because everything under it should be cleaned up
                fixedElements.add(root);
                root
                    .querySelectorAll(":is([data-src], [data-embed-src]):is(img, audio, video, iframe, object, embed):not(.tiptap *)")
                    .forEach(element => {
                        if (fixedElements.has(element)) {
                            return;
                        }
                        element.dataset.ipsLazyloadProcessed = '1'
                        fixedElements.add(element);
                        const dataSrc = (element.dataset.src || element.dataset.embedSrc)?.trim();
                        if (element.getAttribute('src')?.trim() === dataSrc) {
                            delete element.dataset.src;
                            delete element.dataset.embedSrc;
                            return;
                        }
                        Debug.log(`Found legacy lazy loading ${element.tagName.toLowerCase()}. src: ${dataSrc}`);
                        element.setAttribute('loading', 'lazy');
                        element.setAttribute('src', dataSrc);
                        delete element.dataset.src;
                        delete element.dataset.embedSrc;

                        // For images, let's try and set the dimensions to prevent jumps in content height
                        if (element.matches('img')) {
                            let width = parseFloat(element.getAttribute('width') || '');
                            let height = parseFloat(element.getAttribute('height') || '');

                            if (width && height && !Number.isNaN(width) && !Number.isNaN(height)) {
                                return;
                            } else if (element.style.height || element.style.width) { // if CSS if positioning this, we don't care so much
                                return;
                            } else if (parseFloat(width?.toString() || element.dataset.width || '') && parseFloat(height?.toString() || element.dataset.height || '')) {
                                width = Math.round(parseFloat(width?.toString() || element.dataset.width) * 100) / 100;
                                height = Math.round(parseFloat(height?.toString() || element.dataset.height) * 100) / 100;
                            } else if (parseFloat(width?.toString() || element.dataset.width || '') && parseFloat(element.dataset.ratio || '')) {
                                width = Math.round(parseFloat(width?.toString() || element.dataset.width) * 100) / 100;
                                height = Math.round((width / parseFloat(element.dataset.ratio)) * 100) / 100;
                            } else if (parseFloat(height?.toString() || element.dataset.height || '') && parseFloat(element.dataset.ratio || '')) {
                                height = Math.round(parseFloat(height?.toString() || element.dataset.height) * 100) / 100;
                                width = Math.round(height * parseFloat(element.dataset.ratio) * 100) / 100;
                            }

                            if (typeof height === "number" && typeof width === "number" && height > 0 && width > 0) {
                                Debug.log(`Determined the width and height from data- attributes as ${width} and ${height}`);
                                element.setAttribute('width', width.toString());
                                element.setAttribute('height', height.toString());
                            } else if (useNativeDims) {
                                this.getNativeImgDims(element.getAttribute('src'))
                                    .then(dims => {
                                        if (dims) {
                                            Debug.log(`Determined the width and height from the URL as ${dims.width} and ${dims.height}`);
                                            element.setAttribute('width', dims.width.toString());
                                            element.setAttribute('height', dims.height.toString());
                                        }
                                    })
                                    .catch(err => {
                                        Debug.warn(`Failed to determine the native dims of the image at the URL ${element.getAttribute('url')}`);
                                        Debug.warn(err);
                                    })
                            }
                        }
                    });
            },

            /**
             * Get native img dims
             *
             * @param {string } url
             *
             * @returns {Promise<undefined|{width:number,height:number}>}
             */
            getNativeImgDims(url) {
                return new Promise(_resolve => {
                    let done = false;
                    let timeout;
                    const resolve = val => {
                        if (timeout !== undefined) {
                            clearTimeout(timeout);
                        }

                        if (done) {
                            return;
                        }
                        done = true;
                        _resolve(val);
                    };

                    try {
                        let output = {width: 0, height: 0};
                        url = new URL(url);
                        if (imgDimsCache.has(url.toString())) {
                            resolve(imgDimsCache.get(url.toString()));
                            return;
                        }

                        const img = new Image();

                        // force end by 3 seconds
                        timeout = setTimeout(() => {
                            imgDimsCache.set(url.toString(), undefined);
                            resolve(undefined);
                        }, 3000);

                        img.addEventListener('load', () => {
                            output.width = img.naturalWidth;
                            output.height= img.naturalHeight;
                            if (Number.isNaN(output.width) || Number.isNaN(output.height) || output.width <= 0 || output.height <= 0) {
                                imgDimsCache.set(url.toString(), undefined);
                                resolve(undefined);
                                return;
                            }

                            output.height = Math.max(1, Math.round(output.height * 100) / 100);
                            output.width = Math.max(1, Math.round(output.width * 100) / 100);

                            imgDimsCache.set(url.toString(), output);

                            resolve(output);
                        });

                        img.addEventListener('error', () => {
                            imgDimsCache.set(url.toString(), undefined);
                            resolve(undefined);
                        });

                        img.src = url.toString();
                    } catch (e) {
                        resolve(undefined);
                    }
                });
            }
        }
    });
})(jQuery);