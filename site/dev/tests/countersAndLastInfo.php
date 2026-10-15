<?php

use IPS\Content\Item;
use IPS\Content\Search\Index;
use IPS\Db;
use IPS\Dispatcher\External;
use IPS\Member;
use IPS\Node\Model;
use IPS\Settings;

ini_set( 'display_errors', true );
//error_reporting( E_ALL  );
set_time_limit( 0 );
// Load IPB
require_once( '../../init.php' );
External::i();

$member = Member::constructFromData( Db::i()->select( '*', 'core_members', [ 'member_group_id=?', 4 ] )->first() );

$tests = [];
$appsToTest = [ 'forums', 'cms', 'galleryAlbum', 'galleryCategory' ];

foreach( $appsToTest as $app )
{
	try
	{
		switch( $app )
		{
			case 'galleryAlbum':
				$firstAlbumImage = Db::i()->select( "*", 'gallery_images', [ 'image_album_id > ?', 0 ] )->first();
				$tests[ $app ] = new counterTest([
					'nodeId' => $firstAlbumImage['image_album_id'],
					'nodeClass' => 'IPS\gallery\Album',
					'itemClass' => 'IPS\gallery\Image',
					'member' => $member,
					'app' => 'album',
					'itemId' => $firstAlbumImage['image_id']
				]);
				break;

			case 'galleryCategory':
				$firstCategoryImage = Db::i()->select( '*', 'gallery_images', [ 'image_album_id=? and image_caption NOT LIKE \'Test item%\'', 0 ] )->first();
				$tests[ $app ] = new counterTest([
					'nodeId' => 1,
					'nodeClass' => 'IPS\gallery\Category',
					'itemClass' => 'IPS\gallery\Image',
					'member' => $member,
					'app' => 'category',
					'itemId' => $firstCategoryImage['image_id']
				]);
				break;

			case 'cms':
				$firstCmsCategory = Db::i()->select( '*', 'cms_database_categories', [] )->first();
				$tests[ $app ] = new counterTest( [
					'nodeId' => $firstCmsCategory['category_id'],
					'nodeClass' => 'IPS\cms\Categories' . $firstCmsCategory['category_database_id'],
					'itemClass' => 'IPS\cms\Records' . $firstCmsCategory['category_database_id'],
					'member' => $member,
				] );
				break;

			case 'forums':
				$tests[ $app ]  = new counterTest( [
					'nodeId' => 2,
					'nodeClass' => 'IPS\forums\Forum',
					'itemClass' => 'IPS\forums\Topic',
					'member' => $member,
				] );
				break;
		}

		$tests[ $app ]->test_afterPosting();
		$tests[ $app ]->test_hideTopic();
		$tests[ $app ]->test_hideLastPost();
		$tests[ $app ]->test_deleteLastPost();
		$tests[ $app ]->test_postApproval();
		$tests[ $app ]->test_deleteTopic();
	}
	catch( UnderflowException ){}
}


/* Output the results */
header( "Content-Type: text/html");
print <<<EOF
<html>
 <title>Counter Tests</title>
 <style>
  * { font-family: sans-serif; }
  table { width: 100%; }
  td.msg, td.url { font-family: monospace; }
  tr.header { background-color: black; color: white; }
  td.app_header { background-color: #999999; color: white; }
  .info { padding: 12px 0px; }
 </style>
 <body>
 <table border=1 cellborder=1 cellpadding=4>
 <tr class='header'>
  <td>Test</td>
  <td>Message</td>
  <td>Pass/Fail</td>
 </tr>

EOF;
foreach( $tests as $app => $obj )
{
	print <<<EOF
	<tr>
	 <td colspan="3" class="app_header">{$app}</td>
	</tr>
EOF;
	foreach ( $obj->results as $test )
	{
		$expectedOutcome = $test['pass'] ? '<span style="color:green">Pass</span>' : '<span style="color:red">Fail</span>';

		print <<<EOF
	<tr>
		<td class="message">{$test['msg']['method']}</td>
		<td class="message">{$test['msg']['message']}</td>
		<td class="passfail">{$expectedOutcome}</td>
	</tr>
	
EOF;
	}
}

print <<<EOF
</table>
</body>
</html>

EOF;

exit();

/**
 * Test class
 */
class counterTest
{
	public array $results = [];
	private Model $node;
	private Member $member;
	private Item $item;
	private string $itemClass;
	private array $nodeAtInit = [];
	private array $mapping = [];
	private string $app;

	/**
	 * @param array $config
	 */
	public function __construct( array $config )
	{
		/* @var $model Model */
		$model = $config['nodeClass'];
		$this->node = $model::load( $config['nodeId'] );
		$this->itemClass = $config['itemClass'];
		$this->app = $config['app'] ?? $this->node::$permApp;

		$this->member = $config['member'];

		$this->mapping = [
			'forums' => [
				'node' => [
					'items' => 'topics',
					'comments' => 'posts',
					'comments_unapproved' => 'queued_posts',
					'items_unapproved'	  => 'queued_topics',
				]
			],
			'cms' => [
				'node' => [
					'comments' => 'record_comments',
					'comments_unapproved' => 'record_comments_queued',
				]
			],
			'album' => [
				'node' => [
					'items' => 'count_imgs',
					'comments' => 'count_comments',
					'comments_unapproved' => 'comments_unapproved',
				]
			],
			'category' => [
				'node' => [
					'items' => 'count_imgs',
					'comments' => 'count_comments',
					'comments_unapproved' => 'count_comments_hidden', # they say hidden, but it's really unapproved
					'items_unapproved' => 'count_imgs_hidden' # they say hidden, but it's really unapproved
				]
			]
		];

		$this->nodeAtInit = $this->updateAndReturnNodeLastInfo();

		/* Create the topic and populate */
		if( isset( $config['itemId'] ) )
		{
			$class = $this->itemClass;
			$this->item = $class::load( $config['itemId'] );
		}

		$this->item = $this->createItemWithPosts();
	}

	/**
	 * @param Item|Model $class
	 * @param string $column
	 * @return string|null
	 */
	private function getMapping( Item|Model $class, string $column ): string|null
	{
		if ( $class instanceof Item )
		{
			$mapType = 'item';
			$app = $class::$application;
		}
		else
		{
			$mapType = 'node';
			$app = $this->app ?? $class::$permApp;
		}

		if ( !isset( $this->mapping[ $app ] ) )
		{
			return null;
		}

		if ( isset( $this->mapping[ $app ][ $mapType ][ $column ] ) )
		{
			return $this->mapping[ $app ][ $mapType ][ $column ];
		}

		return null;
	}

	/**
	 * Test deleting a topic
	 * @return void
	 */
	public function test_deleteTopic(): void
	{
		$lastComment = $this->item->comments( 1, 0, 'date', 'desc', null, null, null, null, true ); #Bypass caches
		$this->item->delete();
		$lastInfo = $this->updateAndReturnNodeLastInfo();
		$itemClass = get_class( $this->item );

		if ( $lastInfo['lastPost'] )
		{
			if ( $lastInfo['lastPost']['date'] < $lastComment->mapped( 'date' ) )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " deleted, node latest item update time decreased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " deleted, node latest item update time did not decrease" )
				];
			}
		}

		/* Now test soft delete */
		$this->item = $this->createItemWithPosts();
		$lastComment = $this->item->comments( 1, 0, 'date', 'desc', null, null, null, null, true ); #Bypass caches
		$this->item->logDelete( $this->member );
		$lastInfo = $this->updateAndReturnNodeLastInfo();

		if ( $lastInfo['lastPost'] )
		{
			if ( $lastInfo['lastPost']['date'] < $lastComment->mapped( 'date' ) )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " soft deleted, forum latest topic update time decreased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " soft deleted, forum latest topic update time did not decrease" )
				];
			}
		}
	}

	/**
	 * Test adding a post that requires approval
	 * @return void
	 */
	public function test_postApproval(): void
	{
		/* Add a post */
		$this->item = $this->createItemWithPosts();
		$startInfo = $this->updateAndReturnNodeLastInfo();
		$commentClass = $this->itemClass::$commentClass;
		$post = $commentClass::create( $this->item, 'Test approval post ' . time(), false, NULL, $commentClass::incrementPostCount( $this->node ), $this->member, \IPS\DateTime::ts( time() ), null, 1 );
		$lastInfo = $this->updateAndReturnNodeLastInfo();
		$nodeClass = get_class( $this->node );
		$itemClass = get_class( $this->item );

		/* Now reset item to get the latest data */
		$this->updateItemData();

		if ( $lastInfo['lastPost']['date'] == $post->mapped('date') )
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . " added pending moderator approval, node latest item time increased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . " added pending moderator approval, node latest item time did not increase" )
			];
		}

		if ( $this->item->mapped('unapproved_comments') == 1 )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . " added pending moderator approval, unapproved comments count increased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . " added pending moderator approval, unapproved comments count did not increase: " . $this->item->mapped('unapproved_comments') )
			];
		}

		/* Now test the node */
		if ( $lastInfo['comments_unapproved'] and ( $startInfo['comments_unapproved'] < $lastInfo['comments_unapproved'] ) )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $nodeClass . " added pending moderator approval, node unapproved comments count increased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, $nodeClass . " added pending moderator approval, node unapproved comments count did not increase: " . $lastInfo['comments_unapproved'] )
			];
		}

		/*  Now approve */
		$startInfo = $this->updateAndReturnNodeLastInfo();
		$post->unhide( false );
		$lastInfo = $this->updateAndReturnNodeLastInfo();
		$this->updateItemData();

		if ( $lastInfo['lastPost']['date'] != $post->mapped('date') )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . " approved, node latest item time increased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . " approved, node latest item time did not increase" )
			];
		}

		if ( $this->item->mapped('unapproved_comments') == 0 )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . " approved, unapproved comments count decreased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . "  approved unapproved comments count did not change: " . $this->item->mapped('unapproved_comments') )
			];
		}

		/* Now test the node */
		if ( $startInfo['comments_unapproved'] and ( $startInfo['comments_unapproved'] > $lastInfo['comments_unapproved'] ) )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $nodeClass . " post approved, node unapproved comments count decreased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, $nodeClass . " post approved, node unapproved comments count did not decrease: count before approving " . $startInfo['comments_unapproved'] . ', count after approving ' . $lastInfo['comments_unapproved'] )
			];
		}
	}

	/**
	 * Test deleting the last post in a topic
	 *
	 * @return void
	 */
	public function test_deleteLastPost(): void
	{
		/* Make sure we have a fresh topic */
		$this->item->delete();
		$this->item = $this->createItemWithPosts();

		$existingSetting = Settings::i()->dellog_retention_period;
		Settings::i()->dellog_retention_period = 30; # Force a soft delete regardless of ACP settings
		$lastComment = $this->item->comments( 1, 0, 'date', 'desc', null, false, null, null, true ); #Bypass caches
		$lastComment->logDelete();
		Settings::i()->dellog_retention_period = $existingSetting;
		$lastInfo = $this->updateAndReturnNodeLastInfo();
		$newLastComment = $this->item->comments( 1, 0, 'date', 'desc', null, false, null, null, true ); # Do not fetch hidden comments
		$commentClass = $this->itemClass::$commentClass;

		if ( $lastInfo['lastPost']['date'] == $newLastComment->mapped('date') )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, "Last " . $commentClass . " soft deleted, node latest item update time decreased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, "Last " . $commentClass . " soft deleted, node latest item update time did not decrease" )
			];
		}

		/* Make sure we have a fresh topic */
		$this->item->delete();
		$this->item = $this->createItemWithPosts();

		/* Now hard delete the post */
		$existingSetting = Settings::i()->dellog_retention_period;
		Settings::i()->dellog_retention_period = 0; # Force a real delete regardless of ACP settings
		$lastComment = $this->item->comments( 1, 0, 'date', 'desc', null, null, null, null, true ); #Bypass caches
		$lastComment->delete();
		Settings::i()->dellog_retention_period = $existingSetting;
		$lastInfo = $this->updateAndReturnNodeLastInfo();
		$newLastComment = $this->item->comments( 1, 0, 'date', 'desc', null, false, null, null, true ); # Do not fetch hidden comment

		if ( $lastInfo['lastPost']['date'] == $newLastComment->mapped('date') )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, "Last " . $commentClass . " deleted, node latest item update time decreased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, "Last " . $commentClass . " deleted, node latest item update time did not decrease" )
			];
		}
	}

	/**
	 * Test hiding/unhiding the last post in a topic
	 *
	 * @return void
	 */
	public function test_hideLastPost(): void
	{
		$startInfo = $this->updateAndReturnNodeLastInfo();
		$lastComment = $this->item->comments( 1, 0, 'date', 'desc' );
		$numberOfCommentsBeforeHide = $this->item->mapped('num_comments');
		$numberOfHiddenCommentsBeforeHide = $this->item->mapped('hidden_comments');
		$lastComment->hide( false );
		$this->updateItemData();
		$numberOfHiddenCommentsAfterHide = $this->item->mapped('hidden_comments');
		$numberOfCommentsAfterHide = $this->item->mapped('num_comments');
		$newLastComment = $this->item->comments( 1, 0, 'date', 'desc', null, false ); # Do not fetch hidden comments
		$lastInfo = $this->updateAndReturnNodeLastInfo();
		$nodeClass = get_class( $this->node );
		$itemClass = get_class( $this->item );

		if ( isset( $lastInfo['lastPost']['date'] ) and $lastInfo['lastPost']['date'] == $newLastComment->mapped('date') )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $nodeClass . " last comment hidden, node latest item update time decreased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, $nodeClass . " last comment hidden, node latest item update time did not decrease: expecting " . $newLastComment->mapped('date') . ", got " . $lastInfo['lastPost']['date'] )
			];
		}

		/* Check the number of hidden posts */
		/* @var $databaseColumnMap array */
		if ( isset( $itemClass::$databaseColumnMap['hidden_comments'] ) )
		{
			if ( $numberOfHiddenCommentsBeforeHide < $numberOfHiddenCommentsAfterHide )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " last comment hidden, item unapproved comments count increased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " last comment hidden, item unapproved comments count did not increase: " . $this->item->mapped('hidden_comments') )
				];
			}

			/* Now test for normal posts which should decrease */
			if ( $numberOfCommentsBeforeHide > $numberOfCommentsAfterHide )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " last comment hidden, item comments count decreased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " last comment hidden, item comments count did not decrease: " . $numberOfCommentsAfterHide )
				];
			}

			/* Now test the node with normal comments */
			if ( $startInfo['comments'] and ( $startInfo['comments'] > $lastInfo['comments'] ) )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $nodeClass . " last comment hidden, node comments count decreased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $nodeClass . " last comment hidden, node comments count did not decrease: " . $lastInfo['comments'] )
				];
			}
		}

		/* Now unhide the post */
		$startInfo = $this->updateAndReturnNodeLastInfo();
		$lastComment = $this->item->comments( 1, 0, 'date', 'desc' );
		$numberOfHiddenCommentsBeforeHide = $this->item->mapped('hidden_comments');
		$numberOfCommentsBeforeHide = $this->item->mapped('num_comments');
		$lastComment->unhide( false );
		$this->updateItemData();
		$numberOfHiddenCommentsAfterHide = $this->item->mapped('hidden_comments');
		$numberOfCommentsAfterHide = $this->item->mapped('num_comments');
		$newLastComment = $this->item->comments( 1, 0, 'date', 'desc' );
		$lastInfo = $this->updateAndReturnNodeLastInfo();

		if ( $lastInfo['lastPost']['date'] == $newLastComment->mapped('date') )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $nodeClass . " last post unhidden, node latest topic update time increased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, $nodeClass . " last post unhidden, node latest topic update time did not increase: expecting " . $newLastComment->mapped('date') . ", got " . $lastInfo['lastPost']['date'] )
			];
		}

		if ( isset( $itemClass::$databaseColumnMap['unapproved_comments'] ) )
		{
			if ( $numberOfHiddenCommentsBeforeHide > $numberOfHiddenCommentsAfterHide )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " last comment unhidden, item unapproved comments count decreased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " last comment unhidden, item unapproved comments count did not decrease: " . $this->item->mapped('unapproved_comments') )
				];
			}

			/* Now test for normal posts which should increase */
			if ( $numberOfCommentsBeforeHide < $numberOfCommentsAfterHide )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " last comment hidden, item comments count increased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $itemClass . " last comment hidden, item comments count did not increase: " . $numberOfCommentsAfterHide )
				];
			}

			/* Now test the node for normal comments */
			if ( $startInfo['comments'] and ( $startInfo['comments'] < $lastInfo['comments'] ) )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $nodeClass . " last comment unhidden, node comments count increased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $nodeClass . " last comment unhidden, node comments count did not increase: " . $lastInfo['comments'] )
				];
			}
		}
	}

	/**
	 * Test hiding/unhiding a topic
	 *
	 * @return void
	 */
	public function test_hideTopic(): void
	{
		$this->item->hide( false );
		$lastInfo = $this->updateAndReturnNodeLastInfo();
		$commentClass = $this->itemClass::$commentClass;

		/* @var $databaseColumnMap array */
		$titleColumn = $this->itemClass::$databaseColumnMap['title'];

		if ( isset( $lastInfo['lastPost']['item_title'] ) )
		{
			if ( $lastInfo['lastPost']['item_title'] != $this->item->$titleColumn )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__,  $this->itemClass . " hidden, node latest item name correct" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__,  $this->itemClass . " hidden, node latest item name not correct: " . $lastInfo['lastPost']['item_title'] )
				];
			}
		}

		if ( isset( $lastInfo['lastPost'] ) )
		{
			/* Now reset item to get the latest data */
			$this->updateItemData();
			$lastPostColumn = $this->itemClass::$databaseColumnMap['last_comment'];
			$realLastPostColumn = null;
			$lastPostDate = 0;
			if ( is_array( $lastPostColumn ) )
			{
				foreach( $lastPostColumn as $col )
				{
					if ( $this->item->$col > $lastPostDate )
					{
						$lastPostDate = $this->item->$col;
						$realLastPostColumn = $col;
					}
				}
			}
			else
			{
				$lastPostDate = $this->item->$lastPostColumn;
				$realLastPostColumn = $lastPostColumn;
			}

			if ( $lastInfo['lastPost']['date'] < $this->item->$realLastPostColumn )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " hidden, node latest item update time decreased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " hidden, node latest item update time did not decrease [lastPostDate: " . $lastInfo['lastPost']['date'] . ", realLastPostColumn: " . $this->item->$realLastPostColumn . "]" )
				];
			}
		}

		/* Now unhide the topic */
		$this->item->unhide( false );

		/* Now reset item to get the latest data */
		$this->updateItemData();
		$lastInfo = $this->updateAndReturnNodeLastInfo();

		if ( isset( $lastInfo['lastPost']['item_title'] ) )
		{
			if ( str_replace( ' ', '', $lastInfo['lastPost']['item_title'] ) == str_replace( ' ', '', $this->item->$titleColumn ) )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " unhidden, node latest item name correct" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " unhidden, node latest item name not correct: " . $lastInfo['lastPost']['item_title'] )
				];
			}
		}

		if ( isset( $lastInfo['lastPost'] ) )
		{
			$lastPostColumn = $this->itemClass::$databaseColumnMap['last_comment'];
			$realLastPostColumn = null;
			$lastPostDate = 0;
			if ( is_array( $lastPostColumn ) )
			{
				foreach( $lastPostColumn as $col )
				{
					if ( $this->item->$col > $lastPostDate )
					{
						$lastPostDate = $this->item->$col;
						$realLastPostColumn = $col;
					}
				}
			}
			else
			{
				$lastPostDate = $this->item->$lastPostColumn;
				$realLastPostColumn = $lastPostColumn;
			}

			if ( $lastInfo['lastPost']['date'] == $this->item->$realLastPostColumn )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " unhidden, node latest item update time correct" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " unhidden, node latest item update time not correct [LastPost:date: " . $lastInfo['lastPost']['date'] . ", lastPostColumn: " . $this->item->$realLastPostColumn . ']' )
				];
			}
		}
	}

	/**
	 * Test counters / data after posting
	 *
	 * @return void
	 */
	public function test_afterPosting(): void
	{
		$lastInfo = $this->updateAndReturnNodeLastInfo();
		$commentClass = $this->itemClass::$commentClass;
		$nodeClass = get_class( $this->node );

		/* Item counter */
		if ( isset( $lastInfo['items'] ) and ! ( $nodeClass == 'IPS\gallery\Album' or $nodeClass == 'IPS\gallery\Category' ) )
		{
			/* Gallery uses processAfterCreate to update item counter but we can't run that as we create an item in a different way */
			if ( $lastInfo['items'] > $this->nodeAtInit['items'] )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " added, node item count increased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " added, node item count did not increase" )
				];
			}
		}

		/* Post counter */
		if ( $lastInfo['comments'] > $this->nodeAtInit['comments'] )
		{
			$this->results[] = [
				'pass' => true,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . " added, node post count increased" )
			];
		}
		else
		{
			$this->results[] = [
				'pass' => false,
				'msg' => $this->formatMessage( __METHOD__, $commentClass . " added, node post count did not increase" )
			];
		}

		/* Last post time */
		if ( isset( $lastInfo['lastPost'] ) )
		{
			if ( isset( $lastInfo['lastPost']['date'] ) and isset( $this->nodeAtInit['lastPost'] ) and $lastInfo['lastPost']['date'] > $this->nodeAtInit['lastPost']['date'] )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " added, node latest item update time increased" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " added, node latest item update time did not increase" )
				];
			}
		}

		/* Latest topic */
		if ( isset( $lastInfo['lastPost']['item_title'] ) )
		{
			/* @var $databaseColumnMap array */
			$titleColumn = $this->itemClass::$databaseColumnMap['title'];
			if ( $lastInfo['lastPost']['item_title'] == $this->item->$titleColumn )
			{
				$this->results[] = [
					'pass' => true,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " added, node latest item name correct" )
				];
			}
			else
			{
				$this->results[] = [
					'pass' => false,
					'msg' => $this->formatMessage( __METHOD__, $this->itemClass . " added, node latest item name not correct: " . $lastInfo['lastPost']['topic_title'] )
				];
			}
		}
	}

	/**
	 * @param int $hide
	 * @return mixed
	 */
	public function createItemWithPosts( int $hide=0 ): Item
	{
		$time = time() - 5;
		$class = $this->itemClass;
		$postClass = $class::$commentClass;

		if( isset( $this->item ) )
		{
			$item = clone $this->item;
			$created = $class::$databaseColumnMap['date'];
			$updated = $class::$databaseColumnMap['updated'];
			$item->$created = time();
			$item->$updated = time();
		}
		else
		{
			$item = $class::createItem( $this->member, NULL, \IPS\DateTime::ts( $time ), $this->node, $hide );
		}

		/* @var $databaseColumnMap array */
		$titleColumn = $this->itemClass::$databaseColumnMap['title'];

		$item->$titleColumn = 'Test item ' . \IPS\DateTime::ts( $time )->localeTime();

		if( isset( $this->itemClass::$databaseColumnMap['content'] ) )
		{
			$contentColumn = $this->itemClass::$databaseColumnMap['content'];
			$item->$contentColumn = "Test item content";
		}

		$item->save();

		foreach( range( 1, 5 ) as $i )
		{
			if ( $i > 1 )
			{
				$time += 1;
			}

			$post = $postClass::create( $item, 'Test comment ' . $i . ': ' . $time, ( $i == 1 ), NULL, $postClass::incrementPostCount( $this->node ), $this->member, \IPS\DateTime::ts( $time ) );

			if( $i == 1 and isset( $class::$databaseColumnMap['first_comment_id'] ) )
			{
				$column = $class::$databaseColumnMap['first_comment_id'];
				$postIdColumn = $post::$databaseColumnId;
				$item->$column = $post->$postIdColumn;
				$item->save();
			}
		}

		/* Add to search index */
		Index::i()->index( $item );

		return $item;
	}

	/**
	 * Update the topic data
	 *
	 * @return void
	 */
	protected function updateItemData(): void
	{
		/* Avoid multiton cache */
		$idColumn = $this->item::$databasePrefix . $this->item::$databaseColumnId;
		$this->item = $this->itemClass::constructFromData( Db::i()->select( '*', $this->itemClass::$databaseTable, [ $idColumn . '=?', $this->item->$idColumn ] )->first() );
	}

	/**
	 * @return array
	 */
	public function updateAndReturnNodeLastInfo(): array
	{
		/* Update the forum and topic data */
		$nodeClass = get_class( $this->node );
		$this->node = $nodeClass::load( $this->node->_id );
		$app = $nodeClass::$permApp;
		$itemCountField = $this->getMapping( $this->node, 'items' );
		$commentCountField = $this->getMapping( $this->node, 'comments' );
		$itemCountFieldUnapproved = $this->getMapping( $this->node, 'items_unapproved' );
		$commentCountFieldUnapproved = $this->getMapping( $this->node, 'comments_unapproved' );

		$lastPost = null;
		if( method_exists( $nodeClass, 'lastPost' ) )
		{
			$lastPost = $this->node->lastPost();
		}
		elseif( $nodeClass == 'IPS\gallery\Album' or $nodeClass == 'IPS\gallery\Category' )
		{
			if( $image = $this->node->lastImage() )
			{
				$lastPost = [
					'author' => $image->author(),
					'topic_title' => $image->mapped( 'title' ),
					'topic_url' => (string) $image->url(),
					'date' => $image->mapped( 'date' )
				];
			}
		}

		if ( $lastPost )
		{
			$lastPost['item_title'] = $lastPost['topic_title'] ?? $lastPost['record_title'];
		}

		return array(
			'items'    => $itemCountField ? $this->node->$itemCountField : null,
			'comments' => $commentCountField ? $this->node->$commentCountField : null,
			'items_unapproved'    => $itemCountFieldUnapproved ? $this->node->$itemCountFieldUnapproved : null,
			'comments_unapproved' => $commentCountFieldUnapproved? $this->node->$commentCountFieldUnapproved : null,
			'lastPost' => $lastPost
		);
	}

	/**
	 * @param string $method
	 * @param string $msg
	 * @return array
	 */
	public function formatMessage( string $method, string $msg ): array
	{
		return [
			'method'  => str_replace( 'counterTest::test_' , '', $method ),
			'message' => $msg
		];
	}
}


