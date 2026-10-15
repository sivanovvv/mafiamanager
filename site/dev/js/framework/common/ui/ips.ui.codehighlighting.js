((($, _) => {
    "use strict";

    ips.createModule('ips.ui._codehighlighting', function() {

        const LOADER_RESOLVERS = new Set();
        const LOADER_REJECTS = new Set();
        /**
         *
         * @type {'loaded'|'error'|"loading"}
         */
        let STATE = 'loading';

        document.addEventListener('ipsCodehighlightingLoaded', () => {
            STATE = 'loaded';
            LOADER_RESOLVERS.forEach(resolve => resolve());
            LOADER_RESOLVERS.clear();
            LOADER_REJECTS.clear();
        });

        // The actual ips.ui.codehighlighting module is bundled and lazily loads the language support.
        // We are NOT using ips.loader here because that ruins the browsers ability to track the URL of the script
        let timeout;
        let attempts = 0;
        function inject() {
            clearTimeout(timeout);
            window.removeEventListener('load', inject);
            if (typeof ips.ui?.codehighlighting === 'object') {
                STATE = 'loaded';
                LOADER_REJECTS.clear();
                LOADER_RESOLVERS.forEach(resolve => resolve());;
                LOADER_RESOLVERS.clear();
                return;
            }

            if (!document?.body) {
                if (attempts++ < 5) {
                    timeout = setTimeout(inject, 100);
                    Debug.log(`Attempting to load the codehighlighting module. Attempt: ${attempts}`);
                } else {
                    STATE = 'error';
                    LOADER_RESOLVERS.clear();
                    LOADER_REJECTS.forEach(reject => reject(new Error(`The codehighlighting module could not be loaded`)));
                    LOADER_RESOLVERS.clear();
                    Debug.warn(`Couldn't load the codehighlighting module after 5 attempts because document.body isn't present!`);
                }
                return;
            }

            const script = document.createElement('script')
            document.body.appendChild(script)
            script.src = ips.getSetting('baseURL').replace(/\/+$/, "") + "/applications/core/interface/static/codehighlighting/codehighlighting.js?antiCache=" + encodeURIComponent(ips.getSetting('jsAntiCache'));
        }

        try {
            if (!document?.body) {
                throw new Error();
            }
            inject();
        } catch (e) {
            window.addEventListener('load', inject, {once: true});
            timeout = setTimeout(() => {
                if (typeof ips.ui?.codehighlighting === "object") {
                    STATE = 'loaded';
                    LOADER_REJECTS.clear();
                    LOADER_RESOLVERS.forEach(resolve => resolve());
                    LOADER_RESOLVERS.clear();
                    return;
                }
                Debug.warn(`The codehighlighting module was not appended to document.body because the window's \`load\` event didn't fire within 2 seconds after ips.ui._codehighlighting was initialized.`);
                inject()
            }, 2000);
        }

        return {
            whenLoaded() {
                return new Promise((resolve, reject) => {
                    if (STATE === 'loaded') {
                        return resolve();
                    } else if (STATE === 'error') {
                        return reject();
                    }

                    LOADER_REJECTS.add(reject);
                    LOADER_RESOLVERS.add(resolve);
                })
            }
        }
    })
})(jQuery))