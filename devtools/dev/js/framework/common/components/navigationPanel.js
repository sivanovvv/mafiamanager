/**
 * @copyright Invision Power Services, Inc.
 * @since January 2026
 * @author Ehren Harber
 */
class INavigationPanel extends HTMLElement {

    connectedCallback() {
        this.navigationList = this.querySelector('[data-role="navigationList"]');

        this.addEventListener('toggle', this.toggleBlock, true);
        this.addEventListener('scrollend', this.saveScroll);
    }

    /**
     * Get existing list of collapsed blocks so we can add/delete newly toggled ones
     *
     * @returns {void}
     */
    _loadCollapsedPanels() {
        try {
            const value = ips.utils.cookie.get('collapsedNavigationPanels');
            const parsed = JSON.parse(value || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            ips.utils.cookie.set('collapsedNavigationPanels', '[]');
            return [];
        }
    }

    /**
     * Event handler for storing toggle status
     * Hidden categories are stored localDB
     *
     * @param 	{Event} 	e 	toggle Event object
     * @returns {void}
     */
    toggleBlock(e){

        if(!this.collapsed){
            this.collapsed = new Set(this._loadCollapsedPanels());
        }

        const id = e.target.getAttribute('data-id');
        if (!id) return;

        if(e.newState === 'open'){
            this.collapsed.delete(id)
        } else {
            this.collapsed.add(id);
        }

        ips.utils.cookie.set('collapsedNavigationPanels', JSON.stringify([...this.collapsed]), true);

        this.saveScroll();
    };

    /**
     * Scroll event handler for storing scroll position
     * Saved as sessionStorage
     *
     * @returns {void}
     */
    saveScroll(){
        sessionStorage.setItem('navigationPanelScroll', this.scrollTop);
    };
}