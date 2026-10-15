<?php
namespace IPS\Theme;
class class_gallery_front_view extends \IPS\Theme\Template
{	function comments( $image ) {
		$return = '';
		$return .= <<<IPSCONTENT

<div data-controller='core.front.core.commentFeed, core.front.core.ignoredComments' 
IPSCONTENT;

if ( \IPS\Settings::i()->auto_polling_enabled ):
$return .= <<<IPSCONTENT
data-autoPoll
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 data-baseURL='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' 
IPSCONTENT;

if ( $image->isLastPage() ):
$return .= <<<IPSCONTENT
data-lastPage
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 data-feedID='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->feedId, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' id='comments' class="ipsEntries ipsEntries--comments ipsEntries--gallery-comments" data-follow-area-id="image-
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->id, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
">

	
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "gallery" )->featuredComments( $image->featuredComments(), $image->url()->setQueryString('tab', 'comments')->setQueryString('recommended', 'comments') );
$return .= <<<IPSCONTENT


	
IPSCONTENT;

if ( $image->commentPageCount() > 1 ):
$return .= <<<IPSCONTENT

		<div class='ipsButtonBar'>
			<div class='ipsButtonBar__pagination'>{$image->commentPagination( array('tab') )}</div>
			<div class='ipsButtonBar__end'>
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->commentMultimodHeader( $image, '#comments' );
$return .= <<<IPSCONTENT
</div>
		</div>
	
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT


	<div data-role='commentFeed' data-controller='core.front.core.moderation'>
	<form action="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->csrf()->setQueryString( 'do', 'multimodComment' )->setPage('page',\IPS\Request::i()->page), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" method="post" data-ipsPageAction data-role='moderationTools'>
		
IPSCONTENT;

if ( \count( $image->comments( NULL, NULL, 'date', 'asc', NULL, NULL, NULL, NULL, FALSE, isset( \IPS\Widget\Request::i()->showDeleted ) ) ) ):
$return .= <<<IPSCONTENT


				
IPSCONTENT;

$commentCount=0; $timeLastRead = $image->timeLastRead(); $lined = FALSE;
$return .= <<<IPSCONTENT

				
IPSCONTENT;

foreach ( $image->comments( NULL, NULL, 'date', 'asc', NULL, NULL, NULL, NULL, FALSE, isset( \IPS\Widget\Request::i()->showDeleted ) ) as $comment ):
$return .= <<<IPSCONTENT

					
IPSCONTENT;

if ( !$lined and $timeLastRead and $timeLastRead->getTimestamp() < $comment->mapped('date') ):
$return .= <<<IPSCONTENT

						
IPSCONTENT;

if ( $lined = TRUE and $commentCount ):
$return .= <<<IPSCONTENT

							<hr class="ipsUnreadBar">
						
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

					
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

					
IPSCONTENT;

$commentCount++;
$return .= <<<IPSCONTENT

					{$comment->html()}
				
IPSCONTENT;

endforeach;
$return .= <<<IPSCONTENT



		
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

			<p class='ipsEmptyMessage' data-role='noComments'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'no_comments', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</p>
		
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->commentMultimod( $image );
$return .= <<<IPSCONTENT

			</form>
	</div>			
	
IPSCONTENT;

if ( $image->commentPageCount() > 1 ):
$return .= <<<IPSCONTENT

		<div class='ipsButtonBar ipsButtonBar--bottom'>
			<div class='ipsButtonBar__pagination'>{$image->commentPagination( array('tab') )}</div>
		</div>
	
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT


	
IPSCONTENT;

if ( $image->commentForm() || $image->locked() || \IPS\Member::loggedIn()->restrict_post || \IPS\Member::loggedIn()->members_bitoptions['unacknowledged_warnings'] || !\IPS\Member::loggedIn()->checkPostsPerDay() ):
$return .= <<<IPSCONTENT

	<div id='replyForm' data-role='replyArea' class='ipsComposeAreaWrapper 
IPSCONTENT;

if ( !$image->canComment() ):
$return .= <<<IPSCONTENT
cTopicPostArea_noSize
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
'>
		
IPSCONTENT;

if ( $image->commentForm() ):
$return .= <<<IPSCONTENT

			
IPSCONTENT;

if ( $image->locked() ):
$return .= <<<IPSCONTENT

				<p class='ipsComposeArea_warning'><i class='fa-solid fa-circle-info' aria-hidden="true"></i> 
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'image_locked_can_comment', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</p>
			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

				{$image->commentForm()}
			
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

			
IPSCONTENT;

if ( $image->locked() ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "forms", "gallery", 'front' )->commentUnavailable( 'image_locked_cannot_comment' );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

elseif ( \IPS\Member::loggedIn()->restrict_post ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "forms", "gallery", 'front' )->commentUnavailable( 'restricted_cannot_comment', \IPS\Member::loggedIn()->warnings(5,NULL,'rpa'), \IPS\Member::loggedIn()->restrict_post );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

elseif ( \IPS\Member::loggedIn()->members_bitoptions['unacknowledged_warnings'] ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "forms", "gallery", 'front' )->commentUnavailable( 'unacknowledged_warning_cannot_post', \IPS\Member::loggedIn()->warnings( 1, FALSE ) );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

elseif ( !\IPS\Member::loggedIn()->checkPostsPerDay() ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "forms", "gallery", 'front' )->commentUnavailable( 'member_exceeded_posts_per_day' );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	</div>
	
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

</div>

IPSCONTENT;

		return $return;
}

	function image( $image, $commentsAndReviews=FALSE ) {
		$return = '';
		$return .= <<<IPSCONTENT



IPSCONTENT;

if ( $club = $image->container()->club() ):
$return .= <<<IPSCONTENT

	
IPSCONTENT;

if ( \IPS\Settings::i()->clubs and \IPS\Settings::i()->clubs_header == 'full' ):
$return .= <<<IPSCONTENT

		
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "clubs", "core" )->header( $club, $image->container() );
$return .= <<<IPSCONTENT

	
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	<div id='elClubContainer'>

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT


<div data-controller='gallery.front.view.image
IPSCONTENT;

if ( \IPS\Settings::i()->gallery_nsfw ):
$return .= <<<IPSCONTENT
,gallery.front.global.nsfw
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
' data-lightboxURL='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' class="ipsBlockSpacer">
	
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->contentHiddenMessage( $image );
$return .= <<<IPSCONTENT

	<div class='ipsPull i-margin-bottom_block'>
		<div class='elGalleryHeader'>
			
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "view", "gallery" )->imageFrame( $image );
$return .= <<<IPSCONTENT

		</div>
        
IPSCONTENT;

if ( $image->hasPreviousOrNext()  ):
$return .= <<<IPSCONTENT

            
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "view", "gallery", 'front' )->imageCarouselLinks( $image );
$return .= <<<IPSCONTENT

        
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	</div>

	
IPSCONTENT;

$return .= \IPS\core\Advertisement::loadByLocation( 'ad_image_lightbox' );
$return .= <<<IPSCONTENT


	
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "view", \IPS\Request::i()->app )->imageInfo( $image );
$return .= <<<IPSCONTENT


	
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "view", "gallery", 'front' )->imageComments( $image, $commentsAndReviews );
$return .= <<<IPSCONTENT


</div> 


IPSCONTENT;

if ( $image->container()->club() ):
$return .= <<<IPSCONTENT

	</div>

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

IPSCONTENT;

		return $return;
}

	function imageCarouselLink( $carouselImage, $active=false ) {
		$return = '';
		$return .= <<<IPSCONTENT


IPSCONTENT;

$imageWidth=isset( $carouselImage->_dimensions['small'][0] ) ? $carouselImage->_dimensions['small'][0] : 0;
$return .= <<<IPSCONTENT


IPSCONTENT;

$imageHeight=isset( $carouselImage->_dimensions['small'][1] ) ? $carouselImage->_dimensions['small'][1] : 0;
$return .= <<<IPSCONTENT

<li 
IPSCONTENT;

if ( $active ):
$return .= <<<IPSCONTENT
data-active
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 
IPSCONTENT;

if ( $imageWidth && $imageHeight ):
$return .= <<<IPSCONTENT
style='--i-ratio:
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $imageWidth, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
/
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $imageHeight, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
'
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 data-image-id="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $carouselImage->id, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
"  >
	<figure class='ipsFigure'>
		
IPSCONTENT;

if ( $carouselImage->media  ):
$return .= <<<IPSCONTENT

		<a href='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $carouselImage->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' title='
IPSCONTENT;

$sprintf = array($carouselImage->caption); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'view_this_video', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'sprintf' => $sprintf ) );
$return .= <<<IPSCONTENT
' class='ipsFigure__main' data-action="changeImage">
			<video data-role="video" preload="metadata" loading="lazy"
IPSCONTENT;

if ( $carouselImage->masked_file_name  ):
$return .= <<<IPSCONTENT
 poster="
IPSCONTENT;

$return .= \IPS\File::get( "gallery_Images", $carouselImage->masked_file_name )->url;
$return .= <<<IPSCONTENT
"
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
>
				<source src="
IPSCONTENT;

$return .= \IPS\File::get( "gallery_Images", $carouselImage->original_file_name )->url;
$return .= <<<IPSCONTENT

IPSCONTENT;

if ( !$carouselImage->masked_file_name  ):
$return .= <<<IPSCONTENT
#t=1
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
" type='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $carouselImage->file_type, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' />
			</video>
			<i class="ipsFigure__play" aria-hidden="true"></i>
		</a>
		
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

		<a href='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $carouselImage->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' title='
IPSCONTENT;

$sprintf = array($carouselImage->caption); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'view_this_image', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'sprintf' => $sprintf ) );
$return .= <<<IPSCONTENT
' class='ipsFigure__main' data-action="changeImage">
			<img src='
IPSCONTENT;

$return .= \IPS\File::get( "gallery_Images", $carouselImage->small_file_name )->url;
$return .= <<<IPSCONTENT
' alt="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $carouselImage->caption, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" loading="lazy">
		</a>
		
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "gallery", 'front' )->nsfwOverlay( $carouselImage, FALSE );
$return .= <<<IPSCONTENT

	</figure>
</li>
IPSCONTENT;

		return $return;
}

	function imageCarouselLinks( $image ) {
		$return = '';
		$return .= <<<IPSCONTENT



IPSCONTENT;

$prev = array_reverse( array_slice( $image->fetchNextOrPreviousImages( 9, 'ASC' ), 0, 4 ) );
$return .= <<<IPSCONTENT


IPSCONTENT;

$next = $image->fetchNextOrPreviousImages( 9, 'DESC' );
$return .= <<<IPSCONTENT

<div class='cGalleryImageThumbs'>
	<ol class='ipsCarousel ipsCarousel--images ipsCarousel--gallery-image-thumbs' id='gallery-image-thumbs' tabindex="0">
		
IPSCONTENT;

$counter = 1;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

foreach ( $prev as $id => $carouselImage ):
$return .= <<<IPSCONTENT

			
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "view", "gallery", 'front' )->imageCarouselLink( $carouselImage );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

$counter++;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

endforeach;
$return .= <<<IPSCONTENT


		
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "view", "gallery", 'front' )->imageCarouselLink( $image, true );
$return .= <<<IPSCONTENT

		
IPSCONTENT;

$counter++;
$return .= <<<IPSCONTENT


		
IPSCONTENT;

foreach ( $next as $id => $carouselImage ):
$return .= <<<IPSCONTENT

			
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "view", "gallery", 'front' )->imageCarouselLink( $carouselImage );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

$counter++;
$return .= <<<IPSCONTENT

			
IPSCONTENT;

if ( $counter === 10 ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

break;
$return .= <<<IPSCONTENT

			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

endforeach;
$return .= <<<IPSCONTENT

	</ol>
	
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->carouselNavigation( 'gallery-image-thumbs' );
$return .= <<<IPSCONTENT

</div>
IPSCONTENT;

		return $return;
}

	function imageComments( $image, $commentsAndReviews ) {
		$return = '';
		$return .= <<<IPSCONTENT

<div data-role="imageComments">

IPSCONTENT;

if ( $commentsAndReviews ):
$return .= <<<IPSCONTENT

	
IPSCONTENT;

if ( ( $image->directContainer()->allow_reviews && $image->container()->allow_reviews ) && ( $image->directContainer()->allow_comments && $image->container()->allow_comments )  ):
$return .= <<<IPSCONTENT

		<span id="replies"></span>
		<h2 hidden>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'user_feedback', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</h2>
	
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	<div class='ipsBox ipsBox--galleryImageCommentsReviews ipsPull'>
		{$commentsAndReviews}
	</div>

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

</div>
IPSCONTENT;

		return $return;
}

	function imageFrame( $image ) {
		$return = '';
		$return .= <<<IPSCONTENT


<div id="elGalleryImage" class="elGalleryImage" data-role="imageFrame" data-image-id="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->id, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" 
IPSCONTENT;

if ( $image->data ):
$return .= <<<IPSCONTENT
data-imagesizes="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->data, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" 
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
>
	
IPSCONTENT;

if ( $image->media  ):
$return .= <<<IPSCONTENT

		
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageFrame", "videoContainer:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="cGallery_videoContainer" data-ips-hook="videoContainer">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageFrame", "videoContainer:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

			<video data-controller="core.global.core.embeddedvideo" id="elGalleryVideo" data-role="video" controls preload="auto" width="100%" height="100%" 
IPSCONTENT;

if ( $image->masked_file_name  ):
$return .= <<<IPSCONTENT
 poster="
IPSCONTENT;

$return .= \IPS\File::get( "gallery_Images", $image->masked_file_name )->url;
$return .= <<<IPSCONTENT
" 
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
>
				<source src="
IPSCONTENT;

$return .= \IPS\File::get( "gallery_Images", $image->original_file_name )->url;
$return .= <<<IPSCONTENT
" type="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->file_type, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
">
				<embed wmode="opaque" autoplay="true" showcontrols="true" showstatusbar="true" showtracker="true" src="
IPSCONTENT;

$return .= \IPS\File::get( "gallery_Images", $image->original_file_name )->url;
$return .= <<<IPSCONTENT
" width="480" height="360" type="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->file_type, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
">
			</video>
		
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageFrame", "videoContainer:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageFrame", "videoContainer:after", [ $image ] );
$return .= <<<IPSCONTENT

	
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

		
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageFrame", "imageContainer:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="cGalleryViewImage" data-role="notesWrapper" data-controller="gallery.front.view.notes" data-imageid="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->id, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" 
IPSCONTENT;

if ( $image->canEdit() ):
$return .= <<<IPSCONTENT
data-editable
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 data-notesdata="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->_notes_json, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" data-ips-hook="imageContainer">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageFrame", "imageContainer:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

			<a href="
IPSCONTENT;

$return .= \IPS\File::get( "gallery_Images", $image->masked_file_name )->url;
$return .= <<<IPSCONTENT
" title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'view_in_lightbox', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
" data-ipslightbox>
				
IPSCONTENT;

$imageWidth=isset( $image->_dimensions['small'][0] ) ? $image->_dimensions['small'][0] : 0;
$return .= <<<IPSCONTENT

                
IPSCONTENT;

$imageHeight=isset( $image->_dimensions['small'][1] ) ? $image->_dimensions['small'][1] : 0;
$return .= <<<IPSCONTENT

				<img src="
IPSCONTENT;

$return .= \IPS\File::get( "gallery_Images", $image->masked_file_name )->url;
$return .= <<<IPSCONTENT
" alt="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->caption, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" 
IPSCONTENT;

if ( $imageWidth && $imageHeight ):
$return .= <<<IPSCONTENT
width="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $imageWidth, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" height="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $imageHeight, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" 
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 title="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->caption, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" data-role="theImage" fetchpriority="high" decoding="sync">
			</a>
			
IPSCONTENT;

if ( \is_countable( $image->_notes ) AND \count( $image->_notes ) ):
$return .= <<<IPSCONTENT

				<noscript>
					
IPSCONTENT;

foreach ( $image->_notes as $note ):
$return .= <<<IPSCONTENT

						<div class="cGalleryNote" style="left: 
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $note['LEFT'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
%; top: 
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $note['TOP'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
%; width: 
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $note['WIDTH'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
%; height: 
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $note['HEIGHT'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
%">
							<div class="cGalleryNote_border"></div>
							<div class="cGalleryNote_note"><div>
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $note['NOTE'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</div></div>
						</div>
					
IPSCONTENT;

endforeach;
$return .= <<<IPSCONTENT

				</noscript>
			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageFrame", "imageContainer:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageFrame", "imageContainer:after", [ $image ] );
$return .= <<<IPSCONTENT

        	
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "gallery", 'front' )->nsfwOverlay( $image );
$return .= <<<IPSCONTENT


		<div class="cGalleryImageFade">
			
IPSCONTENT;

if ( $image->canEdit() OR $image->canDownloadOriginal() OR \IPS\Member::loggedIn()->member_id ):
$return .= <<<IPSCONTENT

				<button type="button" id="elImageTools" popovertarget="elImageTools_menu" class="ipsButton ipsButton--overlay ipsJS_show cGalleryViewImage_controls"><span>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'image_tools', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</span> <i class="fa-solid fa-caret-down" aria-hidden="true"></i></button>
				<i-dropdown popover id="elImageTools_menu">
					<div class="iDropdown">
						<ul class="iDropdown__items">
							
IPSCONTENT;

if ( $image->canEdit() ):
$return .= <<<IPSCONTENT

								<li class="ipsResponsive_hidePhone">
									<button type="button" title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'add_image_note', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
" data-action="addNote"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> 
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'add_image_note', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</button>
								</li>
								
IPSCONTENT;

if ( !$image->media ):
$return .= <<<IPSCONTENT

									<li><hr class="ipsResponsive_hidePhone"></li>
									<li>
										<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url( 'rotate' )->csrf()->setQueryString( 'direction', 'right' ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'rotate_right', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
">
											<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> 
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'rotate_right', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT

										</a>
									</li>
									<li>
										<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url( 'rotate' )->csrf()->setQueryString( 'direction', 'left' ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'rotate_left', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
">
											<i class="fa-solid fa-rotate-left" aria-hidden="true"></i> 
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'rotate_left', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT

										</a>
									</li>
								
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( \IPS\Member::loggedIn()->member_id ):
$return .= <<<IPSCONTENT

									
IPSCONTENT;

if ( $image->canSetAsAlbumCover() OR $image->canSetAsCategoryCover() ):
$return .= <<<IPSCONTENT

										<li><hr></li>
										
IPSCONTENT;

if ( $image->canSetAsAlbumCover() AND $image->canSetAsCategoryCover() ):
$return .= <<<IPSCONTENT

											<li><a data-action="setAsCover" href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->setQueryString( 'do', 'cover' )->setQueryString( 'set', 'category')->csrf(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
"><i class="fa-solid fa-images" aria-hidden="true"></i>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'cover_category_only', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a></li>
											<li><a data-action="setAsCover" href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->setQueryString( 'do', 'cover' )->setQueryString( 'set', 'album')->csrf(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
"><i class="fa-solid fa-images" aria-hidden="true"></i>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'cover_album_only', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a></li>
											<li><a data-action="setAsCover" href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->setQueryString( 'do', 'cover' )->setQueryString( 'set', 'both')->csrf(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
"><i class="fa-solid fa-images" aria-hidden="true"></i>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'cover_both', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a></li>
										
IPSCONTENT;

elseif ( $image->canSetAsCategoryCover() ):
$return .= <<<IPSCONTENT

											<li><a data-action="setAsCover" href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->setQueryString( 'do', 'cover' )->setQueryString( 'set', 'category')->csrf(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
"><i class="fa-solid fa-images" aria-hidden="true"></i>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'cover_category', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a></li>
										
IPSCONTENT;

elseif ( $image->canSetAsAlbumCover() ):
$return .= <<<IPSCONTENT

											<li><a data-action="setAsCover" href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->setQueryString( 'do', 'cover' )->setQueryString( 'set', 'album')->csrf(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
"><i class="fa-solid fa-images" aria-hidden="true"></i>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'cover_album', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a></li>
										
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

										
IPSCONTENT;

if ( \IPS\Member::loggedIn()->member_id ):
$return .= <<<IPSCONTENT

											<li>
												<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url('setAsPhoto')->csrf(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" data-action="setAsProfile" title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'set_gallery_image_photo', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
"><i class="fa-solid fa-circle-user" aria-hidden="true"></i>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'set_gallery_image_photo', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a>
											</li>
											
IPSCONTENT;

if ( \IPS\Settings::i()->gallery_nsfw and $image->canEdit() ):
$return .= <<<IPSCONTENT

												<li><hr></li>
												<li>
													<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url('toggleNSFW')->csrf(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" data-action="setAsProfile" title="
IPSCONTENT;

if ( $image->nsfw ):
$return .= <<<IPSCONTENT

IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'set_gallery_image_nsfw_on', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT

IPSCONTENT;

else:
$return .= <<<IPSCONTENT

IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'set_gallery_image_nsfw_off', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
"><i class="fa-solid fa-eye-slash" aria-hidden="true"></i>
IPSCONTENT;

if ( $image->nsfw ):
$return .= <<<IPSCONTENT

IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'set_gallery_image_nsfw_on', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT

IPSCONTENT;

else:
$return .= <<<IPSCONTENT

IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'set_gallery_image_nsfw_off', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
</a>
												</li>
											
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

										
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

									
IPSCONTENT;

elseif ( \IPS\Member::loggedIn()->member_id ):
$return .= <<<IPSCONTENT

										<li>
											<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url('setAsPhoto')->csrf(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'set_gallery_image_photo', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
"><i class="fa-solid fa-circle-user" aria-hidden="true"></i>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'set_gallery_image_photo', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a>
										</li>
									
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

								
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( $image->canDownloadOriginal() ):
$return .= <<<IPSCONTENT

								<li>
									<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url('download'), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'download', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
"><i class="fa-solid fa-download" aria-hidden="true"></i> 
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'download', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a>
								</li>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

						</ul>
					</div>
				</i-dropdown>
			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

		</div>
	
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	<span class="elGalleryImageNav">
       
IPSCONTENT;

if ( $image->hasPreviousOrNext() ):
$return .= <<<IPSCONTENT

            <a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->setQueryString( [ 'browse' => 1, 'do' => 'previous' ] ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" class="elGalleryImageNav_prev" data-action="changeImage" data-direction="prev"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></a>
            <a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->setQueryString( [ 'browse' => 1, 'do' => 'next' ] ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" class="elGalleryImageNav_next" data-action="changeImage" data-direction="next"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	</span>
</div>
IPSCONTENT;

		return $return;
}

	function imageInfo( $image ) {
		$return = '';
		$return .= <<<IPSCONTENT


<section data-role="imageInfo">

IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->contentItemMessages( $image->getMessages(), $image );
$return .= <<<IPSCONTENT

<div class="ipsBox ipsColumns ipsColumns--lines ipsPull i-margin-bottom_block">
	<div class="ipsColumns__primary">
		<article>
			<div data-role="imageDescription">
				<header class="ipsPageHeader">
					<div class="ipsPageHeader__row">
						
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "header:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="ipsPageHeader__primary" data-ips-hook="header">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "header:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

							<div class="ipsPageHeader__title">
								
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "title:before", [ $image ] );
$return .= <<<IPSCONTENT
<h1 data-ips-hook="title">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "title:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

									
IPSCONTENT;

if ( $image->canEdit() ):
$return .= <<<IPSCONTENT

										<span data-controller="core.front.core.moderation">
IPSCONTENT;

if ( $image->locked() ):
$return .= <<<IPSCONTENT
<i class="fa-solid fa-lock" aria-hidden="true"></i> 
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

											<span data-role="editableTitle" title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'click_hold_edit', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
">
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->caption, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</span>
										</span>
									
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

										<span>
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->caption, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</span>
									
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

								
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "title:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</h1>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "title:after", [ $image ] );
$return .= <<<IPSCONTENT

								
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "badges:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="ipsBadges" data-ips-hook="badges">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "badges:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

									
IPSCONTENT;

foreach ( $image->badges() as $badge ):
$return .= <<<IPSCONTENT
{$badge}
IPSCONTENT;

endforeach;
$return .= <<<IPSCONTENT

								
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "badges:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "badges:after", [ $image ] );
$return .= <<<IPSCONTENT

							</div>
							
IPSCONTENT;

if ( $image->directContainer()->allow_rating ):
$return .= <<<IPSCONTENT

								<div class="ipsPageHeader__rating">{$image->rating()}</div>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( \count( $image->tags() ) OR $image->prefix() OR ( $image->canEdit() AND $image::canTag( NULL, $image->container() ) ) ):
$return .= <<<IPSCONTENT

								
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->tagsWithPrefix( $image->tags(), $image->prefix(), FALSE, FALSE, ( $image->canEdit() AND $image::canTag( NULL, $image->container() ) ) ? $image->url() : NULL );
$return .= <<<IPSCONTENT

							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

						
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "header:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "header:after", [ $image ] );
$return .= <<<IPSCONTENT

						
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "buttons:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="ipsButtons" data-ips-hook="buttons">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "buttons:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( \count( $image->shareLinks() ) ):
$return .= <<<IPSCONTENT

								
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "sharelinks", "core" )->shareButton( $image );
$return .= <<<IPSCONTENT

							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->follow( 'gallery', 'image', $image->id, $image->followersCount() );
$return .= <<<IPSCONTENT

						
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "buttons:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "buttons:after", [ $image ] );
$return .= <<<IPSCONTENT

					</div>
					<div class="ipsPageHeader__row ipsPageHeader__row--footer">
						
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "footer:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="ipsPageHeader__primary" data-ips-hook="footer">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "footer:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

							<div class="ipsPhotoPanel ipsPhotoPanel--inline">
								
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->userPhoto( $image->author(), 'mini', $image->warningRef() );
$return .= <<<IPSCONTENT

								
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "author:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="ipsPhotoPanel__text" data-ips-hook="author">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "author:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

									<p class="ipsPhotoPanel__primary">
IPSCONTENT;

$htmlsprintf = array($image->author()->link( $image->warningRef() )); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'byline_nodate_itemprop', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'htmlsprintf' => $htmlsprintf ) );
$return .= <<<IPSCONTENT
</p>
									<ul class="ipsPhotoPanel__secondary ipsList ipsList--sep">
										<li>
IPSCONTENT;

$val = ( $image->date instanceof \IPS\DateTime ) ? $image->date : \IPS\DateTime::ts( $image->date );$return .= $val->html(useTitle: true);
$return .= <<<IPSCONTENT
</li>
										<li>
IPSCONTENT;

$pluralize = array( $image->views ); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'num_views_with_number', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'pluralize' => $pluralize ) );
$return .= <<<IPSCONTENT
</li>
										
IPSCONTENT;

if ( $image->author()->member_id ):
$return .= <<<IPSCONTENT

											<li><a href="
IPSCONTENT;

$return .= htmlspecialchars( \IPS\Http\Url::internal( "app=core&module=members&controller=profile&id={$image->author()->member_id}&do=content&type=gallery_image", "front", "profile_content", $image->author()->members_seo_name, 0 ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', TRUE );
$return .= <<<IPSCONTENT
">
IPSCONTENT;

$sprintf = array($image->author()->name); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'find_users_images', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'sprintf' => $sprintf ) );
$return .= <<<IPSCONTENT
</a></li>
										
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

									</ul>
								
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "author:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "author:after", [ $image ] );
$return .= <<<IPSCONTENT

							</div>
						
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "footer:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "footer:after", [ $image ] );
$return .= <<<IPSCONTENT

					</div>
				</header>
				
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "info:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="ipsEntry__post i-padding_3" data-ips-hook="info">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "info:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

					
IPSCONTENT;

if ( $image->description ):
$return .= <<<IPSCONTENT

					    
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->contentWrapper( $image, 'image' );
$return .= <<<IPSCONTENT

					
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

					
IPSCONTENT;

if ( $image->credit_info OR $image->copyright ):
$return .= <<<IPSCONTENT

						<div class="i-margin-top_4 i-flex i-flex-wrap_wrap i-gap_2">
							
IPSCONTENT;

if ( $image->credit_info ):
$return .= <<<IPSCONTENT

								<div class="i-flex_11">
									<h3 class="ipsTitle ipsTitle--h6">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'image_credit_info', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</h3>
									<div>
										
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->credit_info, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

									</div>
								</div>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( $image->copyright ):
$return .= <<<IPSCONTENT

								<div class="i-flex_11">
									<h3 class="ipsTitle ipsTitle--h6">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'image_copyright', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</h3>
									<div>
										© 
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->copyright, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

									</div>
								</div>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

						</div>
					
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "info:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "info:after", [ $image ] );
$return .= <<<IPSCONTENT
				
			</div>
			<footer class="ipsEntry__footer">
				<menu class="ipsEntry__controls">
					<li>{$image->menu()}</li>
				</menu>
				
IPSCONTENT;

if ( \IPS\IPS::classUsesTrait( $image, 'IPS\Content\Reactable' ) and \IPS\Settings::i()->reputation_enabled ):
$return .= <<<IPSCONTENT

					
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->reputation( $image );
$return .= <<<IPSCONTENT

				
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

			</footer>
		</article></div>
	
	<div class="ipsColumns__secondary i-basis_380 i-padding_3" id="elGalleryImageStats">
		
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "imageStats:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="" data-role="imageStats" data-ips-hook="imageStats">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "imageStats:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

if ( $image->showLocation() ):
$return .= <<<IPSCONTENT

				{$image->map( 308, 200 )}
				<div class="i-margin-top_2">
					<div class="i-flex i-justify-content_space-between i-flex-wrap_wrap i-gap_1">
						<div>
							
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->loc_short, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

						</div>
						
IPSCONTENT;

if ( $image->canEdit()  ):
$return .= <<<IPSCONTENT

							<div>
								<button type="button" id="elMapForm" popovertarget="elMapForm_menu" class="i-color_soft">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'map_privacy', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
 <i class="fa-solid fa-caret-down" aria-hidden="true"></i></button>
								<i-dropdown popover id="elMapForm_menu">
									<div class="iDropdown">
										<div class="i-padding_2">
											{$image->enableMapForm()}
										</div>
									</div>
								</i-dropdown>
							</div>
						
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

					</div>
				</div>
				<hr class="ipsHr">
			
IPSCONTENT;

elseif ( $image->showLocation() AND $image->canEdit() AND $image->gps_raw ):
$return .= <<<IPSCONTENT

				<div class="i-opacity_6">
					{$image->map( 308, 200 )}
					<div class="i-font-size_-1 i-margin-top_2">
						
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->loc_short, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

					</div>
				</div>
				<div class="i-font-size_-1 i-margin-top_2">
					<div class="i-flex i-justify-content_space-between i-flex-wrap_wrap i-gap_1">
						<div>
							<strong>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'map_not_being_shown', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</strong>
						</div>
						<div>
							<button type="button" id="elMapForm" popovertarget="elMapForm_menu">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'map_privacy', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
 <i class="fa-solid fa-caret-down" aria-hidden="true"></i></button>
							<i-dropdown popover id="elMapForm_menu">
								<div class="iDropdown">
									<div class="i-padding_3">
										{$image->enableMapForm()}
									</div>
								</div>
							</i-dropdown>
						</div>
					</div>
				</div>

				<hr class="ipsHr">
			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT


            
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "container:before", [ $image ] );
$return .= <<<IPSCONTENT
<div data-ips-hook="container">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "container:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

                <h2 class="ipsTitle ipsTitle--h6 i-color_soft">
IPSCONTENT;

if ( $image->directContainer() instanceof \IPS\gallery\Album ):
$return .= <<<IPSCONTENT

IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'from_the_album', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT

IPSCONTENT;

else:
$return .= <<<IPSCONTENT

IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'from_the_category', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
</h2>
                <h3 class="ipsTitle ipsTitle--h4 i-display_inline-block"><a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->directContainer()->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
">
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->directContainer()->_title, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</a></h3>
                <span class="i-color_soft">· 
IPSCONTENT;

$pluralize = array( $image->directContainer()->count_imgs ); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'num_images', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'pluralize' => $pluralize ) );
$return .= <<<IPSCONTENT
</span>
            
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "container:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "container:after", [ $image ] );
$return .= <<<IPSCONTENT

            <hr class="ipsHr">

			
IPSCONTENT;

if ( \is_countable($image->metadata) AND \count($image->metadata) ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "exif:before", [ $image ] );
$return .= <<<IPSCONTENT
<div class="cGalleryExif" data-ips-hook="exif">
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "exif:inside-start", [ $image ] );
$return .= <<<IPSCONTENT

					
IPSCONTENT;

if ( isset( $image->metadata['EXIF.FocalLength'] ) || ( isset( $image->metadata['IFD0.Make'] ) AND isset( $image->metadata['IFD0.Model'] ) ) || isset( $image->metadata['EXIF.ShutterSpeedValue'] ) || isset( $image->metadata['COMPUTED.ApertureFNumber'] ) || isset( $image->metadata['Exif.Photo.ISOSpeed'] ) ):
$return .= <<<IPSCONTENT

						<h3 class="ipsTitle ipsTitle--h4 ipsTitle--margin">
IPSCONTENT;

$sprintf = array($image->caption); $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'gallery_metadata', ENT_DISALLOWED, 'UTF-8', FALSE ), FALSE, array( 'sprintf' => $sprintf ) );
$return .= <<<IPSCONTENT
</h3>
						<ul class="ipsList ipsList--border ipsList--label-value">
							
IPSCONTENT;

if ( isset( $image->metadata['IFD0.Make'] ) AND isset( $image->metadata['IFD0.Model'] ) ):
$return .= <<<IPSCONTENT

								<li>
									<i class="fa-solid fa-camera-retro" aria-hidden="true"></i>
									<strong class="ipsList__label">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'gallery_exif_camera', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</strong>
									<span class="ipsList__value">
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->metadata['IFD0.Make'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
 
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->metadata['IFD0.Model'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</span>
								</li>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( isset( $image->metadata['EXIF.FocalLength'] ) ):
$return .= <<<IPSCONTENT

								<li>
									<i class="fa-solid fa-arrows-left-right" aria-hidden="true"></i>
									<strong class="ipsList__label">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'EXIF.FocalLength', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</strong>
									<span class="ipsList__value">
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->focallength, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</span>
								</li>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( isset( $image->metadata['EXIF.ExposureTime'] ) ):
$return .= <<<IPSCONTENT

								<li>
									<i class="fa-regular fa-clock" aria-hidden="true"></i>
									<strong class="ipsList__label">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'EXIF.ExposureTime', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</strong>
									<span class="ipsList__value">
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->metadata['EXIF.ExposureTime'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</span>
								</li>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( isset( $image->metadata['COMPUTED.ApertureFNumber'] ) ):
$return .= <<<IPSCONTENT

								<li>
									<i class="fa-solid fa-expand" aria-hidden="true"></i>
									<strong class="ipsList__label">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'COMPUTED.ApertureFNumber', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</strong>
									<span class="ipsList__value">
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->metadata['COMPUTED.ApertureFNumber'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
</span>
								</li>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

							
IPSCONTENT;

if ( isset( $image->metadata['Exif.Photo.ISOSpeed'] ) || isset( $image->metadata['EXIF.ISOSpeedRatings'] ) ):
$return .= <<<IPSCONTENT

								<li>
									<i class="fa-solid fa-camera" aria-hidden="true"></i>
									<strong class="ipsList__label">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'gallery_exif_isospeed', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</strong>
									<span class="ipsList__value">
										
IPSCONTENT;

if ( isset( $image->metadata['Exit.Photo.ISOSpeed'] ) ):
$return .= <<<IPSCONTENT

											
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->metadata['Exif.Photo.ISOSpeed'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

										
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

											
IPSCONTENT;

if ( \is_array( $image->metadata['EXIF.ISOSpeedRatings'] ) ):
$return .= <<<IPSCONTENT

												
IPSCONTENT;

$return .= \IPS\Theme\Template::htmlspecialchars( implode( '/', $image->metadata['EXIF.ISOSpeedRatings'] ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

											
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

												
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->metadata['EXIF.ISOSpeedRatings'], ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

											
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

										
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

									</span>
								</li>
							
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

						</ul>
						<div class="i-text-align_center i-margin-top_3">
							<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url( 'metadata' ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" data-ipsdialog data-ipsdialog-size="narrow" data-ipsdialog-title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'view_all_photo_info', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
" class="ipsButton ipsButton--inherit">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'view_all_photo_info', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a>
						</div>
					
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

						<div class="i-text-align_center i-margin-top_3">
							<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url( 'metadata' ), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" data-ipsdialog data-ipsdialog-size="narrow" data-ipsdialog-title="
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'view_all_photo_info', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
" class="ipsButton ipsButton--inherit">
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'view_photo_info', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a>
						</div>
					
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "exif:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "exif:after", [ $image ] );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "imageStats:inside-end", [ $image ] );
$return .= <<<IPSCONTENT
</div>
IPSCONTENT;

$return .= \IPS\Theme\CustomTemplate::getCustomTemplatesForHookPoint( "gallery/front/view/imageInfo", "imageStats:after", [ $image ] );
$return .= <<<IPSCONTENT

	</div>
</div>

<div class="ipsBox ipsBox--padding ipsPull ipsResponsive_showPhone">
	<div class="ipsPageActions">
		
IPSCONTENT;

if ( \count( $image->shareLinks() ) ):
$return .= <<<IPSCONTENT

			
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "sharelinks", "core" )->shareButton( $image );
$return .= <<<IPSCONTENT

		
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->follow( 'gallery', 'image', $image->id, $image->followersCount() );
$return .= <<<IPSCONTENT

	</div>
</div>
</section>
IPSCONTENT;

		return $return;
}

	function metadata( $image ) {
		$return = '';
		$return .= <<<IPSCONTENT


IPSCONTENT;

if ( !\IPS\Widget\Request::i()->isAjax() ):
$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->pageHeader( \IPS\Member::loggedIn()->language()->addToStack('gallery_metadata', FALSE, array( 'sprintf' => array( $image->caption ) ) ) );
endif;
$return .= <<<IPSCONTENT

<div class='i-padding_2'>
	
IPSCONTENT;

if ( \count( $image->metadata ) ):
$return .= <<<IPSCONTENT

		<ol class='ipsList ipsList--border ipsList--label-value'>
			
IPSCONTENT;

foreach ( $image->metadata as $key => $value ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

if ( !\is_array( $value ) AND ( $image->gps_show OR mb_strpos( $key, 'GPS.' ) === FALSE ) AND ( mb_strpos( $key, 'UndefinedTag' ) === FALSE OR \IPS\Member::loggedIn()->language()->checkKeyExists( $key ) ) AND ( !\IPS\Member::loggedIn()->language()->checkKeyExists( $key ) OR ( \IPS\Member::loggedIn()->language()->checkKeyExists( $key ) AND \IPS\Member::loggedIn()->language()->get( $key ) ) ) ):
$return .= <<<IPSCONTENT

					<li>
						<strong class='ipsList__label'>
IPSCONTENT;

$val = "{$key}"; $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( $val, ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</strong>
						<span class='ipsList__value'>
IPSCONTENT;

if ( \IPS\Member::loggedIn()->language()->checkKeyExists( $key . '_map_' . $value ) ):
$return .= <<<IPSCONTENT

IPSCONTENT;

$val = "{$key}_map_{$value}"; $return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( $val, ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT

IPSCONTENT;

else:
$return .= <<<IPSCONTENT

IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $value, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT

IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
</span>
					</li>
				
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

			
IPSCONTENT;

endforeach;
$return .= <<<IPSCONTENT

		</ol>
	
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

		<p class='ipsEmptyMessage'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'gallery_no_metadata', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</p>
	
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

</div>
IPSCONTENT;

		return $return;
}

	function reviews( $image ) {
		$return = '';
		$return .= <<<IPSCONTENT

<div data-controller='core.front.core.commentFeed' 
IPSCONTENT;

if ( \IPS\Settings::i()->auto_polling_enabled ):
$return .= <<<IPSCONTENT
data-autoPoll
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 data-commentsType='reviews' data-baseURL='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' 
IPSCONTENT;

if ( $image->isLastPage('reviews') ):
$return .= <<<IPSCONTENT
data-lastPage
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 data-feedID='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->reviewFeedId, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' id='reviews' class="ipsEntries ipsEntries--reviews ipsEntries--gallery-reviews" data-follow-area-id="image-
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->id, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
">
	
IPSCONTENT;

if ( \count( $image->reviews( NULL, NULL, NULL, 'desc', NULL, NULL, NULL, NULL, isset( \IPS\Widget\Request::i()->showDeleted ) ) ) ):
$return .= <<<IPSCONTENT


		<div class='ipsButtonBar ipsButtonBar--top'>
			
IPSCONTENT;

if ( $image->reviewPageCount() > 1 ):
$return .= <<<IPSCONTENT

				<div class='ipsButtonBar__pagination'>{$image->reviewPagination( array( 'tab', 'sort' ) )}</div>
			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

			<div class='ipsButtonBar__end'>
				<ul class="ipsDataFilters">
					<li>
						<button type="button" id="elSortReviewsMenu" popovertarget="elSortReviewsMenu_menu" class='ipsDataFilters__button'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'sort_by', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
 <i class='fa-solid fa-caret-down' aria-hidden="true"></i></button>
						<i-dropdown popover id="elSortReviewsMenu_menu" data-i-dropdown-selectable="radio">
							<div class="iDropdown">
								<ul class="iDropdown__items">
									<li data-action="tableFilter">
										<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->setQueryString( array( 'tab' => 'reviews', 'sort' => 'helpful' ) )->setPage('page',1), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" 
IPSCONTENT;

if ( !isset( \IPS\Widget\Request::i()->sort ) or \IPS\Widget\Request::i()->sort != 'newest' ):
$return .= <<<IPSCONTENT
aria-current="page"
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 data-action="filterClick"><i class="iDropdown__input" aria-hidden="true"></i>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'most_helpful', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a>
									</li>
									<li data-action="tableFilter">
										<a href="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->setQueryString( array( 'tab' => 'reviews', 'sort' => 'newest' ) )->setPage('page',1), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" 
IPSCONTENT;

if ( isset( \IPS\Widget\Request::i()->sort ) and \IPS\Widget\Request::i()->sort == 'newest' ):
$return .= <<<IPSCONTENT
aria-current="page"
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT
 data-action="filterClick"><i class="iDropdown__input" aria-hidden="true"></i>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'newest', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</a>
									</li>
								</ul>
							</div>
						</i-dropdown>
					</li>
				</ul>
				
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->commentMultimodHeader( $image, '#reviews', 'review' );
$return .= <<<IPSCONTENT

			</div>
		</div>

		<div data-role='commentFeed' data-controller='core.front.core.moderation'>
			<form action="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url()->csrf()->setQueryString( 'do', 'multimodReview' )->setPage('page',\IPS\Request::i()->page), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" method="post" data-ipsPageAction data-role='moderationTools'>
				
IPSCONTENT;

$reviewCount=0; $timeLastRead = $image->timeLastRead(); $lined = FALSE;
$return .= <<<IPSCONTENT

				
IPSCONTENT;

foreach ( $image->reviews( NULL, NULL, NULL, 'desc', NULL, NULL, NULL, NULL, isset( \IPS\Widget\Request::i()->showDeleted ) ) as $review ):
$return .= <<<IPSCONTENT

					
IPSCONTENT;

if ( !$lined and $timeLastRead and $timeLastRead->getTimestamp() < $review->mapped('date') ):
$return .= <<<IPSCONTENT

						
IPSCONTENT;

if ( $lined = TRUE and $reviewCount ):
$return .= <<<IPSCONTENT

							<hr class="ipsUnreadBar">
						
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

					
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

					
IPSCONTENT;

$reviewCount++;
$return .= <<<IPSCONTENT

					{$review->html()}
				
IPSCONTENT;

endforeach;
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "global", "core" )->commentMultimod( $image, 'review' );
$return .= <<<IPSCONTENT

			</form>
		</div>
		
IPSCONTENT;

if ( $image->reviewPageCount() > 1 ):
$return .= <<<IPSCONTENT

			<div class='ipsButtonBar ipsButtonBar--bottom'>
				<div class='ipsButtonBar__pagination'>{$image->reviewPagination( array( 'tab', 'sort' ) )}</div>
			</div>
		
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	
IPSCONTENT;

elseif ( !$image->canReview() ):
$return .= <<<IPSCONTENT

		<div class='ipsBox__padding'>
			<p class='ipsEmptyMessage' data-role='noReviews'>
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'no_reviews', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</p>
		</div>
	
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	
	<div class="ipsComposeAreaWrapper">
		
IPSCONTENT;

if ( $image->reviewForm() ):
$return .= <<<IPSCONTENT

			
IPSCONTENT;

if ( $image->locked() ):
$return .= <<<IPSCONTENT

				<strong class='i-color_warning'><i class='fa-solid fa-circle-info' aria-hidden="true"></i> 
IPSCONTENT;

$return .= \IPS\Member::loggedIn()->language()->addToStack( htmlspecialchars( 'item_locked_can_review', ENT_DISALLOWED, 'UTF-8', FALSE ), TRUE, array(  ) );
$return .= <<<IPSCONTENT
</strong>
			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

			{$image->reviewForm()}
		
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

			
IPSCONTENT;

if ( $image->hasReviewed() ):
$return .= <<<IPSCONTENT

				<!-- Already reviewed -->
			
IPSCONTENT;

elseif ( $image->locked() ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "forms", "gallery", 'front' )->commentUnavailable( 'item_locked_cannot_review' );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

elseif ( \IPS\Member::loggedin()->restrict_post ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

if ( \IPS\Member::loggedIn()->restrict_post == -1 ):
$return .= <<<IPSCONTENT

					
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "forms", "gallery", 'front' )->reviewUnavailable( 'restricted_cannot_comment' );
$return .= <<<IPSCONTENT

				
IPSCONTENT;

else:
$return .= <<<IPSCONTENT

					
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "forms", "gallery", 'front' )->reviewUnavailable( 'restricted_cannot_comment', \IPS\Member::loggedIn()->warnings(5,NULL,'rpa'), \IPS\Member::loggedIn()->restrict_post );
$return .= <<<IPSCONTENT

				
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

			
IPSCONTENT;

elseif ( \IPS\Member::loggedIn()->members_bitoptions['unacknowledged_warnings'] ):
$return .= <<<IPSCONTENT

				
IPSCONTENT;

$return .= \IPS\Theme::i()->getTemplate( "forms", "gallery", 'front' )->reviewUnavailable( 'unacknowledged_warning_cannot_post', \IPS\Member::loggedIn()->warnings( 1, FALSE ) );
$return .= <<<IPSCONTENT

			
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

		
IPSCONTENT;

endif;
$return .= <<<IPSCONTENT

	</div>
</div>
IPSCONTENT;

		return $return;
}

	function rssContent( $image ) {
		$return = '';
		$return .= <<<IPSCONTENT

{$image->description}
<p>
	<a href='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->url(), ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
' title='
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->caption, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
'><img src='
IPSCONTENT;

$return .= \IPS\File::get( "gallery_Images", $image->masked_file_name )->url;
$return .= <<<IPSCONTENT
' title="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->caption, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
" alt="
IPSCONTENT;
$return .= \IPS\Theme\Template::htmlspecialchars( $image->caption, ENT_QUOTES | ENT_DISALLOWED, 'UTF-8', FALSE );
$return .= <<<IPSCONTENT
"></a>
</p>
IPSCONTENT;

		return $return;
}}