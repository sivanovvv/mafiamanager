<?php
namespace IPS\Theme;
class class_downloads_admin_nexus extends \IPS\Theme\Template
{	function fileInfo( $file ) {
		$return = '';
		$return .= <<<IPSCONTENT


<div class='ipsBox ipsBox--commercePurchasedFile i-margin-bottom_2'>
	<i-data>
		<ul class="ipsData ipsData--table">
			<li class='ipsData__item'>
				<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" class="ipsLinkPanel" aria-hidden="true" tabindex="-1"><span>
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->name, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</span></a>
				<div class='ipsData__image'>
					
IPSCONTENT;

if ( $screenshot = $file->primary_screenshot_thumb ):
$return .= <<<IPSCONTENT

						<img src='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $screenshot->url, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' alt='' loading='lazy'>
					
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

						<i aria-hidden="true"></i>
					
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

				</div>
				<div class="ipsData__content">
					<div class='ipsData__main'>
						<h4 class='ipsData__title'>
							
IPSCONTENT;

if ( $file->prefix() ):
$return .= <<<IPSCONTENT

								
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core", 'front' )->prefix( $file->prefix( TRUE ), $file->prefix() );
$return .= <<<IPSCONTENT

							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							<a href='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' title='
IPSCONTENT;

$sprintf = array($file->name); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'view_this_file', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'sprintf' => $sprintf ) );
$return .= <<<IPSCONTENT
'>
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->name, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</a>
						</h4>
						<p class='ipsData__meta'>
							
IPSCONTENT;

$htmlsprintf = array($file->author()->link()); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'byline_nodate', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'htmlsprintf' => $htmlsprintf ) );
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( \IPS\Widget\Request::i()->app != 'downloads' ):
$return .= <<<IPSCONTENT

								
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'in', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
 <a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->container()->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
">
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->container()->_title, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</a>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

						</p>
						<div class='ipsData__desc ipsRichText ipsTruncate_2'>
							{$file->truncated()}
						</div>
						
IPSCONTENT;

if ( $file->container()->bitoptions['reviews'] ):
$return .= <<<IPSCONTENT

							
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core", 'front' )->rating( 'large', $file->averageReviewRating(), \IPS\Settings::i()->reviews_rating_out_of, $file->memberReviewRating() );
$return .= <<<IPSCONTENT
&nbsp;&nbsp; <span class='i-color_soft'>(
IPSCONTENT;

$pluralize = array( $file->reviews ); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'num_reviews', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'pluralize' => $pluralize ) );
$return .= <<<IPSCONTENT
)</span>
						
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

					</div>
					<div class='ipsData__extra'>
						<ul class='ipsData__stats'>
							
IPSCONTENT;

if ( $file->container()->bitoptions['comments'] ):
$return .= <<<IPSCONTENT

								
IPSCONTENT;

if ( $file->comments ):
$return .= <<<IPSCONTENT

									<li data-stattype="comments">
										<span class='ipsData__stats-icon' data-stat-value='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->comments, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' aria-hidden="true" data-ipstooltip title='
IPSCONTENT;

$pluralize = array( $file->comments ); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'num_comments', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'pluralize' => $pluralize ) );
$return .= <<<IPSCONTENT
'></span>
										<span class='ipsData__stats-label'>
											<a href='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->url()->setQueryString( 'tab', 'comments' )->setFragment('replies'), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
'>
IPSCONTENT;

$pluralize = array( $file->comments ); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'num_comments', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'pluralize' => $pluralize ) );
$return .= <<<IPSCONTENT
</a>
										</span>
									</li>
								
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							<li>
								
IPSCONTENT;

if ( $file->updated == $file->submitted ):
$return .= <<<IPSCONTENT

IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'submitted', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
 
IPSCONTENT;

$val = ( $file->submitted instanceof \IPS\DateTime ) ? $file->submitted : \IPS\DateTime::ts( $file->submitted );$return .= $val->html(useTitle: true);
$return .= <<<IPSCONTENT

IPSCONTENT;

else:
$return .= <<<IPSCONTENT

IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'updated', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
 
IPSCONTENT;

$val = ( $file->updated instanceof \IPS\DateTime ) ? $file->updated : \IPS\DateTime::ts( $file->updated );$return .= $val->html(useTitle: true);
$return .= <<<IPSCONTENT

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							</li>
						</ul>
					</div>
				</div>
			</li>
		</ul>
	</i-data>
</div>
IPSCONTENT;

		return $return;
}

	function itemResultTemplate( $item ) {
		$return = '';
		$return .= <<<IPSCONTENT

<div data-itemid="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $item->id, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" data-role='contentItemRow'>
	<strong>
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $item->mapped('title'), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</strong>
	
IPSCONTENT;

if ( $item->container() ):
$return .= <<<IPSCONTENT

		<em>
IPSCONTENT;

$sprintf = array($item->container()->_title); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'item_selector_added_to_container', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'sprintf' => $sprintf ) );
$return .= <<<IPSCONTENT
</em>
	
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	<br>
	<span class='i-color_soft'>
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $item->author()->name, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
 </span> &middot; 
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $item->priceToDisplay(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

</div>


IPSCONTENT;

		return $return;
}}