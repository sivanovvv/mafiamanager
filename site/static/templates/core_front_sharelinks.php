<?php
namespace IPS\Theme;
class class_core_front_sharelinks extends \IPS\Theme\Template
{	function bluesky( $url, $title ) {
		$return = '';
		$return .= <<<IPSCONTENT

<a href="https://bsky.app/intent/compose?text=
IPSCONTENT;

if ( $title ):
$return .= <<<IPSCONTENT

IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $title, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
%20-%20
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" class="ipsShareLink ipsShareLink--bluesky" target="_blank" data-role="shareLink" data-ipsTooltip='
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'bluesky_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
' rel='nofollow noopener'>
    <i class="fa-brands fa-bluesky" aria-hidden="true"></i>
    <span class="ipsInvisible">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'bluesky_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</span>
</a>
IPSCONTENT;

		return $return;
}

	function email( $url, $title ) {
		$return = '';
		$return .= <<<IPSCONTENT

<a href="mailto:?subject=
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $title, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
&body=
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" rel='nofollow' class='ipsShareLink ipsShareLink--email' data-ipsTooltip='
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'email_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
'>
	<i class="fa-solid fa-envelope" aria-hidden="true"></i>
	<span class="ipsInvisible">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'email_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</span>
</a>
IPSCONTENT;

		return $return;
}

	function facebook( $url ) {
		$return = '';
		$return .= <<<IPSCONTENT

<a href="https://www.facebook.com/sharer/sharer.php?u=
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" class="ipsShareLink ipsShareLink--facebook" target="_blank" data-role="shareLink" data-ipsTooltip='
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'facebook_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
' rel='noopener nofollow'>
	<i class="fa-brands fa-facebook" aria-hidden="true"></i>
	<span class="ipsInvisible">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'facebook_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</span>
</a>
IPSCONTENT;

		return $return;
}

	function linkedin( $url, $title ) {
		$return = '';
		$return .= <<<IPSCONTENT

<a href="https://www.linkedin.com/shareArticle?mini=true&amp;url=
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
&amp;title=
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $title, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" rel="nofollow noopener" class="ipsShareLink ipsShareLink--linkedin" target="_blank" data-role="shareLink" data-ipsTooltip='
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'lin_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
'>
	<i class="fa-brands fa-linkedin" aria-hidden="true"></i>
	<span class="ipsInvisible">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'lin_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</span>
</a>
IPSCONTENT;

		return $return;
}

	function pinterest( $url ) {
		$return = '';
		$return .= <<<IPSCONTENT

<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" class="ipsShareLink ipsShareLink--pinterest" rel="nofollow noopener" target="_blank" data-role="shareLink" data-ipsTooltip='
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'pinterest_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
'>
	<i class="fa-brands fa-pinterest" aria-hidden="true"></i>
	<span class="ipsInvisible">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'pinterest_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</span>
</a>
IPSCONTENT;

		return $return;
}

	function reddit( $url, $title ) {
		$return = '';
		$return .= <<<IPSCONTENT

<a href="https://www.reddit.com/submit?url=
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
&amp;title=
IPSCONTENT;

$return .= \IPS\Theme\Template::htmlspecialchars( urlencode( $title ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" rel="nofollow noopener" class="ipsShareLink ipsShareLink--reddit" target="_blank" data-ipsTooltip='
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'reddit_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
'>
	<i class="fa-brands fa-reddit" aria-hidden="true"></i>
	<span class="ipsInvisible">{lang="reddit_text"</span>
</a>
IPSCONTENT;

		return $return;
}

	function shareButton( $item, $classes = '' ) {
		$return = '';
		$return .= <<<IPSCONTENT


IPSCONTENT;

$id = mt_rand();
$return .= <<<IPSCONTENT


IPSCONTENT;

if ( \count( $item->sharelinks() )  ):
$return .= <<<IPSCONTENT

    <button type="button" id="elShareItem_
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $id, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" popovertarget="elShareItem_
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $id, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
_menu" class='ipsButton ipsButton--share ipsButton--inherit 
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $classes, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
'>
        <i class='fa-solid fa-share-nodes' aria-hidden="true"></i><span class="ipsButton__label">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'share', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</span>
    </button>
    <i-dropdown popover id="elShareItem_
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $id, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
_menu" data-controller="core.front.core.sharelink">
        <div class="iDropdown">
            <div class='i-padding_2'>
                
IPSCONTENT;

$url = $item->url();
$return .= <<<IPSCONTENT

                
IPSCONTENT;

if ( \IPS\Settings::i()->ref_on ):
$return .= <<<IPSCONTENT

                    
IPSCONTENT;

$url = $url->setQueryString( array( '_rid' => \IPS\Member::loggedIn()->member_id  ) );
$return .= <<<IPSCONTENT

                
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

                <button type="button" class="ipsPageActions__mainLink" data-ipscopy data-ipscopy-flashmessage data-ipscopy-text="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" data-ipstooltip title='
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'copy_share_link', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
'><i class="fa-regular fa-copy" aria-hidden="true"></i> 
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</button>
                <ul class='ipsList ipsList--inline i-justify-content_center i-gap_1 i-margin-top_2'>
                    
IPSCONTENT;

foreach ( $item->sharelinks() as $sharelink  ):
$return .= <<<IPSCONTENT

                        <li>{$sharelink}</li>
                    
IPSCONTENT;

endforeach;
$return .= <<<IPSCONTENT

                </ul>
                
IPSCONTENT;

if ( $shareData = $item->webShareData() ):
$return .= <<<IPSCONTENT

                    <button class='ipsHide ipsButton ipsButton--small ipsButton--inherit ipsButton--wide i-margin-top_2' data-controller='core.front.core.webshare' data-role='webShare' data-webShareTitle='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $shareData['title'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' data-webShareText='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $shareData['text'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' data-webShareUrl='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $shareData['url'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'more_share_options', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</button>
                
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

            </div>
        </div>
    </i-dropdown>

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

IPSCONTENT;

		return $return;
}

	function x( $url, $title ) {
		$return = '';
		$return .= <<<IPSCONTENT

<a href="https://x.com/share?url=
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" class="ipsShareLink ipsShareLink--x" target="_blank" data-role="shareLink" data-ipsTooltip='
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'x_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
' rel='nofollow noopener'>
    <i class="fa-brands fa-x-twitter" aria-hidden="true"></i>
    <span class="ipsInvisible">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'x_text', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</span>
</a>
IPSCONTENT;

		return $return;
}}