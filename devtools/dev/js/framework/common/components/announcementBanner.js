/**
 * @copyright Invision Power Services, Inc. - https://www.invisioncommunity.com
 * @since January 2026
 * @author Ehren Harber
 */
class IAnnouncementBanner extends HTMLElement {

	connectedCallback(){
		// We display all announcements in the HTML and hide them with JS due to guest caching
		this.querySelectorAll('[data-announcementid]').forEach(announcement => {
			if( ips.utils.cookie.get(`announcement_${announcement.getAttribute('data-announcementid')}`) ) {
				announcement.hidden = true;
			}
		});
		// Hide announcement when 'x' is clicked
		this.addEventListener("click", this);
	}

	// Handle events
    handleEvent(e){
        return this[`${e.type}Event`] && this[`${e.type}Event`](e);
    }

	// Hide announcement with 'x' button
	clickEvent(e){
		const target = e.target.closest('[data-role="dismissAnnouncement"]');
		if(!target) return;
		const element = target.closest('[data-announcementid]');
		if(!element) return;
		const id = element.getAttribute('data-announcementid');

		let date = new Date();
		date.setTime( date.getTime() + ( 7 * 86400000 ) );
		ips.utils.cookie.set(`announcement_${id}`, true, date.toUTCString() );
		
		element.hidden = true;
	}

}