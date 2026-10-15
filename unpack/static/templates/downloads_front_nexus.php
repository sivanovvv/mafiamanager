<?php
namespace IPS\Theme;
class class_downloads_front_nexus extends \IPS\Theme\Template
{	function chooseProduct( $products ) {
		$return = '';
		$return .= <<<IPSCONTENT


<div class='i-padding_3'>
	<h2 class='ipsTitle ipsTitle--h2 i-text-align_center'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'choose_file_nexus_title', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</h2>
	<p class='i-font-size_2 i-font-weight_500 i-text-align_center i-color_soft i-margin-block_2'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'choose_file_nexus_blurb', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</p>
</div>
	<section data-controller='nexus.front.store.register'>
		<i-data>
			<ul class="ipsData ipsData--grid ipsData--commerce-choose-file i-basis_300 i-border-top_3">
				
IPSCONTENT;

foreach ( $products as $package ):
$return .= <<<IPSCONTENT

					
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "store", "nexus" )->packageBlock( $package );
$return .= <<<IPSCONTENT

				
IPSCONTENT;

endforeach;
$return .= <<<IPSCONTENT

			</ul>
		</i-data>
		<div data-role='productInformationWrapper' class='ipsHide i-background_2 i-padding_3 cNexusRegister_info i-margin_3'>
			<a href='#' class='cNexusRegister_close ipsHide' data-action='closeInfo'>&times;</a>
			<div data-role='productInformation'></div>
		</div>
	</section>
IPSCONTENT;

		return $return;
}

	function fileInfo( $file ) {
		$return = '';
		$return .= <<<IPSCONTENT


IPSCONTENT;

		return $return;
}

	function filePurchaseInfo( $file, $reactivateUrl=NULL ) {
		$return = '';
		$return .= <<<IPSCONTENT


IPSCONTENT;

if ( $file->desc ):
$return .= <<<IPSCONTENT

<div class='i-margin_2' data-ipsTruncate data-ipsTruncate-size='5 lines' data-ipsTruncate-type='remove'>
{$file->desc}
</div>

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

<ul class='ipsList ipsList--inline'>
    
IPSCONTENT;

if ( $reactivateUrl ):
$return .= <<<IPSCONTENT

        <li><a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $reactivateUrl, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" class='ipsButton ipsButton--soft'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'reactivate_package', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a></li>
    
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT


    
IPSCONTENT;

if ( $file->canDownload() ):
$return .= <<<IPSCONTENT

        <li><a 
IPSCONTENT;

if ( $file->canView() ):
$return .= <<<IPSCONTENT
href='
IPSCONTENT;

if ( \IPS\Settings::i()->idm_antileech AND !$file->requiresDownloadConfirmation() ):
$return .= <<<IPSCONTENT

IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->url('download')->csrf(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

IPSCONTENT;

else:
$return .= <<<IPSCONTENT

IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->url('download'), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
'
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 class='ipsButton 
IPSCONTENT;

if ( $file->canView() ):
$return .= <<<IPSCONTENT
ipsButton--primary
IPSCONTENT;

else:
$return .= <<<IPSCONTENT
ipsButton--disabled
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
' 
IPSCONTENT;

if ( $file->requiresDownloadConfirmation() ):
$return .= <<<IPSCONTENT
data-ipsDialog
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'download_now', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a></li>
    
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

    
IPSCONTENT;

if ( $file->container()->can( 'view' ) ):
$return .= <<<IPSCONTENT

        <li><a 
IPSCONTENT;

if ( $file->canView()  ):
$return .= <<<IPSCONTENT
href='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $file->url( "getPrefComment" ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
'
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 class='ipsButton 
IPSCONTENT;

if ( $file->canView() ):
$return .= <<<IPSCONTENT
ipsButton--secondary
IPSCONTENT;

else:
$return .= <<<IPSCONTENT
ipsButton--disabled
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'file_view_details', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a></li>
    
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

</ul>

IPSCONTENT;

if ( !$file->canView() ):
$return .= <<<IPSCONTENT

<p class='i-color_soft'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'nexus_file_no_longer_available', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</p>

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

IPSCONTENT;

		return $return;
}}