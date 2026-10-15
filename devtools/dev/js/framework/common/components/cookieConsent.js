/**
 * Handle dismissing the Cookie Consent/Guest bar
 * @copyright Invision Power Services, Inc. - https://www.invisioncommunity.com
 * @since January 2026
 * @author Ehren Harber
 */
class CookieConsent extends HTMLElement {

    connectedCallback(){
        // Either cookieConsentBar or guestTermsBar
        this.bannerType = this.getAttribute("data-role");
        this.skipToBanner = document.querySelector(`.ipsSkipToContent[data-role="skipToConsent"]`);

        // If guest caching is enabled, the hidden attribute may not reflect each guest's actual preference, so we should enforce it here just in case
        this.hide = false;
        if((this.bannerType === "cookieConsentBar" && ips.utils.cookie.get('cookie_consent') ) || (this.bannerType === "guestTermsBar" && ips.utils.cookie.get('guestTermsDismissed') )){
            this.hide = true;
        }
        this.#hideGuestBar(this.hide);

        // Events
        this.addEventListener("keydown", this.#returnFocus);
        if(this.bannerType === "guestTermsBar"){
            this.addEventListener("click", this.#dismissTerms);
        }
        else if(!ips.utils.cookie.get('cookie_consent_optional')){
            // Add class so we can hide certain "optional cookie" elements
            document.body.classList.add("cOptionalCookiesRejected");
        }
    }

    #dismissTerms(e){
        const target = e.target.closest(`[data-action="dismissTerms"]`);
        if(!target) return;

        e.preventDefault();
        // Intentionally a session cookie
        ips.utils.cookie.set('guestTermsDismissed', 1);
        this.#hideGuestBar(true);
    }

    #hideGuestBar(isHidden){
        this.hidden = isHidden;
        this.skipToBanner.hidden = isHidden;
        document.body.classList.toggle('cWithGuestTerms', !isHidden);
    }

    #returnFocus(e){
        if(e.key === "Escape"){
            document.querySelector(`.ipsSkipToContent[data-role="skipToContent"]`)?.focus();
        }
    }
}