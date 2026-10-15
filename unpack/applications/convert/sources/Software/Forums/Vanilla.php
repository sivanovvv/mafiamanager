<?php
/**
 * @brief		Converter Vanilla Class
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @package		IPS Social Suite
 * @subpackage	convert
 * @since		21 Jan 2015
 */

namespace IPS\convert\Software\Forums;
use DomainException;
use Exception;
use IPS\Content;
use IPS\Content\Reaction;
use IPS\convert\App;
use IPS\convert\Software;
use IPS\convert\Software\Core\Vanilla as VanillaCore;
use IPS\convert\Tools\Vanilla\AST;
use IPS\Data\Store;
use IPS\Db;
use IPS\forums\Topic\Post;
use IPS\Http\Url;
use IPS\Member;
use IPS\Request;
use IPS\Task;
use OutOfRangeException;
use UnderflowException;
use function count;
use function defined;
use function unserialize;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Vanilla Forums Converter
 */
class Vanilla extends Software
{
	/**
	 * Software Name
	 *
	 * @return    string
	 */
	public static function softwareName(): string
	{
		/* Child classes must override this method */
		return "Vanilla Cloud";
	}
	
	/**
	 * Software Key
	 *
	 * @return    string
	 */
	public static function softwareKey(): string
	{
		/* Child classes must override this method */
		return "vanilla";
	}

	/**
	 * Requires Parent
	 *
	 * @return    boolean
	 */
	public static function requiresParent(): bool
	{
		return TRUE;
	}

	/**
	 * Possible Parent Conversions
	 *
	 * @return    array|null
	 */
	public static function parents(): ?array
	{
		return array( 'core' => array( 'vanilla' ) );
	}
	
	/**
	 * Content we can convert from this software. 
	 *
	 * @return    array|null
	 */
	public static function canConvert(): ?array
	{
		return [
			'convertForumsForums' => [
				'table'     	=> 'Category',
				'where'     	=> NULL,
				'extra_steps'   => [ 'convertForumsForumsFollowers' ]
			],
			'convertClubForums'	=> [
				'table'		=> 'Group',
				'where'		=> NULL
			],
			'convertForumsForumsFollowers' => [
				'table'     => 'UserCategory',
				'where'     => [ 'CategoryID>? AND Followed=?', 0, 1 ]
			],
			'convertForumsTopics' => [
				'table'         => 'Discussion',
				'where'         =>  NULL,
				'extra_steps'   => [ 'convertForumsTopicsFollowers' ]
			],
			'convertForumsTopicsFollowers' => [
				'table'     => 'UserDiscussion',
				'where'     => [ 'UserID>? AND Bookmarked=?', 0, 1 ]
			],
			'convertForumsPosts' => [
				'table'			=> 'Discussion',
				'where'			=> NULL,
				'extra_steps'   => [ 'convertForumsPosts2' ]
			],
			'convertForumsPosts2'  => [
				'table'     => 'Comment',
				'where'     => [ 'parentRecordType=?', 'discussion' ]
			],
			'convertAttachments'	=> [
				'table'		=> 'Media',
				'where'		=> [ "ForeignTable IN ('discussion', 'comment', 'embed')" ]
			]
		];
	}

	/**
	 * Allows software to add additional menu row options
	 *
	 * @return    array
	 */
	public function extraMenuRows(): array
	{
		$rows = [];
		$rows['convertForumsPosts2'] = [
			'step_title'		=> 'convert_forums_posts',
			'step_method'		=> 'convertForumsPosts2',
			'ips_rows'			=> Db::i()->select( 'COUNT(*)', 'forums_posts' ),
			'source_rows'		=> [ 'table' => static::canConvert()['convertForumsPosts2']['table'], 'where' => static::canConvert()['convertForumsPosts2']['where'] ],
			'per_cycle'			=> 200,
			'dependencies'		=> [ 'convertForumsPosts' ],
			'link_type'			=> 'forums_posts',
			'requires_rebuild'	=> TRUE
		];
		$rows['convertForumsForumsFollowers'] = [
			'step_title'		=> 'convert_forums_forums_followers',
			'step_method'		=> 'convertForumsForumsFollowers',
			'ips_rows'			=> Db::i()->select( 'COUNT(*)', 'core_follow', [ 'follow_app=? AND follow_area=?', 'forums', 'forums' ] ),
			'source_rows'		=> [ 'table' => static::canConvert()['convertForumsForumsFollowers']['table'], 'where' => static::canConvert()['convertForumsForumsFollowers']['where'] ],
			'per_cycle'			=> 2000,
			'dependencies'		=> [ 'convertForumsForums' ],
			'link_type'			=> 'core_follows',
			'requires_rebuild'	=> FALSE
		];

		if ( array_key_exists( 'convertClubForums', $this->getLibrary()->getConvertableItems() ) )
		{
			$rows['convertForumsForumsFollowers'][] = 'convertClubForums';
		}
		$rows['convertForumsTopicsFollowers'] = [
			'step_title'		=> 'convert_forums_topics_followers',
			'step_method'		=> 'convertForumsTopicsFollowers',
			'ips_rows'			=> Db::i()->select( 'COUNT(*)', 'core_follow', [ 'follow_app=? AND follow_area=?', 'forums', 'topics' ] ),
			'source_rows'		=> [ 'table' => static::canConvert()['convertForumsTopicsFollowers']['table'], 'where' => static::canConvert()['convertForumsTopicsFollowers']['where'] ],
			'per_cycle'			=> 2000,
			'dependencies'		=> [ 'convertForumsTopics' ],
			'link_type'			=> 'core_follows',
			'requires_rebuild'	=> FALSE
		];

		return $rows;
	}

	/**
	 * Count Source Rows for a specific step
	 *
	 * @param string $table		The table containing the rows to count.
	 * @param string|array|NULL $where		WHERE clause to only count specific rows, or NULL to count all.
	 * @param bool $recache	Skip cache and pull directly (updating cache)
	 * @return    integer
	 * @throws	\IPS\convert\Exception
	 */
	public function countRows( string $table, string|array|null $where=NULL, bool $recache=FALSE ): int
	{
		switch( $table )
		{
			case 'Comment':
				try
				{
					$cacheKey = 'convert_' . $this->app->app_id . '_' . md5( $table . json_encode( $where ) );

					if( !isset( Store::i()->$cacheKey ) OR $recache === TRUE )
					{
						$count = 0;
						$count += $this->db->select( 'COUNT(*)', 'Discussion' )->first();
						$count += $this->db->select( 'COUNT(*)', 'Comment' )->first();
						Store::i()->$cacheKey = $count;
					}

					return Store::i()->$cacheKey;
				}
				catch( Exception $e )
				{
					throw new \IPS\convert\Exception( sprintf( Member::loggedIn()->language()->get( 'could_not_count_rows' ), $table ) );
				}

			default:
				return parent::countRows( $table, $where, $recache );
		}
	}
	
	/**
	 * Can we convert passwords from this software.
	 *
	 * @return    boolean
	 */
	public static function loginEnabled(): bool
	{
		return TRUE;
	}

	/**
	 * List of conversion methods that require additional information
	 *
	 * @return    array
	 */
	public static function checkConf(): array
	{
		return array(
			'convertForumsForums',
			'convertAttachments'
		);
	}

	/**
	 * Get More Information
	 *
	 * @param string $method	Conversion method
	 * @return    array|null
	 */
	public function getMoreInfo( string $method ): ?array
	{
		$return = array();

		switch( $method )
		{
			case 'convertForumsForums':
				$return['convertForumsForums'] = array();

				/* Find out where the photos live */
				Member::loggedIn()->language()->words['attach_location_desc'] = Member::loggedIn()->language()->addToStack( 'attach_location' );
				$return['convertForumsForums']['attach_location'] = array(
					'field_class'			=> 'IPS\\Helpers\\Form\\Text',
					'field_default'			=> NULL,
					'field_required'		=> TRUE,
					'field_extra'			=> array(),
					'field_hint'			=> Member::loggedIn()->language()->addToStack('convert_vanilla_photopath'),
				);
				break;
			case 'convertAttachments':
				$return['convertAttachments'] = array(
					'attach_location'	=> array(
						'field_class'		=> 'IPS\\Helpers\\Form\\Text',
						'field_default'		=> NULL,
						'field_required'	=> TRUE,
						'field_extra'		=> array(),
						'field_hint'		=> Member::loggedIn()->language()->addToStack('convert_vanilla_photopath'),
						'field_validation'	=> function( $value ) { if ( !@is_dir( $value ) ) { throw new DomainException( 'path_invalid' ); } },
					),
				);
				break;
		}

		return ( isset( $return[ $method ] ) ) ? $return[ $method ] : array();
	}
	
	/**
	 * Finish - Adds everything it needs to the queues and clears data store
	 *
	 * @return    array        Messages to display
	 */
	public function finish(): array
	{
		/* Content Rebuilds */
		Task::queue( 'core', 'RebuildContainerCounts', [ 'class' => 'IPS\forums\Forum', 'count' => 0 ], 4, [ 'class' ] );
		Task::queue( 'convert', 'RebuildContent', [ 'app' => $this->app->app_id, 'link' => 'forums_posts_first', 'class' => 'IPS\forums\Topic\Post' ], 2, [ 'app', 'link', 'class' ] );
		Task::queue( 'convert', 'RebuildContent', [ 'app' => $this->app->app_id, 'link' => 'forums_posts', 'class' => 'IPS\forums\Topic\Post' ], 2, [ 'app', 'link', 'class' ] );
		Task::queue( 'core', 'RebuildItemCounts', [ 'class' => 'IPS\forums\Topic' ], 3, [ 'class' ] );
		Task::queue( 'convert', 'RebuildFirstPostIds', [ 'app' => $this->app->app_id ], 2, [ 'app' ] );
		Task::queue( 'convert', 'DeleteEmptyTopics', [ 'app' => $this->app->app_id ], 5, [ 'app' ] );

		/* Rebuild Leaderboard */
		Task::queue( 'core', 'RebuildReputationLeaderboard', [], 4 );
		Db::i()->delete('core_reputation_leaderboard_history');

		/* Caches */
		Task::queue( 'convert', 'RebuildTagCache', [ 'app' => $this->app->app_id, 'link' => 'forums_topics', 'class' => 'IPS\forums\Topic' ], 3, [ 'app', 'link', 'class' ] );

		/* Kick off solve index build */
		Task::queue( 'forums', 'RebuildSolvedIndex', [], 4 );
		return [ "f_forum_last_post_data", "f_rebuild_posts", "f_recounting_forums", "f_recounting_topics", "f_topic_tags_recount" ];
	}

	/**
	 * Pre-process content for the Invision Community text parser
	 *
	 * @param	string			The post
	 * @param	string|null		Content Classname passed by post-conversion rebuild
	 * @param	int|null		Content ID passed by post-conversion rebuild
	 * @param	App|null		App object if available
	 * @return	string			The converted post
	 */
	public static function fixPostData( string $post, ?string $className=null, ?int $contentId=null, ?App $app=null ): string
	{
		return VanillaCore::fixPostData( $post, $className, $contentId, $app );
	}

	/**
	 * @brief   temporarily store post content
	 */
	protected array $_postContent = array();

	/**
	 * Convert attachments
	 *
	 * @return	void
	 */
	public function convertAttachments(): void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'MediaID' );
		$this->_postContent = [];

		$mediaQuery = function( $mediaId )
		{
			return iterator_to_array(
				Db::i()->select(
					'*',
					'convert_vanilla_temp',
					[ 'media_id=? AND ' . Db::i()->in( 'link_type', [ 'forums_posts', 'forums_posts_first' ] ), $mediaId ]
				) );
		};

		foreach( $this->fetch( 'Media', 'MediaID', [ $this->db->in( 'ForeignTable', [ 'discussion', 'comment', 'embed' ] ) ] ) AS $row )
		{
			$foreignTable = strtolower( $row['ForeignTable'] );
			$mediaRows = $mediaQuery( $row['MediaID'] );
			if( $foreignTable == 'discussion' )
			{
				$map = array(
					'id1'	=> $row['ForeignID'],
					'id2'	=> $row['ForeignID'],
					'first_post' => true
				);
			}
			elseif( $foreignTable == 'embed' )
			{
				// Nothing to do, attachment must be in another content type
				if( !count( $mediaRows ) )
				{
					$libraryClass->setLastKeyValue( $row['MediaID'] );
					continue;
				}

				$map = [
					'id1'	=> $mediaRows[0]['content_id'],
					'id2'	=> $mediaRows[0]['post_id'],
					'first_post' => ( $mediaRows[0]['link_type'] == 'forums_posts_first' ) ? true : false
				];
			}
			else
			{
				try
				{
					$discussionId = $this->db->select( 'DiscussionID', 'Comment', array( 'CommentID=?', $row['ForeignID'] ) )->first();
				}
				catch( UnderflowException $ex )
				{
					$libraryClass->setLastKeyValue( $row['MediaID'] );
					continue;
				}

				$map = array(
					'id1'	=> $discussionId,
					'id2'	=> $row['ForeignID'],
				);
			}

			/* File extension */
			$ext = explode( '.', $row['Path'] );
			$ext = array_pop( $ext );

			$info = array(
				'attach_id'			=> $row['MediaID'],
				'attach_file'		=> iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $row['Name'] ),
				'attach_date'		=> VanillaCore::mysqlToDateTime( $row['DateInserted'] ),
				'attach_member_id'	=> $row['InsertUserID'],
				'attach_hits'		=> 0,
				'attach_ext'		=> $ext,
				'attach_filesize'	=> $row['Size'],
			);

			$uploadPath = VanillaCore::parseMediaLocation( iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $row['Path'] ), $this->app->_session['more_info']['convertAttachments']['attach_location'] );

			$attachId = $libraryClass->convertAttachment( $info, $map, $uploadPath );

			/* Do some re-jiggery on the post itself to make sure attachment displays */
			if ( $attachId !== FALSE and isset( $mediaRows ) )
			{
				foreach( $mediaRows as $mediaRow )
				{
					try
					{
						$pid = $this->app->getLink( $map['id2'], ( isset( $map['first_post'] ) AND $map['first_post'] === TRUE ) ? 'forums_posts_first' : 'forums_posts' );

						if( !isset( $this->_postContent[ $pid ] ) )
						{
							$this->_postContent[ $pid ] = Db::i()->select( 'post', 'forums_posts', array( "pid=?", $pid ) )->first();
						}

						$this->_postContent[ $pid ] = str_replace( "[ATTACH={$row['MediaID']}]", '[attachment=' . $attachId . ':name]', $this->_postContent[ $pid ] );
					}
					catch( UnderflowException|OutOfRangeException $e ) {}
				}
			}

			unset( $mediaRows );
			$libraryClass->setLastKeyValue( $row['MediaID'] );
		}

		/* Do the updates */
		foreach( $this->_postContent as $pid => $content )
		{
			Db::i()->update( 'forums_posts', array( 'post' => $content ), array( 'pid=?', $pid ) );
		}
	}

	/**
	 * Convert Club Forums
	 *
	 * @return	void
	 */
	public function convertClubForums() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'c.GroupID' );

		$forums = $this->fetch( [ 'Group', 'c' ], 'GroupID', [ 'c.GroupID<>?', -1 ] );
		$uploadsPath = $this->app->_session['more_info']['convertForumsForums']['attach_location'];

		foreach( $forums AS $row )
		{
			$icon = ( isset( $row['Icon'] ) AND $row['Icon'] ) ? VanillaCore::parseMediaLocation( $row['Icon'], $uploadsPath ) : NULL;
			$info = [
				'id'                => $row['GroupID'] + 10000,
				'name'              => 'Discussions',
				'topics'            => $row['CountDiscussions'],
				'parent_id'         => -1,
				'club_id'         	=> $row['GroupID'],
				'icon'              => $icon,
				'sub_can_post'		=> 1,
				'forums_bitoptions'		=> [
					'bw_solved_set_by_member'	 => true,
					'bw_solved_set_by_moderator' => true
				]
			];

			$libraryClass->convertClubForum( $info );
			$libraryClass->setLastKeyValue( $row['CategoryID'] );
		}
	}

	/**
	 * Convert forums
	 *
	 * @return	void
	 */
	public function convertForumsForums(): void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'c.CategoryID' );

		$uploadsPath = $this->app->_session['more_info']['convertForumsForums']['attach_location'];

		$forums = $this->fetch( array( 'Category', 'c' ), 'CategoryID', array( 'c.CategoryID<>?', -1 ) );

		foreach( $forums AS $row )
		{
			$icon = ( isset( $row['Icon'] ) AND $row['Icon'] ) ? VanillaCore::parseMediaLocation( $row['Icon'], $uploadsPath ) : NULL;
			$info = [
				'id'                => $row['CategoryID'],
				'name'              => $row['Name'],
				'description'       => $row['Description'],
				'topics'            => $row['CountDiscussions'],
				'posts'             => $row['CountComments'],
				'parent_id'         => ( (int) $row['ParentCategoryID'] > 0 ) ? $row['ParentCategoryID'] : NULL,
				'position'          => $row['Sort'],
				'icon'              => $icon,
				'sub_can_post'		=> $row['AllowDiscussions'] ?: 0,
				'forums_bitoptions'		=> [
					'bw_solved_set_by_member'	 => true,
					'bw_solved_set_by_moderator' => true
				]
			];

			/* Banner Image? */
			$cardImagePath = null;
			if( !empty( $row['BannerImage'] ) )
			{
				$cardImagePath = VanillaCore::parseMediaLocation( $row['BannerImage'], $uploadsPath );
				$info['card_image'] = pathinfo( $cardImagePath, PATHINFO_BASENAME );
			}

			$libraryClass->convertForumsForum( $info, NULL, $icon, cardImagePath: $cardImagePath );
			$libraryClass->setLastKeyValue( $row['CategoryID'] );
		}
	}

	/**
	 * Convert forum follows
	 *
	 * @return	void
	 */
	public function convertForumsForumsFollowers() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::$usingKeys = FALSE;

		/* Follows */
		$followData = iterator_to_array( $this->fetch( 'UserCategory', 'UserID', [ 'CategoryID>? AND Followed=?', 0, 1 ] ) );
		$this->app->preCacheLinks( $followData, [ 'forums_forums' => 'CategoryID', 'core_members' => 'UserID' ] );
		foreach( $followData AS $follow )
		{
			$frequency = match( $follow['DigestEnabled'] )
			{
				0 => 'immediate',
				1 => 'weekly'
			};

			$libraryClass->convertFollow( [
				'follow_app'			=> 'forums',
				'follow_area'			=> 'forum',
				'follow_rel_id'			=> $follow['CategoryID'],
				'follow_rel_id_type'	=> 'forums_forums',
				'follow_member_id'		=> $follow['UserID'],
				'follow_is_anon'		=> 0,
				'follow_added'			=> VanillaCore::mysqlToDateTime( $follow['DateFollowed'] ),
				'follow_notify_do'		=> 1,
				'follow_notify_meta'	=> '',
				'follow_notify_freq'	=> $frequency,
				'follow_notify_sent'	=> 0,
				'follow_visible'		=> 1,
			] );
		}
	}

	/**
	 * Convert topics
	 *
	 * @return	void
	 */
	public function convertForumsTopics(): void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'd.DiscussionID' );

		$discussions = $this->fetch( array( 'Discussion', 'd' ), 'DiscussionID', NULL,
			'd.*, u.Name as UserName, lcu.UserID as LastCommentUserID, lcu.Name as LastCommentUserName'
		);
		$discussions->join( array( 'User', 'u' ), 'd.InsertUserID=u.UserID' );
		$discussions->join( array( 'User', 'lcu' ), 'd.LastCommentUserID=lcu.UserID' );

		$data = iterator_to_array( $discussions );
		$this->app->preCacheLinks( $data, [ 'core_members' => 'InsertUserID', 'forums_forums' => 'CategoryID' ] );

		$polls = iterator_to_array(
			$this->db->select( '*', 'Poll', [ $this->db->in( 'DiscussionID', array_column( $data, 'DiscussionID' ) ) ] )
						->setKeyField( 'DiscussionID' )
		);

		foreach( $data AS $row )
		{
			/* Skip reports */
			$attributes = [];
			if( !empty( $row['attributes'] ) )
			{
				if( substr( $row['Attributes'], 0, 2 ) == 'a:' ) // Probably serialize
				{
					$attributes = unserialize( $row['Attributes'] );
				}
				else
				{
					$attributes = json_decode( $row['Attributes'], TRUE );
				}
			}

			if( isset( $attributes['Report'] ) OR $row['Type'] == 'Report' )
			{
				$libraryClass->setLastKeyValue( $row['DiscussionID'] );
				continue;
			}

			$row['DateLastComment'] = $row['DateLastComment'] ?? 0;
			$row['LastCommentUserID'] = $row['LastCommentUserID'] ?? 0;
			$row['LastCommentUserName'] = $row['LastCommentUserName'] ?? '';

			/* If last post info is empty, fetch it */
			if( !$row['DateLastComment'] )
			{
				try
				{
					$data = $this->db->select( 'Comment.InsertUserID, Comment.DateInserted, User.Name', 'Comment', array( 'DiscussionID=?', $row['DiscussionID'] ), 'CommentID DESC', array( 0, 1 ) )
								->join( 'User', 'Comment.InsertUserID=User.UserID' )
								->first();

					$row['DateLastComment'] = $data['DateInserted'];
					$row['LastCommentUserID'] = $data['InsertUserId'];
					$row['LastCommentUserName'] = $data['Name'];
				}
				catch( UnderflowException $e ) {}
			}

			/* Is this in a group/club? */
			$forumId = $row['CategoryID'];
			if( !empty( $row['GroupID'] ) )
			{
				$forumId = $row['GroupID'] + 10000;
			}

			$info = array(
				'tid'               => $row['DiscussionID'],
				'title'				=> $row['Name'],
				'forum_id'			=> $forumId,
				'state'				=> ( $row['Closed'] == 0 ) ? 'open' : 'closed',
				'posts'				=> $row['CountComments'],
				'starter_id'		=> $row['InsertUserID'],
				'start_date'		=> VanillaCore::mysqlToDateTime( $row['DateInserted'] ),
				'last_poster_id'	=> $row['LastCommentUserID'],
				'last_post'			=> VanillaCore::mysqlToDateTime( $row['DateLastComment'] ),
				'starter_name'		=> $row['UserName'],
				'last_poster_name'	=> $row['LastCommentUserName'],
				'views'				=> $row['CountViews'],
				'pinned'			=> (int) $row['Announce'] > 0 ? 1 : 0,
			);

			/* Process Polls */
			if( isset( $polls[ $row['DiscussionID'] ] ) )
			{
				$choicesData = iterator_to_array( $this->db->select( 'PollOptionID, CountVotes, Body', 'PollOption', [ 'PollID=?', $polls[ $row['DiscussionID'] ]['PollID'] ], 'Sort ASC' )
															->setKeyField( 'PollOptionID' ) );

				$votes = $search = $choices = [];
				$index = 1;
				foreach( $choicesData AS $choice )
				{
					$choices[ $index ]	= $choice['Body'];
					$votes[ $index ]	= $choice['CountVotes'];
					$search[ $index ] 	= $choice['PollOptionID'];
					$index++;
				}

				$voteData = $this->db->select( 'UserID, PollOptionID', 'PollVote', [ $this->db->in( 'PollOptionID', array_keys( $choicesData ) ) ] );
				$memberVotes = [];
				foreach( $voteData AS $vote )
				{
					$memberVotes[ $vote['UserID'] ] = [
						'member_id'			=> $vote['UserID'],
						'member_choices'	=> [ 1 => array_search( $vote['PollOptionID'], $search ) ]
					];
				}
				
				$info['poll_state'] = [
					'poll_data' => [
						'pid'				=> $polls[ $row['DiscussionID'] ]['PollID'],
						'choices'			=> [ 1 => [
							'question'			=> $polls[ $row['DiscussionID'] ]['Name'],
							'multi'				=> 0,
							'choice'			=> $choices,
							'votes'				=> $votes
						] ],
						'poll_question'		=> $polls[ $row['DiscussionID'] ]['Name'],
						'start_date'		=> VanillaCore::mysqlToDateTime( $row['DateInserted'] ),
						'starter_id'		=> $polls[ $row['DiscussionID'] ]['InsertUserID'],
						'votes'				=> array_sum( $votes ),
						'poll_view_voters'	=> !$polls[ $row['DiscussionID'] ]['Anonymous']
					],
					'vote_data'			=> $memberVotes,
				];
			}

			$libraryClass->convertForumsTopic( $info );

			/* Tags */
			foreach( $this->db->select( '*', [ 'TagDiscussion', 'td' ], [ 'DiscussionID=?', $row['DiscussionID'] ] )
					 	->join( [ 'Tag', 't' ], 'td.TagID=t.TagID' )
					 as $tag )
			{
				$libraryClass->convertTag( array(
					'tag_meta_app' => 'forums',
					'tag_meta_area' => 'forums',
					'tag_meta_parent_id' => $row['CategoryID'],
					'tag_meta_id' => $row['DiscussionID'],
					'tag_text' => $tag['FullName'],
					'tag_member_id' => $row['InsertUserID'],
					'tag_added' => $info['start_date'],
					'tag_prefix' => 0,
				) );
			}

			$libraryClass->setLastKeyValue( $row['DiscussionID'] );
		}
	}

	/**
	 * Convert topic bookmarks
	 *
	 * @return	void
	 */
	public function convertForumsTopicsFollowers() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::$usingKeys = FALSE;

		/* Follows */
		$followData = iterator_to_array( $this->fetch( 'UserDiscussion', 'UserID', [ 'DiscussionID>? AND Bookmarked=?', 0, 1 ] ) );
		$this->app->preCacheLinks( $followData, [ 'forums_topics' => 'DiscussionID', 'core_members' => 'UserID' ] );
		foreach( $followData AS $follow )
		{
			$frequency = match( $follow['Muted'] )
			{
				0 => 'immediate',
				1 => 'none'
			};

			$libraryClass->convertFollow( [
				'follow_app'			=> 'forums',
				'follow_area'			=> 'topic',
				'follow_rel_id'			=> $follow['DiscussionID'],
				'follow_rel_id_type'	=> 'forums_topics',
				'follow_member_id'		=> $follow['UserID'],
				'follow_is_anon'		=> 0,
				'follow_added'			=> !empty( $follow['DateLastViewed'] ) ? VanillaCore::mysqlToDateTime( $follow['DateLastViewed'] ) : time(),
				'follow_notify_do'		=> !$follow['Muted'],
				'follow_notify_meta'	=> '',
				'follow_notify_freq'	=> $frequency,
				'follow_notify_sent'	=> 0,
				'follow_visible'		=> 1,
			] );
		}
	}

	/**
	 * Convert posts
	 *
	 * @return	void
	 */
	public function convertForumsPosts(): void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'DiscussionID' );

		$reactions = $this->_getReactions();

		$data = iterator_to_array( $this->fetch( 'Discussion', 'DiscussionID' ) );
		$this->app->preCacheLinks( $data, [ 'core_members' => 'InsertUserID', 'forums_topics' => 'DiscussionID' ] );

		foreach( $data AS $row )
		{
			/* Skip reports */
			$attributes = [];
			if( !empty( $row['attributes'] ) )
			{
				if( substr( $row['Attributes'], 0, 2 ) == 'a:' ) // Probably serialize
				{
					$attributes = unserialize( $row['Attributes'] );
				}
				else
				{
					$attributes = json_decode( $row['Attributes'], TRUE );
				}
			}

			if( isset( $attributes['Report'] ) OR $row['Type'] == 'Report' )
			{
				$libraryClass->setLastKeyValue( $row['DiscussionID'] );
				continue;
			}

			$editName = NULL;

			if( $row['UpdateUserID'] )
			{
				try
				{
					$editName = $this->db->select( 'Name', 'User', array( 'UserID=?', $row['UpdateUserID'] ) )->first();
				}
				catch( UnderflowException $e ) {}
			}

			// Add Format Type (for later processing) if Markdown
			$format = strtolower( $row['Format'] );
			if( $format == 'markdown' )
			{
				$row['Body'] = '<!--Markdown-->' . $row['Body'];
			}
			elseif( $format == 'rich' )
			{
				$row['Body'] = VanillaCore::processQuill( $row['Body'], $this->app, 'forums_posts_first', $row['DiscussionID'], $row['DiscussionID'] );
			}
			elseif( $format == 'rich2' )
			{
				$row['Body'] = AST::parse( $row['Body'], $this->app, 'forums_posts_first', $row['DiscussionID'], $row['DiscussionID'] );
			}

			/* Get IP */
			try
			{
				$ipAddress = ( $row['InsertIPAddress'] AND !str_contains( $row['InsertIPAddress'], '.' ) ) ? inet_ntop( $row['InsertIPAddress'] ) : $row['InsertIPAddress'];
			}
			catch( \ErrorException $e )
			{
				$ipAddress = '';
			}

			// First post
			$info = array(
				'pid'           => $row['DiscussionID'],
				'topic_id'      => $row['DiscussionID'],
				'post'          => $row['Body'],
				'new_topic'     => 1,
				'edit_time'     => ( $editName === NULL ) ? NULL : VanillaCore::mysqlToDateTime( $row['DateUpdated'] ),
				'edit_name'		=> $editName,
				'author_id'     => $row['InsertUserID'],
				'ip_address'    => $ipAddress,
				'post_date'     => VanillaCore::mysqlToDateTime( $row['DateInserted'] ),
			);

			$postId = $libraryClass->convertForumsPost( $info );
			$libraryClass->setLastKeyValue( $row['DiscussionID'] );

			/* Reputation - We have to do this manually because we're using different link types for first posts. */
			if( $postId !== FALSE )
			{
				$reputation = iterator_to_array( $this->db->select( '*', 'UserTag', [ "RecordType=? AND RecordID=? AND " . $this->db->in( 'TagID', array_keys( $reactions ) ), 'Discussion', $row['DiscussionID'] ] ) );
				$this->app->preCacheLinks( $reputation, [ 'core_members' => [ 'UserID' ] ] );
				foreach( $reputation AS $rep )
				{
					$reaction = Reaction::load( $reactions[ $rep['TagID'] ] );
					try
					{
						Db::i()->insert( 'core_reputation_index', [
							'app' => 'forums',
							'type' => 'pid',
							'type_id' => $postId,
							'member_id' => $this->app->getLink( $rep['UserID'], 'core_members', TRUE ),
							'rep_rating' => $reaction->value,
							'rep_date' => VanillaCore::mysqlToDateTime( $rep['DateInserted'] )->getTimestamp(),
							'member_received' => $info['author_id'],
							'rep_class' => Post::class,
							'item_id' => $this->app->getLink( $row['DiscussionID'], 'forums_topics' ),
							'class_type_id_hash' => md5( Post::class . ':' . $postId ),
							'reaction' => $reactions[ $rep['TagID'] ]
						] );
					}
					catch( \OutOfRangeException ) {}
				}
			}
		}
	}

	/**
	 * Convert other posts
	 *
	 * @return	void
	 */
	public function convertForumsPosts2(): void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'CommentID' );
		$reactions = $this->_getReactions();

		$data = iterator_to_array( $this->fetch( 'Comment', 'CommentID', [ 'parentRecordType=?', 'discussion' ] ) );
		$this->app->preCacheLinks( $data, [ 'core_members' => 'InsertUserID', 'forums_topics' => 'DiscussionID' ] );

		foreach( $data AS $row )
		{
			/* Check whether this is a report */
			if( !empty( $row['Attributes'] ) )
			{
				if( substr( $row['Attributes'], 0, 2 ) == 'a:' ) // Probably serialize
				{
					$attributes = unserialize( $row['Attributes'] );
				}
				else
				{
					$attributes = json_decode( $row['Attributes'], TRUE );
				}

				if( !empty( $attributes['Type'] ) AND $attributes['Type'] == 'Report' )
				{
					$libraryClass->setLastKeyValue( $row['CommentID'] );
					continue;
				}
			}

			$editName = NULL;

			if( $row['UpdateUserID'] )
			{
				try
				{
					$editName = $this->db->select( 'Name', 'User', array( 'UserID=?', $row['UpdateUserID'] ) )->first();
				}
				catch( UnderflowException $e ) {}
			}

			// Add Format Type (for later processing) if Markdown
			$format = strtolower( $row['Format'] );
			if( $format == 'markdown' )
			{
				$row['Body'] = '<!--Markdown-->' . $row['Body'];
			}
			elseif( $format == 'rich' )
			{
				$row['Body'] = VanillaCore::processQuill( $row['Body'], $this->app, 'forums_posts', $row['DiscussionID'], $row['CommentID'] );
			}
			elseif( $format == 'rich2' )
			{
				$row['Body'] = AST::parse( $row['Body'], $this->app, 'forums_posts', $row['DiscussionID'], $row['CommentID'] );
			}

			/* Get IP */
			try
			{
				$ipAddress = ( $row['InsertIPAddress'] AND !str_contains( $row['InsertIPAddress'], '.' ) ) ? inet_ntop( $row['InsertIPAddress'] ) : $row['InsertIPAddress'];
			}
			catch( \ErrorException $e )
			{
				$ipAddress = '';
			}

			$info = [
				'pid'        => $row['CommentID'],
				'topic_id'   => $row['DiscussionID'],
				'post'       => $row['Body'],
				'edit_time'  => ( $editName === NULL ) ? NULL : VanillaCore::mysqlToDateTime( $row['DateUpdated'] ),
				'edit_name'	 => $editName,
				'author_id'  => $row['InsertUserID'],
				'ip_address' => $ipAddress,
				'post_date'  => VanillaCore::mysqlToDateTime( $row['DateInserted'] ),
			];

			$postId = $libraryClass->convertForumsPost( $info );

			/* Khoros can have multiple solutions, so we'll just take the first one */
			if( $postId !== FALSE AND isset( $row['QnA'] ) AND $row['QnA'] == 'Accepted' )
			{
				$x = Post::load( $postId );

				if( !$x->item()->topic_answered_pid )
				{
					$x->post_bwoptions['best_answer'] = TRUE;
					$x->save();

					$x->item()->topic_answered_pid = $postId;
					$x->item()->save();
				}
			}

			/* Reputation */
			if( $postId !== FALSE )
			{
				$reputation = iterator_to_array( $this->db->select( '*', 'UserTag', [ "RecordType=? AND RecordID=? AND " . $this->db->in( 'TagID', array_keys( $reactions ) ), 'Comment', $row['CommentID'] ] ) );
				$this->app->preCacheLinks( $reputation, [ 'core_members' => [ 'UserID' ] ] );
				foreach( $reputation AS $rep )
				{
					$libraryClass->convertReputation( [
						'app'				=> 'forums',
						'type'				=> 'pid',
						'type_id'			=> $info['pid'],
						'member_id'			=> $rep['UserID'],
						'member_received'	=> $info['author_id'],
						'reaction'			=> $this->_reactionTagIdToUrlCode()[ $rep['TagID'] ] ?? null,
						'rep_date'			=> VanillaCore::mysqlToDateTime( $rep['DateInserted'] ),
					] );
				}
			}

			$libraryClass->setLastKeyValue( $row['CommentID'] );
		}
	}

	/**
	 * Check if we can redirect the legacy URLs from this software to the new locations
	 *
	 * @return    Url|NULL
	 * @note	Forums and profiles don't use an ID in the URL. While we may be able to somehow cross reference this with our SEO slug, it wouldn't be reliable.
	 */
	public function checkRedirects(): ?Url
	{
		$url = Request::i()->url();

		if( preg_match( '#/discussion/([0-9]+)/#i', $url->data[ Url::COMPONENT_PATH ], $matches ) )
		{
			$class	= '\IPS\forums\Topic';
			$types	= array( 'topics', 'forums_topics' );
			$oldId	= (int) $matches[1];
		}
		elseif( preg_match( '#/discussion/comment/([0-9]+)#i', $url->data[ Url::COMPONENT_PATH ], $matches ) )
		{
			$class	= '\IPS\forums\Topic\Post';
			$types	= array( 'posts', 'forums_posts' );
			$oldId	= $matches[1];
		}

		if( isset( $class ) )
		{
			try
			{
				try
				{
					$data = (string) $this->app->getLink( $oldId, $types );
				}
				catch( OutOfRangeException $e )
				{
					$data = (string) $this->app->getLink( $oldId, $types, FALSE, TRUE );
				}
				$item = $class::load( $data );

				if( $item instanceof Content )
				{
					if( $item->canView() )
					{
						return $item->url();
					}
				}
			}
			catch( Exception $e )
			{
				return NULL;
			}
		}

		return NULL;
	}

	protected static ?array $reactions = NULL;

	protected function _getReactions(): array
	{
		if( static::$reactions === NULL )
		{
			$rIds = iterator_to_array( $this->db->select( 'UrlCode, TagID', 'ReactionType', [ "Class!=? AND Attributes NOT LIKE '%\"Permission\":\"Garden.Curation.Manage\"%'", 'Flag' ] ) );
			foreach( $rIds AS $rData )
			{
				try
				{
					static::$reactions[ $rData['TagID'] ] = $this->app->getLink( $rData['UrlCode'], 'core_reactions', TRUE );
				}
				catch( \OutOfRangeException  $e ) {}
			}

			if( empty( static::$reactions ) )
			{
				static::$reactions = [];
			}

		//	dump(static::$reactions);
		}
		return static::$reactions;
	}

	protected static ?array $_urlCodeCache = NULL;

	protected function _reactionTagIdToUrlCode(): array
	{
		if( static::$_urlCodeCache === NULL )
		{
			static::$_urlCodeCache = iterator_to_array( $this->db->select( 'UrlCode, TagID', 'ReactionType', [ "Class!=? AND Attributes NOT LIKE '%\"Permission\":\"Garden.Curation.Manage\"%'", 'Flag' ] )
											->setKeyField('TagID')
											->setValueField('UrlCode') );
		}

		return static::$_urlCodeCache;
	}
}